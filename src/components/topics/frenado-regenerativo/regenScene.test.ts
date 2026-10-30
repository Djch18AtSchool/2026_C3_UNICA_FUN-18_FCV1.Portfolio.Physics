import { describe, expect, test } from 'vitest';
import { DRIVE_CYCLES } from '../../../lib/data/driveCycles';
import { MODEL3_LR_RWD_2025 } from '../../../lib/data/evModels';
import { cycleBalance, DEFAULT_REGEN, type BalanceStep } from '../../../lib/physics/energy';
import {
  balanceAt,
  BRAKE_PARTS,
  cumulativeDistance,
  drivePhase,
  ENERGY_SERIES,
  energyAxisMax,
  energySeries,
  flowWidth,
  J_PER_KWH,
  MAX_FLOW_WIDTH,
  MIN_FLOW_WIDTH,
  peakBrakeTime,
  powerFlows,
  roadPosition,
  type BalanceAt,
} from './regenScene';

const udds = DRIVE_CYCLES.udds.samples;
const { steps: uddsSteps, totals: uddsTotals } = cycleBalance(
  udds,
  MODEL3_LR_RWD_2025,
  DEFAULT_REGEN,
);
const uddsDistance = cumulativeDistance(udds);

/** A hand-made instant: everything zero except what the case sets. */
function instant(overrides: Partial<BalanceAt>): BalanceAt {
  return {
    t: 0,
    v: 0,
    distance: 0,
    pWheel: 0,
    pBrake: 0,
    pRegen: 0,
    pFriction: 0,
    pBattery: 0,
    eTraction: 0,
    eRoadLoad: 0,
    eBrake: 0,
    eBattery: 0,
    eFriction: 0,
    eConversionLoss: 0,
    recoveredShare: 0,
    ...overrides,
  };
}

describe('cumulativeDistance', () => {
  test('integrates the trapezoid of v: 0 → 10 m/s in 1 s covers 5 m', () => {
    expect(
      cumulativeDistance([
        { t: 0, v: 0 },
        { t: 1, v: 10 },
        { t: 3, v: 10 },
      ]),
    ).toEqual([0, 5, 25]);
  });

  test('the UDDS covers 11,99 km, one entry per sample', () => {
    expect(uddsDistance).toHaveLength(udds.length);
    expect(uddsDistance[uddsDistance.length - 1] / 1000).toBeCloseTo(11.99, 2);
  });
});

describe('balanceAt', () => {
  test('at a sample time it reads that step: the hardest UDDS braking ends at t = 116 s', () => {
    const at = balanceAt(uddsSteps, uddsDistance, 116);

    expect(at.v).toBe(uddsSteps[116].v);
    expect(at.pWheel / 1000).toBeCloseTo(-33.2036, 4);
    expect(at.pBrake).toBe(uddsSteps[116].pBrake);
    expect(at.eBattery).toBe(uddsSteps[116].eBattery);
    expect(at.pBattery).toBeCloseTo(DEFAULT_REGEN.eta * uddsSteps[116].pRegen, 9);
    expect(at.recoveredShare).toBeCloseTo(uddsSteps[116].eBattery / uddsSteps[116].eTraction, 12);
  });

  test('between samples v and the energies are interpolated and the powers are the interval’s', () => {
    const at = balanceAt(uddsSteps, uddsDistance, 115.5);
    const [s0, s1] = [uddsSteps[115], uddsSteps[116]];

    expect(at.v).toBeCloseTo((s0.v + s1.v) / 2, 12);
    expect(at.pWheel).toBe(s1.pWheel);
    expect(at.eBattery).toBeCloseTo((s0.eBattery + s1.eBattery) / 2, 9);
    // Under constant deceleration the distance is v0·τ + ½·a·τ², not the chord.
    const a = s1.v - s0.v;
    expect(at.distance).toBeCloseTo(uddsDistance[115] + s0.v * 0.5 + 0.5 * a * 0.25, 9);
  });

  test('at rest at t = 0 every power and energy is 0 and the share is 0, not NaN', () => {
    const at = balanceAt(uddsSteps, uddsDistance, 0);

    expect(at).toEqual(instant({}));
  });

  test('times outside the cycle clamp to its ends; the end reads the totals', () => {
    expect(balanceAt(uddsSteps, uddsDistance, -5).t).toBe(0);
    const end = balanceAt(uddsSteps, uddsDistance, 99_999);

    expect(end.t).toBe(1369);
    expect(end.eBattery).toBe(uddsTotals.battery);
    expect(end.recoveredShare).toBe(uddsTotals.recoveredShare);
    expect(end.distance).toBe(uddsDistance[uddsDistance.length - 1]);
  });

  test('with η = 0 the battery power and the share stay 0', () => {
    const { steps } = cycleBalance(udds, MODEL3_LR_RWD_2025, { ...DEFAULT_REGEN, eta: 0 });

    const at = balanceAt(steps, uddsDistance, 116);

    expect(at.pBattery).toBe(0);
    expect(at.recoveredShare).toBe(0);
    expect(at.pRegen).toBeGreaterThan(0);
  });
});

