import { describe, expect, test } from 'vitest';
import { mathTextWidth } from '../../../lib/mathNotation';
import { boxesOverlap, textBox } from '../../lab/labelClearance';
import { formatTimeScale } from '../../lab/timeScaleFormat';
import { SCALE_BAND_BOTTOM, scaleBadgeSpot } from './flybyScaleBadge';

const NOTE_SIZE = 12;
/** The narrowest frame: a 320 px phone (275,5 px of canvas, drawn at 276). */
const NARROWEST_WIDTH = 276;
const CORNER = 12;
const VP_RIGHT = 66;
/** The widest r_p value the frame prints, at its right corner. */
const RP_VALUE = 'r_p = 100,00 R_J';

describe('scaleBadgeSpot', () => {
  test('starts to the right of the V_p key, a gap clear of it', () => {
    const { x } = scaleBadgeSpot(VP_RIGHT, 19_354);

    expect(x).toBeGreaterThanOrEqual(VP_RIGHT + 8);
  });

  test('keeps both lines inside the 30 px text band at the top, whatever the factor', () => {
    for (const factor of [0.25, 2.5, 1_700, 19_354, 4_600_000]) {
      const { boxes } = scaleBadgeSpot(VP_RIGHT, factor);

      for (const box of boxes) {
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(box.bottom).toBeLessThanOrEqual(SCALE_BAND_BOTTOM);
      }
    }
  });

  test('has a box per line: the factor and its words', () => {
    expect(scaleBadgeSpot(VP_RIGHT, 19_354).boxes).toHaveLength(2);
    expect(scaleBadgeSpot(VP_RIGHT, Number.NaN).boxes).toHaveLength(1);
  });

  test('clears the r_p value at the right even on the narrowest frame', () => {
    const rp = textBox({ x: NARROWEST_WIDTH - CORNER, y: 22 }, RP_VALUE, NOTE_SIZE, 'end');
    for (const factor of [19_354, 1_700, 0.25]) {
      for (const box of scaleBadgeSpot(VP_RIGHT, factor).boxes) {
        expect(boxesOverlap(box, rp)).toBe(false);
        expect(box.right).toBeLessThanOrEqual(rp.left - 8);
      }
    }
  });

  test('measures the words in the sans font the badge draws them in', () => {
    const words = scaleBadgeSpot(VP_RIGHT, 19_354).boxes[1];

    expect(words.right - words.left).toBeCloseTo(
      mathTextWidth('cámara rápida', NOTE_SIZE, 'sans'),
      6,
    );
  });

  test('measures the factor as the badge prints it', () => {
    const factor = scaleBadgeSpot(VP_RIGHT, 19_354).boxes[0];

    expect(factor.right - factor.left).toBeGreaterThan(
      mathTextWidth(formatTimeScale(19_354), NOTE_SIZE, 'mono'),
    );
  });
});
