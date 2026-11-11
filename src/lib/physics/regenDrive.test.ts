import { describe, expect, test } from 'vitest';
import { LEAF_2025, MODEL3_LR_RWD_2025 } from '../data/evModels';
import { G_EARTH } from './constants';
import {
  DEFAULT_REGEN,
  FASTSIM_MOTOR_PMAX_W,
  lowSpeedFade,
  roadLoadForce,
  type RegenParams,
} from './energy';
import {
  driveCar,
  driveStep,
  FASTSIM_MODEL3_CHASSIS,
  PEDAL_APPLY_S,
  PEDAL_RETURN_S,
  pedalTravel,
  startDrive,
  tractionAccelMax,
  type DriveCar,
  type DriveState,
  type PedalsHeld,
} from './regenDrive';

const CAR = driveCar(MODEL3_LR_RWD_2025);
const M = MODEL3_LR_RWD_2025.m;
const DT = 0.01;
const NONE: PedalsHeld = { throttle: false, brake: false };
const GAS: PedalsHeld = { throttle: true, brake: false };
const BRAKE: PedalsHeld = { throttle: false, brake: true };
const BOTH: PedalsHeld = { throttle: true, brake: true };
/** Energy books close to this share of the largest energy in play (float residue only). */
const RELATIVE_CLOSURE = 1e-9;
/** 58 km/h, the UDDS's speed when figure 6.3's stretch starts. */
const CRUISE = 16.1;

const kinetic = (v: number, m = M) => 0.5 * m * v * v;

/** Runs `steps` steps of DT holding `held` (or a held per step index) from `state`. */
function run(
  state: DriveState,
  held: PedalsHeld | ((i: number) => PedalsHeld),
  steps: number,
  car: DriveCar = CAR,
  regen: RegenParams = DEFAULT_REGEN,
): DriveState {
  const heldAt = typeof held === 'function' ? held : () => held;
  return Array.from({ length: steps }, (_, i) => i).reduce(
    (current, i) => driveStep(current, heldAt(i), DT, car, regen),
    state,
  );
}

/** A state with both pedals already at the floor, the way a long press leaves them. */
const pressed = (state: DriveState, pedals: Partial<Pick<DriveState, 'throttle' | 'brake'>>) => ({
  ...state,
  ...pedals,
});

describe('the car the pedals drive (FASTSim 3.1.0, 2022 Tesla Model 3 RWD)', () => {
  test('copies the chassis of the vehicle file: μ 0,7, 59 % on the drive axle, h 0,53 m, L 2,875 28 m', () => {
    expect(FASTSIM_MODEL3_CHASSIS).toEqual({
      wheelFricCoef: 0.7,
      driveAxleWeightFrac: 0.59,
      cgHeight: 0.53,
      wheelBase: 2.87528,
    });
  });

  test('the traction limit is μ φ g / (1 − h μ / L): 4,65 m/s² for a rear drive (cálculo propio)', () => {
    const {
      wheelFricCoef: mu,
      driveAxleWeightFrac: phi,
      cgHeight: h,
      wheelBase: l,
    } = FASTSIM_MODEL3_CHASSIS;

    expect(tractionAccelMax()).toBeCloseTo((mu * phi * G_EARTH) / (1 - (h * mu) / l), 12);
    expect(tractionAccelMax()).toBeCloseTo(4.652, 3);
  });

  test('driveCar: tractive force m·a_máx, the motor’s 239 kW and brakes up to μ n = μ m g', () => {
    expect(CAR.vehicle).toBe(MODEL3_LR_RWD_2025);
    expect(CAR.tractionForceMax).toBeCloseTo(M * tractionAccelMax(), 9);
    expect(CAR.tractionPowerMax).toBe(FASTSIM_MOTOR_PMAX_W);
    expect(CAR.brakeForceMax).toBeCloseTo(0.7 * M * G_EARTH, 9);
  });

  test('a lighter car gets proportionally smaller forces (the LEAF keeps the Model 3 chassis)', () => {
    const leaf = driveCar(LEAF_2025);

    expect(leaf.tractionForceMax / LEAF_2025.m).toBeCloseTo(CAR.tractionForceMax / M, 12);
    expect(leaf.brakeForceMax / LEAF_2025.m).toBeCloseTo(CAR.brakeForceMax / M, 12);
  });
});

