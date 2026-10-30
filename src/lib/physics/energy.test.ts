import { describe, expect, test } from 'vitest';
import { DRIVE_CYCLES } from '../data/driveCycles';
import { LEAF_2025, MODEL3_LR_RWD_2025 } from '../data/evModels';
import {
  cycleBalance,
  DEFAULT_REGEN,
  KG_PER_LB,
  lowSpeedFade,
  MS_PER_MPH,
  N_PER_LBF,
  roadLoadForce,
  roadLoadFromEpa,
  type BalanceTotals,
  type CycleSample,
  type Vehicle,
} from './energy';

const J_PER_KWH = 3.6e6;
const kWh = (j: number) => j / J_PER_KWH;
const UDDS = DRIVE_CYCLES.udds.samples;
const HWFET = DRIVE_CYCLES.hwfet.samples;
const US06 = DRIVE_CYCLES.us06.samples;
const UDDS_TOTALS = cycleBalance(UDDS, MODEL3_LR_RWD_2025, DEFAULT_REGEN).totals;
const RELATIVE_CLOSURE = 1e-6;

/** A 1 Hz cycle from a list of speeds in m/s. */
const cycleOf = (speeds: number[]): CycleSample[] => speeds.map((v, t) => ({ t, v }));
const ALL_TOTAL_KEYS: (keyof BalanceTotals)[] = [
  'traction',
  'roadLoad',
  'kineticRemoved',
  'roadLoadWhileSlowing',
  'brake',
  'battery',
  'friction',
  'recoveredShare',
  'peakBrakePower',
  'peakDecelG',
];

describe('unit conversions', () => {
  test('uses the exact definitions of the pound, the pound-force and the mile per hour', () => {
    expect(KG_PER_LB).toBe(0.45359237);
    expect(N_PER_LBF).toBeCloseTo(4.4482216152605, 12);
    expect(MS_PER_MPH).toBe(0.44704);
  });

  test('roadLoadFromEpa converts the Model 3 target coefficients to SI (research §5)', () => {
    const rl = roadLoadFromEpa(27.02, 0.2873, 0.0122);

    expect(rl.A).toBeCloseTo(120.19, 1);
    expect(rl.B).toBeCloseTo(2.8587, 3);
    expect(rl.C).toBeCloseTo(0.27155, 4);
  });

  test('roadLoadFromEpa divides C by 0,44704², not by 0,44704 (pitfall 3)', () => {
    expect(roadLoadFromEpa(0, 0, 1).C).toBeCloseTo(N_PER_LBF / MS_PER_MPH ** 2, 9);
  });

  test('roadLoadFromEpa rejects non-finite coefficients', () => {
    expect(() => roadLoadFromEpa(Number.NaN, 0.2873, 0.0122)).toThrow(RangeError);
    expect(() => roadLoadFromEpa(27.02, Infinity, 0.0122)).toThrow(RangeError);
  });
});

describe('roadLoadForce', () => {
  test('is A + Bv + Cv²', () => {
    expect(roadLoadForce(10, { A: 100, B: 2, C: 0.3 })).toBeCloseTo(150, 9);
    expect(roadLoadForce(0, { A: 100, B: 2, C: 0.3 })).toBe(100);
  });

  test('rejects a negative or non-finite speed', () => {
    expect(() => roadLoadForce(-1, MODEL3_LR_RWD_2025.roadLoad)).toThrow(RangeError);
    expect(() => roadLoadForce(Number.NaN, MODEL3_LR_RWD_2025.roadLoad)).toThrow(RangeError);
  });
});

describe('lowSpeedFade', () => {
  test('is 0,98 / (1 + 500·exp(−0,99·(v_mph + 1))) (FASTSim 2)', () => {
    expect(lowSpeedFade(0)).toBeCloseTo(0.98 / (1 + 500 * Math.exp(-0.99)), 9);
    expect(lowSpeedFade(10 * MS_PER_MPH)).toBeCloseTo(0.98 / (1 + 500 * Math.exp(-0.99 * 11)), 9);
  });

  test('is almost zero at rest, half of 0,98 near 5,3 mph and 0,98 at road speed', () => {
    const halfSpeedMph = Math.log(500) / 0.99 - 1;

    expect(lowSpeedFade(0)).toBeLessThan(0.006);
    expect(lowSpeedFade(halfSpeedMph * MS_PER_MPH)).toBeCloseTo(0.49, 9);
    expect(lowSpeedFade(30)).toBeCloseTo(0.98, 6);
  });

  test('grows with speed', () => {
    const values = [0, 1, 2, 3, 5, 10].map(lowSpeedFade);

    values.slice(1).forEach((value, i) => expect(value).toBeGreaterThan(values[i]));
  });

  test('rejects a negative speed', () => {
    expect(() => lowSpeedFade(-0.1)).toThrow(RangeError);
  });
});

