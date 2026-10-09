const NARROW_NBSP = ' ';
const NOT_A_NUMBER = '—';
const DEFAULT_PRECISION = 2;

export interface FormatNumberOptions {
  precision?: number;
  unit?: string;
}

/** Spanish-style number: decimal comma, U+202F thousands, optional unit. Locale independent. */
export function formatNumber(value: number, options: FormatNumberOptions = {}): string {
  if (!Number.isFinite(value)) return NOT_A_NUMBER;
  const { precision = DEFAULT_PRECISION, unit } = options;
  const [integerPart, fractionPart] = value.toFixed(precision).split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
  const text = fractionPart === undefined ? grouped : `${grouped},${fractionPart}`;
  return unit ? `${text}${NARROW_NBSP}${unit}` : text;
}
