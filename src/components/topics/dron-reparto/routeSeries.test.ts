import { describe, expect, test } from 'vitest';
import { DRONE_ROUTE, generateRoute, type RouteSample } from '../../../lib/data/droneRoute';
import {
  decimate,
  distanceSeries,
  dwellWindows,
  indexBefore,
  interpolateAt,
  motionPhase,
} from './routeSeries';

const SAMPLES = generateRoute(DRONE_ROUTE);
const LEG_LENGTHS = [Math.hypot(600, 200), Math.hypot(300, 600), Math.hypot(600, 300)];
const ROUTE_LENGTH = LEG_LENGTHS.reduce((sum, d) => sum + d, 0) + Math.hypot(300, 1100);

function sample(overrides: Partial<RouteSample>): RouteSample {
  return { t: 0, x: 0, y: 0, vx: 0, vy: 0, speed: 0, ax: 0, ay: 0, accel: 0, ...overrides };
}

describe('decimate', () => {
  test('keeps every nth sample and always the last one', () => {
    expect(decimate([0, 1, 2, 3, 4, 5, 6], 3)).toEqual([0, 3, 6]);
    expect(decimate([0, 1, 2, 3, 4, 5, 6, 7], 3)).toEqual([0, 3, 6, 7]);
  });

  test('turns the 0.1 s route into one sample every 0.5 s', () => {
    const coarse = decimate(SAMPLES, 5);

    expect(coarse[1].t).toBeCloseTo(0.5, 9);
    expect(coarse[coarse.length - 1]).toBe(SAMPLES[SAMPLES.length - 1]);
    coarse.slice(0, -1).forEach((row, i) => expect(row.t).toBeCloseTo(i * 0.5, 9));
  });

  test('rejects a step below 1', () => {
    expect(() => decimate([1, 2], 0)).toThrow(RangeError);
  });
});

describe('distanceSeries', () => {
  test('integrates the speed into the 3 114 m of the route while the displacement returns to 0', () => {
    const series = distanceSeries(SAMPLES);
    const last = series[series.length - 1];

    expect(series[0]).toEqual({ t: 0, distance: 0, displacement: 0 });
    expect(last.distance).toBeCloseTo(ROUTE_LENGTH, 1);
    expect(last.displacement).toBeCloseTo(0, 6);
  });

  test('reaches the length of the first leg when the drone lands at A', () => {
    const atA = distanceSeries(SAMPLES).find((row) => row.t === 80)!;

    expect(atA.distance).toBeCloseTo(LEG_LENGTHS[0], 1);
    expect(atA.displacement).toBeCloseTo(LEG_LENGTHS[0], 6);
  });
});

describe('dwellWindows', () => {
  test('finds the three 20 s stops and names them after the nearest stop', () => {
    const windows = dwellWindows(SAMPLES, DRONE_ROUTE.stops);

    expect(windows.map((w) => w.label)).toEqual(['A', 'B', 'C']);
    windows.forEach((w) => expect(w.to - w.from).toBeCloseTo(20, 0));
  });
});

describe('motionPhase', () => {
  test('tells apart accelerating, cruising, braking and hovering', () => {
    expect(motionPhase(sample({ ax: 2.5, accel: 2.5 }))).toBe('acelerando');
    expect(motionPhase(sample({ vx: 5, speed: 5, ax: 2.5, accel: 2.5 }))).toBe('acelerando');
    expect(motionPhase(sample({ vx: 10, speed: 10 }))).toBe('crucero');
    expect(motionPhase(sample({ vx: 5, speed: 5, ax: -2.5, accel: 2.5 }))).toBe('frenando');
    expect(motionPhase(sample({}))).toBe('detenido');
  });
});

describe('indexBefore', () => {
  const TIMES = [0, 0.5, 1, 1.5, 2];

  test('finds the last sample at or before t', () => {
    expect(indexBefore(TIMES, 0.6)).toBe(1);
    expect(indexBefore(TIMES, 1)).toBe(2);
    expect(indexBefore(TIMES, 1.49)).toBe(2);
    expect(indexBefore(TIMES, 2)).toBe(4);
  });

  test('returns the first index below the range and the last one past it', () => {
    expect(indexBefore(TIMES, -3)).toBe(0);
    expect(indexBefore(TIMES, 9)).toBe(4);
  });

  test('takes a time accessor for sampled objects', () => {
    expect(indexBefore(SAMPLES, 65.05, (s) => s.t)).toBe(650);
    expect(SAMPLES[indexBefore(SAMPLES, 65.05, (s) => s.t)].t).toBeCloseTo(65, 9);
  });

  test('rejects an empty list', () => {
    expect(() => indexBefore([], 1)).toThrow(RangeError);
  });
});

describe('interpolateAt', () => {
  const TIMES = [0, 1, 2];
  const VALUES = [0, 10, 0];

  test('is linear between samples and exact on them', () => {
    expect(interpolateAt(TIMES, VALUES, 0.25)).toBeCloseTo(2.5, 9);
    expect(interpolateAt(TIMES, VALUES, 1)).toBe(10);
    expect(interpolateAt(TIMES, VALUES, 1.5)).toBeCloseTo(5, 9);
  });

  test('clamps t to the sampled range', () => {
    expect(interpolateAt(TIMES, VALUES, -1)).toBe(0);
    expect(interpolateAt(TIMES, VALUES, 2)).toBe(0);
    expect(interpolateAt(TIMES, VALUES, 7)).toBe(0);
  });

  test('matches the laboratory sample on the route: x at t = 116,23 s', () => {
    const times = SAMPLES.map((s) => s.t);
    const xs = SAMPLES.map((s) => s.x);
    const before = SAMPLES[1162];
    const after = SAMPLES[1163];
    const expected = before.x + (after.x - before.x) * 0.3;

    expect(interpolateAt(times, xs, 116.23)).toBeCloseTo(expected, 6);
  });

  test('rejects mismatched lengths', () => {
    expect(() => interpolateAt([0, 1], [0], 0.5)).toThrow(RangeError);
  });
});
