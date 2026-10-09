import { describe, expect, test } from 'vitest';
import { clamp, clampSettings } from './limits';

describe('clamp', () => {
  test('caps a value above the range at the upper bound', () => {
    expect(clamp(5, [0, 3])).toBe(3);
  });
  test('raises a value below the range to the lower bound', () => {
    expect(clamp(-2, [0, 3])).toBe(0);
  });
  test('keeps a value inside the range', () => {
    expect(clamp(2, [0, 3])).toBe(2);
  });
  test('falls back to the lower bound for NaN', () => {
    expect(clamp(NaN, [1, 3])).toBe(1);
  });
  test('falls back to the lower bound for infinities', () => {
    expect(clamp(Infinity, [1, 3])).toBe(1);
    expect(clamp(-Infinity, [1, 3])).toBe(1);
  });
});

describe('clampSettings', () => {
  const limits = { g: [1, 150], v0: [2, 25] } as const;

  test('clamps out-of-range values and lists the clamped keys', () => {
    expect(clampSettings({ g: 500, v0: 8 }, limits)).toEqual({
      values: { g: 150, v0: 8 },
      clamped: ['g'],
    });
  });
  test('reports nothing when every value is inside its range', () => {
    expect(clampSettings({ g: 9.81, v0: 8 }, limits)).toEqual({
      values: { g: 9.81, v0: 8 },
      clamped: [],
    });
  });
  test('lists clamped keys in the key order of the settings object', () => {
    const result = clampSettings({ g: 0, v0: 99 }, limits);
    expect(result.clamped).toEqual(['g', 'v0']);
  });
  test('does not mutate its input and returns a new object', () => {
    const input = { g: 500, v0: 8 };
    const result = clampSettings(input, limits);
    expect(input).toEqual({ g: 500, v0: 8 });
    expect(result.values).not.toBe(input);
  });
});
