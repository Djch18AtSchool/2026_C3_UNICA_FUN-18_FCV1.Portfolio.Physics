import {
  MATH_SYMBOL_RANGES,
  PLEX_MONO_RANGES,
  PLEX_SANS_RANGES,
  type CodeRange,
} from './plexCoverage';

const NO_BREAK_SPACE = ' ';
/** A space before a standalone numeral, Arabic (1, 10) or Roman (I, IV), maybe with : , . or ; */
const SPACE_BEFORE_NUMERAL = / (?=(?:\d+|[IVXLC]+)[:,.;]?(?:\s|$))/g;

/**
 * Joins each standalone numeral to the word before it with a no-break space, so a wrapped
 * heading never strands "1" or "I" at the start of a line ("Fórmula 1", "Física I").
 */
export function bindNumerals(text: string): string {
  return text.replace(SPACE_BEFORE_NUMERAL, NO_BREAK_SPACE);
}

export type PlexFamily = 'sans' | 'mono';

/**
 * What each family's stack draws: Plex Sans, then the «Plex Symbols» face that follows it in the
 * sans stack (src/styles/math.css: → ∞ ≈ ≤ ≥ ⋅ … from KaTeX_Main); Plex Mono alone.
 */
const FAMILY_RANGES: Readonly<Record<PlexFamily, readonly CodeRange[]>> = {
  sans: [...PLEX_SANS_RANGES, ...MATH_SYMBOL_RANGES],
  mono: PLEX_MONO_RANGES,
};

const inRanges = (char: string, ranges: readonly CodeRange[]) => {
  const point = char.codePointAt(0) ?? -1;
  return ranges.some(([from, to]) => point >= from && point <= to);
};

/** True when IBM Plex Sans itself has a glyph for `char` (not the symbol face after it). */
export function isPlexSansGlyph(char: string): boolean {
  return inRanges(char, PLEX_SANS_RANGES);
}

/**
 * U+202F (narrow no-break space, formatNumber's thousands and unit separator) is not in Plex's
 * cmap, but no fallback font draws it: HarfBuzz, the shaper of Chromium and Firefox on every
 * platform, substitutes the font's own space at half its width (measured in Chromium 156 on
 * 2026-11-10: 0,30 em in Plex Mono, 0,12 em in Plex Sans, the platform font list naming only
 * IBM Plex). A space has no ink, so the reader sees Plex's spacing, not another family.
 * Measured in WebKit (the WPE port of Playwright on Linux, 2026-11-13), not Chromium's way: a
 * fallback font supplies it there, 0,20 em in both families (against 0,12 em in Plex Sans and
 * 0,30 em in Plex Mono in Chromium). Cosmetic and inkless: a readout like «265,63 m» is a pixel
 * or three wider or narrower, and nothing overflows or misaligns.
 */
const SYNTHESIZED_SPACES: ReadonlySet<string> = new Set([' ']);

/** The DOM's collapsible whitespace: never drawn as a glyph. */
const LAYOUT_WHITESPACE: ReadonlySet<string> = new Set(['\t', '\n', '\r', '\f']);

/** True when the site's stack of `family` draws `char` in every face the site loads. */
export function isCovered(char: string, family: PlexFamily = 'sans'): boolean {
  if (SYNTHESIZED_SPACES.has(char) || LAYOUT_WHITESPACE.has(char)) return true;
  return inRanges(char, FAMILY_RANGES[family]);
}

/**
 * The characters of `text` that the site's stack of `family` does not draw, each once, in order
 * of first appearance: the browser would take them from a fallback font. A combining mark
 * (U+20D7, the vector arrow) counts as its own character. The coverage list is
 * src/lib/plexCoverage.ts, derived from the font files by scripts/font-data.ts.
 */
export function uncoveredChars(text: string, family: PlexFamily = 'sans'): string[] {
  return [...new Set(text)].filter((char) => !isCovered(char, family));
}

/** Marks of the notation that must never reach a reader as text: a subscript, a power or a formula written raw. */
export const RAW_NOTATION_MARKS = ['_', '^', '$'] as const;

/**
 * Real names that hold an underscore: files ("contact_solver.c", "tcurve_F3soft.lut"), constants
 * ("DY_REF", "MPC_XY_CRUISE"), and any web address, shown as the source's link text. Each part has two
 * characters or more; a subscript written raw ("F_z", "v_y1", "T_mín") starts from a single letter.
 */
const LITERAL_NAME = /https?:\/\/\S+|[A-Za-z]{2,}(?:_[A-Za-z0-9]{2,})+/g;

/** The notation marks left in `text` once real names are set aside: a raw `F_z`, `10^-7` or `$`. */
export function rawNotationMarks(text: string): string[] {
  const rest = text.replace(LITERAL_NAME, '');
  return RAW_NOTATION_MARKS.filter((mark) => rest.includes(mark));
}

/*
 * ---- The type rule (E3, src/styles/math.css): what tests/e2e/glyphs.spec.ts checks per element ----
 */

/** Where a drawn text sits: a display equation is KaTeX's own, the rest follows the page's type. */
export type TextSetting = 'display-math' | 'inline-math' | 'figure' | 'text';

/** One font the browser used for an element's text (DevTools' CSS.getPlatformFontsForNode). */
export interface DrawnFont {
  familyName: string;
  glyphCount: number;
}

export interface DrawnText {
  /** The element's own text. */
  text: string;
  setting: TextSetting;
  /** The first family of its computed font-family. */
  family: string;
  fontStyle: string;
  /** Inside NUMBERING_SELECTOR: the one place for Plex Mono. */
  isNumbering: boolean;
  /** No child element holds text: the fonts are its own (the browser adds an inline child's). */
  isLeaf: boolean;
  /** A variable of an inline formula (KaTeX's `mathnormal`), not a unit or a `\text{…}`. */
  isMathVariable: boolean;
  fonts: readonly DrawnFont[];
}

