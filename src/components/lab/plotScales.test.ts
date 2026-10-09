import { describe, expect, test } from 'vitest';
import { linearScale, niceTicks, padDomain, tickDecimals } from './plotScales';

describe('linearScale', () => {
  test('maps a value to pixels and back', () => {
    const scale = linearScale({ min: 0, max: 10 }, [0, 100]);

    expect(scale.toPx(2.5)).toBe(25);
    expect(scale.toValue(25)).toBe(2.5);
  });

  test('supports an inverted range, as a y axis drawn downwards needs', () => {
    const scale = linearScale({ min: 0, max: 4 }, [400, 0]);

    expect(scale.toPx(0)).toBe(400);
    expect(scale.toPx(4)).toBe(0);
    expect(scale.toValue(100)).toBe(3);
  });

  test('exposes its domain and range', () => {
    const scale = linearScale({ min: -1, max: 1 }, [10, 20]);

    expect(scale.domain).toEqual({ min: -1, max: 1 });
    expect(scale.range).toEqual([10, 20]);
  });

  test('throws when the domain is empty', () => {
    expect(() => linearScale({ min: 1, max: 1 }, [0, 1])).toThrow(RangeError);
  });

  test('throws when the domain is reversed or not finite', () => {
    expect(() => linearScale({ min: 2, max: 1 }, [0, 1])).toThrow(RangeError);
    expect(() => linearScale({ min: 0, max: Number.NaN }, [0, 1])).toThrow(RangeError);
  });

  test('throws when the range has no length', () => {
    expect(() => linearScale({ min: 0, max: 1 }, [5, 5])).toThrow(RangeError);
  });
});

describe('niceTicks', () => {
  test('picks a step of 2 for 0 to 8.2 in about five ticks', () => {
    expect(niceTicks({ min: 0, max: 8.2 }, 5)).toEqual([0, 2, 4, 6, 8]);
  });

  test('includes nice extremes that fall inside the domain', () => {
    expect(niceTicks({ min: 40, max: 160 }, 6)).toEqual([40, 60, 80, 100, 120, 140, 160]);
  });

  test('uses a step of 2.5 when it is the closest nice step', () => {
    expect(niceTicks({ min: 0, max: 10 }, 4)).toEqual([0, 2.5, 5, 7.5, 10]);
  });

  test('handles negative domains and steps below one', () => {
    expect(niceTicks({ min: -1, max: 1 }, 4)).toEqual([-1, -0.5, 0, 0.5, 1]);
  });

  test('returns clean decimals without floating point residue', () => {
    expect(niceTicks({ min: 0, max: 0.3 }, 3)).toEqual([0, 0.1, 0.2, 0.3]);
  });

  test('throws on an empty domain or a tick count below one', () => {
    expect(() => niceTicks({ min: 1, max: 1 }, 5)).toThrow(RangeError);
    expect(() => niceTicks({ min: 0, max: 1 }, 0)).toThrow(RangeError);
  });
});

describe('padDomain', () => {
  test('pads by a fraction of the span and then reaches zero', () => {
    expect(padDomain([1, 3], 0.1, true)).toEqual({ min: 0, max: 3.2 });
  });

  test('pads both sides when zero is not required', () => {
    const domain = padDomain([1, 3], 0.1);

    expect(domain.min).toBeCloseTo(0.8);
    expect(domain.max).toBeCloseTo(3.2);
  });

  test('reaches zero from below for negative values', () => {
    const domain = padDomain([-3, -1], 0.1, true);

    expect(domain.min).toBeCloseTo(-3.2);
    expect(domain.max).toBe(0);
  });

  test('gives a single value a non-empty domain around it', () => {
    const domain = padDomain([5, 5], 0.1);

    expect(domain.min).toBeLessThan(5);
    expect(domain.max).toBeGreaterThan(5);
  });

  test('gives zero alone a non-empty domain even without padding', () => {
    const domain = padDomain([0], 0);

    expect(domain.max).toBeGreaterThan(domain.min);
  });

  test('throws on no values or non-finite values', () => {
    expect(() => padDomain([], 0.1)).toThrow(RangeError);
    expect(() => padDomain([1, Number.POSITIVE_INFINITY], 0.1)).toThrow(RangeError);
  });
});

describe('tickDecimals', () => {
  test('gives the decimals a tick step needs, at most two', () => {
    expect(tickDecimals(20)).toBe(0);
    expect(tickDecimals(2.5)).toBe(1);
    expect(tickDecimals(0.25)).toBe(2);
    expect(tickDecimals(0.025)).toBe(2);
  });
});