describe('DEFAULT_REGEN', () => {
  test('is the site model: η 0,80, P_máx 239 kW and no low-speed fade', () => {
    expect(DEFAULT_REGEN).toEqual({ eta: 0.8, pMax: 239_000, lowSpeedFade: false });
  });
});

describe('cycleBalance on the UDDS with the Model 3 LR RWD 2025 (research §7)', () => {
  test('reproduces the traction, kinetic, road-load and brake energies', () => {
    expect(kWh(UDDS_TOTALS.traction)).toBeCloseTo(1.597, 2);
    expect(kWh(UDDS_TOTALS.kineticRemoved)).toBeCloseTo(1.124, 2);
    expect(kWh(UDDS_TOTALS.roadLoadWhileSlowing)).toBeCloseTo(0.255, 2);
    expect(kWh(UDDS_TOTALS.brake)).toBeCloseTo(0.869, 2);
    expect(kWh(UDDS_TOTALS.roadLoad)).toBeCloseTo(0.729, 2);
  });

  test('stores 0,695 kWh, 43,5 % of the traction, with η 0,80 and P_máx 239 kW', () => {
    expect(kWh(UDDS_TOTALS.battery)).toBeCloseTo(0.695, 2);
    expect(UDDS_TOTALS.recoveredShare).toBeCloseTo(0.435, 2);
  });

  test('peaks at 33,2 kW of braking power and 0,150 g of deceleration', () => {
    expect(UDDS_TOTALS.peakBrakePower / 1000).toBeCloseTo(33.2, 0);
    expect(UDDS_TOTALS.peakDecelG).toBeCloseTo(0.15, 2);
  });

  test('drops to 0,487 kWh with a cold or full battery (P_máx 10 kW)', () => {
    const { totals } = cycleBalance(UDDS, MODEL3_LR_RWD_2025, { ...DEFAULT_REGEN, pMax: 10_000 });

    expect(kWh(totals.battery)).toBeCloseTo(0.487, 2);
  });

  test('with the low-speed fade recovers 0,807 kWh at the wheels and leaves 0,062 kWh to friction', () => {
    const { totals } = cycleBalance(UDDS, MODEL3_LR_RWD_2025, {
      ...DEFAULT_REGEN,
      lowSpeedFade: true,
    });

    expect(kWh(totals.battery / DEFAULT_REGEN.eta)).toBeCloseTo(0.807, 2);
    expect(kWh(totals.friction)).toBeCloseTo(0.062, 2);
    expect(totals.battery).toBeLessThan(UDDS_TOTALS.battery);
  });
});

describe('cycleBalance across cycles with DEFAULT_REGEN (η·brake / traction)', () => {
  test('HWFET returns 12,8 % of the traction: in highway driving the air does most of the braking', () => {
    const { totals } = cycleBalance(HWFET, MODEL3_LR_RWD_2025, DEFAULT_REGEN);

    expect(totals.recoveredShare * 100).toBeCloseTo(12.8, 1);
    expect(kWh(totals.traction)).toBeCloseTo(1.775, 2);
    expect(kWh(totals.brake)).toBeCloseTo(0.285, 2);
    expect(totals.brake / totals.kineticRemoved).toBeCloseTo(0.456, 2);
    expect(totals.peakBrakePower / 1000).toBeCloseTo(47.1, 0);
  });

  test('US06 returns 32,1 % and reaches 0,314 g', () => {
    const { totals } = cycleBalance(US06, MODEL3_LR_RWD_2025, DEFAULT_REGEN);

    expect(totals.recoveredShare * 100).toBeCloseTo(32.1, 1);
    expect(kWh(totals.traction)).toBeCloseTo(2.432, 2);
    expect(kWh(totals.brake)).toBeCloseTo(0.976, 2);
    expect(kWh(totals.kineticRemoved)).toBeCloseTo(1.452, 2);
    expect(totals.peakBrakePower / 1000).toBeCloseTo(70.8, 0);
    expect(totals.peakDecelG).toBeCloseTo(0.314, 2);
  });

  test('US06 with P_máx 30 kW stores 0,632 kWh: the limit matters in aggressive driving', () => {
    const { totals } = cycleBalance(US06, MODEL3_LR_RWD_2025, { ...DEFAULT_REGEN, pMax: 30_000 });

    expect(kWh(totals.battery)).toBeCloseTo(0.632, 2);
  });

  test('the LEAF 2025 on the UDDS needs 1,605 kWh of traction and 0,749 kWh of braking', () => {
    const { totals } = cycleBalance(UDDS, LEAF_2025, DEFAULT_REGEN);

    expect(kWh(totals.traction)).toBeCloseTo(1.605, 2);
    expect(kWh(totals.brake)).toBeCloseTo(0.749, 2);
  });
});

