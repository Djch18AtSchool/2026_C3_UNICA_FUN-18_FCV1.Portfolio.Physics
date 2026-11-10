import { describe, expect, test } from 'vitest';
import {
  advancesModule,
  coverageModule,
  deriveAdvances,
  deriveFamilyCoverage,
  parseUnicodeRange,
  toRanges,
} from '../../scripts/font-data';
import {
  KATEX_MAIN_ADVANCES,
  KATEX_MATH_ADVANCES,
  PLEX_MONO_ADVANCE,
  PLEX_SANS_ADVANCES,
} from './glyphAdvances';
import { PLEX_MONO_RANGES, PLEX_SANS_RANGES } from './plexCoverage';

describe('the committed font data matches the installed font files', () => {
  test('Plex Sans and Plex Mono coverage', () => {
    expect(deriveFamilyCoverage('sans')).toEqual(PLEX_SANS_RANGES);
    expect(deriveFamilyCoverage('mono')).toEqual(PLEX_MONO_RANGES);
  });

  test('advance widths of Plex and of the KaTeX characters', () => {
    const derived = deriveAdvances();

    expect(derived.mono).toBe(PLEX_MONO_ADVANCE);
    expect(Object.fromEntries(derived.sans)).toEqual(PLEX_SANS_ADVANCES);
    expect(Object.fromEntries(derived.katexMain)).toEqual(KATEX_MAIN_ADVANCES);
    expect(Object.fromEntries(derived.katexMath)).toEqual(KATEX_MATH_ADVANCES);
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
    expect(coverageModule([[0x20, 0x7e]], [[0x20, 0x7e]])).toContain('[0x0020, 0x007e]');
    const text = advancesModule({
      mono: 600,
      sans: [[0x41, 620]],
      katexMain: [['∞', 1000]],
      katexMath: [],
    });
    expect(text).toContain('PLEX_MONO_ADVANCE = 600');
    expect(text).toContain("'∞': 1000,");
    expect(text).toContain('0x0041: 620,');
  });
});
