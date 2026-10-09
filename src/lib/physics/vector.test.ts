import { describe, expect, test } from 'vitest';
import { add, angle, fromPolar, magnitude, scale, sub, vec } from './vector';

describe('vector', () => {
  test('magnitude of (3, 4) is 5', () => {
    expect(magnitude(vec(3, 4))).toBe(5);
  });

  test('fromPolar(20, π/4) has both components close to 14.142', () => {
    const v = fromPolar(20, Math.PI / 4);
    expect(v.x).toBeCloseTo(14.142, 3);
    expect(v.y).toBeCloseTo(14.142, 3);
  });

  test('angle of (0, 1) is π/2', () => {
    expect(angle(vec(0, 1))).toBe(Math.PI / 2);
  });

  test('add returns a new vector with the component-wise sum', () => {
    const a = vec(1, 2);
    const b = vec(3, -5);
    const result = add(a, b);
    expect(result).toEqual({ x: 4, y: -3 });
    expect(result).not.toBe(a);
    expect(result).not.toBe(b);
  });

  test('sub returns a new vector with the component-wise difference', () => {
    const a = vec(1, 2);
    const b = vec(3, -5);
    const result = sub(a, b);
    expect(result).toEqual({ x: -2, y: 7 });
    expect(result).not.toBe(a);
    expect(result).not.toBe(b);
  });

  test('scale returns a new vector multiplied by the scalar', () => {
    const a = vec(1.5, -2);
    const result = scale(a, 2);
    expect(result).toEqual({ x: 3, y: -4 });
    expect(result).not.toBe(a);
    expect(a).toEqual({ x: 1.5, y: -2 });
  });
});
