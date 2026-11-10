/**
 * KaTeX inline in HTML text: figure captions, chart titles and legends, readout and parameter
 * labels may write `$\vec v = \vec V_p + \vec v_\infty$` and get the equations' typography, with
 * MathML for assistive technology. `\$` is a literal dollar sign. This module only splits and
 * escapes (no KaTeX, so the browser bundle stays light); src/lib/texHtml.ts typesets. Figure.astro
 * renders on the server; React components use InlineMath (src/components/lab/InlineMath.tsx).
 */
import { mathTextToString } from './mathNotation';

export type InlineSegment = { kind: 'text'; text: string } | { kind: 'math'; tex: string };

const ESCAPED_DOLLAR = '\\$';
const DOLLAR = '$';
/** A placeholder for \$ while splitting: a private-use character no text contains. */
const DOLLAR_PLACEHOLDER = '';
const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

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

export function hasInlineMath(text: string): boolean {
  return splitInlineMath(text).some((segment) => segment.kind === 'math');
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** TeX control words of labels and their characters in the MathText notation. */
// prettier-ignore
const TEX_SYMBOLS: Readonly<Record<string, string>> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε', zeta: 'ζ',
  eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν',
  xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ',
  chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ',
  Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', infty: '∞', odot: '☉',
  approx: '≈', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', to: '→',
  rightarrow: '→', leftarrow: '←', cdot: '⋅', times: '×', pm: '±', mp: '∓', partial: '∂',
  nabla: '∇', perp: '⊥', parallel: '∥', propto: '∝', sim: '∼', equiv: '≡', int: '∫',
};
const TEX_SPACING = /\\[,;:!]|\\q?quad\b|\\(left|right)\b/g;
const TEX_TEXT = /\\(?:text|mathrm|mathbf|mathit|operatorname)\{([^{}]*)\}/g;

/**
 * The TeX of an inline formula in the MathText notation of src/lib/mathNotation.ts, so it can be
 * said aloud with mathTextToString: \vec v_\infty → "vec v_∞", \frac{a}{b} → "(a)/(b)". Covers
 * the commands labels use; an unknown command keeps its name.
 */
export function texToNotation(tex: string): string {
  return tex
    .replace(/\^\\circ/g, '°')
    .replace(/\{,\}/g, ',')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
    .replace(TEX_TEXT, '$1')
    .replace(/\\([A-Za-z]+)/g, (command, name: string) => TEX_SYMBOLS[name] ?? command)
    .replace(/\\vec\s*\{([^{}])\}/g, 'vec $1')
    .replace(/\\vec\s*/g, 'vec ')
    .replace(TEX_SPACING, '')
    .replace(/\\ /g, ' ')
    .replace(/\\([A-Za-z]+)/g, '$1')
    .replace(/(?<![_^])\{([^{}]*)\}/g, '$1');
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