describe('peakBrakeTime', () => {
  test('is the end of the interval with the largest brake power: 116 s on the UDDS', () => {
    expect(peakBrakeTime(uddsSteps)).toBe(116);
  });

  test('is the first sample time when the car never brakes', () => {
    const parked: BalanceStep[] = cycleBalance(
      [
        { t: 0, v: 0 },
        { t: 1, v: 0 },
      ],
      MODEL3_LR_RWD_2025,
      DEFAULT_REGEN,
    ).steps;

    expect(peakBrakeTime(parked)).toBe(0);
  });
});

describe('powerFlows', () => {
  test('in traction power flows battery → motor → wheels; the battery link is a lower bound', () => {
    const flows = powerFlows(instant({ v: 10, pWheel: 20_000 }));

    expect(flows).toEqual([
      {
        id: 'battery-motor',
        kind: 'traction',
        power: 20_000,
        towards: 'right',
        isLowerBound: true,
      },
      {
        id: 'motor-wheels',
        kind: 'traction',
        power: 20_000,
        towards: 'right',
        isLowerBound: false,
      },
      { id: 'wheels-brakes', kind: 'idle', power: 0, towards: 'right', isLowerBound: false },
    ]);
  });

  test('braking sends η·P_regen to the battery and the rest of P_freno to the brakes', () => {
    const flows = powerFlows(
      instant({
        v: 10,
        pWheel: -30_000,
        pBrake: 30_000,
        pRegen: 10_000,
        pBattery: 8_000,
        pFriction: 20_000,
      }),
    );

    expect(flows).toEqual([
      { id: 'battery-motor', kind: 'regen', power: 8_000, towards: 'left', isLowerBound: false },
      { id: 'motor-wheels', kind: 'regen', power: 10_000, towards: 'left', isLowerBound: false },
      {
        id: 'wheels-brakes',
        kind: 'friction',
        power: 20_000,
        towards: 'right',
        isLowerBound: false,
      },
    ]);
  });

  test('with η = 0 the motor still brakes but nothing reaches the battery', () => {
    const flows = powerFlows(instant({ v: 10, pWheel: -5_000, pBrake: 5_000, pRegen: 5_000 }));

    expect(flows[0]).toMatchObject({ kind: 'idle', power: 0 });
    expect(flows[1]).toMatchObject({ kind: 'regen', power: 5_000 });
  });

  test('at rest every link is idle', () => {
    expect(powerFlows(instant({})).every((flow) => flow.kind === 'idle')).toBe(true);
  });
});

