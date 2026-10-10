import { describe, expect, test } from 'vitest';
import { linearScale } from '../../lab/plotScales';
import { computeJump, JUMP_LIMITS, type JumpSettings } from './jumpModel';
import {
  handleFromSettings,
  launchLengthPerMs,
  sceneDomains,
  settingsFromHandle,
  stateAt,
  timeFromMarkerDrag,
} from './jumpScene';

/** 10 m on both axes over 500 × 400 px; y grows upwards, as in the plot. */
const SCALES = {
  x: linearScale({ min: 0, max: 10 }, [0, 500]),
  y: linearScale({ min: 0, max: 10 }, [400, 0]),
};
const LENGTH_PER_MS = 0.5;
const SETTINGS: JumpSettings = { v0: 10, g: 9.81, vx: 4, fallMultiplier: 1 };

describe('handleFromSettings', () => {
  test('puts the tip of v0 = (vx, v0) at (vx, v0) · lengthPerMs metres from the origin', () => {
    // Act
    const tip = handleFromSettings(SETTINGS, SCALES, LENGTH_PER_MS);

    // Assert: (4, 10) m/s · 0.5 m per m/s = (2, 5) m → (100, 200) px.
    expect(tip.x).toBeCloseTo(100, 9);
    expect(tip.y).toBeCloseTo(200, 9);
  });
});

describe('settingsFromHandle', () => {
  test('is the inverse of handleFromSettings inside the limits', () => {
    for (const settings of [SETTINGS, { ...SETTINGS, v0: 2.5, vx: 0 }, { ...SETTINGS, v0: 18 }]) {
      // Arrange
      const tip = handleFromSettings(settings, SCALES, LENGTH_PER_MS);

      // Act
      const back = settingsFromHandle(tip, SCALES, LENGTH_PER_MS, JUMP_LIMITS);

      // Assert
      expect(back.v0).toBeCloseTo(settings.v0, 9);
      expect(back.vx).toBeCloseTo(settings.vx, 9);
    }
  });

  test('clamps v0 and vx to JUMP_LIMITS', () => {
    // Act: far up and to the right, then below the ground and left of the origin.
    const high = settingsFromHandle({ x: 5000, y: -5000 }, SCALES, LENGTH_PER_MS, JUMP_LIMITS);
    const low = settingsFromHandle({ x: -50, y: 900 }, SCALES, LENGTH_PER_MS, JUMP_LIMITS);

    // Assert
    expect(high).toEqual({ v0: JUMP_LIMITS.v0[1], vx: JUMP_LIMITS.vx[1] });
    expect(low).toEqual({ v0: JUMP_LIMITS.v0[0], vx: JUMP_LIMITS.vx[0] });
  });

  test('returns only v0 and vx, so g and the fall multiplier stay with the caller', () => {
    expect(
      Object.keys(settingsFromHandle({ x: 100, y: 200 }, SCALES, 0.5, JUMP_LIMITS)).sort(),
    ).toEqual(['v0', 'vx']);
  });
});

describe('timeFromMarkerDrag', () => {
  const result = computeJump({ v0: 10, g: 9.81, vx: 3, fallMultiplier: 1 });

  test('returns the t of the sample whose x is nearest the pointer', () => {
    // Arrange: a pointer 1 px to the right of sample 100.
    const sample = result.points[100];
    const pointerX = SCALES.x.toPx(sample.x) + 1e-3;

    // Act & Assert
    expect(timeFromMarkerDrag(pointerX, SCALES.x, result)).toBe(sample.t);
  });

  test('stays within [0, tAir] past either end of the jump', () => {
    expect(timeFromMarkerDrag(-100, SCALES.x, result)).toBe(0);
    expect(timeFromMarkerDrag(10_000, SCALES.x, result)).toBe(result.tAir);
  });
});

describe('stateAt', () => {
  const settings = { v0: 10, g: 9.81, vx: 3, fallMultiplier: 2 };
  const result = computeJump(settings);

  test('starts at the origin with the launch velocity and peaks at the apex', () => {
    expect(stateAt(result, 0)).toEqual({ t: 0, x: 0, y: 0, vy: 10 });
    const apex = stateAt(result, result.tApex);
    expect(apex.y).toBeCloseTo(result.hMax, 3);
    expect(apex.vy).toBeCloseTo(0, 1);
    expect(apex.x).toBeCloseTo(3 * result.tApex, 9);
  });

  test('interpolates between samples and clamps t to the flight', () => {
    // Arrange: halfway between samples 10 and 11.
    const [a, b] = [result.points[10], result.points[11]];

    // Act
    const mid = stateAt(result, (a.t + b.t) / 2);

    // Assert
    expect(mid.x).toBeCloseTo((a.x + b.x) / 2, 9);
    expect(mid.y).toBeCloseTo((a.y + b.y) / 2, 9);
    expect(stateAt(result, -1)).toEqual(stateAt(result, 0));
    expect(stateAt(result, result.tAir + 5).y).toBe(0);
    expect(stateAt(result, result.tAir + 5).t).toBe(result.tAir);
  });
});

describe('sceneDomains', () => {
  test('frames the farthest range and the highest apex, the ground just above the bottom', () => {
    // Arrange: an Earth jump ~ 6.1 m long and 5.1 m high.
    const earth = computeJump({ v0: 10, g: 9.81, vx: 3, fallMultiplier: 1 });

    // Act
    const { x, y } = sceneDomains([earth]);

    // Assert: a 4 % sliver below y = 0 keeps a marker on the ground inside the plot's clip.
    expect(y.min).toBeCloseTo(-0.04 * (y.max - y.min), 9);
    expect(y.max).toBeGreaterThan(earth.hMax);
    expect(x.min).toBeLessThan(0);
    expect(x.max).toBeGreaterThan(earth.range);
  });

  test('takes the union of several jumps', () => {
    const small = computeJump({ v0: 5, g: 9.81, vx: 2, fallMultiplier: 1 });
    const big = computeJump({ v0: 12, g: 9.81, vx: 6, fallMultiplier: 1 });

    const both = sceneDomains([small, big]);

    expect(both).toEqual(sceneDomains([big]));
  });

  test('keeps the height between 0.5 and 1.5 times the width by growing up or right', () => {
    // A flat, long jump and a vertical one.
    const flat = sceneDomains([computeJump({ v0: 2, g: 9.81, vx: 12, fallMultiplier: 1 })]);
    const tall = sceneDomains([computeJump({ v0: 20, g: 9.81, vx: 0, fallMultiplier: 1 })]);
    const ratio = (d: typeof flat) => (d.y.max - d.y.min) / (d.x.max - d.x.min);

    expect(ratio(flat)).toBeCloseTo(0.5, 9);
    expect(ratio(tall)).toBeCloseTo(1.5, 9);
    expect(flat.y.min).toBeLessThan(0);
    expect(tall.y.min).toBeLessThan(0);
  });
});

describe('launchLengthPerMs', () => {
  test('draws the largest v0 at half the height of the y domain', () => {
    const lengthPerMs = launchLengthPerMs({ min: 0, max: 8 }, JUMP_LIMITS);

    expect(JUMP_LIMITS.v0[1] * lengthPerMs).toBeCloseTo(4, 9);
  });
});
