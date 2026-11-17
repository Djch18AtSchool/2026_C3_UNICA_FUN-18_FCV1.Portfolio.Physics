import { describe, expect, test } from 'vitest';
import {
  advancesModule,
  coverageModule,
  deriveAdvances,
  deriveFamilyCoverage,
  deriveSymbolCoverage,
  parseSymbolFaces,
  parseUnicodeRange,
  symbolSizeAdjust,
  toRanges,
} from '../../scripts/font-data';
import {
  MATH_SYMBOL_ADVANCES,
  PLEX_MONO_ADVANCE,
  PLEX_SANS_ADVANCES,
  PLEX_SANS_ITALIC_ADVANCES,
} from './glyphAdvances';
import { KATEX_SCALE } from './mathFonts';
import {
  MATH_SYMBOL_RANGES,
  MATH_SYMBOL_SIZE_ADJUST,
  PLEX_MONO_RANGES,
  PLEX_SANS_RANGES,
} from './plexCoverage';

const SIZE_ADJUST_DECIMALS = 4;

describe('the committed font data matches the installed font files', () => {
  test('Plex Sans and Plex Mono coverage', () => {
    expect(deriveFamilyCoverage('sans')).toEqual(PLEX_SANS_RANGES);
    expect(deriveFamilyCoverage('mono')).toEqual(PLEX_MONO_RANGES);
  });

  test('the symbols of the «Math Symbols» face and its size-adjust (math.css)', () => {
    expect(deriveSymbolCoverage()).toEqual(MATH_SYMBOL_RANGES);
    expect(symbolSizeAdjust()).toBe(MATH_SYMBOL_SIZE_ADJUST);
  });

  test('advance widths of Plex upright and italic and of the symbols', () => {
    const derived = deriveAdvances();

    expect(derived.mono).toBe(PLEX_MONO_ADVANCE);
    expect(Object.fromEntries(derived.sans)).toEqual(PLEX_SANS_ADVANCES);
    expect(Object.fromEntries(derived.sansItalic)).toEqual(PLEX_SANS_ITALIC_ADVANCES);
    expect(Object.fromEntries(derived.symbols)).toEqual(MATH_SYMBOL_ADVANCES);
  });
});

describe('the type rule the fonts carry', () => {
  test('math.css scales the symbols by KATEX_SCALE: their x-height meets Plex’s', () => {
    expect(MATH_SYMBOL_SIZE_ADJUST).toBe(Number(KATEX_SCALE.toFixed(SIZE_ADJUST_DECIMALS)));
  });

  test('the symbol face draws what Plex lacks and nothing Plex draws', () => {
    const inSymbols = (char: string) =>
      MATH_SYMBOL_RANGES.some(
        ([from, to]) => (char.codePointAt(0) ?? 0) >= from && (char.codePointAt(0) ?? 0) <= to,
      );

    for (const char of '→∞≈≤≥⋅∫⊥⊙∂') expect(inSymbols(char), char).toBe(true);
    for (const char of 'aθΔ−×·') expect(inSymbols(char), char).toBe(false);
  });

  test('Plex Sans digits are tabular: one advance for every figure', () => {
    const digits = new Set(Array.from({ length: 10 }, (_, d) => PLEX_SANS_ADVANCES[0x30 + d]));

    expect(digits.size).toBe(1);
  });

  test('reproduces the audit: what Plex lacks (§5.1)', () => {
    const covers = (point: number) =>
      PLEX_SANS_RANGES.some(([from, to]) => point >= from && point <= to);

    for (const char of '⃗→∞≈≠≤≥√∫⊥☉⊙₀ₐₓₕₘₙₚ⁻⁵⁷ ẋẍ') {
      expect(covers(char.codePointAt(0) ?? 0), char).toBe(false);
    }
  });
});

describe('script helpers', () => {
  test('parses unicode-range lists, wildcards included', () => {
    expect(parseUnicodeRange('U+0460-052F, U+20B4,U+4??')).toEqual([
      [0x460, 0x52f],
      [0x20b4, 0x20b4],
      [0x400, 0x4ff],
    ]);
  });

  test('merges consecutive code points into ranges', () => {
    expect(toRanges([5, 1, 2, 3, 7, 6])).toEqual([
      [1, 3],
      [5, 7],
    ]);
  });

  test('writes modules that declare every list', () => {
    const coverage = coverageModule([[0x20, 0x7e]], [[0x20, 0x7e]], [[0x221e, 0x221e]], 1.5);
    expect(coverage).toContain('[0x0020, 0x007e]');
    expect(coverage).toContain('[0x221e, 0x221e]');
    expect(coverage).toContain('MATH_SYMBOL_SIZE_ADJUST = 1.5');
    const text = advancesModule({
      mono: 600,
      sans: [[0x41, 620]],
      sansItalic: [[0x61, 540]],
      symbols: [[0x221e, 1000]],
    });
    expect(text).toContain('PLEX_MONO_ADVANCE = 600');
    expect(text).toContain('0x221e: 1000,');
    expect(text).toContain('0x0061: 540,');
    expect(text).toContain('0x0041: 620,');
  });

  test('reads the «Math Symbols» faces of a stylesheet and refuses an incomplete one', () => {
    const face = (body: string) => `@font-face { font-family: 'Math Symbols'; ${body} }`;
    const css = face(
      "src: url('../x/KaTeX_Main-Regular.woff2') format('woff2'); unicode-range: U+2190-22FF; size-adjust: 116.74%;",
    );

    expect(parseSymbolFaces(css)).toEqual([
      { file: 'KaTeX_Main-Regular.woff', ranges: [[0x2190, 0x22ff]], sizeAdjust: 1.1674 },
    ]);
    expect(parseSymbolFaces("@font-face { font-family: 'Other'; }")).toEqual([]);
    expect(() => parseSymbolFaces(face('unicode-range: U+2190;'))).toThrow(/incomplete/);
  });
});
