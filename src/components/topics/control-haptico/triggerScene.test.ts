import { describe, expect, test } from 'vitest';
import { criticalDamping } from '../../../lib/physics';
import {
  advanceRelease,
  dampingRatio,
  leverAngle,
  MAX_RELEASE_S,
  releaseParams,
  RELEASE_DT,
  SLOW_MOTION,
  startRelease,
  TRIGGER_MASS_KG,
  TRIGGER_PRESETS,
  triggerKeyTarget,
  triggerPresetIdFor,
  triggerReadings,
  xFromLever,
  xFromPointer,
} from './triggerScene';

const TRAVEL_MM = 8;
const MAX_ANGLE_DEG = 24;
const FRAME_S = 1 / 60;

/** Runs frames of `frameS` until the release ends or `limitS` passes; returns the final state. */
function runRelease(xMm: number, k: number, ratio = 1, frameS = FRAME_S, limitS = 5) {
  const params = releaseParams(k, ratio);
  let release = startRelease(xMm);
  let frames = 0;
  while (!release.isDone && frames * frameS < limitS) {
    release = advanceRelease(release, frameS, params);
    frames++;
  }
  return { release, frames };
}

describe('leverAngle and xFromLever', () => {
  test('map the travel linearly onto the lever angle', () => {
    expect(leverAngle(0, TRAVEL_MM, MAX_ANGLE_DEG)).toBe(0);
    expect(leverAngle(4, TRAVEL_MM, MAX_ANGLE_DEG)).toBe(12);
    expect(leverAngle(8, TRAVEL_MM, MAX_ANGLE_DEG)).toBe(24);
    expect(xFromLever(6, TRAVEL_MM, MAX_ANGLE_DEG)).toBe(2);
  });

  test('are inverses of each other', () => {
    for (const x of [0, 0.5, 3, 7.9, 8, -1.2]) {
      expect(
        xFromLever(leverAngle(x, TRAVEL_MM, MAX_ANGLE_DEG), TRAVEL_MM, MAX_ANGLE_DEG),
      ).toBeCloseTo(x, 12);
    }
    for (const angle of [0, 5, 13.7, 24]) {
      expect(
        leverAngle(xFromLever(angle, TRAVEL_MM, MAX_ANGLE_DEG), TRAVEL_MM, MAX_ANGLE_DEG),
      ).toBeCloseTo(angle, 12);
    }
  });

  test('reject a travel or a maximum angle that is not positive', () => {
    expect(() => leverAngle(1, 0, MAX_ANGLE_DEG)).toThrow(RangeError);
    expect(() => xFromLever(1, TRAVEL_MM, -5)).toThrow(RangeError);
  });
});

describe('releaseParams', () => {
  test('uses a 20 g lever and critical damping by default', () => {
    const params = releaseParams(400);

    expect(params.k).toBe(400);
    expect(params.m).toBe(TRIGGER_MASS_KG);
    expect(TRIGGER_MASS_KG).toBe(0.02);
    expect(params.c).toBeCloseTo(5.657, 3);
    expect(params.c).toBe(criticalDamping(400, 0.02));
  });

  test('scales the damping by the given ratio of the critical value', () => {
    expect(releaseParams(400, 0.3).c).toBeCloseTo(0.3 * 5.657, 3);
  });

  test('the damping setting picks the ratio: 1 for crítica, 0,3 for subamortiguada', () => {
    expect(dampingRatio('critica')).toBe(1);
    expect(dampingRatio('subamortiguada')).toBe(0.3);
  });
});

