/**
 * The type rule's last mile (README, «Notación matemática»): a letter that names a magnitude is
 * written as a formula, `$v$`, never loose in a sentence. A loose letter is drawn upright in the
 * text's face, so «con t» and «con $t$» read as two different things.
 *
 * The criterion is explicit and mechanical: a single letter, standing alone between spaces or
 * punctuation, outside every formula, that the same page uses as a variable in its formulas (its
 * magnitudes: the letters of its `$…$` and its equations). Three things are not magnitudes:
 * - a Spanish word: «a», «o», «y» are flagged only where no word could stand (before «=» or «(»,
 *   or after an article: «el e de una pelota»); «e» and «u» are words only where Spanish uses
 *   them, before an «i»/«hi» (or a «y», or a formula) and an «o»/«ho»;
 * - a unit: after a number («900 m», «3 h», «12 N»), alone in parentheses («(m)», «(d)») or after
 *   a degree sign («°C»);
 * - a name the guard is told about (an exception with its reason, at the call site).
 * Greek letters are always magnitudes.
 */
import { splitInlineMath } from './inlineSegments';

/** Letters that are also Spanish words: a symbol only where a word could not stand. */
const WORD_LETTERS = new Set(['a', 'e', 'o', 'u', 'y', 'A', 'O', 'Y']);
/** «e» and «u» are words only before these: «elásticas e inelásticas», «x e §», «siete u ocho». */
const WORD_ONLY_BEFORE: Readonly<Record<string, RegExp>> = {
  e: /^[\s\u00a0]+(?:[iíIÍyY§]|[hH][iíIÍ])/u,
  u: /^[\s\u00a0]+(?:[oóOÓ]|[hH][oóOÓ])/u,
};
/** Letters that are units after a number: «900 m», «2 s», «3 h», «1 d», «12 N», «5 J», «8 W». */
const UNIT_LETTERS = new Set(['m', 's', 'h', 'd', 'g', 'N', 'J', 'W']);
const UNIT_IN_PARENTHESES = { before: /\($/u, after: /^\)/u };
const GREEK = 'α-ωΑ-Ωϑϕϵ';
const LETTER = new RegExp(`[A-Za-z${GREEK}]`, 'u');
/** What may sit right before a loose letter: not a letter, digit or the pieces of a formula. */
const LEFT_JOINED = new RegExp(`[\\p{L}\\p{N}\\\\$_^'’′.\\-/·°${GREEK}]`, 'u');
/** What may sit right after it: not a letter, digit, index, prime, power, unit slash or hyphen. */
const RIGHT_JOINED = new RegExp(`[\\p{L}\\p{N}_^'’′²³⁻¹/·\\-]`, 'u');
const NUMBER_BEFORE = /[\d§][\s\u00a0\u202f]*$/u;
const ARTICLE_BEFORE = /(?:^|[\s(«])(?:el|la|los|las|un|una|del|al)[\s\u00a0]+$/iu;
/** A formula goes on: a relation after the letter, or its argument right after it («e(v)»). */
const FORMULA_AFTER = /^(?:[\s\u00a0]*[=<>≤≥≈]|\()/u;
/** Code spans and URLs are not prose. */
const NOT_PROSE = /`[^`]*`|https?:\/\/\S+/gu;
const INTERPOLATION_START = '${';
/** A template interpolation's value stands for one number or word: a placeholder. */
const INTERPOLATED = '0';

/** `text` with each template interpolation `${…}` (braces balanced) replaced by a placeholder. */
export function withoutInterpolations(text: string): string {
  const start = text.indexOf(INTERPOLATION_START);
  if (start < 0) return text;
  let depth = 0;
  for (let i = start + 1; i < text.length; i++) {
    depth += text[i] === '{' ? 1 : text[i] === '}' ? -1 : 0;
    if (depth === 0) {
      return text.slice(0, start) + INTERPOLATED + withoutInterpolations(text.slice(i + 1));
    }
  }
  return text.slice(0, start);
}

export interface LooseSymbol {
  letter: string;
  /** The text around it, to find it in its source. */
  context: string;
}

/** The text outside every `$…$` formula, each formula replaced by a placeholder. */
function proseOnly(text: string): string {
  return splitInlineMath(withoutInterpolations(text).replace(NOT_PROSE, ' '))
    .map((segment) => (segment.kind === 'text' ? segment.text : '§'))
    .join('');
}

function isWordHere(letter: string, before: string, after: string): boolean {
  if (!WORD_LETTERS.has(letter)) return false;
  if (FORMULA_AFTER.test(after) || ARTICLE_BEFORE.test(before)) return false;
  return WORD_ONLY_BEFORE[letter]?.test(after) ?? true;
}

function isUnit(letter: string, before: string, after: string): boolean {
  if (!UNIT_LETTERS.has(letter)) return false;
  const isInParentheses =
    UNIT_IN_PARENTHESES.before.test(before) && UNIT_IN_PARENTHESES.after.test(after);
  return NUMBER_BEFORE.test(before) || isInParentheses;
}

function isLoose(text: string, index: number, symbols: ReadonlySet<string>): boolean {
  const letter = text[index];
  const before = text.slice(0, index);
  const after = text.slice(index + 1);
  if (LEFT_JOINED.test(before.at(-1) ?? ' ') || RIGHT_JOINED.test(after[0] ?? ' ')) return false;
  if (!symbols.has(letter) && !new RegExp(`[${GREEK}]`, 'u').test(letter)) return false;
  return !isUnit(letter, before, after) && !isWordHere(letter, before, after);
}

const CONTEXT_CHARS = 32;

/** Every loose magnitude letter of `text`, with a little of the text around it. */
export function looseSymbols(text: string, symbols: ReadonlySet<string>): LooseSymbol[] {
  const prose = proseOnly(text);
  return [...prose].flatMap((char, index) =>
    LETTER.test(char) && isLoose(prose, index, symbols)
      ? [
          {
            letter: char,
            context: prose
              .slice(Math.max(0, index - CONTEXT_CHARS), index + CONTEXT_CHARS)
              .replace(/\s+/gu, ' '),
          },
        ]
      : [],
  );
}

/** LaTeX that names no variable: text, roman words and units, operator names, colours. */
const TEX_WORDS = /\\(?:text\w*|mathrm|operatorname|mathbf|textrm|color|begin|end)\{[^{}]*\}/gu;
const TEX_GREEK: Readonly<Record<string, string>> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  varepsilon: 'ε',
  epsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  vartheta: 'θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  phi: 'φ',
  varphi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Delta: 'Δ',
  Omega: 'Ω',
  Phi: 'Φ',
};
/** A subscript is a label (`r_p`, `v_\text{rel}`), not a variable of its own. */
const SUBSCRIPT = /_(?:\{[^{}]*\}|\\?[A-Za-z0-9])/gu;
const COMMAND = /\\([A-Za-z]+)/gu;

/** The variables a formula writes: its single letters, outside commands, words and subscripts. */
export function texVariables(tex: string): string[] {
  const plain = tex.replace(TEX_WORDS, ' ').replace(SUBSCRIPT, ' ');
  const greek = [...plain.matchAll(COMMAND)].flatMap(([, name]) => TEX_GREEK[name] ?? []);
  const latin = plain.replace(COMMAND, ' ').match(/[A-Za-z]/gu) ?? [];
  return [...latin, ...greek];
}
