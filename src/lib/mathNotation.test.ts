import { describe, expect, test } from 'vitest';
import {
  marksTopEm,
  mathRuns,
  mathTextToString,
  mathTextWidth,
  normalizeNotation,
  parseNotation,
  toNotation,
} from './mathNotation';
import { PLEX_SANS_ITALIC_ADVANCES } from './glyphAdvances';

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
  test('sets lowercase Greek italic and marks the symbols of the «Plex Symbols» face', () => {
    expect(mathRuns('ω_máx ≈ 3 Δ')).toEqual([
      { text: 'ω', style: 'italic', script: 'base' },
      { text: 'máx', script: 'sub' },
      { text: ' ', script: 'base' },
      { text: '≈', style: 'symbol', script: 'base' },
      { text: ' 3 Δ', script: 'base' },
    ]);
  });

  test('a $…$ formula sets its letters italic and its \\text upright, as the HTML does', () => {
    expect(mathRuns('$r_p$ = 10,09 R_J')).toEqual([
      { text: 'r', style: 'italic', script: 'base' },
      { text: 'p', style: 'italic', script: 'sub' },
      // The words are literal: a _ outside $…$ is printed, not a subscript.
      { text: ' = 10,09 R_J', script: 'base' },
    ]);
    expect(mathRuns('$v_\\text{máx}$')).toEqual([
      { text: 'v', style: 'italic', script: 'base' },
      { text: 'máx', script: 'sub' },
    ]);
  });

  test('draws ☉ with KaTeX’s ⊙ and ≠ as an equals sign with a drawn stroke', () => {
    expect(mathRuns('M_☉ ≠ 0')).toEqual([
      { text: 'M', script: 'base' },
      { text: '⊙', style: 'symbol', script: 'sub' },
      { text: ' ', script: 'base' },
      { text: '=', script: 'base', mark: 'not' },
      { text: ' 0', script: 'base' },
    ]);
  });

  test('a vector base is a run of its own, marked for its drawn arrow', () => {
    expect(mathRuns('vec v_∞')).toEqual([
      { text: 'v', script: 'base', mark: 'vector' },
      { text: '∞', style: 'symbol', script: 'sub' },
    ]);
  });

  test('a plain label stays one run', () => {
    expect(mathRuns('Júpiter, 13 km/s')).toEqual([{ text: 'Júpiter, 13 km/s', script: 'base' }]);
  });
});

describe('toNotation', () => {
  test('turns the formulas of a $…$ label into notation; a label without $ is notation already', () => {
    expect(toNotation('paso de $r_p$')).toBe('paso de 𝑟_𝑝');
    expect(toNotation('a $v_\\infty$')).toBe('a 𝑣_∞');
    expect(toNotation('v_∞,in')).toBe('v_∞,in');
  });

  test('escapes a literal _ or ^ of the words, which the notation would take as a script', () => {
    expect(toNotation('archivo_1 ^ $x$')).toBe('archivo\\_1 \\^ 𝑥');
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

  test('says a $…$ label’s italic letters as plain ones', () => {
    expect(mathTextToString('$r_p$ = 10 km')).toBe('r sub p = 10 km');
    expect(mathTextToString('$h_0$')).toBe('h sub 0');
  });
});

describe('mathTextWidth', () => {
  test('Plex Sans figures advance 0,6 em each (tabular); scripts are set at 75 %', () => {
    expect(mathTextWidth('1_2', 10)).toBeCloseTo(6 + 4.5);
  });

  test('a symbol uses its face’s advance, after the face’s size-adjust', () => {
    // KaTeX_Main ∞ advances 1 em, scaled to Plex's x-height (0,516 / 0,442).
    expect(mathTextWidth('∞', 10)).toBeCloseTo((10 * 0.516) / 0.442);
  });

  test('an italic letter uses Plex Sans Italic’s advance', () => {
    expect(mathTextWidth('$v$', 10)).toBeCloseTo(PLEX_SANS_ITALIC_ADVANCES[0x76] / 100);
    expect(mathTextWidth('ω', 10)).toBeCloseTo(PLEX_SANS_ITALIC_ADVANCES[0x3c9] / 100);
  });

  test('Plex Sans uses its table, with n as the stand-in for an untabulated character', () => {
    expect(mathTextWidth('ii', 10)).toBeLessThan(mathTextWidth('mm', 10));
    expect(mathTextWidth('Ѐ', 10)).toBeCloseTo(mathTextWidth('n', 10));
  });
});

describe('mathTextToString keeps number spacing', () => {
  test('the narrow no-break space of formatNumber survives', () => {
    expect(mathTextToString('r_p = 721 375 km')).toBe('r sub p = 721 375 km');
  });
});

describe('punctuation, empty scripts, moduli and the reach of drawn arrows', () => {
  test('a period, colon or semicolon followed by a space or the end ends a subscript', () => {
    const scripts = (source: string) =>
      parseNotation(source).flatMap((token) => (token.kind === 'script' ? [token.text] : []));

    expect(scripts('V_p: x')).toEqual(['p']);
    expect(scripts('v_∞.')).toEqual(['∞']);
    expect(scripts('a_x; b_y.z')).toEqual(['x', 'y.z']);
    expect(mathTextToString('V_p: 13; v_∞.')).toBe('V sub p: 13; v sub infinito.');
  });

  test('an empty script says nothing', () => {
    expect(mathTextToString('x^ = 1')).toBe('x = 1');
    expect(mathTextToString('x_{}')).toBe('x');
  });

  test('moduli pair up across a label', () => {
    expect(mathTextToString('|a| + |b|')).toBe('módulo de a + módulo de b');
  });

  test('marksTopEm: how far above the baseline a drawn arrow reaches, in em', () => {
    expect(marksTopEm('V_p')).toBe(0);
    expect(marksTopEm('vec v')).toBeCloseTo(0.516 + 0.12 + 0.16);
    expect(marksTopEm('vec V')).toBeGreaterThan(marksTopEm('vec v'));
  });
});

describe('mathTextToString arrows', () => {
  test.each([
    ['m_2 → ∞', 'm sub 2 tiende a infinito'],
    ['rueda → batería', 'rueda a batería'],
    ['A → B', 'A a B'],
    ['t → ∞ s', 't tiende a infinito s'],
    ['x→ y', 'x a y'],
  ])('says %s as «%s», never «flecha»', (source, spoken) => {
    expect(mathTextToString(source)).toBe(spoken);
  });
});
