import { describe, expect, test } from 'vitest';
import { cubicBezier, EASE_IN_OUT } from './cubicBezier';

/** Central difference of `f` at `x`. */
const derivative = (f: (x: number) => number, x: number, h = 1e-6) =>
  (f(x + h) - f(x - h)) / (2 * h);

describe('cubicBezier', () => {
  test('CSS ease-in-out is cubic-bezier(0.42, 0, 0.58, 1) (CSS Easing Level 1)', () => {
    expect(EASE_IN_OUT).toEqual([0.42, 0, 0.58, 1]);
  });

  test('goes from 0 to 1, symmetric about the middle, and starts and ends at rest', () => {
    // Arrange
    const easing = cubicBezier(...EASE_IN_OUT);

    // Act + Assert
    expect(easing.progress(0)).toBe(0);
    expect(easing.progress(1)).toBe(1);
    expect(easing.progress(0.5)).toBeCloseTo(0.5, 12);
    expect(easing.progress(0.2) + easing.progress(0.8)).toBeCloseTo(1, 12);
    expect(easing.slope(0)).toBe(0);
    expect(easing.slope(1)).toBe(0);
  });

  test('the slope in the middle is y′/x′ at s = ½: 1,5/0,87', () => {
    expect(cubicBezier(...EASE_IN_OUT).slope(0.5)).toBeCloseTo(1.5 / 0.87, 10);
  });

  test('the slope is the derivative of the progress', () => {
    const easing = cubicBezier(0.25, 0.1, 0.25, 1);

    for (const time of [0.05, 0.3, 0.5, 0.71, 0.95]) {
      expect(easing.slope(time)).toBeCloseTo(derivative(easing.progress, time), 6);
    }
  });

  test('control points on the diagonal give the linear curve', () => {
    const linear = cubicBezier(1 / 3, 1 / 3, 2 / 3, 2 / 3);

    for (const time of [0, 0.1, 0.37, 0.5, 0.9, 1]) {
      expect(linear.progress(time)).toBeCloseTo(time, 12);
      expect(linear.slope(time)).toBeCloseTo(1, 12);
    }
  });

  test('a curve flat in the middle, cubic-bezier(1, 0, 0, 1), still inverts by bisection', () => {
    // Arrange: x(s) = 3s − 6s² + 4s³ has x′ = 3(1 − 2s)², flat at s = ½; y(s) = 3s² − 2s³.
    const easing = cubicBezier(1, 0, 0, 1);
    const x = (s: number) => 3 * s - 6 * s * s + 4 * s ** 3;
    const y = (s: number) => 3 * s * s - 2 * s ** 3;

    // Act + Assert
    for (const s of [0.1, 0.3, 0.45, 0.55, 0.8]) {
      expect(easing.progress(x(s))).toBeCloseTo(y(s), 9);
    }
    expect(easing.slope(0.5)).toBe(Infinity);
  });

  test('holds the ends outside [0, 1]: before the start and after the end it is at rest', () => {
    const easing = cubicBezier(...EASE_IN_OUT);

    expect(easing.progress(-0.5)).toBe(0);
    expect(easing.progress(1.5)).toBe(1);
    expect(easing.slope(-0.5)).toBe(0);
    expect(easing.slope(1.5)).toBe(0);
  });

  test('rejects control abscissas outside [0, 1], as CSS does', () => {
    expect(() => cubicBezier(-0.1, 0, 0.58, 1)).toThrow(RangeError);
    expect(() => cubicBezier(0.42, 0, 1.2, 1)).toThrow(RangeError);
    expect(() => cubicBezier(Number.NaN, 0, 0.58, 1)).toThrow(RangeError);
  });
});
