import { describe, expect, test } from 'vitest';
import {
  DRONE_ROUTE,
  generateRoute,
  routeDuration,
  type RouteDefinition,
} from '../../../lib/data/droneRoute';
import { isDeclaredRoute, moveStop, sampleAt, tryGenerate } from './routeEdit';

const SAMPLES = generateRoute(DRONE_ROUTE);

describe('moveStop', () => {
  test('returns a new route with the stop moved and leaves the original untouched', () => {
    const before = structuredClone(DRONE_ROUTE);

    const moved = moveStop(DRONE_ROUTE, 2, 950, 750);

    expect(moved).not.toBe(DRONE_ROUTE);
    expect(moved.stops).not.toBe(DRONE_ROUTE.stops);
    expect(moved.stops[2]).toEqual({ name: 'B', x: 950, y: 750, dwell: 20 });
    expect(DRONE_ROUTE).toEqual(before);
  });

  test('rounds the new position to the nearest 10 m', () => {
    const moved = moveStop(DRONE_ROUTE, 1, 613.4, 196.2);

    expect(moved.stops[1]).toMatchObject({ x: 610, y: 200 });
  });

  test('keeps every other stop and the limits as they were', () => {
    const moved = moveStop(DRONE_ROUTE, 3, 400, 1000);

    expect(moved.stops.filter((_, i) => i !== 3)).toEqual(
      DRONE_ROUTE.stops.filter((_, i) => i !== 3),
    );
    expect(moved).toMatchObject({ vMax: 10, aMax: 2.5, dt: 0.1 });
  });
});

describe('tryGenerate', () => {
  test('returns the samples of a valid route', () => {
    const result = tryGenerate(moveStop(DRONE_ROUTE, 1, 500, 300));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.samples[0]).toMatchObject({ t: 0, x: 0, y: 0 });
    expect(result.samples.at(-1)?.t).toBeGreaterThan(0);
  });

  test('two coincident consecutive stops give a message in Spanish, not an exception', () => {
    const result = tryGenerate(moveStop(DRONE_ROUTE, 2, 300, 1100));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(
      /^La parada B y la parada C coinciden: no hay tramo entre ellas\./,
    );
    expect(result.error).toMatch(/última ruta válida/);
  });

  test('a stop dropped on the depot names the depot', () => {
    const result = tryGenerate(moveStop(DRONE_ROUTE, 1, 0, 0));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(
      /^El depósito y la parada A coinciden: no hay tramo entre ellos\./,
    );
  });

  test('any other invalid route gets a generic message', () => {
    const result = tryGenerate({ ...DRONE_ROUTE, vMax: 0 });

    expect(result).toEqual({
      ok: false,
      error: 'No se pudo generar la ruta con estos valores. Se conserva la última ruta válida.',
    });
  });

  test('errors that are not RangeErrors still propagate', () => {
    const broken = { ...DRONE_ROUTE, stops: null } as unknown as RouteDefinition;

    expect(() => tryGenerate(broken)).toThrow(TypeError);
  });
});

describe('isDeclaredRoute', () => {
  test('is true for the declared route and an identical copy', () => {
    expect(isDeclaredRoute(DRONE_ROUTE)).toBe(true);
    expect(isDeclaredRoute(structuredClone(DRONE_ROUTE))).toBe(true);
  });

  test('is false once a stop moves', () => {
    expect(isDeclaredRoute(moveStop(DRONE_ROUTE, 1, 620, 200))).toBe(false);
  });

  test('is true again when the stop goes back to where it was', () => {
    const back = moveStop(moveStop(DRONE_ROUTE, 1, 620, 200), 1, 600, 200);

    expect(isDeclaredRoute(back)).toBe(true);
  });

  test('is false when a limit changes', () => {
    expect(isDeclaredRoute({ ...DRONE_ROUTE, vMax: 12 })).toBe(false);
    expect(isDeclaredRoute({ ...DRONE_ROUTE, aMax: 3 })).toBe(false);
  });
});

describe('sampleAt', () => {
  test('at a grid instant returns that sample (t = 65 s is sample 650)', () => {
    const at = sampleAt(SAMPLES, 65);

    expect(at.t).toBeCloseTo(65, 9);
    expect(at.x).toBeCloseTo(SAMPLES[650].x, 9);
    expect(at.y).toBeCloseTo(SAMPLES[650].y, 9);
    expect(at.speed).toBeCloseTo(SAMPLES[650].speed, 9);
  });

  test('between two samples interpolates linearly', () => {
    const at = sampleAt(SAMPLES, 65.05);
    const [a, b] = [SAMPLES[650], SAMPLES[651]];

    expect(at.t).toBeCloseTo(65.05, 9);
    expect(at.x).toBeCloseTo((a.x + b.x) / 2, 9);
    expect(at.vy).toBeCloseTo((a.vy + b.vy) / 2, 9);
    expect(at.accel).toBeCloseTo((a.accel + b.accel) / 2, 9);
  });

  test('clamps t to the first and last samples', () => {
    expect(sampleAt(SAMPLES, -5)).toEqual(SAMPLES[0]);
    expect(sampleAt(SAMPLES, routeDuration(DRONE_ROUTE) + 100)).toEqual(SAMPLES.at(-1));
  });

  test('braking into A at 65 s: the acceleration opposes the velocity', () => {
    const at = sampleAt(SAMPLES, 65);

    expect(at.vx * at.ax + at.vy * at.ay).toBeLessThan(0);
  });
});
