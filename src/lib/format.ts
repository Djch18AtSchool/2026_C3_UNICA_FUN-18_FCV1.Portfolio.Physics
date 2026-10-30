const NARROW_NBSP = ' ';
/** U+2212, the typographic minus sign: never the ASCII hyphen-minus in a printed number. */
export const MINUS_SIGN = '\u2212';
const NOT_A_NUMBER = '—';
const DEFAULT_PRECISION = 2;
/** Degree, minute and second of arc: written against the number, "97,5°" (SI Brochure §5.4.3). */
const ATTACHED_UNITS: ReadonlySet<string> = new Set(['°', '′', '″']);

export interface FormatNumberOptions {
  precision?: number;
  unit?: string;
}

/**
 * Spanish-style number: U+2212 minus, decimal comma, U+202F thousands, optional unit after a
 * U+202F (none before °, ′ and ″). Locale independent.
 */
export function formatNumber(value: number, options: FormatNumberOptions = {}): string {
  if (!Number.isFinite(value)) return NOT_A_NUMBER;
  const { precision = DEFAULT_PRECISION, unit } = options;
  const magnitude = Math.abs(value).toFixed(precision);
  // A negative value that rounds to zero (and −0 itself) must not print as "−0,00".
  const sign = value < 0 && Number(magnitude) !== 0 ? MINUS_SIGN : '';
  const [integerPart, fractionPart] = magnitude.split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
  const digits = fractionPart === undefined ? grouped : `${grouped},${fractionPart}`;
  const text = `${sign}${digits}`;
  if (!unit) return text;
  return ATTACHED_UNITS.has(unit) ? `${text}${unit}` : `${text}${NARROW_NBSP}${unit}`;
}