describe('flowWidth', () => {
  test('is proportional to |P|: 20 kW draws 5 px', () => {
    expect(flowWidth(20_000)).toBe(5);
    expect(flowWidth(40_000)).toBe(10);
  });

  test('no power draws nothing, a trickle stays visible and a peak stays inside the node', () => {
    expect(flowWidth(0)).toBe(0);
    expect(flowWidth(100)).toBe(MIN_FLOW_WIDTH);
    expect(flowWidth(1e9)).toBe(MAX_FLOW_WIDTH);
  });
});

describe('drivePhase', () => {
  test('names each regime of the wheels', () => {
    expect(drivePhase(instant({}))).toBe('stopped');
    expect(drivePhase(instant({ v: 5, pWheel: 1_000 }))).toBe('traction');
    expect(drivePhase(instant({ v: 5, pWheel: -1_000, pBrake: 1_000, pRegen: 1_000 }))).toBe(
      'regen',
    );
    expect(
      drivePhase(instant({ v: 5, pWheel: -1_000, pBrake: 1_000, pRegen: 400, pFriction: 600 })),
    ).toBe('blended');
    expect(drivePhase(instant({ v: 5, pWheel: -1_000, pBrake: 1_000, pFriction: 1_000 }))).toBe(
      'friction',
    );
    expect(drivePhase(instant({ v: 5 }))).toBe('coasting');
  });
});

describe('energy series', () => {
  test('ENERGY_SERIES colors the battery green, the friction heat orange-red and the loss cyan', () => {
    const byKey = Object.fromEntries(ENERGY_SERIES.map((s) => [s.key, s.color]));

    expect(byKey.eBattery).toBe('var(--chart-3)');
    expect(byKey.eFriction).toBe('var(--chart-2)');
    expect(byKey.eConversionLoss).toBe('var(--chart-6)');
    expect(new Set(Object.values(byKey)).size).toBe(ENERGY_SERIES.length);
    expect(ENERGY_SERIES.map((s) => s.key)).toEqual([
      'eTraction',
      'eRoadLoad',
      'eBrake',
      'eBattery',
      'eConversionLoss',
      'eFriction',
    ]);
  });

  test('the brake parts add up to the braking at the wheels at any instant', () => {
    for (const t of [0, 115.5, 116, 700.25, 1369]) {
      const at = balanceAt(uddsSteps, uddsDistance, t);
      const parts = BRAKE_PARTS.reduce((sum, key) => sum + at[key], 0);
      expect(parts).toBeCloseTo(at.eBrake, 6);
    }
  });

  test('energySeries thins a cycle to at most maxPoints + 1 points in kWh, keeping both ends', () => {
    const points = energySeries(uddsSteps, 'eBattery', 100);

    expect(points.length).toBeLessThanOrEqual(101);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 1369, y: uddsTotals.battery / J_PER_KWH });
    expect(points.every((p, i) => i === 0 || p.x > points[i - 1].x)).toBe(true);
  });

  test('a short cycle keeps every step', () => {
    expect(energySeries(uddsSteps.slice(0, 10), 'eTraction')).toHaveLength(10);
  });

  test('energyAxisMax rounds the largest final energy up to 0,5 kWh', () => {
    expect(energyAxisMax(uddsSteps)).toBe(2);
    const us06 = cycleBalance(DRIVE_CYCLES.us06.samples, MODEL3_LR_RWD_2025, DEFAULT_REGEN);
    expect(energyAxisMax(us06.steps)).toBe(2.5);
    expect(energyAxisMax(uddsSteps.slice(0, 1))).toBe(0.5);
  });
});

describe('roadPosition', () => {
  test('maps the distance covered onto the road and never leaves it', () => {
    expect(roadPosition(0, 1000, 20, 220)).toBe(20);
    expect(roadPosition(500, 1000, 20, 220)).toBe(120);
    expect(roadPosition(2000, 1000, 20, 220)).toBe(220);
    expect(roadPosition(-1, 1000, 20, 220)).toBe(20);
    expect(roadPosition(10, 0, 20, 220)).toBe(20);
  });
});
