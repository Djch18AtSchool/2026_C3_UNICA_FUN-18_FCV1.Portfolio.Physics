/**
 * Mathematical Italic letters (U+1D434…; ℎ for h): how the notation of figure labels
 * (src/lib/mathNotation.ts) marks a variable, so «$r_p$» keeps r and p in italic once it is plain
 * text. MathText draws each as the ASCII letter in Plex Sans Italic; speech and widths read it back.
 */

/** Offsets of the Mathematical Italic capitals and small letters from A and a (U+1D434, U+1D44E). */
const ITALIC_CAPITAL_A = 0x1d434;
const ITALIC_SMALL_A = 0x1d44e;
const LETTERS_IN_ALPHABET = 26;
/** U+1D455 is unassigned: the italic h is the Planck constant ℎ (U+210E). */
const ITALIC_H = 'ℎ';
const CAPITAL_A = 'A'.codePointAt(0) ?? 0;
const SMALL_A = 'a'.codePointAt(0) ?? 0;

/** The Mathematical Italic letter of an ASCII letter (h → ℎ); anything else unchanged. */
export function mathItalic(char: string): string {
  if (char === 'h') return ITALIC_H;
  const point = char.codePointAt(0) ?? 0;
  if (/^[A-Z]$/.test(char)) return String.fromCodePoint(ITALIC_CAPITAL_A + point - CAPITAL_A);
  if (/^[a-z]$/.test(char)) return String.fromCodePoint(ITALIC_SMALL_A + point - SMALL_A);
  return char;
}

/** The ASCII letter of a Mathematical Italic one, or undefined for any other character. */
export function plainOfItalic(char: string): string | undefined {
  if (char === ITALIC_H) return 'h';
  const point = char.codePointAt(0) ?? 0;
  const capital = point - ITALIC_CAPITAL_A;
  if (capital >= 0 && capital < LETTERS_IN_ALPHABET)
    return String.fromCodePoint(CAPITAL_A + capital);
  const small = point - ITALIC_SMALL_A;
  if (small >= 0 && small < LETTERS_IN_ALPHABET) return String.fromCodePoint(SMALL_A + small);
  return undefined;
}

/** The text with its Mathematical Italic letters written as plain ASCII (for speech and widths). */
export function plainLetters(text: string): string {
  return [...text].map((char) => plainOfItalic(char) ?? char).join('');
}
