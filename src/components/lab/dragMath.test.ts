import { describe, expect, test } from 'vitest';
import { clampTo, snapTo, svgPointFromClient } from './dragMath';

describe('clampTo', () => {
  test('clamps a value above the max down to the max', () => {
    // Arrange
    const value = 11;

    // Act
    const clamped = clampTo(value, 0, 10);

    // Assert
    expect(clamped).toBe(10);
  });

  test('clamps a value below the min up to the min', () => {
    // Arrange
    const value = -5;

    // Act
    const clamped = clampTo(value, 0, 10);

    // Assert
    expect(clamped).toBe(0);
  });

  test('passes through a value already inside the range', () => {
    // Arrange
    const value = 4;

    // Act
    const clamped = clampTo(value, 0, 10);

    // Assert
    expect(clamped).toBe(4);
  });
});

describe('snapTo', () => {
  test('snaps to the nearest multiple of step', () => {
    // Arrange
    const value = 0.26;
    const step = 0.05;

    // Act
    const snapped = snapTo(value, step);

    // Assert
    expect(snapped).toBe(0.25);
  });

  test('rounds up when closer to the next multiple', () => {
    // Arrange
    const value = 0.95;
    const step = 0.25;

    // Act
    const snapped = snapTo(value, step);

    // Assert
    expect(snapped).toBe(1);
  });

  test('throws RangeError when step is zero', () => {
    // Arrange
    const value = 1;
    const step = 0;

    // Act & Assert
    expect(() => snapTo(value, step)).toThrow(RangeError);
  });

  test('throws RangeError when step is negative', () => {
    // Arrange
    const value = 1;
    const step = -0.1;

    // Act & Assert
    expect(() => snapTo(value, step)).toThrow(RangeError);
  });
});

describe('svgPointFromClient', () => {
  test('applies the matrix to a client-space point', () => {
    // Arrange
    const ctmInverse = { a: 2, b: 0, c: 0, d: 2, e: -10, f: -20 };

    // Act
    const point = svgPointFromClient(ctmInverse, 15, 30);

    // Assert
    expect(point).toEqual({ x: 20, y: 40 });
  });

  test('applies non-zero b and c terms (rotation/skew)', () => {
    // Arrange
    const ctmInverse = { a: 1, b: 1, c: 1, d: 1, e: 0, f: 0 };

    // Act
    const point = svgPointFromClient(ctmInverse, 3, 5);

    // Assert
    expect(point).toEqual({ x: 8, y: 8 });
  });
});