describe('advanceRelease', () => {
  /** Runs a release frame by frame, recording the lowest x it ever reaches. */
  function releaseFrom(xMm: number, k: number, ratio = 1) {
    const params = releaseParams(k, ratio);
    let release = startRelease(xMm);
    let lowest = Infinity;
    while (!release.isDone) {
      release = advanceRelease(release, FRAME_S, params);
      lowest = Math.min(lowest, release.state.x);
    }
    return { release, lowest };
  }

  test('starts at rest velocity from the released displacement, in metres', () => {
    expect(startRelease(8)).toEqual({
      state: { x: 0.008, v: 0 },
      elapsed: 0,
      carry: 0,
      isDone: false,
    });
  });

  test('integrates finely enough: ω₀·dt ≤ 0,04 at k = 600 with critical damping', () => {
    const omega = Math.sqrt(600 / TRIGGER_MASS_KG);

    expect(RELEASE_DT).toBe(1 / 4800);
    expect(omega * RELEASE_DT).toBeLessThanOrEqual(0.04);
  });

  test('the first sub-steps track the analytic critically damped return within 3 %', () => {
    const params = releaseParams(400);
    const omega = Math.sqrt(400 / TRIGGER_MASS_KG);
    let release = startRelease(8);
    for (let step = 1; step <= 96; step++) {
      release = advanceRelease(release, RELEASE_DT * SLOW_MOTION, params);
      const t = step * RELEASE_DT;
      const analytic = 0.008 * (1 + omega * t) * Math.exp(-omega * t);
      expect(release.elapsed).toBeCloseTo(t, 12);
      expect(Math.abs(release.state.x - analytic) / analytic).toBeLessThan(0.03);
    }
  });

  test('brings a critically damped lever from 8 mm to rest, never below x = 0', () => {
    const { release, lowest } = releaseFrom(8, 400);

    expect(release.state).toEqual({ x: 0, v: 0 });
    expect(release.elapsed).toBeLessThan(0.2);
    expect(lowest).toBeGreaterThanOrEqual(0);
  });

  test('an underdamped lever stops at the rest stop, never below 0, sooner than a critical one', () => {
    for (const k of [50, 400, 600]) {
      const critical = releaseFrom(8, k);
      const underdamped = releaseFrom(8, k, 0.3);

      expect(underdamped.lowest).toBeGreaterThanOrEqual(0);
      expect(underdamped.release.state).toEqual({ x: 0, v: 0 });
      expect(underdamped.release.elapsed).toBeLessThan(critical.release.elapsed);
    }
  });

  test('plays 10 times slower than real: whole steps of 1/4800 s, the remainder carried', () => {
    const params = releaseParams(400);
    const once = advanceRelease(startRelease(8), 2.5 * RELEASE_DT * SLOW_MOTION, params);

    expect(SLOW_MOTION).toBe(10);
    expect(once.elapsed).toBeCloseTo(2 * RELEASE_DT, 12);
    expect(once.carry).toBeCloseTo(0.5 * RELEASE_DT, 12);
    const twice = advanceRelease(once, 0.5 * RELEASE_DT * SLOW_MOTION, params);
    expect(twice.elapsed).toBeCloseTo(3 * RELEASE_DT, 12);
    expect(twice.carry).toBeCloseTo(0, 12);
  });

  test('a long frame (a background tab) adds at most 50 ms of displayed time', () => {
    const release = advanceRelease(startRelease(8), 2, releaseParams(50, 0.3));

    expect(release.elapsed * SLOW_MOTION).toBeLessThanOrEqual(0.05 + 1e-9);
  });

  test('stops after 3 s of displayed time even when the lever never reaches rest', () => {
    const stuck = { k: 0, m: TRIGGER_MASS_KG, c: 0 };
    let release = startRelease(8);
    while (!release.isDone) release = advanceRelease(release, FRAME_S, stuck);

    expect(release.elapsed * SLOW_MOTION).toBeCloseTo(MAX_RELEASE_S, 6);
    expect(release.state).toEqual({ x: 0, v: 0 });
  });

  test('every displayed release from the travel ends within 3 s', () => {
    for (const k of [50, 400, 600]) {
      for (const ratio of [1, 0.3]) {
        const { release } = releaseFrom(8, k, ratio);
        expect(release.elapsed * SLOW_MOTION).toBeLessThan(MAX_RELEASE_S);
      }
    }
  });

  test('a finished release stays as it is', () => {
    const { release } = runRelease(8, 400);

    expect(advanceRelease(release, FRAME_S, releaseParams(400))).toBe(release);
  });

  test('a release from rest ends at once', () => {
    const { release, frames } = runRelease(0, 400);

    expect(release.isDone).toBe(true);
    expect(frames).toBe(1);
  });
});

describe('triggerReadings', () => {
  test('at 8 mm with k = 400 N/m and x₀ = 0: 3,2 N and 12,8 mJ', () => {
    const readings = triggerReadings({ k: 400, x0Mm: 0 }, 8);

    expect(readings.force).toBeCloseTo(3.2, 12);
    expect(readings.hooke).toBeCloseTo(3.2, 12);
    expect(readings.energy).toBeCloseTo(12.8, 12);
    expect(readings.work).toBeCloseTo(12.8, 12);
  });

  test('with x₀ = 3 mm the trigger gives 2,0 N and 5,0 mJ of finger work at the bottom', () => {
    const readings = triggerReadings({ k: 400, x0Mm: 3 }, 8);

    expect(readings.force).toBeCloseTo(2, 12);
    expect(readings.hooke).toBeCloseTo(3.2, 12);
    expect(readings.energy).toBeCloseTo(12.8, 12);
    expect(readings.work).toBeCloseTo(5, 12);
  });

  test('before x₀ the trigger pushes nothing', () => {
    expect(triggerReadings({ k: 400, x0Mm: 3 }, 2)).toMatchObject({ force: 0, work: 0 });
  });
});

