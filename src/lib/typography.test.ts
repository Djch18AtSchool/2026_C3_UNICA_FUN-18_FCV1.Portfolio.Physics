import { describe, expect, test } from 'vitest';
import { bindNumerals, isCovered, uncoveredChars } from './typography';

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

  test('lists the symbols, sub- and superscripts Plex lacks, once each and in order', () => {
    expect(uncoveredChars('v∞ ≈ 7, rₚ ≤ 3, v∞ ≥ 1, 10⁻⁷, M☉')).toEqual([
      '∞',
      '≈',
      'ₚ',
      '≤',
      '≥',
      '⁻',
      '⁷',
      '☉',
    ]);
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
    expect(isCovered('∞', 'sans')).toBe(false);
  });
});
