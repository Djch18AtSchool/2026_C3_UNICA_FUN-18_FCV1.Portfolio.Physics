import { describe, expect, test } from 'vitest';
import {
  mathRuns,
  mathTextToString,
  mathTextWidth,
  normalizeNotation,
  parseNotation,
} from './mathNotation';

describe('parseNotation', () => {
  test('a subscript runs to the next space and may hold a comma: v_∞,in', () => {
    expect(parseNotation('v_∞,in = 7')).toEqual([
      { kind: 'char', char: 'v' },
      { kind: 'script', script: 'sub', text: '∞,in' },
      { kind: 'char', char: ' ' },
      { kind: 'char', char: '=' },
      { kind: 'char', char: ' ' },
      { kind: 'char', char: '7' },
    ]);
  });

  test('a comma followed by a space ends the subscript: v_x, v_y', () => {
    expect(parseNotation('v_x, v_y')).toEqual([
      { kind: 'char', char: 'v' },
      { kind: 'script', script: 'sub', text: 'x' },
      { kind: 'char', char: ',' },
      { kind: 'char', char: ' ' },
      { kind: 'char', char: 'v' },
      { kind: 'script', script: 'sub', text: 'y' },
    ]);
  });

  test('braces hold any text; a superscript may start with a minus sign', () => {
    expect(parseNotation('10^-7 a_{x y}')).toEqual([
      { kind: 'char', char: '1' },
      { kind: 'char', char: '0' },
      { kind: 'script', script: 'sup', text: '−7' },
      { kind: 'char', char: ' ' },
      { kind: 'char', char: 'a' },
      { kind: 'script', script: 'sub', text: 'x y' },
    ]);
  });

  test('a script stops at a parenthesis, a bar, a slash and an operator', () => {
    const scripts = (source: string) =>
      parseNotation(source).flatMap((token) => (token.kind === 'script' ? [token.text] : []));

    expect(scripts('(V_p) |v_y| r_p/R_J v_1+v_2=v_3')).toEqual(['p', 'y', 'p', 'J', '1', '2', '3']);
  });

  test('"vec v" is a vector; "vec" inside a word is not', () => {
    expect(parseNotation('vec V_p')).toEqual([
      { kind: 'vector', char: 'V' },
      { kind: 'script', script: 'sub', text: 'p' },
    ]);
    expect(parseNotation('Δvec v')[1]).toEqual({ kind: 'vector', char: 'v' });
    expect(parseNotation('vector').every((token) => token.kind === 'char')).toBe(true);
  });

  test('a backslash keeps _ and ^ literal', () => {
    expect(
      parseNotation('a\\_b\\^c')
        .map((t) => (t.kind === 'char' ? t.char : '?'))
        .join(''),
    ).toBe('a_b^c');
  });
});

describe('normalizeNotation', () => {
  test('turns Unicode sub- and superscripts Plex lacks into real scripts', () => {
    expect(normalizeNotation('rₚ = 10⁻⁷ vₓ')).toBe('r_{p} = 10^{-7} v_{x}');
  });

  test('keeps ¹ ² ³, which Plex draws', () => {
    expect(normalizeNotation('km²/s³')).toBe('km²/s³');
  });

  test('turns a combining vector arrow into "vec"', () => {
    expect(normalizeNotation('v⃗ = V⃗_p')).toBe('vec v = vec V_p');
  });
});

describe('mathRuns', () => {
  test('sets Greek and the symbols Plex lacks in KaTeX, the rest in the label font', () => {
    expect(mathRuns('ω_máx ≈ 3')).toEqual([
      { text: 'ω', font: 'katex-math', script: 'base' },
      { text: 'máx', script: 'sub' },
      { text: ' ', script: 'base' },
      { text: '≈', font: 'katex-main', script: 'base' },
      { text: ' 3', script: 'base' },
    ]);
  });

  test('draws ☉ with KaTeX’s ⊙ and ≠ as an equals sign with a drawn stroke', () => {
    expect(mathRuns('M_☉ ≠ 0')).toEqual([
      { text: 'M', script: 'base' },
      { text: '⊙', font: 'katex-main', script: 'sub' },
      { text: ' ', script: 'base' },
      { text: '=', script: 'base', mark: 'not' },
      { text: ' 0', script: 'base' },
    ]);
  });

  test('a vector base is a run of its own, marked for its drawn arrow', () => {
    expect(mathRuns('vec v_∞')).toEqual([
      { text: 'v', script: 'base', mark: 'vector' },
      { text: '∞', font: 'katex-main', script: 'sub' },
    ]);
  });

  test('a plain label stays one run', () => {
    expect(mathRuns('Júpiter, 13 km/s')).toEqual([{ text: 'Júpiter, 13 km/s', script: 'base' }]);
  });
});

describe('mathTextToString', () => {
  test('reads subscripts in natural Spanish: «v sub infinito, in»', () => {
    expect(mathTextToString('v_∞,in')).toBe('v sub infinito, in');
  });

  test('reads powers, vectors, moduli and Greek letters', () => {
    expect(mathTextToString('10^-7')).toBe('10 a la menos 7');
    expect(mathTextToString('km^2')).toBe('km al cuadrado');
    expect(mathTextToString('vec v = vec V_p + vec v_∞')).toBe(
      'vector v = vector V sub p + vector v sub infinito',
    );
    expect(mathTextToString('|Δv| ≈ 11')).toBe('módulo de delta v aproximadamente 11');
    expect(mathTextToString('ω_máx')).toBe('omega sub máx');
  });

  test('names the Sun for ☉ and the circled dot for ⊙', () => {
    expect(mathTextToString('√(2GM_☉/r)')).toBe('raíz de (2GM sub Sol/r)');
    expect(mathTextToString('⊙ eje')).toBe('punto en círculo eje');
  });

  test('leaves plain text as it is', () => {
    expect(mathTextToString('Afelio: 6,29 UA')).toBe('Afelio: 6,29 UA');
  });
});

describe('mathTextWidth', () => {
  test('Plex Mono advances 0,6 em a character; scripts are set at 75 %', () => {
    expect(mathTextWidth('V_p', 10, 'mono')).toBeCloseTo(6 + 4.5);
  });

  test('KaTeX characters use their own advance', () => {
    // KaTeX_Main ∞ advances 1 em, scaled to Plex's x-height (0,516 / 0,442).
    expect(mathTextWidth('∞', 10, 'mono')).toBeCloseTo((10 * 0.516) / 0.442);
  });

  test('Plex Sans uses its table, with n as the stand-in for an untabulated character', () => {
    expect(mathTextWidth('ii', 10, 'sans')).toBeLessThan(mathTextWidth('mm', 10, 'sans'));
    expect(mathTextWidth('Ѐ', 10, 'sans')).toBeCloseTo(mathTextWidth('n', 10, 'sans'));
  });
});
