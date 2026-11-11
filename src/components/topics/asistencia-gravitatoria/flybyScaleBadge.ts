/**
 * Where the planet frame's time-scale badge goes: in the text band at the top, to the right of the
 * V⃗_p key and clear of the r_p value at the right corner, so it never moves while r_p is dragged
 * (the V_p key is the only text it follows, and that one does not change). Its boxes are the
 * obstacles the v∞ labels keep off. Pure, in the frame's pixels.
 */
import { mathTextWidth } from '../../../lib/mathNotation';
import { textBox, type Box } from '../../lab/labelClearance';
import { formatTimeScale, timeScaleLabel } from '../../lab/timeScaleFormat';

/** The badge's own sizes (TimeScaleBadgeSvg): the factor 14 px, its words 12 px, 16 px below. */
const FACTOR_SIZE = 14;
const WORDS_SIZE = 12;
const LINE_GAP = 16;
/** Baseline of the factor: the two lines centre on the band's axis, with the corner texts. */
const FACTOR_BASELINE = 12;
/** Gap between the V_p key's text and the badge. */
const KEY_GAP = 12;
/** The text band's height (PlanetFrame's TEXT_BAND, less the descenders' room): nothing below. */
export const SCALE_BAND_BOTTOM = 32;

export interface ScaleBadgeSpot {
  /** Start of both lines and baseline of the first (the second is LINE_GAP below). */
  x: number;
  y: number;
  boxes: readonly Box[];
}

export function scaleBadgeSpot(keyRight: number, factor: number): ScaleBadgeSpot {
  const x = keyRight + KEY_GAP;
  const y = FACTOR_BASELINE;
  const words = timeScaleLabel(factor);
  const wordsBox = (): Box => {
    const at = { x, y: y + LINE_GAP };
    const base = textBox(at, words ?? '', WORDS_SIZE, 'start');
    return { ...base, right: x + mathTextWidth(words ?? '', WORDS_SIZE, 'sans') };
  };
  const factorBox = textBox({ x, y }, formatTimeScale(factor), FACTOR_SIZE, 'start');
  return { x, y, boxes: words === undefined ? [factorBox] : [factorBox, wordsBox()] };
}
