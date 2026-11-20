import { describe, expect, test } from 'vitest';
import { seededRandom } from './random';

describe('seededRandom (mulberry32)', () => {
  test('the same seed gives the same sequence; another seed, another one', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const c = seededRandom(8);
    const first = Array.from({ length: 5 }, () => a());

    expect(Array.from({ length: 5 }, () => b())).toEqual(first);
    expect(Array.from({ length: 5 }, () => c())).not.toEqual(first);
  });

  test('draws are uniform in [0, 1): mean ≈ 1/2 and variance ≈ 1/12 over 20 000 draws', () => {
    const random = seededRandom(12);
    const draws = Array.from({ length: 20_000 }, () => random());
    const mean = draws.reduce((sum, x) => sum + x, 0) / draws.length;
    const variance = draws.reduce((sum, x) => sum + (x - mean) ** 2, 0) / draws.length;

    expect(draws.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(mean).toBeCloseTo(0.5, 2);
    expect(variance).toBeCloseTo(1 / 12, 2);
  });

  test('rejects a seed that is not an integer', () => {
    expect(() => seededRandom(1.5)).toThrow(RangeError);
    expect(() => seededRandom(Number.NaN)).toThrow(RangeError);
  });
});