describe('cycleBalance closes the energy books', () => {
  test.each([
    ['UDDS', UDDS],
    ['HWFET', HWFET],
    ['US06', US06],
  ])('%s, rest to rest: traction − brake = road load', (_, cycle) => {
    const { totals } = cycleBalance(cycle, MODEL3_LR_RWD_2025, DEFAULT_REGEN);

    expect(Math.abs(totals.traction - totals.brake - totals.roadLoad)).toBeLessThan(
      RELATIVE_CLOSURE * totals.roadLoad,
    );
  });

  test('the kinetic energy removed splits into road load while slowing and brake', () => {
    expect(UDDS_TOTALS.roadLoadWhileSlowing + UDDS_TOTALS.brake).toBeCloseTo(
      UDDS_TOTALS.kineticRemoved,
      6,
    );
  });

  test('the brake energy splits into what the motor takes (battery / η) and friction', () => {
    const { totals } = cycleBalance(UDDS, MODEL3_LR_RWD_2025, { ...DEFAULT_REGEN, pMax: 10_000 });

    expect(totals.battery / DEFAULT_REGEN.eta + totals.friction).toBeCloseTo(totals.brake, 6);
  });

  test('the last step carries the totals and every cumulative series never decreases', () => {
    const { steps, totals } = cycleBalance(UDDS, MODEL3_LR_RWD_2025, DEFAULT_REGEN);
    const last = steps[steps.length - 1];
    const series = [
      'eTraction',
      'eRoadLoad',
      'eKineticRemoved',
      'eBrake',
      'eBattery',
      'eFriction',
    ] as const;

    expect([
      last.eTraction,
      last.eRoadLoad,
      last.eKineticRemoved,
      last.eBrake,
      last.eBattery,
      last.eFriction,
    ]).toEqual([
      totals.traction,
      totals.roadLoad,
      totals.kineticRemoved,
      totals.brake,
      totals.battery,
      totals.friction,
    ]);
    steps.slice(1).forEach((step, i) => {
      series.forEach((key) => expect(step[key]).toBeGreaterThanOrEqual(steps[i][key]));
    });
  });
});

describe('cycleBalance steps', () => {
  test('has one step per sample; the first is the start, at rest in the books', () => {
    const { steps } = cycleBalance(UDDS, MODEL3_LR_RWD_2025, DEFAULT_REGEN);

    expect(steps).toHaveLength(UDDS.length);
    expect(steps[0]).toEqual({
      t: UDDS[0].t,
      v: UDDS[0].v,
      pWheel: 0,
      pBrake: 0,
      pRegen: 0,
      pFriction: 0,
      eTraction: 0,
      eRoadLoad: 0,
      eKineticRemoved: 0,
      eBrake: 0,
      eBattery: 0,
      eFriction: 0,
    });
    steps.forEach((step, i) => expect([step.t, step.v]).toEqual([UDDS[i].t, UDDS[i].v]));
  });

  test('computes one interval by hand: 0 → 10 → 0 m/s with Δt = 2 s', () => {
    const vehicle: Vehicle = { name: 'prueba', m: 1000, roadLoad: { A: 100, B: 0, C: 0 } };
    const cycle: CycleSample[] = [
      { t: 0, v: 0 },
      { t: 2, v: 10 },
      { t: 4, v: 0 },
    ];

    const { steps, totals } = cycleBalance(cycle, vehicle, {
      eta: 0.5,
      pMax: 10_000,
      lowSpeedFade: false,
    });

    // Speeding up: ΔK = 50 kJ in 2 s → 25 kW, plus 100 N · 5 m/s = 0,5 kW.
    expect(steps[1].pWheel).toBeCloseTo(25_500, 9);
    // Slowing down: −25 kW + 0,5 kW = −24,5 kW of braking; the motor takes 10 kW, friction 14,5 kW.
    expect(steps[2]).toMatchObject({
      pWheel: -24_500,
      pBrake: 24_500,
      pRegen: 10_000,
      pFriction: 14_500,
    });
    expect(totals).toMatchObject({
      traction: 51_000,
      roadLoad: 2_000,
      kineticRemoved: 50_000,
      roadLoadWhileSlowing: 1_000,
      brake: 49_000,
      battery: 10_000,
      friction: 29_000,
      peakBrakePower: 24_500,
    });
    expect(totals.recoveredShare).toBeCloseTo(10_000 / 51_000, 12);
    expect(totals.peakDecelG).toBeCloseTo(5 / 9.81, 12);
  });

  test('counts a coasting interval where road load alone removes the kinetic energy as no braking', () => {
    const vehicle: Vehicle = { name: 'prueba', m: 1000, roadLoad: { A: 1000, B: 0, C: 0 } };

    const { totals } = cycleBalance(cycleOf([10, 9.9]), vehicle, DEFAULT_REGEN);

    expect(totals.kineticRemoved).toBeCloseTo(995, 9);
    expect(totals.roadLoadWhileSlowing).toBeCloseTo(995, 9);
    expect(totals.brake).toBe(0);
    expect(totals.traction).toBeCloseTo(9950 - 995, 9);
  });

  test('does not mutate the cycle, the vehicle or the parameters', () => {
    const cycle = cycleOf([0, 5, 0]);
    const regen = { ...DEFAULT_REGEN };
    const before = JSON.stringify([cycle, MODEL3_LR_RWD_2025, regen]);

    cycleBalance(cycle, MODEL3_LR_RWD_2025, regen);

    expect(JSON.stringify([cycle, MODEL3_LR_RWD_2025, regen])).toBe(before);
  });
});

