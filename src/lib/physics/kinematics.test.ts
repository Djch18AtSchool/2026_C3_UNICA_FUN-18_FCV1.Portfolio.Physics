import { describe, expect, test } from 'vitest';
import {
  derivativeSeries,
  position,
  position2D,
  trapezoidalProfile,
  velocity,
  type Sample,
} from './kinematics';
import { vec } from './vector';

describe('uniformly accelerated motion', () => {
  test('position and velocity follow x0 + v0 t + a t²/2 and v0 + a t', () => {
    expect(position({ x0: 0, v0: 2, a: 4 }, 3)).toBe(24);
    expect(velocity({ x0: 0, v0: 2, a: 4 }, 3)).toBe(14);
  });

  test('position rejects negative time', () => {
    expect(() => position({ x0: 0, v0: 0, a: 0 }, -1)).toThrow(RangeError);
  });

  test('position2D applies the same law per component', () => {
    expect(position2D(vec(0, 0), vec(3, 4), vec(0, -9.81), 2)).toEqual({
      x: 6,
      y: expect.closeTo(-11.62, 2),
    });
  });
});

describe('derivativeSeries', () => {
  const samples: Sample[] = [0, 1, 2, 3, 4].map((t) => ({ t, value: vec(t * t, 0) }));

  test('central difference of x = t² is exact at an interior point', () => {
    const derivative = derivativeSeries(samples);
    expect(derivative[2].t).toBe(2);
    expect(Math.abs(derivative[2].value.x - 4)).toBeLessThanOrEqual(1e-9);
  });

  test('one-sided differences at the ends stay within 1 of dx/dt = 2t', () => {
    const derivative = derivativeSeries(samples);
    expect(derivative).toHaveLength(samples.length);
    expect(Math.abs(derivative[0].value.x - 0)).toBeLessThanOrEqual(1);
    expect(Math.abs(derivative[4].value.x - 8)).toBeLessThanOrEqual(1);
  });

  test('rejects fewer than two samples or non-increasing time', () => {
    expect(() => derivativeSeries([{ t: 0, value: vec(0, 0) }])).toThrow(RangeError);
    expect(() =>
      derivativeSeries([
        { t: 0, value: vec(0, 0) },
        { t: 0, value: vec(1, 0) },
      ]),
    ).toThrow(RangeError);
  });
});

describe('trapezoidalProfile', () => {
  test('trapezoidal case (100 m, 10 m/s, 2.5 m/s²)', () => {
    const p = trapezoidalProfile(100, 10, 2.5);
    expect(p.duration).toBe(14);
    expect(p.isTriangular).toBe(false);
    expect(p.s(14)).toBeCloseTo(100, 9);
    expect(p.v(7)).toBeCloseTo(10, 9);
    expect(p.a(2)).toBe(2.5);
    expect(p.a(7)).toBe(0);
    expect(p.a(12)).toBe(-2.5);
    expect(p.s(4)).toBeCloseTo(20, 9);
  });

  test('triangular case (10 m, 10 m/s, 2.5 m/s²)', () => {
    const p = trapezoidalProfile(10, 10, 2.5);
    expect(p.duration).toBe(4);
    expect(p.isTriangular).toBe(true);
    expect(p.v(2)).toBeCloseTo(5, 9);
    expect(p.s(4)).toBeCloseTo(10, 9);
  });

  test('clamps time outside [0, duration] to the start and end states', () => {
    const p = trapezoidalProfile(100, 10, 2.5);
    expect([p.s(-1), p.v(-1), p.a(-1)]).toEqual([0, 0, 0]);
    expect([p.s(20), p.v(20), p.a(20)]).toEqual([100, 0, 0]);
  });

  test('rejects non-positive arguments', () => {
    expect(() => trapezoidalProfile(0, 10, 2.5)).toThrow(RangeError);
  });
});
