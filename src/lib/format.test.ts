import { describe, expect, test } from 'vitest';
import { formatNumber } from './format';

describe('formatNumber', () => {
  test('uses decimal comma, narrow no-break space for thousands and before the unit', () => {
    expect(formatNumber(1234.5, { precision: 1, unit: 'm/s' })).toBe('1\u202f234,5\u202fm/s');
  });
  test('defaults to two decimals', () => {
    expect(formatNumber(0.5)).toBe('0,50');
  });
  test('formats a value with a unit', () => {
    expect(formatNumber(9.81, { precision: 2, unit: 'm/s²' })).toBe('9,81\u202fm/s²');
  });
  test('returns an em dash for non-finite values', () => {
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
    expect(formatNumber(-Infinity, { unit: 'm' })).toBe('—');
  });
  test('keeps the sign in front and groups millions', () => {
    expect(formatNumber(-1234567.891)).toBe('-1\u202f234\u202f567,89');
  });
  test('supports zero precision', () => {
    expect(formatNumber(1500, { precision: 0 })).toBe('1\u202f500');
  });
  test('never prints a minus sign for values that round to zero', () => {
    expect(formatNumber(-0.001)).toBe('0,00');
    expect(formatNumber(-0)).toBe('0,00');
    expect(formatNumber(-0.4, { precision: 0 })).toBe('0');
    expect(formatNumber(-0.001, { unit: 'm' })).toBe('0,00\u202fm');
  });
  test('keeps the minus sign for values that do not round to zero', () => {
    expect(formatNumber(-0.01)).toBe('-0,01');
    expect(formatNumber(-0.6, { precision: 0 })).toBe('-1');
  });
});
