// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { mathTextWidth } from '../../../lib/mathNotation';
import { boxesOverlap, textBox } from '../../lab/labelClearance';
import { TimeScaleBadgeSvg } from '../../lab/TimeScaleBadge';
import { formatTimeScale } from '../../lab/timeScaleFormat';
import { FACTOR_SIZE, LINE_GAP, scaleBadgeSpot, WORDS_SIZE } from './flybyScaleBadge';

const NOTE_SIZE = 12;
/** The narrowest frame: a 320 px phone (275,5 px of canvas, drawn at 276). */
const NARROWEST_WIDTH = 276;
const WIDEST_WIDTH = 380;
const CORNER = 12;
/** More than the 12 px gap the badge had, which read as «V_p ×19 000». */
const WELL_APART = 32;
const VP_RIGHT = 66;
/** The widest r_p value the frame prints, at its right corner. */
const RP_VALUE = 'r_p = 100,00 R_J';
const rpLeft = (width: number) =>
  textBox({ x: width - CORNER, y: 22 }, RP_VALUE, NOTE_SIZE, 'end').left;
const spot = (factor: number, width = NARROWEST_WIDTH) =>
  scaleBadgeSpot(VP_RIGHT, rpLeft(width), factor);

describe('scaleBadgeSpot', () => {
  test('keeps a gap clear of the V_p key on the narrowest frame', () => {
    expect(spot(19_354).x).toBeGreaterThanOrEqual(VP_RIGHT + 8);
  });

  test('on a wide frame it centres in the free span, so it does not read as part of the V_p key', () => {
    const { x, boxes } = spot(19_354, WIDEST_WIDTH);
    const right = Math.max(...boxes.map((box) => box.right));
    const freeLeft = x - VP_RIGHT;
    const freeRight = rpLeft(WIDEST_WIDTH) - right;

    expect(freeLeft).toBeGreaterThan(WELL_APART);
    expect(Math.abs(freeLeft - freeRight)).toBeLessThanOrEqual(1);
  });

  test('keeps both lines inside the frame at the top, whatever the factor', () => {
    for (const factor of [0.25, 2.5, 1_700, 19_354, 4_600_000]) {
      for (const box of spot(factor).boxes) expect(box.top).toBeGreaterThanOrEqual(0);
    }
  });

  test('has a box per line: the factor and its words', () => {
    expect(spot(19_354).boxes).toHaveLength(2);
    expect(spot(Number.NaN).boxes).toHaveLength(1);
  });

  test('clears the r_p value at the right even on the narrowest frame', () => {
    const rp = textBox({ x: NARROWEST_WIDTH - CORNER, y: 22 }, RP_VALUE, NOTE_SIZE, 'end');
    for (const factor of [19_354, 1_700, 0.25]) {
      for (const box of spot(factor).boxes) {
        expect(boxesOverlap(box, rp)).toBe(false);
        expect(box.right).toBeLessThanOrEqual(rp.left - 8);
      }
    }
  });

  test('measures the words in the sans font the badge draws them in', () => {
    const words = spot(19_354).boxes[1];

    expect(words.right - words.left).toBeCloseTo(
      mathTextWidth('cámara rápida', NOTE_SIZE, 'sans'),
      6,
    );
  });

  test('measures the factor as the badge prints it', () => {
    const factor = spot(19_354).boxes[0];

    expect(factor.right - factor.left).toBeGreaterThan(
      mathTextWidth(formatTimeScale(19_354), NOTE_SIZE, 'mono'),
    );
  });
});

describe('the sizes copied from TimeScaleBadgeSvg', () => {
  test('are the ones the shared badge draws: its font sizes and the gap between its two lines', () => {
    const { container } = render(
      <svg>
        <TimeScaleBadgeSvg factor={19_354} x={10} y={50} />
      </svg>,
    );
    const texts = [...container.querySelectorAll('text')];

    expect(texts.map((text) => Number(text.getAttribute('font-size')))).toEqual([
      FACTOR_SIZE,
      WORDS_SIZE,
    ]);
    expect(Number(texts[1].getAttribute('y')) - Number(texts[0].getAttribute('y'))).toBe(LINE_GAP);
  });
});
