/** Text helpers of the flyby laboratory: signed values, durations and the time-lapse factor. */
import { formatNumber } from '../../../lib/format';

/** U+2212, the true minus sign of every signed text in the topic. */
export const MINUS = '−';
const SECONDS_PER_HOUR = 3600;
const HOURS_PER_DAY = 24;
/** Up to this many hours a duration reads in hours; beyond, in days. */
const MAX_HOURS_SHOWN = 48;
const DURATION_DECIMALS = 1;
/** The time-lapse factor is rounded to this many significant digits: it is an order of size. */
const LAPSE_DIGITS = 2;

/** "+9,94 km/s", "−2,13 km/s" (U+2212), and no sign when the value rounds to zero. */
export function signed(value: number, precision: number, unit?: string): string {
  const text = formatNumber(Math.abs(value), { precision, unit });
  if (Number(Math.abs(value).toFixed(precision)) === 0) return text;
  return `${value < 0 ? MINUS : '+'}${text}`;
}

/** A duration in s as hours ("11,6 h") up to two days, then as days ("4,2 días"). */
export function durationText(seconds: number): string {
  const hours = seconds / SECONDS_PER_HOUR;
  if (hours <= MAX_HOURS_SHOWN)
    return formatNumber(hours, { precision: DURATION_DECIMALS, unit: 'h' });
  return formatNumber(hours / HOURS_PER_DAY, { precision: DURATION_DECIMALS, unit: 'días' });
}

/** How many times faster than real a pass of `seconds` plays in `playback` s, to two digits. */
export function lapseFactorText(seconds: number, playback: number): string {
  return formatNumber(Number((seconds / playback).toPrecision(LAPSE_DIGITS)), { precision: 0 });
}
