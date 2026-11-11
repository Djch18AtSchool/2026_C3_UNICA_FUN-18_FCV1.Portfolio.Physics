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
/**
 * Baseline of the factor: low enough that its line box (14 px of Plex Mono reaches 14,4 px above
 * the baseline) stays inside the svg, which a check of the figures' texts requires.
 */
const FACTOR_BASELINE = 16;
/** Gap between the V_p key's text and the badge. */
const KEY_GAP = 12;
/**
 * The lowest the badge's boxes reach: the words' descenders go a few px past PlanetFrame's 30 px
 * text band, where the drawing starts, so the e2e checks that no stroke or text meets it.
 */
export const SCALE_BAND_BOTTOM = 36;

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
