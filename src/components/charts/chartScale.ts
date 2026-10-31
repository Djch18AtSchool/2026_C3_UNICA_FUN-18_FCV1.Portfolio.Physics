/** Format a tick with the Spanish decimal comma and no trailing zeros ("2,50" → "2,5", "5,0" → "5"). */
export function trimTrailingZeros(text: string): string {
  return text.includes(',') ? text.replace(/,?0+$/, '') : text;
}
