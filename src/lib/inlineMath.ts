/**
 * KaTeX inline in HTML text: figure captions, chart titles and legends, readout and parameter
 * labels may write `$\vec v = \vec V_p + \vec v_\infty$` and get the equations' typography, with
 * MathML for assistive technology. `\$` is a literal dollar sign. This module only splits and
 * escapes (no KaTeX, so the browser bundle stays light); src/lib/texHtml.ts typesets. Figure.astro
 * renders on the server; React components use InlineMath (src/components/lab/InlineMath.tsx).
 */
import { hasInlineMath, splitInlineMath } from './inlineSegments';
import { mathTextToString } from './mathNotation';
import { texToNotation } from './texNotation';

export { hasInlineMath, splitInlineMath, type InlineSegment } from './inlineSegments';
export { texToNotation } from './texNotation';

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export type InlineGroup =
  { kind: 'text'; text: string } | { kind: 'math'; tex: string; after: string };

/** Punctuation that must stay on the line of the formula before it. */
const TRAILING_PUNCTUATION = /^[.,;:!?)\]»%]+/;
/** Class of the span that keeps a formula and its punctuation on one line (Tailwind). */
export const NO_WRAP_CLASS = 'whitespace-nowrap';

/**
 * The segments with the punctuation right after each formula moved into it (`after`), so a
 * renderer can keep them on one line: «… $\vec v_\infty$.» never wraps before the period.
 */
export function groupInlineMath(text: string): InlineGroup[] {
  const segments = splitInlineMath(text);
  return segments.flatMap((segment, i): InlineGroup[] => {
    const previous = segments[i - 1];
    if (segment.kind === 'math') {
      const next = segments[i + 1];
      const after = next?.kind === 'text' ? (TRAILING_PUNCTUATION.exec(next.text)?.[0] ?? '') : '';
      return [{ kind: 'math', tex: segment.tex, after }];
    }
    const taken =
      previous?.kind === 'math' ? (TRAILING_PUNCTUATION.exec(segment.text)?.[0] ?? '') : '';
    const rest = segment.text.slice(taken.length);
    return rest === '' ? [] : [{ kind: 'text', text: rest }];
  });
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Text with $…$ as a screen reader should hear it, for strings that cannot carry KaTeX's MathML
 * (a live region, an aria-label): «Cambio módulo de delta vector v en km/s».
 */
export function inlineMathToSpeech(text: string): string {
  return splitInlineMath(text)
    .map((segment) =>
      segment.kind === 'text' ? segment.text : mathTextToString(texToNotation(segment.tex)),
    )
    .join('');
}

/**
 * The aria-label of a control whose visible label holds $…$, said in words, so its name reads
 * «Máxima aproximación r sub p» in every browser; undefined for a plain label (the label element
 * names the control as usual).
 */
export function mathAriaLabel(text: string): string | undefined {
  return hasInlineMath(text) ? inlineMathToSpeech(text) : undefined;
}
