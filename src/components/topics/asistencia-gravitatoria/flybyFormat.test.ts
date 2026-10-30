import { describe, expect, test } from 'vitest';
import { durationText, lapseFactorText, signed } from './flybyFormat';

const plain = (text: string) => text.replace(/\s/g, ' ');

describe('flybyFormat', () => {
  test('signed writes + and a true minus, and no sign for zero', () => {
    expect(plain(signed(9.944, 2, 'km/s'))).toBe('+9,94 km/s');
    expect(plain(signed(-2.1348, 2, 'km/s'))).toBe('−2,13 km/s');
    expect(signed(-0.0004, 1, 'h').replace(/\s/g, ' ')).toBe('0,0 h');
  });

  test('durations read in hours up to two days, then in days', () => {
    expect(plain(durationText(36 * 3600))).toBe('36,0 h');
    expect(plain(durationText(4.2 * 86400))).toBe('4,2 días');
  });

  test('the lapse factor keeps two significant digits', () => {
    expect(plain(lapseFactorText(363_000, 12))).toBe('30 000');
  });
});