describe('pedalTravel: a held pedal sinks, a released one comes back', () => {
  test('held, it reaches the floor in PEDAL_APPLY_S (2 s) and stays there', () => {
    expect(PEDAL_APPLY_S).toBe(2);
    expect(pedalTravel(0, true, 0.5)).toBeCloseTo(0.25, 12);
    expect(pedalTravel(0.9, true, 0.5)).toBe(1);
  });

  test('released, it is back at rest after PEDAL_RETURN_S (0,5 s) from the floor, never below', () => {
    expect(PEDAL_RETURN_S).toBe(0.5);
    expect(pedalTravel(1, false, 0.25)).toBeCloseTo(0.5, 12);
    expect(pedalTravel(0.1, false, 0.25)).toBe(0);
  });

  test('rejects a negative or non-finite step', () => {
    expect(() => pedalTravel(0, true, -0.1)).toThrow(RangeError);
    expect(() => pedalTravel(0, true, Number.NaN)).toThrow(RangeError);
  });
});

describe('startDrive', () => {
  test('a car at speed v and distance x, both pedals up and nothing in the books', () => {
    const state = startDrive(CRUISE, 4590, 0);

    expect(state).toMatchObject({ t: 0, v: CRUISE, distance: 4590, throttle: 0, brake: 0 });
    expect(state.eTraction + state.eBrake + state.eRoadLoad + state.eBattery).toBe(0);
    expect(state.pWheel).toBe(0);
  });

  test('rejects a negative speed', () => {
    expect(() => startDrive(-1, 0)).toThrow(RangeError);
  });
});

