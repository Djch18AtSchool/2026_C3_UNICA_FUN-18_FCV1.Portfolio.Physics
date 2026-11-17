import { describe, expect, test } from 'vitest';
import { looseSymbols, texVariables, withoutInterpolations } from './looseSymbols';

const SYMBOLS = new Set(['v', 't', 'x', 'y', 'a', 'e', 'm', 'g', 'K', 'N', 'C', 'F']);
const letters = (text: string) => looseSymbols(text, SYMBOLS).map(({ letter }) => letter);

describe('looseSymbols', () => {
  test('flags a magnitude letter standing alone in a sentence, with the text around it', () => {
    const [found] = looseSymbols('La posición crece con t, y el rumbo reparte v.', SYMBOLS);

    expect(letters('La posición crece con t, y el rumbo reparte v.')).toEqual(['t', 'v']);
    expect(found.context).toContain('crece con t,');
  });

  test('a letter inside a formula, or joined to other letters, digits or indices, is not loose', () => {
    expect(letters('La posición crece con $t$ y $v_x = v\\cos\\theta$.')).toEqual([]);
    expect(letters('mg, v0, v_x, x², h′, m/s, kg·m/s, L-rueda')).toEqual([]);
  });

  test('a letter the page never uses as a variable is a name, not a magnitude', () => {
    expect(letters('el anillo B y la parada Z')).toEqual([]);
  });

  test('greek letters are always magnitudes', () => {
    expect(letters('con ω fijo')).toEqual(['ω']);
  });

  test('«a», «o» and «y» are words unless a formula follows or an article comes before', () => {
    expect(letters('va de 0 a 10 y vuelve o se queda')).toEqual([]);
    expect(letters('donde a = dv/dt y el y de la gráfica')).toEqual(['a', 'y']);
    expect(letters('la e(v) real')).toEqual(['e', 'v']);
  });

  test('«e» is a word only before an «i», «hi», «y» or a formula; «u», before an «o»', () => {
    expect(letters('elásticas e inelásticas, agua e hielo, x e y, $x$ e $y$')).toEqual(['x']);
    expect(letters('Un solo número, e, decide; e compara')).toEqual(['e', 'e']);
    expect(letters('siete u ocho')).toEqual([]);
  });

  test('a unit after a number, alone in parentheses or after a degree sign is not a magnitude', () => {
    expect(letters('900 m, $x = 3$ m, 12 N, 2 s, 1 g, (m), 120 °C')).toEqual([]);
    expect(letters('la masa m y la normal N')).toEqual(['m', 'N']);
  });

  test('code spans and URLs are not prose', () => {
    expect(letters('el código `v = x + t` de https://example.com/a/v')).toEqual([]);
  });
});

describe('withoutInterpolations', () => {
  test('replaces each ${…}, braces balanced, by one placeholder value', () => {
    expect(withoutInterpolations('a ${f({ p: 2 })}× y ${n} s')).toBe('a 0× y 0 s');
  });

  test('an unclosed interpolation drops the rest; text without one is unchanged', () => {
    expect(withoutInterpolations('dura ${f(')).toBe('dura ');
    expect(withoutInterpolations('sin nada')).toBe('sin nada');
  });
});

describe('texVariables', () => {
  test('lists the single letters of a formula, not its commands, words, units or subscripts', () => {
    expect(texVariables('F = m\\,a_\\text{máx}, \\quad v = 3\\ \\mathrm{m/s} + r_p')).toEqual([
      'F',
      'm',
      'a',
      'v',
      'r',
    ]);
  });

  test('names greek variables by their letter', () => {
    expect(texVariables('\\omega^2 r = \\varepsilon')).toEqual(['r', 'ω', 'ε']);
  });
});
