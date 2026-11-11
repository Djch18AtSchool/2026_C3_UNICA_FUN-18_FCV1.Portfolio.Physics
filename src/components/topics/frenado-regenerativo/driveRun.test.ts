import { describe, expect, test } from 'vitest';
import { MODEL3_LR_RWD_2025 } from '../../../lib/data/evModels';
import { DEFAULT_REGEN } from '../../../lib/physics/energy';
import { driveCar, driveStep, startDrive, type PedalsHeld } from '../../../lib/physics/regenDrive';
import {
  DRIVE_STEP_S,
  extendRun,
  heldAt,
  newRun,
  resimulateRun,
  runEnd,
  speedTrace,
  stateAt,
  stepAt,
  truncateRun,
  type DriveCourse,
  type DriveModel,
} from './driveRun';

const COURSE: DriveCourse = {
  offset: 376,
  duration: 26,
  startSpeed: 16.1,
  startDistance: 4590,
  stopLine: 4826,
  roadEnd: 4885,
};
const MODEL: DriveModel = { car: driveCar(MODEL3_LR_RWD_2025), regen: DEFAULT_REGEN };
const NONE: PedalsHeld = { throttle: false, brake: false };
const BRAKE: PedalsHeld = { throttle: false, brake: true };
const GAS: PedalsHeld = { throttle: true, brake: false };

describe('steps and instants', () => {
  test('a run steps every 0,01 s; stepAt is robust to float residue (0,03 s is step 3)', () => {
    expect(DRIVE_STEP_S).toBe(0.01);
    expect(stepAt(0.03)).toBe(3);
    expect(stepAt(0.0349)).toBe(3);
    expect(stepAt(26)).toBe(2600);
  });
});

describe('newRun', () => {
  test('starts at the course’s speed and distance, at t = 0, pedals released', () => {
    const run = newRun(COURSE);

    expect(run.states).toEqual([startDrive(16.1, 4590, 0)]);
    expect(run.inputs).toEqual([{ step: 0, held: NONE }]);
    expect(runEnd(run)).toBe(0);
  });
});

describe('extendRun', () => {
  test('integrates up to the step of t with the pedals held, exactly as driveStep would', () => {
    const run = extendRun(newRun(COURSE), 0.05, BRAKE, COURSE, MODEL);
    const byHand = [0, 1, 2, 3, 4].reduce(
      (state) => driveStep(state, BRAKE, DRIVE_STEP_S, MODEL.car, MODEL.regen),
      startDrive(16.1, 4590, 0),
    );

    expect(run.states).toHaveLength(6);
    expect(run.states[5]).toEqual(byHand);
    expect(runEnd(run)).toBeCloseTo(0.05, 12);
  });

  test('records a change of pedals at the first new step, and only a change', () => {
    const braking = extendRun(newRun(COURSE), 0.05, BRAKE, COURSE, MODEL);
    const still = extendRun(braking, 0.1, BRAKE, COURSE, MODEL);
    const gas = extendRun(still, 0.12, GAS, COURSE, MODEL);

    expect(still.inputs).toEqual([
      { step: 0, held: NONE },
      { step: 0, held: BRAKE },
    ]);
    expect(gas.inputs.at(-1)).toEqual({ step: 10, held: GAS });
    expect(heldAt(gas.inputs, 9)).toEqual(BRAKE);
    expect(heldAt(gas.inputs, 11)).toEqual(GAS);
  });

  test('stops at the end of the course and leaves a run already past t unchanged', () => {
    const run = extendRun(newRun(COURSE), 99, NONE, COURSE, MODEL);

    expect(run.states).toHaveLength(2601);
    expect(extendRun(run, 3, BRAKE, COURSE, MODEL)).toBe(run);
  });

  test('does not mutate the run it extends', () => {
    const run = newRun(COURSE);
    const before = structuredClone(run);

    extendRun(run, 1, GAS, COURSE, MODEL);

    expect(run).toEqual(before);
  });
});

describe('stateAt and replay', () => {
  const run = extendRun(newRun(COURSE), 2, BRAKE, COURSE, MODEL);

  test('reads the recorded state of the step of t, clamped to the recording', () => {
    expect(stateAt(run, 1)).toBe(run.states[100]);
    expect(stateAt(run, 0)).toBe(run.states[0]);
    expect(stateAt(run, 5)).toBe(run.states[200]);
    expect(stateAt(run, -1)).toBe(run.states[0]);
  });
});

describe('truncateRun: playing again from an earlier instant drops what came after', () => {
  test('keeps the states up to the step of t and the inputs before it', () => {
    const braking = extendRun(newRun(COURSE), 1, BRAKE, COURSE, MODEL);
    const run = extendRun(braking, 2, GAS, COURSE, MODEL);
    const cut = truncateRun(run, 1.5);

    expect(cut.states).toEqual(run.states.slice(0, 151));
    expect(cut.inputs).toEqual(run.inputs);
    expect(truncateRun(run, 0.5).inputs).toEqual(braking.inputs);
    expect(truncateRun(run, 0).inputs).toEqual([{ step: 0, held: NONE }]);
  });

  test('is the same run when t is at or past its end', () => {
    const run = extendRun(newRun(COURSE), 1, BRAKE, COURSE, MODEL);

    expect(truncateRun(run, 1)).toBe(run);
    expect(truncateRun(run, 3)).toBe(run);
  });
});

describe('resimulateRun: the same pedals with another car or regeneration', () => {
  const braking = extendRun(newRun(COURSE), 3, BRAKE, COURSE, MODEL);
  const run = extendRun(braking, 4, NONE, COURSE, MODEL);

  test('with the same model it is the same run', () => {
    expect(resimulateRun(run, COURSE, MODEL)).toEqual(run);
  });

  test('with a cold battery (P_máx 10 kW) the same pedals send less to the battery', () => {
    const cold = { ...MODEL, regen: { ...DEFAULT_REGEN, pMax: 10_000 } };
    const again = resimulateRun(run, COURSE, cold);

    expect(again.states).toHaveLength(run.states.length);
    expect(again.inputs).toBe(run.inputs);
    expect(again.states.at(-1)?.eBattery).toBeLessThan(run.states.at(-1)?.eBattery ?? 0);
    expect(again.states.at(-1)?.eFriction).toBeGreaterThan(run.states.at(-1)?.eFriction ?? 0);
  });
});

describe('speedTrace', () => {
  test('v every 0,1 s up to t, in km/h against the cycle’s time, ending at t', () => {
    const run = extendRun(newRun(COURSE), 1.05, BRAKE, COURSE, MODEL);
    const trace = speedTrace(run, COURSE, 1.05);

    expect(trace[0]).toEqual({ x: 376, y: 16.1 * 3.6 });
    expect(trace).toHaveLength(12);
    expect(trace[10].x).toBeCloseTo(377, 9);
    expect(trace.at(-1)?.x).toBeCloseTo(377.05, 9);
    expect(trace.at(-1)?.y).toBeCloseTo((run.states[105].v ?? 0) * 3.6, 9);
  });

  test('a run that has not started is its first point', () => {
    expect(speedTrace(newRun(COURSE), COURSE, 0)).toEqual([{ x: 376, y: 16.1 * 3.6 }]);
  });
});
