import { describe, expect, test } from 'vitest';
import {
  airTime,
  apexHeight,
  designJump,
  eulerStep,
  heightAt,
  timeToApex,
  trajectory,
  type EulerState,
} from './projectile';

describe('vertical projectile', () => {
  test('apex height, time to apex and air time', () => {
    expect(apexHeight(10, 9.81)).toBeCloseTo(5.097, 3);
    expect(timeToApex(10, 9.81)).toBeCloseTo(1.019, 3);
    expect(airTime(10, 9.81)).toBeCloseTo(2.039, 3);
    expect(airTime(10, 9.81, 19.62)).toBeCloseTo(1.74, 3);
  });

  test('heightAt follows v0 t − g t²/2', () => {
    expect(heightAt(10, 10, 1)).toBe(5);
  });

  test('designJump inverts apex height and time to apex', () => {
    expect(designJump(5.097, 1.019)).toEqual({
      g: expect.closeTo(9.81, 1),
      v0: expect.closeTo(10, 1),
    });
  });

  test('rejects non-positive v0 or g', () => {
    expect(() => apexHeight(10, 0)).toThrow(RangeError);
    expect(() => timeToApex(0, 9.81)).toThrow(RangeError);
    expect(() => airTime(10, 9.81, 0)).toThrow(RangeError);
  });

  test('designJump rejects non-positive height or time to apex', () => {
    expect(() => designJump(0, 1)).toThrow(RangeError);
    expect(() => designJump(1, 0)).toThrow(RangeError);
  });
});

describe('trajectory', () => {
  test('samples the whole flight and lands exactly on y = 0', () => {
    const tr = trajectory({ v0: 10, gUp: 9.81, vx: 2 });
    expect(tr).toHaveLength(240);
    expect(tr.at(-1)).toMatchObject({
      y: 0,
      t: expect.closeTo(2.039, 3),
      // Brief listed 4.078 (2 × rounded 2.039); exact vx·t_air = 2 × 20/9.81 = 4.07747 m.
      x: expect.closeTo(4.077, 3),
    });
    expect(Math.max(...tr.map((p) => p.y))).toBeCloseTo(5.097, 2);
  });

  test('handles a slow, long jump (v0 = 25, g = 1)', () => {
    expect(trajectory({ v0: 25, gUp: 1 })).toHaveLength(240);
  });

  test('uses gDown after the apex', () => {
    const tr = trajectory({ v0: 10, gUp: 9.81, gDown: 19.62 }, 3);
    expect(tr[0]).toEqual({ t: 0, x: 0, y: 0, vy: 10 });
    expect(tr[2].t).toBeCloseTo(1.74, 3);
    expect(tr[2].vy).toBeCloseTo(-19.62 * (tr[2].t - 10 / 9.81), 9);
  });

  test('rejects fewer than two points', () => {
    expect(() => trajectory({ v0: 10, gUp: 9.81 }, 1)).toThrow(RangeError);
  });
});

const MAX_EULER_STEPS = 10_000;

describe('eulerStep', () => {
  test('integrates a jump close to the analytic apex and landing time', () => {
    const dt = 1 / 120;
    const g = 9.81;
    let s: EulerState = { t: 0, x: 0, y: 0, vx: 2, vy: 10 };
    let maxY = 0;
    let steps = 0;
    do {
      s = eulerStep(s, g, g, dt);
      maxY = Math.max(maxY, s.y);
      steps++;
    } while (s.y > 0 && steps < MAX_EULER_STEPS);
    expect(s.y).toBeLessThanOrEqual(0);
    expect(Math.abs(maxY - 5.097) / 5.097).toBeLessThan(0.01);
    expect(Math.abs(s.t - 2.039) / 2.039).toBeLessThan(0.02);
  });

  test('is semi-implicit and picks gUp while rising, gDown otherwise', () => {
    const dt = 0.01;
    const rising = eulerStep({ t: 0, x: 0, y: 1, vx: 2, vy: 3 }, 5, 20, dt);
    expect(rising).toEqual({
      t: expect.closeTo(0.01, 12),
      x: expect.closeTo(0.02, 12),
      vy: expect.closeTo(3 - 5 * dt, 12),
      y: expect.closeTo(1 + (3 - 5 * dt) * dt, 12),
      vx: 2,
    });
    const falling = eulerStep({ t: 0, x: 0, y: 1, vx: 0, vy: 0 }, 5, 20, dt);
    expect(falling.vy).toBeCloseTo(-20 * dt, 12);
  });

  test('does not clamp y at the ground', () => {
    const next = eulerStep({ t: 0, x: 0, y: 0, vx: 0, vy: -1 }, 9.81, 9.81, 0.1);
    expect(next.y).toBeLessThan(0);
  });

  test('returns a new object and leaves the input untouched', () => {
    const s = Object.freeze({ t: 0, x: 0, y: 0, vx: 1, vy: 1 });
    expect(eulerStep(s, 9.81, 9.81, 0.01)).not.toBe(s);
    expect(s).toEqual({ t: 0, x: 0, y: 0, vx: 1, vy: 1 });
  });

  test('rejects non-positive dt or gravities', () => {
    const s = { t: 0, x: 0, y: 0, vx: 0, vy: 0 };
    expect(() => eulerStep(s, 9.81, 9.81, 0)).toThrow(RangeError);
    expect(() => eulerStep(s, 0, 9.81, 0.01)).toThrow(RangeError);
    expect(() => eulerStep(s, 9.81, -1, 0.01)).toThrow(RangeError);
  });
});
