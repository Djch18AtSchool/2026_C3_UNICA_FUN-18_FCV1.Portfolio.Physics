import { describe, expect, test } from 'vitest';
import { bindNumerals } from './typography';

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
