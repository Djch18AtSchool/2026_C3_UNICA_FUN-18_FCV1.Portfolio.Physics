/**
 * The time scale a lab declares on its canvas (TimeScaleBadge): «×20», «×0,25», «×19 000», the
 * short word that goes with it and the sentence a screen reader says. The factor is simulated
 * seconds per real second; it is an order of size, so it is rounded to two significant digits.
 */
import { formatNumber } from '../../lib/format';
import { mathAriaLabel } from '../../lib/inlineMath';

export const TIMES_SIGN = '×';
const SIGNIFICANT_DIGITS = 2;
const UNKNOWN = '—';
/** Within this of 1 the factor reads «×1», so it is real time. */
const REAL_TIME_SLACK = 0.005;

const isFactor = (factor: number) => Number.isFinite(factor) && factor > 0;

/** The factor with two significant digits, decimal comma and U+202F thousands: «19 000», «0,25». */
function factorNumber(factor: number): string {
  const rounded = Number(factor.toPrecision(SIGNIFICANT_DIGITS));
  const decimals = Math.max(0, SIGNIFICANT_DIGITS - 1 - Math.floor(Math.log10(rounded)));
  const text = formatNumber(rounded, { precision: decimals });
  return text.includes(',') ? text.replace(/,?0+$/u, '') : text;
}

/** «×20», «×0,25», «×19 000»; «×—» for a factor that is not a positive finite number. */
export function formatTimeScale(factor: number): string {
  return `${TIMES_SIGN}${isFactor(factor) ? factorNumber(factor) : UNKNOWN}`;
}

/** «velocidad real» at ×1, «cámara rápida» above, «cámara lenta» below; none without a factor. */
export function timeScaleLabel(factor: number): string | undefined {
  if (!isFactor(factor)) return undefined;
  if (Math.abs(factor - 1) < REAL_TIME_SLACK) return 'velocidad real';
  return factor > 1 ? 'cámara rápida' : 'cámara lenta';
}

/**
 * What a screen reader says: «Escala de tiempo: 20 veces la velocidad real, cámara rápida»; at ×1
 * «Escala de tiempo: velocidad real». A label with $…$ is said in words (mathAriaLabel).
 */
export function timeScaleSpoken(factor: number, label?: string): string {
  if (!isFactor(factor)) return 'Escala de tiempo: sin definir';
  const isRealTime = timeScaleLabel(factor) === 'velocidad real';
  const scale = isRealTime ? 'velocidad real' : `${factorNumber(factor)} veces la velocidad real`;
  const spokenLabel = label === undefined ? undefined : (mathAriaLabel(label) ?? label);
  const suffix = spokenLabel && spokenLabel !== scale ? `, ${spokenLabel}` : '';
  return `Escala de tiempo: ${scale}${suffix}`;
}
