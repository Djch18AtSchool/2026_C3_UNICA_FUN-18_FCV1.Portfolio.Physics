/**
 * The mini-notation of figure labels, for SVG text that cannot use KaTeX. Written in source as
 * plain text with three markers:
 *
 *   v_∞,in    subscript: `_` then a run up to a space, ( ) [ ] { } | / = + _ ^, or a comma
 *             followed by a space; `_{…}` holds anything (`a_{x y}`).
 *   10^-7     superscript, the same way; a leading - prints as U+2212.
 *   vec v     a vector: an arrow drawn over the next character (vec V_p → arrow over V only).
 *
 * `\_` and `\^` are literal. Greek letters and the symbols IBM Plex lacks (∞ ≈ ≤ ≥ → √ ∫ ⊥ ⊙ …)
 * are set in KaTeX's fonts (src/lib/mathFonts.ts); ☉ prints as KaTeX's ⊙ and ≠ as "=" with a
 * drawn stroke. Unicode sub- and superscripts (rₚ, 10⁻⁷) and the combining arrow U+20D7 are
 * rewritten into the notation first, so no label reaches the reader in a fallback font.
 * src/components/lab/MathText.tsx draws it; mathTextToString says it.
 */
import {
  KATEX_MAIN_ADVANCES,
  KATEX_MATH_ADVANCES,
  PLEX_MONO_ADVANCE,
  PLEX_SANS_ADVANCES,
} from './glyphAdvances';
import { KATEX_SCALE, mathFontOf, type MathFont } from './mathFonts';
import { spokenName } from './mathSpeech';
import { MINUS_SIGN } from './format';

export type Script = 'base' | 'sub' | 'sup';
export type LabelFamily = 'mono' | 'sans';

export type MathToken =
  | { kind: 'char'; char: string }
  | { kind: 'vector'; char: string }
  | { kind: 'script'; script: 'sub' | 'sup'; text: string };

/** A stretch of one font and script level; `mark` asks for a drawn arrow or negation stroke. */
export interface MathRun {
  text: string;
  font?: MathFont;
  script: Script;
  mark?: 'vector' | 'not';
}

/** Size of a sub- or superscript relative to the label. */
export const SCRIPT_SCALE = 0.75;
const PER_MILLE = 1000;
const STAND_IN_CHAR = 'n'.codePointAt(0) ?? 0;

// prettier-ignore
const SUBSCRIPTS: Readonly<Record<string, string>> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8',
  '₉': '9', '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')', 'ₐ': 'a', 'ₑ': 'e', 'ₒ': 'o',
  'ₓ': 'x', 'ₕ': 'h', 'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm', 'ₙ': 'n', 'ₚ': 'p', 'ₛ': 's', 'ₜ': 't',
};
// prettier-ignore
const SUPERSCRIPTS: Readonly<Record<string, string>> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8',
  '⁹': '9', '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')', 'ⁿ': 'n', 'ⁱ': 'i',
};
/** Superscripts Plex draws itself: a run made only of these stays as written ("km²/s²"). */
const PLEX_SUPERSCRIPTS = new Set(['¹', '²', '³']);
const COMBINING_ARROW = '\u20D7';
const SCRIPT_STOPS = new Set([' ', '\t', '\n', '(', ')', '[', ']', '{', '}', '|', '/', '=', '+']);
const MINUS_CHARS = new Set(['-', MINUS_SIGN]);
/** Characters drawn with another glyph, and their mark. */
const DISPLAY: Readonly<Record<string, { text: string; mark?: 'not' }>> = {
  '☉': { text: '⊙' },
  '≠': { text: '=', mark: 'not' },
};

const charClass = (table: Readonly<Record<string, string>>) =>
  `[${Object.keys(table)
    .join('')
    .replace(/[-[\]()]/g, '\\$&')}]+`;
const SUBSCRIPT_RUN = new RegExp(charClass(SUBSCRIPTS), 'g');
const SUPERSCRIPT_RUN = new RegExp(charClass(SUPERSCRIPTS), 'g');
const mapChars = (run: string, table: Readonly<Record<string, string>>) =>
  [...run].map((char) => table[char]).join('');

/** Rewrites Unicode sub- and superscripts and the combining arrow U+20D7 into the notation. */
export function normalizeNotation(source: string): string {
  return source
    .replace(SUBSCRIPT_RUN, (run) => `_{${mapChars(run, SUBSCRIPTS)}}`)
    .replace(SUPERSCRIPT_RUN, (run) =>
      [...run].every((char) => PLEX_SUPERSCRIPTS.has(char))
        ? run
        : `^{${mapChars(run, SUPERSCRIPTS)}}`,
    )
    .replace(new RegExp(`(.)${COMBINING_ARROW}`, 'gu'), 'vec $1');
}

/** End (exclusive) of an unbraced script run starting at `from`. */
function scriptRunEnd(chars: readonly string[], from: number): number {
  let end = from;
  while (end < chars.length) {
    const char = chars[end];
    const next = chars[end + 1];
    if (SCRIPT_STOPS.has(char) || char === '_' || char === '^') break;
    if (char === ',' && (next === undefined || next === ' ')) break;
    if (MINUS_CHARS.has(char) && end > from) break;
    end += 1;
  }
  return end;
}

/** The script's text and the index after it, for a marker at `at`. */
function readScript(chars: readonly string[], at: number): { text: string; next: number } {
  if (chars[at + 1] === '{') {
    const close = chars.indexOf('}', at + 2);
    const end = close === -1 ? chars.length : close;
    return { text: chars.slice(at + 2, end).join(''), next: end + 1 };
  }
  const end = scriptRunEnd(chars, at + 1);
  return { text: chars.slice(at + 1, end).join(''), next: end };
}