describe('driveStep: the kernel integrates v(t) from the pedals', () => {
  test('coasting: no power at the wheels, only road load slows the car', () => {
    const next = driveStep(startDrive(CRUISE, 0), NONE, DT, CAR, DEFAULT_REGEN);
    const roadLoad = roadLoadForce(CRUISE, MODEL3_LR_RWD_2025.roadLoad);

    expect(Math.abs(next.pWheel)).toBeLessThan(1e-6);
    expect(next.eBrake + next.eTraction).toBeLessThan(1e-9);
    expect((CRUISE - next.v) / DT).toBeCloseTo(roadLoad / M, 3);
    expect(next.eRoadLoad).toBeCloseTo(kinetic(CRUISE) - kinetic(next.v), 6);
  });

  test('the accelerator pushes with its depth times the traction limit while that is below P/v', () => {
    const state = pressed(startDrive(5, 0), { throttle: 0.5 });
    const next = driveStep(state, GAS, DT, CAR, DEFAULT_REGEN);
    const depth = pedalTravel(0.5, true, DT);
    const force = depth * CAR.tractionForceMax;
    const vMean = (5 + next.v) / 2;

    expect(next.throttle).toBeCloseTo(depth, 12);
    expect(next.pWheel).toBeCloseTo(force * vMean, 6);
    expect(next.eTraction).toBeCloseTo(force * vMean * DT, 9);
    expect(next.isTractionPowerLimited).toBe(false);
  });

  test('at speed the motor’s 239 kW binds: the force is P/v and the step says so', () => {
    const fast = 30;
    const next = driveStep(
      pressed(startDrive(fast, 0), { throttle: 1 }),
      GAS,
      DT,
      CAR,
      DEFAULT_REGEN,
    );

    expect(next.pWheel).toBeCloseTo((FASTSIM_MOTOR_PMAX_W / fast) * ((fast + next.v) / 2), 3);
    expect(next.isTractionPowerLimited).toBe(true);
  });

  test('from rest the car moves only once the push beats the road load A (static, as the kernel)', () => {
    // 0,005 + DT/2 = 0,01 of the traction limit, 90 N: less than A = 120 N.
    const weak = driveStep(
      pressed(startDrive(0, 0), { throttle: 0.005 }),
      GAS,
      DT,
      CAR,
      DEFAULT_REGEN,
    );
    const strong = driveStep(
      pressed(startDrive(0, 0), { throttle: 0.5 }),
      GAS,
      DT,
      CAR,
      DEFAULT_REGEN,
    );

    expect(weak.v).toBe(0);
    expect(weak.eTraction).toBe(0);
    expect(weak.t).toBeCloseTo(DT, 12);
    expect(strong.v).toBeGreaterThan(0);
  });

  test('the brake takes F_b v̄ at the wheels and splits it as the kernel does: min(f(v) P, P_máx)', () => {
    const state = pressed(startDrive(CRUISE, 0), { brake: 0.2 });
    const next = driveStep(state, BRAKE, DT, CAR, DEFAULT_REGEN);
    const force = pedalTravel(0.2, true, DT) * CAR.brakeForceMax;
    const pBrake = force * ((CRUISE + next.v) / 2);

    expect(next.pBrake).toBeCloseTo(pBrake, 3);
    expect(next.pRegen).toBeCloseTo(lowSpeedFade(next.v) * pBrake, 3);
    expect(next.pFriction).toBeCloseTo(next.pBrake - next.pRegen, 9);
    expect(next.pBattery).toBeCloseTo(DEFAULT_REGEN.eta * next.pRegen, 9);
  });

  test('the brake overrides the accelerator: both held, nothing goes into traction', () => {
    const state = pressed(startDrive(CRUISE, 0), { throttle: 1, brake: 0.3 });
    const next = driveStep(state, BOTH, DT, CAR, DEFAULT_REGEN);

    expect(next.eTraction).toBe(0);
    expect(next.pBrake).toBeGreaterThan(0);
    expect(next.throttle).toBe(1);
  });

  test('a battery that takes little (P_máx 10 kW) saturates: the pads take the rest', () => {
    const cold = { ...DEFAULT_REGEN, pMax: 10_000 };
    const next = driveStep(pressed(startDrive(CRUISE, 0), { brake: 0.5 }), BRAKE, DT, CAR, cold);

    expect(next.pRegen).toBe(10_000);
    expect(next.pFriction).toBeGreaterThan(0);
    expect(next.isRegenAtLimit).toBe(true);
    expect(next.isFadeFriction).toBe(false);
  });

  test('near rest f(v) fades the motor out: the pads finish the stop', () => {
    const next = driveStep(
      pressed(startDrive(1, 0), { brake: 0.1 }),
      BRAKE,
      DT,
      CAR,
      DEFAULT_REGEN,
    );

    expect(next.pFriction).toBeGreaterThan(next.pRegen);
    expect(next.isFadeFriction).toBe(true);
    expect(next.isRegenAtLimit).toBe(false);
  });

  test('without f(v) and below P_máx, the brake is all regeneration: no flag', () => {
    const noFade = { ...DEFAULT_REGEN, lowSpeedFade: false };
    const next = driveStep(pressed(startDrive(1, 0), { brake: 0.1 }), BRAKE, DT, CAR, noFade);

    expect(next.pFriction).toBeLessThan(1e-9);
    expect(next.isFadeFriction || next.isRegenAtLimit).toBe(false);
  });

  test('never reverses: a step that would pass rest stops exactly within it', () => {
    const state = pressed(startDrive(0.05, 100), { brake: 1 });
    const next = driveStep(state, BRAKE, DT, CAR, DEFAULT_REGEN);
    const force = CAR.brakeForceMax + roadLoadForce(0.025, MODEL3_LR_RWD_2025.roadLoad);
    const stopTime = (M * 0.05) / force;

    expect(next.v).toBe(0);
    expect(next.t).toBeCloseTo(DT, 12);
    expect(next.distance - 100).toBeCloseTo((0.05 / 2) * stopTime, 12);
    expect(next.eBrake + next.eRoadLoad).toBeCloseTo(kinetic(0.05), 9);
  });

  test('at rest with the brake held nothing changes but the time', () => {
    const state = pressed(startDrive(0, 50), { brake: 1 });
    const next = driveStep(state, BRAKE, DT, CAR, DEFAULT_REGEN);

    expect(next).toMatchObject({ v: 0, distance: 50, eBrake: 0, eRoadLoad: 0, pBrake: 0 });
    expect(next.t).toBeCloseTo(DT, 12);
  });

  test('the distance grows by v̄ Δt', () => {
    const next = driveStep(startDrive(CRUISE, 10), NONE, DT, CAR, DEFAULT_REGEN);

    expect(next.distance - 10).toBeCloseTo(((CRUISE + next.v) / 2) * DT, 12);
  });

  test('does not mutate its inputs and is deterministic', () => {
    const state = pressed(startDrive(CRUISE, 0), { brake: 0.4 });
    const copy = structuredClone(state);
    const held = { ...BRAKE };

    const a = driveStep(state, held, DT, CAR, DEFAULT_REGEN);
    const b = driveStep(state, held, DT, CAR, DEFAULT_REGEN);

    expect(state).toEqual(copy);
    expect(held).toEqual(BRAKE);
    expect(a).toEqual(b);
  });

  test('rejects a step so long that the road load at the mean speed has no solution', () => {
    const floored = pressed(startDrive(10, 0), { brake: 1 });

    expect(() => driveStep(floored, BRAKE, 1e6, CAR, DEFAULT_REGEN)).toThrow(/too long/);
  });

  test('rejects a step that is not positive and a state with a negative speed', () => {
    expect(() => driveStep(startDrive(1, 0), NONE, 0, CAR, DEFAULT_REGEN)).toThrow(RangeError);
    expect(() => driveStep({ ...startDrive(1, 0), v: -1 }, NONE, DT, CAR, DEFAULT_REGEN)).toThrow(
      RangeError,
    );
  });
});

