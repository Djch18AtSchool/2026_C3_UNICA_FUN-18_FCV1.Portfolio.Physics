/**
 * How a figure label (src/lib/mathNotation.ts) sets each character, by the site's type rule
 * (src/styles/math.css): everything in IBM Plex Sans, a variable in its italic, and the symbols
 * Plex lacks (→ ∞ ≈ ≤ ≥ ⋅ ⊙ …) from the «Math Symbols» face that follows Plex in the sans stack,
 * KaTeX_Main scaled to Plex's x-height. A label never names a font: the stack draws each glyph,
 * as in the prose and the controls. scripts/font-data.ts derives which symbols that face draws
 * (MATH_SYMBOL_RANGES) and their advances.
 */
import { MATH_SYMBOL_RANGES } from './plexCoverage';

/** Lowercase Greek: a variable, italic as in the inline formulas (KaTeX's \alpha … \omega). */
export const LOWER_GREEK = 'αβγδεζηθικλμνξοπρςστυφχψω';

/** True when the «Math Symbols» face draws `char` in the sans stack (Plex Sans has no glyph). */
export function isMathSymbol(char: string): boolean {
  const point = char.codePointAt(0) ?? -1;
  return MATH_SYMBOL_RANGES.some(([from, to]) => point >= from && point <= to);
}

/** x-height and cap height in em, from the OS/2 tables (IBM Plex Sans and Mono share them). */
export const PLEX_HEIGHTS = { x: 0.516, cap: 0.698 } as const;
export const KATEX_HEIGHTS = { x: 0.442, cap: 0.683 } as const;

/**
 * The «Math Symbols» face is scaled so KaTeX's x-height meets Plex's (≈ 1,17), the way KaTeX
 * sets its own formulas at 1,21 em beside body text; otherwise ∞ looks a size too small. math.css
 * writes it as the faces' size-adjust (MATH_SYMBOL_SIZE_ADJUST, checked by fontData.test.ts).
 */
export const KATEX_SCALE = PLEX_HEIGHTS.x / KATEX_HEIGHTS.x;
