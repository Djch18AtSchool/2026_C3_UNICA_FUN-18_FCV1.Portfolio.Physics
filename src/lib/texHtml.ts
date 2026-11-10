/**
 * KaTeX typesetting of inline math, with MathML for assistive technology. Imported statically only
 * on the server (Figure.astro, InlineMath's server render); the browser loads it on demand
 * (src/components/lab/texRenderer.ts), so a page whose formulas were all rendered on the server
 * never downloads KaTeX's JavaScript.
 */
import katex from 'katex';
import { escapeHtml, splitInlineMath } from './inlineMath';

/** Inline KaTeX HTML (with MathML); a TeX error throws, as Equation.astro does. */
export function texToHtml(tex: string): string {
  return katex.renderToString(tex, {
    displayMode: false,
    throwOnError: true,
    output: 'htmlAndMathml',
  });
}

/** The text as HTML: plain parts escaped, $…$ parts typeset by KaTeX. */
export function inlineMathToHtml(text: string): string {
  return splitInlineMath(text)
    .map((segment) => (segment.kind === 'math' ? texToHtml(segment.tex) : escapeHtml(segment.text)))
    .join('');
}
