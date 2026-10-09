import { describe, expect, test } from 'vitest';
import { elasticEnergy, forceCurve, hookeForce, piecewiseResistance } from './spring';

describe('spring', () => {
  test('Hooke force opposes the displacement', () => {
    expect(hookeForce(150, -0.08)).toBeCloseTo(12, 6);
  });

  test('elastic energy is k x²/2', () => {
    expect(elasticEnergy(150, -0.08)).toBeCloseTo(0.48, 6);
  });

  test('piecewise resistance is zero before the start point and linear after it', () => {
    expect(piecewiseResistance(0.002, 0.003, 400)).toBe(0);
    expect(piecewiseResistance(0.005, 0.003, 400)).toBeCloseTo(0.8, 6);
  });

  test('forceCurve samples steps + 1 points from 0 to xMax', () => {
    const curve = forceCurve((x) => 2 * x, 1, 4);
    expect(curve).toHaveLength(5);
    expect(curve[0]).toEqual({ x: 0, f: 0 });
    expect(curve.at(-1)).toEqual({ x: 1, f: 2 });
  });

  test('forceCurve rejects a non-positive or non-integer step count', () => {
    expect(() => forceCurve((x) => x, 1, 0)).toThrow(RangeError);
    expect(() => forceCurve((x) => x, 1, 2.5)).toThrow(RangeError);
  });
});
