import { describe, expect, test } from 'vitest';
import { derivativeSeries, trapezoidalProfile, vec } from '../physics';
import { DRONE_ROUTE, generateRoute, routeDuration, type RouteDefinition } from './droneRoute';

const SAMPLES = generateRoute(DRONE_ROUTE);
const TOLERANCE = 1e-9;
const FIRST_LEG = trapezoidalProfile(Math.hypot(600, 200), 10, 2.5);
const DWELL_A = 20;

describe('DRONE_ROUTE', () => {
  test('declares the delivery route with the ArduPilot Copter 4.6.3 limits', () => {
    expect(DRONE_ROUTE.stops.map(({ name, x, y, dwell }) => [name, x, y, dwell])).toEqual([
      ['Depósito', 0, 0, 0],
      ['A', 600, 200, 20],
      ['B', 900, 800, 20],
      ['C', 300, 1100, 20],
      ['Depósito', 0, 0, 0],
    ]);
    expect(DRONE_ROUTE.vMax).toBe(10);
    expect(DRONE_ROUTE.aMax).toBe(2.5);
    expect(DRONE_ROUTE.dt).toBe(0.1);
  });
});

describe('routeDuration', () => {
  test('adds the four trapezoidal legs and the 60 s of dwells: 387.4 s', () => {
    expect(routeDuration(DRONE_ROUTE)).toBeCloseTo(387.4, 1);
  });

  test('rejects a route with fewer than two stops', () => {
    const route: RouteDefinition = { ...DRONE_ROUTE, stops: DRONE_ROUTE.stops.slice(0, 1) };

    expect(() => routeDuration(route)).toThrow(RangeError);
  });

  test('rejects a negative dwell', () => {
    const stops = DRONE_ROUTE.stops.map((stop, i) => (i === 1 ? { ...stop, dwell: -1 } : stop));

    expect(() => routeDuration({ ...DRONE_ROUTE, stops })).toThrow(RangeError);
  });
});

describe('generateRoute', () => {
  test('starts and ends at the depot, at rest', () => {
    const first = SAMPLES[0];
    const last = SAMPLES[SAMPLES.length - 1];

    expect([first.t, first.x, first.y, first.speed]).toEqual([0, 0, 0, 0]);
    expect(last.x).toBeCloseTo(0, 6);
    expect(last.y).toBeCloseTo(0, 6);
    expect(last.speed).toBe(0);
  });

  test('samples t every 0.1 s up to the end of the route (3 874 ± 2 samples)', () => {
    SAMPLES.slice(1).forEach((sample, i) => {
      expect(sample.t - SAMPLES[i].t).toBeCloseTo(0.1, 9);
    });
    expect(Math.abs(SAMPLES.length - 3874)).toBeLessThanOrEqual(2);
    expect(SAMPLES[SAMPLES.length - 1].t).toBeGreaterThanOrEqual(routeDuration(DRONE_ROUTE));
  });

  test('never exceeds vMax nor aMax', () => {
    expect(Math.max(...SAMPLES.map((s) => s.speed))).toBeLessThanOrEqual(10 + TOLERANCE);
    expect(Math.max(...SAMPLES.map((s) => s.accel))).toBeLessThanOrEqual(2.5 + TOLERANCE);
  });

  test('reaches vMax and aMax on the long legs', () => {
    expect(Math.max(...SAMPLES.map((s) => s.speed))).toBeCloseTo(10, 9);
    expect(Math.max(...SAMPLES.map((s) => s.accel))).toBeCloseTo(2.5, 9);
  });

  test('is at rest at A during its 20 s dwell', () => {
    const dwell = SAMPLES.filter(
      (s) => s.t > FIRST_LEG.duration && s.t < FIRST_LEG.duration + DWELL_A,
    );

    expect(dwell.length).toBeGreaterThan(190);
    dwell.forEach((s) => {
      expect(s.speed).toBe(0);
      expect(s.accel).toBe(0);
      expect(s.x).toBeCloseTo(600, 9);
      expect(s.y).toBeCloseTo(200, 9);
    });
  });

  test('points velocity and acceleration along the heading of the leg', () => {
    const heading = vec(600 / Math.hypot(600, 200), 200 / Math.hypot(600, 200));
    const accelerating = SAMPLES.find((s) => s.t === 2)!;
    const cruising = SAMPLES.find((s) => s.t === 30)!;
    const braking = SAMPLES.find((s) => s.t === 65)!;

    expect(accelerating.vx).toBeCloseTo(5 * heading.x, 9);
    expect(accelerating.vy).toBeCloseTo(5 * heading.y, 9);
    expect(accelerating.ax).toBeCloseTo(2.5 * heading.x, 9);
    expect(accelerating.ay).toBeCloseTo(2.5 * heading.y, 9);
    expect(cruising.speed).toBeCloseTo(10, 9);
    expect(cruising.accel).toBe(0);
    expect(braking.ax).toBeCloseTo(-2.5 * heading.x, 9);
    expect(braking.ay).toBeCloseTo(-2.5 * heading.y, 9);
  });

  test('keeps speed and accel equal to the magnitudes of their components', () => {
    SAMPLES.forEach((s) => {
      expect(s.speed).toBeCloseTo(Math.hypot(s.vx, s.vy), 9);
      expect(s.accel).toBeCloseTo(Math.hypot(s.ax, s.ay), 9);
    });
  });

  test('agrees with the numerical derivative of the sampled positions within 1 mm/s away from the kinks', () => {
    const positions = SAMPLES.map((s) => ({ t: s.t, value: vec(s.x, s.y) }));
    const numerical = derivativeSeries(positions);
    // Central differences are exact for quadratics; they only err within one dt of a kink in a(t).
    const smooth = SAMPLES.map((s, i) => ({ s, i })).filter(
      ({ i }) =>
        i > 0 &&
        i < SAMPLES.length - 1 &&
        SAMPLES[i - 1].ax === SAMPLES[i + 1].ax &&
        SAMPLES[i - 1].ay === SAMPLES[i + 1].ay,
    );

    expect(smooth.length).toBeGreaterThan(3700);
    smooth.forEach(({ s, i }) => {
      expect(Math.abs(numerical[i].value.x - s.vx)).toBeLessThan(1e-3);
      expect(Math.abs(numerical[i].value.y - s.vy)).toBeLessThan(1e-3);
    });
  });

  test('returns a new array without touching the definition', () => {
    const before = JSON.stringify(DRONE_ROUTE);

    const again = generateRoute(DRONE_ROUTE);

    expect(again).not.toBe(SAMPLES);
    expect(again).toEqual(SAMPLES);
    expect(JSON.stringify(DRONE_ROUTE)).toBe(before);
  });
});
