import { describe, expect, test } from 'vitest';
import { JUMP_PRESETS } from '../../../lib/data/jumpPresets';
import { computeJump, JUMP_DEFAULTS, JUMP_LIMITS } from './jumpModel';

describe('computeJump', () => {
  test('a symmetric Earth jump at 10 m/s reaches 5.097 m and lands after 2.039 s', () => {
    const result = computeJump({ v0: 10, g: 9.81, vx: 0, fallMultiplier: 1 });

    expect(result.hMax).toBeCloseTo(5.097, 3);
    expect(result.tApex).toBeCloseTo(1.019, 3);
    expect(result.tAir).toBeCloseTo(2.039, 3);
    expect(result.points).toHaveLength(240);
    expect(result.domain.y[0]).toBe(0);
    expect(result.domain.y[1]).toBeCloseTo(5.607, 3);
  });

  test('doubling the fall gravity shortens the air time to 1.740 s', () => {
    const result = computeJump({ v0: 10, g: 9.81, vx: 0, fallMultiplier: 2 });

    expect(result.tAir).toBeCloseTo(1.74, 3);
    expect(result.hMax).toBeCloseTo(5.097, 3);
  });

  test('range is vx times the air time and sets the x domain', () => {
    const result = computeJump({ v0: 10, g: 9.81, vx: 3, fallMultiplier: 1 });

    expect(result.range).toBeCloseTo(3 * 2.0387, 3);
    expect(result.domain.x).toEqual([0, result.range]);
  });

  test('a vertical jump keeps a 1 m wide x domain', () => {
    const result = computeJump({ v0: 10, g: 9.81, vx: 0, fallMultiplier: 1 });

    expect(result.range).toBe(0);
    expect(result.domain.x).toEqual([0, 1]);
  });

  test('the extreme corner of the limits stays finite (v0 = 25 m/s, g = 1 m/s²)', () => {
    const result = computeJump({ v0: 25, g: 1, vx: 0, fallMultiplier: 1 });

    expect(result.hMax).toBeCloseTo(312.5, 6);
    expect(result.points).toHaveLength(240);
    expect(result.points.every((p) => [p.t, p.x, p.y, p.vy].every(Number.isFinite))).toBe(true);
  });

  test('the defaults are the Celeste preset values', () => {
    const celeste = JUMP_PRESETS.find((preset) => preset.id === 'celeste');

    expect(JUMP_DEFAULTS).toEqual(celeste?.values);
    expect(JUMP_DEFAULTS.g).toBe(112.5);
  });

  test('the defaults sit inside the limits', () => {
    for (const key of Object.keys(JUMP_DEFAULTS) as (keyof typeof JUMP_DEFAULTS)[]) {
      const [low, high] = JUMP_LIMITS[key];
      expect(JUMP_DEFAULTS[key]).toBeGreaterThanOrEqual(low);
      expect(JUMP_DEFAULTS[key]).toBeLessThanOrEqual(high);
    }
  });
});
