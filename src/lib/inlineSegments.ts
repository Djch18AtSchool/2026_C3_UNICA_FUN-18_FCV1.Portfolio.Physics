/**
 * The site's one syntax for symbols in text: words with formulas between `$…$` (`\$` is a
 * literal dollar sign). The HTML typesets them with KaTeX (src/lib/inlineMath.ts, texHtml.ts);
 * a figure label sets them with MathText (src/lib/mathNotation.ts).
 */
export type InlineSegment = { kind: 'text'; text: string } | { kind: 'math'; tex: string };

const ESCAPED_DOLLAR = '\\$';
const DOLLAR = '$';
/** A placeholder for \$ while splitting: a private-use character no text contains. */
const DOLLAR_PLACEHOLDER = '';
const restoreDollars = (text: string) => text.replaceAll(DOLLAR_PLACEHOLDER, DOLLAR);

/** The text as plain and math segments; throws on an unclosed $. */
export function splitInlineMath(text: string): InlineSegment[] {
  const parts = text.replaceAll(ESCAPED_DOLLAR, DOLLAR_PLACEHOLDER).split(DOLLAR);
  if (parts.length % 2 === 0) {
    throw new Error(`InlineMath: "$" sin cerrar en «${text}»`);
  }
  return parts.flatMap((part, i): InlineSegment[] => {
    if (i % 2 === 1) return [{ kind: 'math', tex: restoreDollars(part) }];
    return part === '' ? [] : [{ kind: 'text', text: restoreDollars(part) }];
  });
}

export function hasInlineMath(text: string): boolean {
  return splitInlineMath(text).some((segment) => segment.kind === 'math');
}
