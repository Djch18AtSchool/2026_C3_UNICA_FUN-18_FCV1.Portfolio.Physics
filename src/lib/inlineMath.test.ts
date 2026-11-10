import { describe, expect, test } from 'vitest';
import {
  groupInlineMath,
  hasInlineMath,
  inlineMathToSpeech,
  mathAriaLabel,
  splitInlineMath,
  texToNotation,
} from './inlineMath';
import { inlineMathToHtml, texToHtml } from './texHtml';

describe('splitInlineMath', () => {
  test('splits text and $…$ math, in order', () => {
    expect(splitInlineMath('la suma $\\vec v = \\vec V_p$ antes y $v_\\infty$.')).toEqual([
      { kind: 'text', text: 'la suma ' },
      { kind: 'math', tex: '\\vec v = \\vec V_p' },
      { kind: 'text', text: ' antes y ' },
      { kind: 'math', tex: 'v_\\infty' },
      { kind: 'text', text: '.' },
    ]);
  });

  test('\\$ is a literal dollar sign', () => {
    expect(splitInlineMath('cuesta \\$5')).toEqual([{ kind: 'text', text: 'cuesta $5' }]);
  });

  test('plain text is one segment, and an empty string none', () => {
    expect(splitInlineMath('Rapidez de la Voyager 2')).toEqual([
      { kind: 'text', text: 'Rapidez de la Voyager 2' },
    ]);
    expect(splitInlineMath('')).toEqual([]);
  });

  test('an unclosed $ fails loudly instead of printing a stray sign', () => {
    expect(() => splitInlineMath('v = $x')).toThrow(/sin cerrar/);
  });
});

describe('hasInlineMath', () => {
  test('is true only for text with $…$', () => {
    expect(hasInlineMath('a $b$')).toBe(true);
    expect(hasInlineMath('a \\$b')).toBe(false);
    expect(hasInlineMath('a b')).toBe(false);
  });
});

describe('texToHtml', () => {
  test('renders KaTeX with MathML for assistive technology', () => {
    const html = texToHtml('\\vec v');

    expect(html).toContain('class="katex"');
    expect(html).toContain('<math');
  });

  test('a TeX error fails the build', () => {
    expect(() => texToHtml('\\frac{')).toThrow();
  });
});

describe('inlineMathToHtml', () => {
  test('escapes the text and typesets the math', () => {
    const html = inlineMathToHtml('a < b & $x^2$');

    expect(html.startsWith('a &lt; b &amp; <span class="katex">')).toBe(true);
  });

  test('plain text comes back escaped and otherwise unchanged', () => {
    expect(inlineMathToHtml('«Júpiter» "1"')).toBe('«Júpiter» &quot;1&quot;');
  });
});

describe('texToNotation', () => {
  test('turns the TeX of labels into the MathText notation', () => {
    expect(texToNotation('\\vec v = \\vec V_p + \\vec v_\\infty')).toBe(
      'vec v = vec V_p + vec v_∞',
    );
    expect(texToNotation('v_{\\infty,\\text{in}}')).toBe('v_{∞,in}');
    expect(texToNotation('|\\Delta\\vec v|')).toBe('|Δvec v|');
    expect(texToNotation('\\sqrt{2GM_\\odot/r}')).toBe('√(2GM_☉/r)');
    expect(texToNotation('4{,}4 \\cdot 10^{-21}\\ \\mathrm{m/s}')).toBe('4,4 ⋅ 10^{-21} m/s');
    expect(texToNotation('\\frac{a}{b} \\le \\theta_\\text{in}')).toBe('(a)/(b) ≤ θ_in');
  });

  test('leaves an unknown command as its name, never as a backslash', () => {
    expect(texToNotation('\\foo x')).toBe('foo x');
  });
});

describe('inlineMathToSpeech', () => {
  test('says the math in words and keeps the text', () => {
    expect(inlineMathToSpeech('Cambio $|\\Delta\\vec v|$ en km/s')).toBe(
      'Cambio módulo de delta vector v en km/s',
    );
    expect(inlineMathToSpeech('Vectores $\\vec v_\\infty$ y $\\vec v_\\text{rel}$')).toBe(
      'Vectores vector v sub infinito y vector v sub rel',
    );
  });

  test('plain text comes back unchanged', () => {
    expect(inlineMathToSpeech('Ángulo de giro δ')).toBe('Ángulo de giro δ');
  });
});

describe('mathAriaLabel', () => {
  test('gives a spoken name only to a label with math', () => {
    expect(mathAriaLabel('Máxima aproximación $r_p$')).toBe('Máxima aproximación r sub p');
    expect(mathAriaLabel('Lado de paso')).toBeUndefined();
  });
});

describe('groupInlineMath', () => {
  test('binds the punctuation right after a formula to it, so a line never starts with it', () => {
    expect(groupInlineMath('entre $a$ y $b$. Un $c$, otro $d$ fin')).toEqual([
      { kind: 'text', text: 'entre ' },
      { kind: 'math', tex: 'a', after: '' },
      { kind: 'text', text: ' y ' },
      { kind: 'math', tex: 'b', after: '.' },
      { kind: 'text', text: ' Un ' },
      { kind: 'math', tex: 'c', after: ',' },
      { kind: 'text', text: ' otro ' },
      { kind: 'math', tex: 'd', after: '' },
      { kind: 'text', text: ' fin' },
    ]);
  });

  test('takes only punctuation, never a following word', () => {
    expect(groupInlineMath('($m$): sí; $x$km')).toEqual([
      { kind: 'text', text: '(' },
      { kind: 'math', tex: 'm', after: '):' },
      { kind: 'text', text: ' sí; ' },
      { kind: 'math', tex: 'x', after: '' },
      { kind: 'text', text: 'km' },
    ]);
  });
});

describe('inlineMathToHtml binding', () => {
  test('wraps a formula and its punctuation in a no-wrap span', () => {
    expect(inlineMathToHtml('a $x$.')).toMatch(
      /^a <span class="whitespace-nowrap"><span class="katex">.*<\/span>\.<\/span>$/,
    );
  });
});
