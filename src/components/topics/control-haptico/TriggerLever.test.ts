import { describe, expect, test } from 'vitest';
import { monoTextWidth } from '../../lab/plotScales';
import { LEVER_HALF_THICKNESS, LEVER_TEXT_SIZE, valueLabelDrop } from './TriggerLever';

/** The cap height of the label's digits as a share of its size: what rises above the baseline. */
const ASCENT_SHARE = 0.8;
const DEG = Math.PI / 180;

/**
 * How far below the tip the lever's lower edge lies at a distance `left` of the tip, for a lever
 * at `angle` degrees (y down; negative: the tip above the pivot).
 */
const edgeBelowTip = (angle: number, left: number) =>
  Math.tan(-angle * DEG) * left + LEVER_HALF_THICKNESS;

describe('the value label under the lever’s tip', () => {
  test.each([-12, -6, 0, 6, 12])('at %s° its whole text clears the lever’s lower edge', (angle) => {
    const text = 'x = 0,0 mm';
    const drop = valueLabelDrop(angle, text);
    const top = drop - LEVER_TEXT_SIZE * ASCENT_SHARE;
    // The text ends 10 px right of the tip and runs left: check its leftmost point.
    const leftmost = monoTextWidth(text, LEVER_TEXT_SIZE) - 10;

    expect(top).toBeGreaterThan(edgeBelowTip(angle, Math.max(leftmost, 0)));
  });
});
