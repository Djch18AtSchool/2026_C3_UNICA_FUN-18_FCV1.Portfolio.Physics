/**
 * The TeX of an inline formula in the notation of figure labels (src/lib/mathNotation.ts), so an
 * SVG label sets it as the HTML does and mathTextToString can say it. Its letters are variables,
 * written as Mathematical Italic letters (src/lib/mathItalic.ts); the words of \text{…},
 * \mathrm{…} or \operatorname{…} and a command's own name stay upright.
 */
import { MINUS_SIGN } from './format';
import { mathItalic } from './mathItalic';

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

/** Marks around the words a formula keeps upright while its letters turn italic. */
const UPRIGHT_OPEN = '\u0001';
const UPRIGHT_CLOSE = '\u0002';
const UPRIGHT_MARKS = /[\u0001\u0002]/g;
/** A command (kept), an upright stretch (kept), a letter (made italic) or a hyphen (a minus). */
const COMMAND_UPRIGHT_LETTER_OR_HYPHEN = /\\[A-Za-z]+|\u0001[^\u0002]*\u0002|[A-Za-z-]/g;
const HYPHEN = '-';

/**
 * The letters of a formula as Mathematical Italic and its hyphens as minus signs (KaTeX's −),
 * but not commands nor upright words.
 */
const italicizeLetters = (tex: string) =>
  tex.replace(COMMAND_UPRIGHT_LETTER_OR_HYPHEN, (match) => {
    if (match === HYPHEN) return MINUS_SIGN;
    return match.length === 1 ? mathItalic(match) : match;
  });

/**
 * The TeX of an inline formula in the MathText notation of src/lib/mathNotation.ts:
 * \vec v_\infty → "vec 𝑣_∞", \frac{a}{b} → "(𝑎)/(𝑏)", v_\text{máx} → "𝑣_máx". Covers the commands
 * labels use; an unknown command keeps its name, upright.
 */
export function texToNotation(tex: string): string {
  const marked = tex
    .replace(/\^\\circ/g, '°')
    .replace(/\{,\}/g, ',')
    .replace(TEX_TEXT, (_match, words: string) => `${UPRIGHT_OPEN}${words}${UPRIGHT_CLOSE}`);
  return italicizeLetters(marked)
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
    .replace(/\\([A-Za-z]+)/g, (command, name: string) => TEX_SYMBOLS[name] ?? command)
    .replace(/\\vec\s*\{([^{}])\}/gu, 'vec $1')
    .replace(/\\vec\s*/g, 'vec ')
    .replace(TEX_SPACING, '')
    .replace(/\\ /g, ' ')
    .replace(/\\([A-Za-z]+)/g, '$1')
    .replace(/(?<![_^])\{([^{}]*)\}/g, '$1')
    .replace(UPRIGHT_MARKS, '');
}
