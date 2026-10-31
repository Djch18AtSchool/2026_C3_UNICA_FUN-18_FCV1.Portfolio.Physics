import { describe, expect, test } from 'vitest';
import { trimTrailingZeros } from './chartScale';

describe('trimTrailingZeros', () => {
  test.each([
    ['2,50', '2,5'],
    ['5,00', '5'],
    ['0,00', '0'],
    ['10,0', '10'],
    ['100', '100'],
    ['1 000,0', '1 000'],
    ['-0,25', '-0,25'],
  ])('turns %s into %s', (input, expected) => {
    expect(trimTrailingZeros(input)).toBe(expected);
  });
});
