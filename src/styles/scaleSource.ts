/**
 * Source plumbing for scaleScan.ts: blanking comments (offsets and lines kept, so a violation
 * still points at its line), finding string literals and CSS regions, and the `scale-exempt`
 * directive. Nothing here knows the scale.
 */

/** Replaces a span with spaces, keeping its newlines, so offsets and line numbers hold. */
export function blank(text: string): string {
  return text.replace(/[^\n]/g, ' ');
}

export function blankMatches(text: string, pattern: RegExp): string {
  return text.replace(pattern, (match) => blank(match));
}

export const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
export const HTML_COMMENT = /<!--[\s\S]*?-->/g;
export const JSX_COMMENT = /\{\/\*[\s\S]*?\*\/\}/g;

type JsState = 'code' | "'" | '"' | '`' | 'line' | 'block';

function nextState(state: JsState, char: string, next: string): JsState | 'skip' {
  if (state === 'code') {
    if (char === '/' && next === '/') return 'line';
    if (char === '/' && next === '*') return 'block';
    if (char === "'" || char === '"' || char === '`') return char;
    return 'code';
  }
  if (state === 'line') return char === '\n' ? 'code' : 'line';
  if (state === 'block') return char === '*' && next === '/' ? 'skip' : 'block';
  if (char === '\\') return 'skip';
  // A quote string cannot cross a line: an apostrophe in JSX text ends at the line's end.
  if (char === state || (char === '\n' && state !== '`')) return 'code';
  return state;
}

/**
 * Blanks `//` and `/* *\/` comments in TypeScript, TSX or an Astro template, leaving strings
 * (and the `//` of a URL inside one) alone.
 */
export function blankJsComments(text: string): string {
  const chars = [...text];
  let state: JsState = 'code';
  let index = 0;
  while (index < chars.length) {
    const char = chars[index];
    const next = chars[index + 1] ?? '';
    const result = nextState(state, char, next);
    const isComment =
      state === 'line' || state === 'block' || result === 'line' || result === 'block';
    if (result === 'skip') {
      if (state === 'block') {
        chars[index] = ' ';
        chars[index + 1] = ' ';
        state = 'code';
      }
      index += 2;
      continue;
    }
    if (isComment && char !== '\n') chars[index] = ' ';
    state = result;
    index += 1;
  }
  return chars.join('');
}

export interface Region {
  text: string;
  /** Offset of `text` in the file. */
  offset: number;
}

/** String literals: '…' and "…" on one line, `…` across lines (its expressions included). */
export function stringLiterals(text: string): Region[] {
  return [...text.matchAll(/`([^`]*)`|'([^'\n]*)'|"([^"\n]*)"/g)].map((match) => ({
    text: match[1] ?? match[2] ?? match[3],
    offset: (match.index ?? 0) + 1,
  }));
}

/** Every whitespace- or quote-separated word of a region, with its offset. */
export function words(region: Region): Region[] {
  return [...region.text.matchAll(/[^\s'"`{}$]+/g)].map((match) => ({
    text: match[0],
    offset: region.offset + (match.index ?? 0),
  }));
}

/** The regions a pattern's first group captures. */
export function captures(text: string, pattern: RegExp): Region[] {
  return [...text.matchAll(pattern)].map((match) => ({
    text: match[1],
    offset: (match.index ?? 0) + match[0].indexOf(match[1]),
  }));
}

/** Offsets where each line starts, for `lineAt`. */
export function lineStarts(text: string): number[] {
  return [0, ...[...text.matchAll(/\n/g)].map((match) => (match.index ?? 0) + 1)];
}

export function lineAt(starts: readonly number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (starts[middle] <= offset) low = middle;
    else high = middle - 1;
  }
  return low + 1;
}

const DIRECTIVE = /scale-exempt:[ \t]*([^*\n}>-][^*\n}]*?)[ \t]*(?:\*\/|-->|$)/;
const COMMENT_ON_LINE = /\{?\/\*.*?\*\/\}?|<!--.*?-->|\/\/.*$/g;
const MIN_REASON_LENGTH = 3;

/**
 * `scale-exempt: <reason>` in a comment names an exception: it exempts its own line or, on a
 * line with nothing but the comment, the next one. A reason is required.
 */
export function exemptions(text: string): Map<number, string> {
  const exempt = new Map<number, string>();
  text.split('\n').forEach((line, index) => {
    const reason = DIRECTIVE.exec(line)?.[1]?.trim();
    if (reason === undefined || reason.length < MIN_REASON_LENGTH) return;
    const isAlone = line.replace(COMMENT_ON_LINE, '').trim() === '';
    exempt.set(index + (isAlone ? 2 : 1), reason);
  });
  return exempt;
}
