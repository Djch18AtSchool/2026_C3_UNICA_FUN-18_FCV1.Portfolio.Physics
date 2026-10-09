import { describe, expect, test } from 'vitest';
import { airTime, apexHeight, designJump, heightAt, timeToApex, trajectory } from './projectile';

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
