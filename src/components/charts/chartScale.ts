const TARGET_TICK_COUNT = 4;
const MAX_TICK_DECIMALS = 3;

/** Decimals that tell apart ticks spaced about span / 4 (10 → 1, 1 → 2, 0.1 → 3). */
export function tickPrecision(span: number): number {
  if (!Number.isFinite(span) || span <= 0) return 2;
  const step = span / TARGET_TICK_COUNT;
  const decimals = Math.ceil(-Math.log10(step)) + 1;
  return Math.min(Math.max(decimals, 0), MAX_TICK_DECIMALS);
}

/** Format a tick with the Spanish decimal comma and no trailing zeros ("2,50" → "2,5", "5,0" → "5"). */
export function trimTrailingZeros(text: string): string {
  return text.includes(',') ? text.replace(/,?0+$/, '') : text;
}
