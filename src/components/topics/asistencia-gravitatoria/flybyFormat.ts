/** Text helpers of the flyby laboratory: signed values and the time-lapse factor. */
import { formatNumber } from '../../../lib/format';

/** U+2212, the true minus sign of every signed text in the topic. */
export const MINUS = '−';
/** The time-lapse factor is rounded to this many significant digits: it is an order of size. */
const LAPSE_DIGITS = 2;

/** "+9,94 km/s", "−2,13 km/s" (U+2212), and no sign when the value rounds to zero. */
export function signed(value: number, precision: number, unit?: string): string {
  const text = formatNumber(Math.abs(value), { precision, unit });
  if (Number(Math.abs(value).toFixed(precision)) === 0) return text;
  return `${value < 0 ? MINUS : '+'}${text}`;
}

/** How many times faster than real a pass of `seconds` plays in `playback` s, to two digits. */
export function lapseFactorText(seconds: number, playback: number): string {
  return formatNumber(Number((seconds / playback).toPrecision(LAPSE_DIGITS)), { precision: 0 });
}
