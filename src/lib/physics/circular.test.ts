import { describe, expect, test } from 'vitest';
import {
  centripetalFromOmega,
  centripetalFromSpeed,
  frequency,
  headToFootGradient,
  maxCorneringSpeed,
  omegaToRpm,
  period,
  radiusForGravity,
  rpmForGravity,
  rpmToOmega,
  solveHabitat,
  tangentialSpeed,
} from './circular';

describe('uniform circular motion', () => {
  test('converts rpm to angular speed and back', () => {
    expect(rpmToOmega(2)).toBeCloseTo(0.2094, 4);
    expect(omegaToRpm(rpmToOmega(2))).toBeCloseTo(2, 12);
  });

  test('period, frequency, tangential speed and centripetal acceleration', () => {
    expect(period(rpmToOmega(2))).toBeCloseTo(30, 6);
    expect(frequency(rpmToOmega(2))).toBeCloseTo(1 / 30, 12);
    expect(tangentialSpeed(2, 3)).toBe(6);
    expect(centripetalFromSpeed(6, 3)).toBe(12);
  });

  test('rotating habitat radius and spin rate for a target gravity', () => {
    expect(radiusForGravity(9.81, 2)).toBeCloseTo(223.6, 1);
    expect(rpmForGravity(9.81, 100)).toBeCloseTo(2.99, 2);
  });

  test('Stanford torus (NASA SP-413: R = 830 m, 1 rpm) gives about 0.93 g', () => {
    expect(centripetalFromOmega(rpmToOmega(1), 830) / 9.81).toBeCloseTo(0.93, 2);
  });

  test('head-to-foot gradient and maximum cornering speed', () => {
    expect(headToFootGradient(223.6, 1.8)).toBeCloseTo(0.00805, 5);
    expect(maxCorneringSpeed(1.5, 9.81, 50)).toBeCloseTo(27.1, 1);
  });

  test('solveHabitat summarises the Stanford torus', () => {
    expect(solveHabitat({ r: 830, rpm: 1 })).toMatchObject({
      gRatio: expect.closeTo(0.93, 2),
      period: expect.closeTo(60, 3),
    });
  });

  test('rejects non-positive spin rates and radii', () => {
    expect(() => radiusForGravity(9.81, 0)).toThrow(RangeError);
    expect(() => rpmForGravity(9.81, 0)).toThrow(RangeError);
    expect(() => period(0)).toThrow(RangeError);
    expect(() => solveHabitat({ r: -1, rpm: 1 })).toThrow(RangeError);
  });
});
