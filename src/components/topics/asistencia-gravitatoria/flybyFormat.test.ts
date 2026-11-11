import { describe, expect, test } from 'vitest';
import { formatTimeScale } from '../../lab/timeScaleFormat';
import { lapseFactorText, nominalFactor, signed } from './flybyFormat';

const plain = (text: string) => text.replace(/\s/g, ' ');

describe('flybyFormat', () => {
  test('signed writes + and a true minus, and no sign for zero', () => {
    expect(plain(signed(9.944, 2, 'km/s'))).toBe('+9,94 km/s');
    expect(plain(signed(-2.1348, 2, 'km/s'))).toBe('−2,13 km/s');
    expect(signed(-0.0004, 1, 'h').replace(/\s/g, ' ')).toBe('0,0 h');
  });

  test('the lapse factor keeps two significant digits', () => {
    expect(plain(lapseFactorText(363_000, 12))).toBe('30 000');
  });

  test('the lapse factor is the badge’s own text without its sign: one rounding for both', () => {
    for (const seconds of [2.5 * 12, 36, 363_000, 232_243, 1_700 * 12, 0.25 * 12]) {
      expect(lapseFactorText(seconds, 12)).toBe(formatTimeScale(seconds / 12).slice(1));
    }
    expect(lapseFactorText(30, 12)).toBe('2,5');
  });

  test('the nominal factor is the pass over the seconds it plays in', () => {
    expect(nominalFactor(363_000, 12)).toBe(30_250);
  });
});