describe('cycleBalance degenerate inputs', () => {
  test.each([
    ['η = 0', { ...DEFAULT_REGEN, eta: 0 }],
    ['P_máx = 0', { ...DEFAULT_REGEN, pMax: 0 }],
  ])('%s stores nothing: battery 0, recoveredShare 0, no NaN', (_, regen) => {
    const { steps, totals } = cycleBalance(UDDS, MODEL3_LR_RWD_2025, regen);

    expect(totals.battery).toBe(0);
    expect(totals.recoveredShare).toBe(0);
    ALL_TOTAL_KEYS.forEach((key) => expect(Number.isFinite(totals[key])).toBe(true));
    steps.forEach((step) =>
      Object.values(step).forEach((value) => expect(Number.isFinite(value)).toBe(true)),
    );
  });

  test('P_máx = 0 sends all the braking energy to friction', () => {
    const { totals } = cycleBalance(UDDS, MODEL3_LR_RWD_2025, { ...DEFAULT_REGEN, pMax: 0 });

    expect(totals.friction).toBeCloseTo(UDDS_TOTALS.brake, 6);
  });

  test('a car parked the whole cycle has zero traction and a recovered share of 0, not NaN', () => {
    const { totals } = cycleBalance(cycleOf([0, 0, 0]), MODEL3_LR_RWD_2025, DEFAULT_REGEN);

    ALL_TOTAL_KEYS.forEach((key) => expect(totals[key]).toBe(0));
  });

  test('rejects fewer than two samples, time that does not advance and negative speeds', () => {
    expect(() => cycleBalance(cycleOf([0]), MODEL3_LR_RWD_2025, DEFAULT_REGEN)).toThrow(
      /2 samples/,
    );
    expect(() =>
      cycleBalance(
        [
          { t: 0, v: 0 },
          { t: 0, v: 1 },
        ],
        MODEL3_LR_RWD_2025,
        DEFAULT_REGEN,
      ),
    ).toThrow(/time/);
    expect(() => cycleBalance(cycleOf([0, -1]), MODEL3_LR_RWD_2025, DEFAULT_REGEN)).toThrow(
      RangeError,
    );
  });

  test('rejects η outside [0, 1], a negative P_máx and a non-positive mass', () => {
    const cycle = cycleOf([0, 5, 0]);

    expect(() => cycleBalance(cycle, MODEL3_LR_RWD_2025, { ...DEFAULT_REGEN, eta: 1.2 })).toThrow(
      /eta/,
    );
    expect(() => cycleBalance(cycle, MODEL3_LR_RWD_2025, { ...DEFAULT_REGEN, eta: -0.1 })).toThrow(
      /eta/,
    );
    expect(() => cycleBalance(cycle, MODEL3_LR_RWD_2025, { ...DEFAULT_REGEN, pMax: -1 })).toThrow(
      /pMax/,
    );
    expect(() => cycleBalance(cycle, { ...MODEL3_LR_RWD_2025, m: 0 }, DEFAULT_REGEN)).toThrow(
      /^m must/,
    );
  });
});