const isAsciiLetter = (char: string | undefined) => char !== undefined && /[A-Za-z]/.test(char);
const startsVector = (chars: readonly string[], i: number) =>
  chars.slice(i, i + 4).join('') === 'vec ' &&
  chars[i + 4] !== undefined &&
  chars[i + 4] !== ' ' &&
  !isAsciiLetter(chars[i - 1]);
const asScriptText = (text: string) =>
  [...text].map((char) => (MINUS_CHARS.has(char) ? MINUS_SIGN : char)).join('');

/** The notation as tokens: plain characters, vectors and sub- or superscripts. */
export function parseNotation(source: string): MathToken[] {
  const chars = [...normalizeNotation(source)];
  const tokens: MathToken[] = [];
  let i = 0;
  while (i < chars.length) {
    const char = chars[i];
    if (char === '\\' && (chars[i + 1] === '_' || chars[i + 1] === '^')) {
      tokens.push({ kind: 'char', char: chars[i + 1] });
      i += 2;
    } else if (char === '_' || char === '^') {
      const { text, next } = readScript(chars, i);
      tokens.push({
        kind: 'script',
        script: char === '_' ? 'sub' : 'sup',
        text: asScriptText(text),
      });
      i = next;
    } else if (startsVector(chars, i)) {
      tokens.push({ kind: 'vector', char: chars[i + 4] });
      i += 5;
    } else {
      tokens.push({ kind: 'char', char });
      i += 1;
    }
  }
  return tokens;
}

/** One character as a run: its displayed glyph, font, level and mark. */
function charRun(char: string, script: Script, mark?: 'vector'): MathRun {
  const display = DISPLAY[char];
  const text = display?.text ?? char;
  const font = mathFontOf(text);
  const runMark = mark ?? display?.mark;
  return { text, script, ...(font ? { font } : {}), ...(runMark ? { mark: runMark } : {}) };
}

const sameStyle = (a: MathRun, b: MathRun) =>
  a.font === b.font && a.script === b.script && !a.mark && !b.mark;

/** The notation as runs to draw, consecutive characters of one style merged. */
export function mathRuns(source: string): MathRun[] {
  const single = parseNotation(source).flatMap((token): MathRun[] => {
    if (token.kind === 'vector') return [charRun(token.char, 'base', 'vector')];
    if (token.kind === 'char') return [charRun(token.char, 'base')];
    return [...token.text].map((char) => charRun(char, token.script));
  });
  return single.reduce<MathRun[]>((runs, run) => {
    const last = runs.at(-1);
    if (last && sameStyle(last, run)) {
      return [...runs.slice(0, -1), { ...last, text: last.text + run.text }];
    }
    return [...runs, run];
  }, []);
}

const spokenChar = (char: string) => {
  const name = spokenName(char);
  return name === undefined ? char : ` ${name} `;
};

/** Collapses spaces and drops those that the padding of a name left before , ) or after (. */
const tidy = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;:.)\]])/g, '$1')
    .replace(/([([])\s+/g, '$1')
    .trim();

/** A script's content said aloud: commas get a pause, minus signs a word. */
function spokenScript(script: 'sub' | 'sup', text: string): string {
  if (script === 'sup' && text === '2') return ' al cuadrado';
  if (script === 'sup' && text === '3') return ' al cubo';
  const words = [...text]
    .map((char) => (char === MINUS_SIGN ? ' menos ' : char === ',' ? ', ' : spokenChar(char)))
    .join('');
  return `${script === 'sub' ? ' sub ' : ' a la '}${tidy(words)}`;
}

/**
 * The label as a screen reader should say it, in Spanish: «v sub infinito, in» for v_∞,in,
 * «10 a la menos 7», «vector V sub p», «módulo de delta v». Plain text comes back unchanged.
 */
export function mathTextToString(source: string): string {
  let bars = 0;
  const parts = parseNotation(source).map((token) => {
    if (token.kind === 'script') return spokenScript(token.script, token.text);
    if (token.kind === 'vector') return ` vector ${spokenChar(token.char)}`;
    if (token.char !== '|') return spokenChar(token.char);
    bars += 1;
    return bars % 2 === 1 ? ' módulo de ' : ' ';
  });
  return tidy(parts.join(''));
}

/** Advance of one character, in em, in the font the run uses. */
function advanceEm(char: string, font: MathFont | undefined, family: LabelFamily): number {
  if (font === 'katex-main') return (KATEX_MAIN_ADVANCES[char] ?? PER_MILLE) / PER_MILLE;
  if (font === 'katex-math') return (KATEX_MATH_ADVANCES[char] ?? PER_MILLE) / PER_MILLE;
  if (family === 'mono') return PLEX_MONO_ADVANCE / PER_MILLE;
  const point = char.codePointAt(0) ?? STAND_IN_CHAR;
  return (PLEX_SANS_ADVANCES[point] ?? PLEX_SANS_ADVANCES[STAND_IN_CHAR]) / PER_MILLE;
}

/** Size of a run relative to the label: scripts at 75 %, KaTeX glyphs at Plex's x-height. */
export function runScale(run: MathRun): number {
  return (run.script === 'base' ? 1 : SCRIPT_SCALE) * (run.font ? KATEX_SCALE : 1);
}

/** Width of one run, px, at the label's `fontSize`. */
export function runWidth(run: MathRun, fontSize: number, family: LabelFamily): number {
  const em = [...run.text].reduce((sum, char) => sum + advanceEm(char, run.font, family), 0);
  return em * fontSize * runScale(run);
}

/** Width (px) of a label in the notation, set at `fontSize` in Plex `family` (kerning aside). */
export function mathTextWidth(source: string, fontSize: number, family: LabelFamily): number {
  return mathRuns(source).reduce((sum, run) => sum + runWidth(run, fontSize, family), 0);
}
