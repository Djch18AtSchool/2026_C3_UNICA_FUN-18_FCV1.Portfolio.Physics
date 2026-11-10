import { PLEX_MONO_RANGES, PLEX_SANS_RANGES, type CodeRange } from './plexCoverage';

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

const FAMILY_RANGES: Readonly<Record<PlexFamily, readonly CodeRange[]>> = {
  sans: PLEX_SANS_RANGES,
  mono: PLEX_MONO_RANGES,
};

/**
 * U+202F (narrow no-break space, formatNumber's thousands and unit separator) is not in Plex's
 * cmap, but no fallback font draws it: HarfBuzz, the shaper of Chromium and Firefox on every
 * platform, substitutes the font's own space at half its width (measured in Chromium 156 on
 * 2026-11-10: 0,30 em in Plex Mono, 0,12 em in Plex Sans, the platform font list naming only
 * IBM Plex). A space has no ink, so the reader sees Plex's spacing, not another family.
 */
const SYNTHESIZED_SPACES: ReadonlySet<string> = new Set([' ']);

/** The DOM's collapsible whitespace: never drawn as a glyph. */
const LAYOUT_WHITESPACE: ReadonlySet<string> = new Set(['\t', '\n', '\r', '\f']);

/** True when IBM Plex of `family` draws `char` in every weight the site loads. */
export function isCovered(char: string, family: PlexFamily = 'sans'): boolean {
  if (SYNTHESIZED_SPACES.has(char) || LAYOUT_WHITESPACE.has(char)) return true;
  const point = char.codePointAt(0) ?? -1;
  return FAMILY_RANGES[family].some(([from, to]) => point >= from && point <= to);
}

/**
 * The characters of `text` that IBM Plex of `family` does not draw, each once, in order of first
 * appearance: the browser would take them from a fallback font. A combining mark (U+20D7, the
 * vector arrow) counts as its own character. The coverage list is src/lib/plexCoverage.ts,
 * derived from the font files by scripts/font-data.ts.
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