describe('driveStep closes the energy books (input work − losses = what is stored)', () => {
  /** Accelerate, cruise, brake hard, coast, brake to rest and wait: every regime once. */
  const script = (i: number): PedalsHeld => {
    if (i < 300) return GAS;
    if (i < 500) return NONE;
    if (i < 650) return BRAKE;
    if (i < 800) return BOTH;
    if (i < 900) return NONE;
    if (i < 1600) return BRAKE;
    return NONE;
  };
  const cases: [string, RegenParams][] = [
    ['the site model', DEFAULT_REGEN],
    ['a cold battery (P_máx 10 kW)', { ...DEFAULT_REGEN, pMax: 10_000 }],
    ['no regeneration (P_máx 0)', { ...DEFAULT_REGEN, pMax: 0 }],
    ['without f(v)', { ...DEFAULT_REGEN, lowSpeedFade: false }],
  ];

  test.each(cases)(
    '%s: E_batería + ΔK = E_tracción − (carga en carretera + fricción + pérdidas)',
    (_, regen) => {
      const start = startDrive(CRUISE, 0);
      const end = run(start, script, 1800, CAR, regen);
      const input = end.eTraction;
      const losses = end.eRoadLoad + end.eFriction + end.eConversionLoss;
      const stored = end.eBattery + kinetic(end.v) - kinetic(start.v);
      const scale = Math.max(input, kinetic(start.v));

      expect(end.v).toBe(0);
      expect(Math.abs(stored - (input - losses)) / scale).toBeLessThan(RELATIVE_CLOSURE);
      expect(
        Math.abs(end.eBrake - (end.eBattery + end.eConversionLoss + end.eFriction)) / scale,
      ).toBeLessThan(RELATIVE_CLOSURE);
    },
  );

  test('every accumulated energy never decreases and the speed never goes negative', () => {
    const states = Array.from({ length: 1800 }, (_, i) => i).reduce<DriveState[]>(
      (acc, i) => [...acc, driveStep(acc[acc.length - 1], script(i), DT, CAR, DEFAULT_REGEN)],
      [startDrive(CRUISE, 0)],
    );
    const keys = ['eTraction', 'eRoadLoad', 'eBrake', 'eBattery', 'eFriction'] as const;

    states.slice(1).forEach((state, i) => {
      expect(state.v).toBeGreaterThanOrEqual(0);
      keys.forEach((key) => expect(state[key]).toBeGreaterThanOrEqual(states[i][key]));
    });
  });

  test('the brake on the floor from 58 km/h stops the car in v/(μ g) plus road load: 2,3 s (cálculo propio)', () => {
    const floored = pressed(startDrive(CRUISE, 0), { brake: 1 });

    expect(CRUISE / (0.7 * G_EARTH)).toBeCloseTo(2.34, 2);
    expect(run(floored, BRAKE, 225).v).toBeGreaterThan(0);
    expect(run(floored, BRAKE, 240).v).toBe(0);
  });
});
