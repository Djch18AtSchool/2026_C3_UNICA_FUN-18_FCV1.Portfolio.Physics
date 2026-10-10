import { describe, expect, test } from 'vitest';
import { JUMP_PRESETS } from '../../../lib/data/jumpPresets';
import { computeJump, computeJumpEuler, EULER_DT, JUMP_DEFAULTS, JUMP_LIMITS } from './jumpModel';

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

describe('computeJumpEuler', () => {
  test('a symmetric Earth jump peaks v0·Δt/2 below the analytic apex and lands near 2v0/g', () => {
    // Arrange
    const settings = { v0: 10, g: 9.81, vx: 3, fallMultiplier: 1 };
    const analytic = computeJump(settings);

    // Act
    const euler = computeJumpEuler(settings);

    // Assert
    expect(euler.hMax).toBeCloseTo(analytic.hMax - (10 * EULER_DT) / 2, 2);
    expect(euler.tApex).toBeCloseTo(analytic.tApex, 1);
    expect(euler.tAir).toBeCloseTo(analytic.tAir, 1);
    expect(euler.range).toBeCloseTo(3 * euler.tAir, 9);
  });

  test("Mario's standing jump reaches 3.75, 3.88 and 3.95 m at 30, 60 and 144 frames/s", () => {
    // Arrange: the Super Mario Bros. preset at 16 px = 1 m (the analytic apex is 4.00 m).
    const mario = { v0: 15, g: 28.1, vx: 6, fallMultiplier: 3.5 };

    // Act & Assert
    expect(computeJumpEuler(mario, 1 / 30).hMax).toBeCloseTo(3.75, 2);
    expect(computeJumpEuler(mario, 1 / 60).hMax).toBeCloseTo(3.88, 2);
    expect(computeJumpEuler(mario, 1 / 144).hMax).toBeCloseTo(3.95, 2);
  });

  test('starts at the origin, ends on the ground and keeps time increasing', () => {
    // Act
    const euler = computeJumpEuler({ v0: 13.1, g: 112.5, vx: 11.25, fallMultiplier: 1 });
    const first = euler.points[0];
    const last = euler.points[euler.points.length - 1];

    // Assert
    expect(first).toEqual({ t: 0, x: 0, y: 0, vy: 13.1 });
    expect(last.y).toBe(0);
    expect(last.t).toBe(euler.tAir);
    expect(last.x).toBeCloseTo(euler.range, 9);
    expect(euler.points.every((p, i) => i === 0 || p.t > euler.points[i - 1].t)).toBe(true);
    expect(euler.points.slice(1, -1).every((p) => p.y > 0)).toBe(true);
  });

  test('the fall multiplier shortens the descent like the analytic model', () => {
    const settings = { v0: 10, g: 9.81, vx: 0, fallMultiplier: 2 };

    expect(computeJumpEuler(settings).tAir).toBeCloseTo(computeJump(settings).tAir, 1);
  });

  test('the extreme corner of the limits stays finite (v0 = 25 m/s, g = 1 m/s²)', () => {
    const euler = computeJumpEuler({ v0: 25, g: 1, vx: 12, fallMultiplier: 1 });

    expect(euler.tAir).toBeCloseTo(50, 0);
    expect(euler.points.every((p) => [p.t, p.x, p.y, p.vy].every(Number.isFinite))).toBe(true);
  });
});
