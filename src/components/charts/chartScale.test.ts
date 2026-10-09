import { describe, expect, test } from 'vitest';
import { tickPrecision, trimTrailingZeros } from './chartScale';

describe('tickPrecision', () => {
  test.each([
    [100, 0],
    [10, 1],
    [1, 2],
    [0.1, 3],
    [0.001, 3],
  ])('uses the decimals needed for a span of %s', (span, expected) => {
    expect(tickPrecision(span)).toBe(expected);
  });

  test('falls back to two decimals for degenerate spans', () => {
    expect(tickPrecision(0)).toBe(2);
    expect(tickPrecision(NaN)).toBe(2);
    expect(tickPrecision(-3)).toBe(2);
  });
});

describe('trimTrailingZeros', () => {
  test.each([
    ['2,50', '2,5'],
    ['5,00', '5'],
    ['0,00', '0'],
    ['10,0', '10'],
    ['100', '100'],
    ['1\u202f000,0', '1\u202f000'],
    ['-0,25', '-0,25'],
  ])('turns %s into %s', (input, expected) => {
    expect(trimTrailingZeros(input)).toBe(expected);
  });
});
