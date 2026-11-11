/**
 * Where the planet frame's time-scale badge goes: in the text band at the top, centred between the
 * V⃗_p key and the widest r_p value the frame prints (so it neither reads as part of the key nor
 * moves while r_p is dragged), clear of both. Its boxes are the obstacles the v∞ labels keep off.
 * Pure, in the frame's pixels.
 */
import { mathTextWidth } from '../../../lib/mathNotation';
import { textBox, type Box } from '../../lab/labelClearance';
import { formatTimeScale, timeScaleLabel } from '../../lab/timeScaleFormat';

/**
 * TimeScaleBadgeSvg's own sizes, copied (it does not export them): the factor 14 px, its words
 * 12 px, the words one LINE_GAP below. A test renders the shared badge and compares.
 */
export const FACTOR_SIZE = 14;
export const WORDS_SIZE = 12;
export const LINE_GAP = 16;
/**
 * Baseline of the factor: low enough that its line box (14 px of Plex Mono reaches 14,4 px above
 * the baseline) stays inside the svg, which a check of the figures' texts requires.
 */
const FACTOR_BASELINE = 16;
/** The least gap to the V_p key and to the r_p value. */
const MIN_GAP = 8;

export interface ScaleBadgeSpot {
  /** Start of both lines and baseline of the first (the second is LINE_GAP below). */
  x: number;
  y: number;
  boxes: readonly Box[];
}

export function scaleBadgeSpot(
  keyRight: number,
  valueLeft: number,
  factor: number,
): ScaleBadgeSpot {
  const y = FACTOR_BASELINE;
  const words = timeScaleLabel(factor);
  const factorText = formatTimeScale(factor);
  const factorWidth = textBox({ x: 0, y }, factorText, FACTOR_SIZE, 'start').right;
  const wordsWidth = words === undefined ? 0 : mathTextWidth(words, WORDS_SIZE, 'sans');
  const width = Math.max(factorWidth, wordsWidth);
  const x = keyRight + Math.max(MIN_GAP, (valueLeft - keyRight - width) / 2);
  const factorBox = textBox({ x, y }, factorText, FACTOR_SIZE, 'start');
  if (words === undefined) return { x, y, boxes: [factorBox] };
  const base = textBox({ x, y: y + LINE_GAP }, words, WORDS_SIZE, 'start');
  return { x, y, boxes: [factorBox, { ...base, right: x + wordsWidth }] };
}
