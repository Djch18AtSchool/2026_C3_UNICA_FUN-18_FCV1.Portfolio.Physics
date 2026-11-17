import { describe, expect, test } from 'vitest';
import {
  bindNumerals,
  isCovered,
  isPlexSansGlyph,
  uncoveredChars,
  rawNotationMarks,
  inlineMathSizeViolation,
  typeRuleViolations,
  uprightFigureVariables,
  type DrawnText,
  type LabelRun,
} from './typography';

const NBSP = ' ';

describe('bindNumerals', () => {
  test('keeps an Arabic numeral on the line of the word before it', () => {
    expect(bindNumerals('Llantas de Fórmula 1: la ventana')).toBe(
      `Llantas de Fórmula${NBSP}1: la ventana`,
    );
  });

  test('keeps a Roman numeral with its word, at the end of the text', () => {
    expect(bindNumerals('Portafolio de evidencias de Física I')).toBe(
      `Portafolio de evidencias de Física${NBSP}I`,
    );
  });

  test('leaves short words and numerals inside words alone', () => {
    const text = 'Gravedad artificial y el Tema 10x en la estación';

    expect(bindNumerals(text)).toBe(text);
  });

  test('binds a numeral followed by a comma or a period', () => {
    expect(bindNumerals('Vol. 1, edición 10.')).toBe(`Vol.${NBSP}1, edición${NBSP}10.`);
  });
});

describe('uncoveredChars', () => {
  test('passes Spanish text, decimal commas and the typographic signs Plex draws', () => {
    expect(uncoveredChars('Rapidez −2,13 km/s · 97,5° × ± «ñ» – —')).toEqual([]);
  });

  test('lists the sub- and superscripts and symbols no face of the stack draws, once each and in order', () => {
    expect(uncoveredChars('v∞ ≈ 7, rₚ ≤ 3, v∞ ≥ 1, 10⁻⁷, M☉')).toEqual(['ₚ', '⁻', '⁷', '☉']);
  });

  test('the symbols Plex lacks come from the sans stack’s «Plex Symbols» face, never Plex Mono', () => {
    expect(uncoveredChars('v∞ ≈ 7 ≤ 3 → ⋅', 'sans')).toEqual([]);
    expect(uncoveredChars('v∞ ≈ 7', 'mono')).toEqual(['∞', '≈']);
  });

  test('catches the combining vector arrow U+20D7 on its own', () => {
    expect(uncoveredChars('v⃗')).toEqual(['⃗']);
  });

  test('Greek is covered by Plex Sans but not by Plex Mono', () => {
    expect(uncoveredChars('ω δ Δ', 'sans')).toEqual([]);
    expect(uncoveredChars('ω δ Δ', 'mono')).toEqual(['ω', 'δ', 'Δ']);
  });

  test('accepts the narrow no-break space U+202F that formatNumber prints', () => {
    expect(uncoveredChars('1 000 km', 'mono')).toEqual([]);
    expect(uncoveredChars('1 000 km', 'sans')).toEqual([]);
  });

  test('ignores the collapsible whitespace of the DOM (tabs and line breaks)', () => {
    expect(uncoveredChars('a\n\tb\r\n')).toEqual([]);
  });
});

describe('isCovered', () => {
  test('answers per character and family', () => {
    expect(isCovered('A', 'mono')).toBe(true);
    expect(isCovered('ω', 'mono')).toBe(false);
    expect(isCovered('ω', 'sans')).toBe(true);
    expect(isCovered('∞', 'sans')).toBe(true);
    expect(isCovered('∞', 'mono')).toBe(false);
  });
});

describe('isPlexSansGlyph', () => {
  test('is Plex Sans alone: a symbol of the face after it is not one', () => {
    expect(isPlexSansGlyph('θ')).toBe(true);
    expect(isPlexSansGlyph('7')).toBe(true);
    expect(isPlexSansGlyph('∞')).toBe(false);
  });
});

describe('rawNotationMarks', () => {
  test.each([
    ['Carga F_z', ['_']],
    ['10^-7 rad/s', ['^']],
    ['cuesta $5', ['$']],
    ['F_z y 10^-7', ['_', '^']],
    ['Sin marcas', []],
  ])('finds the marks of %s', (text, marks) => {
    expect(rawNotationMarks(text)).toEqual(marks);
  });

  test('lets real names pass: files, constants and identifiers in a URL', () => {
    expect(rawNotationMarks('src/contact_solver.c L383 y tcurve_F3soft.lut')).toEqual([]);
    expect(rawNotationMarks('del orden del DY_REF=1.80 y MPC_XY_VEL_MAX de MUR')).toEqual([]);
    expect(rawNotationMarks('researchrepository.wvu.edu/faculty_publications/2509')).toEqual([]);
    expect(rawNotationMarks('http://www.x.com/gdc2016/GDC2016_Pittman.pdf')).toEqual([]);
  });

  test('a subscript starts from a single letter, so it is not taken for a name', () => {
    expect(rawNotationMarks('v_y1 = 2 y T_mín')).toEqual(['_']);
  });

  test('a subscript at the end of a sentence is not a file name', () => {
    expect(rawNotationMarks('el valor de F_z. Luego sigue')).toEqual(['_']);
  });
});

