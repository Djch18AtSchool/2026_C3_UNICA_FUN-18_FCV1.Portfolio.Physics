import { describe, expect, test } from 'vitest';
import { DRONE_ROUTE, generateRoute } from '../../../lib/data/droneRoute';
import {
  chartStep,
  clampStop,
  MAP_DOMAIN,
  stopKeyTarget,
  STOP_BOUNDS,
  timeAxisEnd,
  timeFromPoint,
  trailSamples,
} from './droneScene';

const SAMPLES = generateRoute(DRONE_ROUTE);

describe('map window', () => {
  test('holds every declared stop inside the stop bounds and the bounds inside the map', () => {
    for (const stop of DRONE_ROUTE.stops) {
      expect(stop.x).toBeGreaterThanOrEqual(STOP_BOUNDS.x[0]);
      expect(stop.x).toBeLessThanOrEqual(STOP_BOUNDS.x[1]);
      expect(stop.y).toBeGreaterThanOrEqual(STOP_BOUNDS.y[0]);
      expect(stop.y).toBeLessThanOrEqual(STOP_BOUNDS.y[1]);
    }
    expect(MAP_DOMAIN.x.min).toBeLessThan(STOP_BOUNDS.x[0]);
    expect(MAP_DOMAIN.x.max).toBeGreaterThan(STOP_BOUNDS.x[1]);
    expect(MAP_DOMAIN.y.min).toBeLessThan(STOP_BOUNDS.y[0]);
    expect(MAP_DOMAIN.y.max).toBeGreaterThan(STOP_BOUNDS.y[1]);
  });

  test('clampStop keeps a dragged stop inside the bounds', () => {
    expect(clampStop({ x: -400, y: 5000 })).toEqual({ x: STOP_BOUNDS.x[0], y: STOP_BOUNDS.y[1] });
    expect(clampStop({ x: 512, y: 300 })).toEqual({ x: 512, y: 300 });
  });
});

describe('stopKeyTarget', () => {
  test('arrows move 10 m, with Shift 100 m; other keys are ignored', () => {
    const at = { x: 600, y: 200 };

    expect(stopKeyTarget('ArrowRight', false, at)).toEqual({ x: 610, y: 200 });
    expect(stopKeyTarget('ArrowUp', false, at)).toEqual({ x: 600, y: 210 });
    expect(stopKeyTarget('ArrowLeft', true, at)).toEqual({ x: 500, y: 200 });
    expect(stopKeyTarget('ArrowDown', true, at)).toEqual({ x: 600, y: 100 });
    expect(stopKeyTarget('Enter', false, at)).toBeUndefined();
  });

  test('never leaves the stop bounds', () => {
    expect(stopKeyTarget('ArrowDown', true, { x: 300, y: 0 })).toEqual({ x: 300, y: 0 });
  });
});

describe('timeFromPoint', () => {
  test('returns the t of the sample nearest the point', () => {
    const target = SAMPLES[1000];

    expect(timeFromPoint(SAMPLES, target.x + 0.001, target.y)).toBeCloseTo(target.t, 6);
  });

  test('over a stop it returns the first instant there (the arrival)', () => {
    const t = timeFromPoint(SAMPLES, 600, 200);
    const arrival = SAMPLES.find((s) => s.x === 600 && s.y === 200);

    expect(t).toBe(arrival?.t);
  });
});

describe('chartStep and trailSamples', () => {
  test('the declared route is charted every 0,5 s (one sample in five)', () => {
    expect(chartStep(SAMPLES.length)).toBe(5);
  });

  test('a long edited route is thinned to about 800 chart points', () => {
    expect(Math.ceil(31760 / chartStep(31760))).toBeLessThanOrEqual(800);
  });

  test('the trail runs through samples before t and ends exactly at the drone', () => {
    const now = { ...SAMPLES[650], t: 65.03, x: 1, y: 2 };
    const trail = trailSamples(SAMPLES, now);

    expect(trail[0]).toEqual({ x: 0, y: 0 });
    expect(trail.at(-1)).toEqual({ x: 1, y: 2 });
    expect(trail.length).toBeLessThan(660);
  });
});

describe('timeAxisEnd', () => {
  test('rounds the duration up to a round tick', () => {
    expect(timeAxisEnd(387.4)).toBe(400);
    expect(timeAxisEnd(3176)).toBe(3500);
    expect(timeAxisEnd(92)).toBe(95);
  });
});
