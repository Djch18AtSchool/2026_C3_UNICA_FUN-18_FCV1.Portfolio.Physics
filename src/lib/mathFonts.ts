/**
 * Which characters of a figure label are set in KaTeX's fonts instead of IBM Plex: every Greek
 * letter (Plex Mono has none, and the equations set them in KaTeX) and the symbols Plex lacks.
 * katex.min.css, imported by BaseLayout on every page, declares both families, so a label that
 * uses them downloads the same files the equations do. scripts/font-data.ts checks that each font
 * draws its characters and reads their advance widths.
 */

/** Lowercase Greek, italic as in the equations (KaTeX's \alpha … \omega). */
export const KATEX_MATH_CHARS = 'αβγδεζηθικλμνξοπρςστυφχψωϑϕϖϵϱ';

/** Uppercase Greek, upright (KaTeX's \Delta, \Omega), and the symbols Plex does not draw. */
export const KATEX_MAIN_CHARS = 'ΓΔΘΛΞΠΣΥΦΨΩ∞≈≤≥→←↔√∫⊥⊙∂∇∝≡∼⋅∓≪≫∥∠⇒';

export type MathFont = 'katex-main' | 'katex-math';

/** CSS font-family of each KaTeX face, with KaTeX's own serif fallback. */
export const MATH_FONT_FAMILY: Readonly<Record<MathFont, string>> = {
  'katex-main': 'KaTeX_Main, "Times New Roman", serif',
  'katex-math': 'KaTeX_Math, "Times New Roman", serif',
};

/** The KaTeX face that draws `char`, or undefined when the label's own Plex font does. */
export function mathFontOf(char: string): MathFont | undefined {
  if (KATEX_MATH_CHARS.includes(char)) return 'katex-math';
  if (KATEX_MAIN_CHARS.includes(char)) return 'katex-main';
  return undefined;
}

/** x-height and cap height in em, from the OS/2 tables (IBM Plex Sans and Mono share them). */
export const PLEX_HEIGHTS = { x: 0.516, cap: 0.698 } as const;
export const KATEX_HEIGHTS = { x: 0.442, cap: 0.683 } as const;

/**
 * KaTeX glyphs in a label are scaled so their x-height meets Plex's (≈ 1,17), the way KaTeX sets
 * its own formulas at 1,21 em beside body text; otherwise ∞ and ω look a size too small.
 */
export const KATEX_SCALE = PLEX_HEIGHTS.x / KATEX_HEIGHTS.x;