describe('typeRuleViolations (the type rule of E3)', () => {
  const plex = (glyphCount: number) => ({ familyName: 'IBM Plex Sans', glyphCount });
  const katex = (glyphCount: number) => ({ familyName: 'KaTeX_Main', glyphCount });
  const drawn = (over: Partial<DrawnText>): DrawnText => ({
    text: 'x',
    setting: 'text',
    family: 'IBM Plex Sans',
    fontStyle: 'normal',
    isNumbering: false,
    isLeaf: true,
    isMathVariable: false,
    fonts: [plex(1)],
    ...over,
  });

  test('a Plex Sans text, a symbol from the stack and an italic variable pass', () => {
    expect(typeRuleViolations(drawn({ text: '265,63 m' }))).toEqual([]);
    expect(typeRuleViolations(drawn({ text: '→', fonts: [katex(1)] }))).toEqual([]);
    expect(typeRuleViolations(drawn({ text: 'ω', fontStyle: 'italic' }))).toEqual([]);
  });

  test('KaTeX drawing a letter or a figure Plex has fails, outside a display', () => {
    const digit = drawn({
      setting: 'inline-math',
      text: '9',
      family: 'KaTeX_Main',
      fonts: [katex(1)],
    });

    expect(typeRuleViolations(digit)).toEqual([expect.stringMatching(/KaTeX dibuja 1/)]);
    expect(typeRuleViolations({ ...digit, setting: 'display-math' })).toEqual([]);
  });

  test('a parent’s fonts hold its children’s: KaTeX is only judged on an element of its own text', () => {
    expect(typeRuleViolations(drawn({ text: 'Con', isLeaf: false, fonts: [katex(3)] }))).toEqual(
      [],
    );
  });

  test('Plex Mono is the numbering’s alone: a value in it fails', () => {
    const value = drawn({ text: '0,00 rpm', family: 'IBM Plex Mono' });

    expect(typeRuleViolations(value)).toEqual([expect.stringMatching(/Plex Mono/)]);
    expect(typeRuleViolations({ ...value, isNumbering: true })).toEqual([]);
  });

  test('a lowercase Greek letter is a variable: upright, it fails', () => {
    expect(typeRuleViolations(drawn({ text: 'giro δ' }))).toEqual([
      expect.stringMatching(/griego/),
    ]);
    expect(typeRuleViolations(drawn({ text: 'Δv' }))).toEqual([]);
  });

  test('a Latin variable of an inline formula (KaTeX’s mathnormal) is italic: upright, it fails', () => {
    const variable = drawn({ setting: 'inline-math', text: 'k', isMathVariable: true });

    expect(typeRuleViolations(variable)).toEqual([expect.stringMatching(/variable latina/)]);
    expect(typeRuleViolations({ ...variable, fontStyle: 'italic' })).toEqual([]);
    // A unit or a \text{…} of the formula is not a variable: it stays upright.
    expect(typeRuleViolations({ ...variable, isMathVariable: false })).toEqual([]);
  });
});

describe('uprightFigureVariables (a figure label’s Latin variable is italic)', () => {
  const up = (text: string): LabelRun => ({ text, isItalic: false, isScript: false });
  const it = (text: string): LabelRun => ({ text, isItalic: true, isScript: false });
  const sub = (text: string): LabelRun => ({ text, isItalic: false, isScript: true });

  test.each([
    ['T = 4,92 s', [up('T = 4,92 s')], ['T']],
    ['2 RPM → r = 223,6 m', [up('2 RPM → r = 223,6 m')], ['r']],
    ['m B ≈ 1,2·10⁻⁵ N·m', [up('m B ≈ 1,2·10⁻⁵ N·m')], ['B']],
    ['K′ = 6 J', [up('K′ = 6 J')], ['K']],
    ['t_h = 0,53 s', [up('t'), sub('h'), up(' = 0,53 s')], ['t']],
    ['vec v_0', [up('v'), sub('0')], ['v']],
    ['vec v', [up('v')], ['v']],
    ['y(t)', [up('y(t)')], ['y']],
  ])('finds the upright variable of «%s»', (_label, runs, letters) => {
    expect(uprightFigureVariables(runs)).toEqual(letters);
  });

  test.each([
    ['$T$ = 4,92 s', [it('T'), up(' = 4,92 s')]],
    ['$t_h$ = 0,53 s', [it('t'), sub('h'), up(' = 0,53 s')]],
    ['a unit after a number', [up('h₀ = 4,00 m'), up('1 g')]],
    ['a word, an article or a conjunction', [up('Rebote y caída a la pared')]],
    ['a unit in parentheses', [up('Tiempo (s)')]],
    ['a name: the stops A, B and C', [up('A')]],
    ['a name: the motor’s symbol M', [up('M')]],
    ['an acronym or a model', [up('C3 · K2 · RPM')]],
    ['a subscript’s own letter', [it('v'), sub('p')]],
  ])('lets %s pass', (_why, runs) => {
    expect(uprightFigureVariables(runs)).toEqual([]);
  });
});

describe('inlineMathSizeViolation', () => {
  test('an inline formula is set at its text’s size: 1 em, never KaTeX’s 1,21', () => {
    expect(inlineMathSizeViolation(16, 16)).toBeUndefined();
    expect(inlineMathSizeViolation(19.36, 16)).toMatch(/1,21 em/);
  });
});
