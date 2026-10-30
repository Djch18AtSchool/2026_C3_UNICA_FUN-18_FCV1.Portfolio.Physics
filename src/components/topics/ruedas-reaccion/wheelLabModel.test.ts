import { describe, expect, test } from 'vitest';
import { GRAVITY_GRADIENT_6U } from '../../../lib/data/reactionWheels';
import {
  disturbanceReadings,
  disturbanceSeries,
  DISTURBANCE_SPAN,
  DUMP_THRESHOLD,
  dumpingParams,
  maneuverFeasibility,
  maneuverReadings,
  maneuverSeries,
  SECONDS_PER_HOUR,
  type WheelSettings,
} from './wheelLabModel';

const GIRO_90_60: WheelSettings = { mode: 'maniobra', thetaDeg: 90, T: 60, actuator: 'magnetopar' };

describe('maneuverReadings', () => {
  test('90° in 60 s peaks at 30 s: 45°, 3,0 °/s, −969,5 rpm, 19 % of L_max and τ flips sign', () => {
    const first = maneuverReadings(GIRO_90_60, 10);
    const middle = maneuverReadings(GIRO_90_60, 30);

    expect(middle.thetaS).toBeCloseTo(45, 6);
    expect(middle.omegaS).toBeCloseTo(3, 6);
    expect(middle.omegaW).toBeCloseTo(-969.5, 1);
    expect(middle.Lw).toBeCloseTo(-9.6955e-3, 6);
    expect(middle.share).toBeCloseTo(0.1939, 4);
    expect(first.torque).toBeCloseTo(-3.2318e-4, 7);
    expect(maneuverReadings(GIRO_90_60, 40).torque).toBeCloseTo(3.2318e-4, 7);
  });

  test('reports the plan: peak wheel rate signed against θ and the wheel turns, also for −90°', () => {
    const plus = maneuverReadings(GIRO_90_60, 60);
    const minus = maneuverReadings({ ...GIRO_90_60, thetaDeg: -90 }, 60);

    expect(plus.thetaS).toBeCloseTo(90, 6);
    expect(plus.peakOmegaW).toBeCloseTo(-969.5, 1);
    expect(plus.turns).toBeCloseTo(-484.8, 1);
    expect(minus.peakOmegaW).toBeCloseTo(969.5, 1);
    expect(minus.turns).toBeCloseTo(484.8, 1);
  });

  test('T = 8 s (below T_min) stays finite and asks for more than the wheel has', () => {
    const readings = maneuverReadings({ ...GIRO_90_60, T: 8 }, 4);

    for (const value of Object.values(readings)) {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    }
    expect(readings.share).toBeGreaterThan(1);
  });
});

describe('maneuverFeasibility', () => {
  test('90°: T_min 12,06 s by torque and 11,63 s by momentum, so 60 s is feasible and 8 s is not', () => {
    const ok = maneuverFeasibility(GIRO_90_60);
    const tooFast = maneuverFeasibility({ ...GIRO_90_60, T: 8 });

    expect(ok.byTorque).toBeCloseTo(12.06, 2);
    expect(ok.byMomentum).toBeCloseTo(11.63, 2);
    expect(ok.tMin).toBeCloseTo(12.06, 2);
    expect(ok.isFeasible).toBe(true);
    expect(tooFast.isFeasible).toBe(false);
    expect(tooFast.torqueShare).toBeGreaterThan(1);
    expect(tooFast.momentumShare).toBeCloseTo(1.454, 3);
  });

  test('θ = 0 needs no time and is always feasible', () => {
    const still = maneuverFeasibility({ ...GIRO_90_60, thetaDeg: 0, T: 5 });

    expect(still.tMin).toBe(0);
    expect(still.isFeasible).toBe(true);
  });
});

describe('disturbance', () => {
  test('dumps from 80 % (a design choice) to empty, with the magnetorquer or the thruster bound', () => {
    expect(DUMP_THRESHOLD).toBe(0.8);
    expect(dumpingParams('magnetopar')).toMatchObject({ tauDump: 1.2e-5, dumpAt: 0.8, dumpTo: 0 });
    expect(dumpingParams('propulsor').tauDump).toBe(0.008);
    expect(DISTURBANCE_SPAN).toBe(3 * 24 * SECONDS_PER_HOUR);
  });

  test('fills at τ_gg with the body still, reaches 80 % at 48,6 h, then the magnetorquer brings it down', () => {
    const before = disturbanceReadings('magnetopar', 48 * SECONDS_PER_HOUR);
    const dumping = disturbanceReadings('magnetopar', 49 * SECONDS_PER_HOUR);
    const after = disturbanceReadings('magnetopar', 50 * SECONDS_PER_HOUR);

    expect(before.thetaS).toBe(0);
    expect(before.omegaS).toBe(0);
    expect(before.share).toBeCloseTo(0.7896, 3);
    expect(before.dumping).toBe(false);
    expect(before.torque).toBeCloseTo(2.2847e-7, 10);
    expect(before.omegaW).toBeCloseTo((before.Lw / 9.5493e-5) * (60 / (2 * Math.PI)), 0);
    expect(dumping.dumping).toBe(true);
    expect(dumping.share).toBeLessThan(before.share);
    expect(dumping.torque).toBeCloseTo(2.2847e-7 - 1.2e-5, 10);
    expect(after.dumping).toBe(false);
    expect(after.share).toBeLessThan(0.01);
  });

  test('the thruster empties the wheel in seconds', () => {
    const t1 = (0.8 * 0.05) / GRAVITY_GRADIENT_6U.torque;
    expect(disturbanceReadings('propulsor', t1 + 4).dumping).toBe(true);
    expect(disturbanceReadings('propulsor', t1 + 6).dumping).toBe(false);
  });
});

describe('series', () => {
  test('the maneuver plots L_w / L_max (%) as an exact triangle: 0, −19,4 % at T/2, 0', () => {
    const points = maneuverSeries(GIRO_90_60);

    expect(points.map((p) => p.x)).toEqual([0, 30, 60]);
    expect(points[1].y).toBeCloseTo(-19.39, 2);
    expect(points[2].y).toBeCloseTo(0, 9);
  });

  test('the disturbance plot (hours, %) holds every corner of the sawtooth exactly', () => {
    const points = disturbanceSeries('magnetopar');
    const peak = points.find((p) => p.y > 79.999);
    const trough = points.find((p, i) => i > 0 && p.y < 1e-6);

    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1].x).toBe(72);
    expect(peak?.x).toBeCloseTo(48.63, 2);
    expect(trough?.x).toBeCloseTo(48.63 + 0.944, 2);
    expect(points.every((p, i) => i === 0 || p.x > points[i - 1].x)).toBe(true);
  });
});
