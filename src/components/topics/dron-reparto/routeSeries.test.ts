import { describe, expect, test } from 'vitest';
import { DRONE_ROUTE, generateRoute, type RouteSample } from '../../../lib/data/droneRoute';
import { decimate, distanceSeries, dwellWindows, motionPhase, sampleAt } from './routeSeries';

const SAMPLES = generateRoute(DRONE_ROUTE);
const DT = DRONE_ROUTE.dt;
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

describe('sampleAt', () => {
  test('returns the sample on the grid nearest to t, clamped to the route', () => {
    expect(sampleAt(SAMPLES, 30, DT).t).toBe(30);
    expect(sampleAt(SAMPLES, 30.04, DT).t).toBe(30);
    expect(sampleAt(SAMPLES, -5, DT)).toBe(SAMPLES[0]);
    expect(sampleAt(SAMPLES, 1e6, DT)).toBe(SAMPLES[SAMPLES.length - 1]);
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
