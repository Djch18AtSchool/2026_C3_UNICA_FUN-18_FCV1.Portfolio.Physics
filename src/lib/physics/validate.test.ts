import { describe, expect, test } from 'vitest';
import { requireFinite, requireNonNegative, requirePositive } from './validate';

const NON_FINITE = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

describe('requireFinite', () => {
  test('accepts finite numbers and rejects NaN and ±Infinity', () => {
    expect(() => requireFinite('x', -3.5)).not.toThrow();
    for (const value of NON_FINITE) {
      expect(() => requireFinite('x', value)).toThrow(/x must be a finite number/);
    }
  });
});

describe('requirePositive', () => {
  test('accepts finite positive numbers and rejects zero or negative', () => {
    expect(() => requirePositive('m', 0.02)).not.toThrow();
    expect(() => requirePositive('m', 0)).toThrow(/m must be greater than 0, got 0/);
    expect(() => requirePositive('m', -1)).toThrow(RangeError);
  });

  test('rejects NaN and ±Infinity with a clear RangeError', () => {
    for (const value of NON_FINITE) {
      expect(() => requirePositive('m', value)).toThrow(RangeError);
      expect(() => requirePositive('m', value)).toThrow(/m must be a finite number/);
    }
  });
});

describe('requireNonNegative', () => {
  test('accepts zero and finite positive numbers and rejects negative', () => {
    expect(() => requireNonNegative('k', 0)).not.toThrow();
    expect(() => requireNonNegative('k', 400)).not.toThrow();
    expect(() => requireNonNegative('k', -1)).toThrow(/k must be 0 or greater, got -1/);
  });

  test('rejects NaN and ±Infinity with a clear RangeError', () => {
    for (const value of NON_FINITE) {
      expect(() => requireNonNegative('k', value)).toThrow(RangeError);
      expect(() => requireNonNegative('k', value)).toThrow(/k must be a finite number/);
    }
  });
});
