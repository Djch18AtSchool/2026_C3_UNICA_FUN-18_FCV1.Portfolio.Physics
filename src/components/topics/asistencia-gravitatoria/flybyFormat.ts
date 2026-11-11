/** Text helpers of the flyby laboratory: signed values and the time-lapse factor. */
import { formatNumber } from '../../../lib/format';
import { formatTimeScale, TIMES_SIGN } from '../../lab/timeScaleFormat';

/** U+2212, the true minus sign of every signed text in the topic. */
export const MINUS = '−';

/** "+9,94 km/s", "−2,13 km/s" (U+2212), and no sign when the value rounds to zero. */
export function signed(value: number, precision: number, unit?: string): string {
  const text = formatNumber(Math.abs(value), { precision, unit });
  if (Number(Math.abs(value).toFixed(precision)) === 0) return text;
  return `${value < 0 ? MINUS : '+'}${text}`;
}

/** A planet radius as a unit in HTML (InlineMath): «R_J» → «$R_\mathrm{J}$»; others unchanged. */
export function unitTex(unit: string): string {
  const radius = /^R_([A-Z])$/.exec(unit);
  return radius ? `$R_\\mathrm{${radius[1]}}$` : unit;
}

/** How many times faster than real a pass of `seconds` plays in `playback` s: the clock's time scale. */
export const nominalFactor = (seconds: number, playback: number): number => seconds / playback;

/**
 * That factor as the canvas's badge writes it, without its sign («19 000»): the note and the badge
 * share one rounding (formatTimeScale), so they cannot say different numbers.
 */
export function lapseFactorText(seconds: number, playback: number): string {
  return formatTimeScale(nominalFactor(seconds, playback)).replace(TIMES_SIGN, '');
}