describe('xFromPointer', () => {
  const pivot = { x: 100, y: 100 };
  const restDeg = -12;

  test('reads the travel from the pointer angle about the pivot', () => {
    const at = (deg: number) => ({
      x: pivot.x + 200 * Math.cos((deg * Math.PI) / 180),
      y: pivot.y + 200 * Math.sin((deg * Math.PI) / 180),
    });

    expect(xFromPointer(at(-12), pivot, restDeg, TRAVEL_MM, MAX_ANGLE_DEG)).toBeCloseTo(0, 9);
    expect(xFromPointer(at(0), pivot, restDeg, TRAVEL_MM, MAX_ANGLE_DEG)).toBeCloseTo(4, 9);
    expect(xFromPointer(at(12), pivot, restDeg, TRAVEL_MM, MAX_ANGLE_DEG)).toBeCloseTo(8, 9);
  });

  test('clamps to the travel', () => {
    expect(xFromPointer({ x: 300, y: -500 }, pivot, restDeg, TRAVEL_MM, MAX_ANGLE_DEG)).toBe(0);
    expect(xFromPointer({ x: 110, y: 400 }, pivot, restDeg, TRAVEL_MM, MAX_ANGLE_DEG)).toBe(8);
  });
});

describe('triggerKeyTarget', () => {
  test('arrows move 0,1 mm, Shift or Page keys 1 mm, Home and End to the ends', () => {
    expect(triggerKeyTarget('ArrowRight', false, 3)).toBe(3.1);
    expect(triggerKeyTarget('ArrowUp', false, 3)).toBe(3.1);
    expect(triggerKeyTarget('ArrowLeft', false, 3)).toBe(2.9);
    expect(triggerKeyTarget('ArrowDown', true, 3)).toBe(2);
    expect(triggerKeyTarget('PageUp', false, 3)).toBe(4);
    expect(triggerKeyTarget('PageDown', false, 3)).toBe(2);
    expect(triggerKeyTarget('Home', false, 3)).toBe(0);
    expect(triggerKeyTarget('End', false, 3)).toBe(8);
  });

  test('stays inside the travel and on the 0,1 mm grid', () => {
    expect(triggerKeyTarget('ArrowRight', true, 7.5)).toBe(8);
    expect(triggerKeyTarget('ArrowLeft', false, 0)).toBe(0);
    expect(triggerKeyTarget('ArrowRight', false, 0.2)).toBe(0.3);
    expect(triggerKeyTarget('ArrowRight', false, 2.34)).toBe(2.4);
  });

  test('other keys do nothing', () => {
    expect(triggerKeyTarget('Enter', false, 3)).toBeUndefined();
  });
});

describe('trigger presets', () => {
  test("are the text's examples: ideal spring, x₀ = 3 mm and 0,3 of the critical damping", () => {
    expect(TRIGGER_PRESETS.map(({ name, values }) => [name, values])).toEqual([
      ['Resorte ideal', { k: 400, x0Mm: 0, damping: 'critica' }],
      ['Gatillo DualSense', { k: 400, x0Mm: 3, damping: 'critica' }],
      ['Subamortiguado', { k: 400, x0Mm: 0, damping: 'subamortiguada' }],
    ]);
    expect(dampingRatio('subamortiguada')).toBe(0.3);
  });

  test('at the bottom, the DualSense example gives 2,0 N and 5,0 mJ of finger work', () => {
    const { k, x0Mm } = TRIGGER_PRESETS[1].values;
    const readings = triggerReadings({ k, x0Mm }, TRAVEL_MM);

    expect(readings.force).toBeCloseTo(2, 10);
    expect(readings.work).toBeCloseTo(5, 10);
  });

  test('triggerPresetIdFor names the matching preset, or none', () => {
    expect(triggerPresetIdFor({ k: 400, x0Mm: 3, damping: 'critica' })).toBe('dualsense');
    expect(triggerPresetIdFor({ k: 410, x0Mm: 3, damping: 'critica' })).toBeUndefined();
  });
});
