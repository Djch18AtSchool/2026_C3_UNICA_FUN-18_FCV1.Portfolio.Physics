/**
 * CSS math that leans on custom properties: `calc()`, `min()`, `max()` and `clamp()` with a
 * `var(--…)` inside. The scale check (scaleScan.ts) judges such an expression by its literals
 * only, since a variable is judged where it is defined, so arithmetic on tokens can land off the
 * scale (`calc(var(--space-1) - var(--border-thin))` is 3 px). Evaluating the result would flag the
 * composite lengths that copy a real part on purpose (the pinned transport's 69 px, the grid
 * paper's 80 px major line) and cannot resolve those relative to a box (`100cqw`, `%`). Each one is
 * reviewed by hand instead: scale.test.ts fails on an expression that scaleCalcReviewed.ts does
 * not list with its reason, and on a listed one that is gone.
 */
import {
  blankJsComments,
  blankMatches,
  CSS_COMMENT,
  HTML_COMMENT,
  JSX_COMMENT,
} from './scaleSource';

const MATH_FUNCTION = /\b(?:calc|min|max|clamp)\(/g;
const CUSTOM_PROPERTY = 'var(--';
/** A reason as short as a scale-exempt one (scaleSource.ts) at least. */
const MIN_REASON_LENGTH = 3;

/** Expressions reviewed by hand, by repo-relative file: the expression without spaces → why. */
export type ReviewedTokenMath = Readonly<Record<string, Readonly<Record<string, string>>>>;

function withoutComments(path: string, text: string): string {
  const markup = blankMatches(blankMatches(text, HTML_COMMENT), JSX_COMMENT);
  const css = blankMatches(markup, CSS_COMMENT);
  return /\.(ts|tsx)$/.test(path) ? blankJsComments(css) : css;
}

/** The index just past the parenthesis that closes the one before `from`, or the text's end. */
function closingParen(text: string, from: number): number {
  let depth = 1;
  let end = from;
  while (end < text.length && depth > 0) {
    if (text[end] === '(') depth += 1;
    else if (text[end] === ')') depth -= 1;
    end += 1;
  }
  return end;
}

/** The outermost math expressions with a custom property in one file, spaces removed, each once. */
export function tokenMath(path: string, text: string): string[] {
  const code = withoutComments(path, text);
  const found: string[] = [];
  let resumeAt = 0;
  for (const match of code.matchAll(MATH_FUNCTION)) {
    const start = match.index ?? 0;
    if (start < resumeAt) continue;
    resumeAt = closingParen(code, start + match[0].length);
    const expression = code.slice(start, resumeAt).replace(/\s+/g, '');
    if (expression.includes(CUSTOM_PROPERTY)) found.push(expression);
  }
  return [...new Set(found)];
}

/**
 * What the reviewed list misses (an expression it does not name, or names without a reason) and
 * what it names that no file writes any more, both as «file: expression».
 */
export function compareTokenMath(
  found: Readonly<Record<string, readonly string[]>>,
  reviewed: ReviewedTokenMath,
): { unreviewed: string[]; gone: string[] } {
  const unreviewed = Object.entries(found).flatMap(([file, expressions]) =>
    expressions
      .filter(
        (expression) => (reviewed[file]?.[expression]?.trim().length ?? 0) < MIN_REASON_LENGTH,
      )
      .map((expression) => `${file}: ${expression}`),
  );
  const gone = Object.entries(reviewed).flatMap(([file, expressions]) =>
    Object.keys(expressions)
      .filter((expression) => !(found[file] ?? []).includes(expression))
      .map((expression) => `${file}: ${expression}`),
  );
  return { unreviewed, gone };
}