/**
 * The notebook's numbering, the one place for Plex Mono: the `numbering` utility, the «Por qué»
 * labels, citations [n], source addresses and connection numbers, code, and the diagrams' panel
 * titles, detail marks and equation numbers.
 */
export const NUMBERING_SELECTOR = [
  '.numbering',
  '.why-label',
  '.cite',
  '.source-url',
  '.connections-number',
  'code, kbd, samp, pre',
  '.hd-title, .hd-mark-label',
  '.wd-title, .wd-mark-label, .wd-tag',
].join(', ');

const KATEX_FONT = /^KaTeX_/;
const MONO_FAMILY = /^IBM Plex Mono/;
const LOWER_GREEK = /[α-ω]/u;
const LATIN_LETTER = /[A-Za-z]/;
const ITALIC = 'italic';

/** Characters of `text` that Plex Sans has no glyph for (all occurrences, whitespace aside). */
const nonPlexCount = (text: string) =>
  [...text].filter((char) => char.trim() !== '' && !isPlexSansGlyph(char)).length;

/**
 * How `drawn` breaks the type rule, in words (empty when it keeps it): KaTeX's faces draw only
 * what Plex lacks (outside a display equation), Plex Mono only numbers, and a lowercase Greek
 * letter, a variable, is italic.
 */
export function typeRuleViolations(drawn: DrawnText): string[] {
  if (drawn.setting === 'display-math') return [];
  const katexGlyphs = drawn.fonts
    .filter((font) => KATEX_FONT.test(font.familyName))
    .reduce((sum, font) => sum + font.glyphCount, 0);
  const extra = drawn.isLeaf ? katexGlyphs - nonPlexCount(drawn.text) : 0;
  return [
    ...(extra > 0 ? [`KaTeX dibuja ${extra} letras o cifras que Plex tiene`] : []),
    ...(MONO_FAMILY.test(drawn.family) && !drawn.isNumbering
      ? ['Plex Mono fuera de la numeración (un valor va en Plex Sans)']
      : []),
    ...(LOWER_GREEK.test(drawn.text) && drawn.fontStyle !== ITALIC
      ? ['griego en minúscula, recto (una variable va en cursiva)']
      : []),
    ...(drawn.isMathVariable && LATIN_LETTER.test(drawn.text) && drawn.fontStyle !== ITALIC
      ? ['variable latina de una fórmula, recta (una variable va en cursiva)']
      : []),
  ];
}

/** A stretch of a figure label (an SVG <text>) as the browser set it. */
export interface LabelRun {
  text: string;
  isItalic: boolean;
  /** A sub- or superscript (MathText's tspan at 75 %). */
  isScript: boolean;
}

/**
 * Whole labels that are names, not variables: the stops A, B and C of Tema 1's route, and M, the
 * electrical symbol of the motor in Tema 6's power flow (a letter in a circle).
 */
const FIGURE_LETTER_NAMES: ReadonlySet<string> = new Set(['A', 'B', 'C', 'M']);
/** After a variable, maybe past spaces: a relation (T = 4,92 s, K′ = 6 J, r ≈ 2). */
const RELATION_AFTER = /^\s*[=≈≠<>≤≥′']/u;
/** A letter or a figure next to the letter makes it part of a word, an acronym or a model. */
const WORD_CHAR = /[\p{L}\p{N}]/u;

interface LabelChar {
  char: string;
  isItalic: boolean;
  isScript: boolean;
}

/** True when the upright base letter at `i` reads as a variable: a script, a relation or a call follows. */
function readsAsVariable(chars: readonly LabelChar[], i: number): boolean {
  const before = chars[i - 1];
  const after = chars[i + 1];
  if (before && !before.isScript && WORD_CHAR.test(before.char)) return false;
  if (after?.isScript) return true;
  if (after && WORD_CHAR.test(after.char)) return false;
  if (after?.char === '(') return true;
  const rest = chars
    .slice(i + 1)
    .map((c) => c.char)
    .join('');
  return RELATION_AFTER.test(rest);
}

/**
 * The upright Latin letters of a figure label that name a variable (E3's rule: a variable is
 * italic, in a figure as in the text): a single letter followed by a sub- or superscript
 * («t_h», «vec v_0»), by a relation («T = 4,92 s», «m B ≈ …») or by a call («y(t)»), or a
 * whole label of one letter («vec v») that is not a name (the stops A, B, C; the motor M). A unit after a
 * number («4,00 m», «1 g»), a word («y», «a») and an acronym («C3», «RPM») pass.
 */
export function uprightFigureVariables(runs: readonly LabelRun[]): string[] {
  const chars = runs.flatMap((run) =>
    [...run.text].map((char) => ({ char, isItalic: run.isItalic, isScript: run.isScript })),
  );
  const label = chars
    .map((c) => c.char)
    .join('')
    .trim();
  return chars.flatMap((c, i) => {
    if (c.isItalic || c.isScript || !LATIN_LETTER.test(c.char)) return [];
    const isWholeLabel = label === c.char && !FIGURE_LETTER_NAMES.has(c.char);
    return isWholeLabel || readsAsVariable(chars, i) ? [c.char] : [];
  });
}

const DECIMALS = 2;

/** An inline formula set at another size than its text's (KaTeX's own is 1,21 em). */
export function inlineMathSizeViolation(size: number, parentSize: number): string | undefined {
  if (size === parentSize) return undefined;
  const ratio = (size / parentSize).toFixed(DECIMALS).replace('.', ',');
  return `fórmula en línea a ${ratio} em de su texto (va a 1 em)`;
}
