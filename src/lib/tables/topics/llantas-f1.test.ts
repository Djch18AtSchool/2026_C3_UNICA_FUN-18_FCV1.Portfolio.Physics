import { describe, expect, test } from 'vitest';
import { tableById } from '../index';
import { tableMarkdown } from '../markdown';
import { MUR_GRIP_CURVE } from '../../data/tyreModels';
import { TABLES } from './llantas-f1';

/** Markdown rows as plain cells: "| a | b |" → ['a', 'b'], with every space normalised. */
function markdownRows(markdown: string): string[][] {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('| '))
    .map((line) =>
      line
        .slice(2, -2)
        .split(' | ')
        .map((cell) => cell.replace(/\s+/g, ' ')),
    );
}

/** The body rows of a table (header and alignment rows dropped). */
const bodyRows = (index: number) => markdownRows(tableMarkdown(TABLES[index])).slice(2);

describe('llantas-f1 tables', () => {
  test('the four tables are in the registry under the topic slug', () => {
    expect(TABLES.map((table) => table.id)).toEqual([
      'llantas-f1-carga',
      'llantas-f1-temperatura',
      'llantas-f1-mur-carga',
      'llantas-f1-mur-temperatura',
    ]);
    expect(tableById('llantas-f1-carga')).toBe(TABLES[0]);
  });

  test('carga: the two models cross at 4 000 N; at 8 000 N, 12 800 N against 11 943 N', () => {
    const [header] = markdownRows(tableMarkdown(TABLES[0]));

    expect(header).toEqual([
      'Carga vertical $F_z$ (N)',
      'Modelo lineal, $\\mu_0 F_z$ (N)',
      'Ecuación (4.2), $\\mu(F_z) F_z$ (N)',
      '$\\mu$ efectivo, $\\mu(F_z)$',
    ]);
    expect(bodyRows(0)).toEqual([
      ['250', '400', '528', '2,11'],
      ['4 000', '6 400', '6 400', '1,60'],
      ['8 000', '12 800', '11 943', '1,49'],
      ['10 000', '16 000', '14 599', '1,46'],
    ]);
  });

  test('carga: the caption keeps the 2,11 caveat and the source says the parameters are illustrative', () => {
    const { caption, source } = TABLES[0];

    expect(caption).toContain('El $\\mu$ efectivo de 2,11 a 250 N es un artefacto del modelo');
    expect(caption).toContain('cuando la carga tiende a cero, da un $\\mu$ infinito');
    expect(source.text).toContain('ilustrativos, no medidos');
    expect(source.text.replace(/\s/g, ' ')).toContain(
      '$\\mu_0$ = 1,6, $F_{z0}$ = 4 000 N y $\\beta$ = 0,9',
    );
    expect(source.text).toContain('Milliken');
  });

  test('temperatura: 1,75 at both edges of the C3 window, 1,11 at 60 °C and 1,45 at 160 °C', () => {
    expect(bodyRows(1)).toEqual([
      ['60', '1,11', '39'],
      ['105', '1,75', '3'],
      ['120', '1,80', '0'],
      ['135', '1,75', '3'],
      ['160', '1,45', '19'],
    ]);
    expect(TABLES[1].caption).toContain('no baja del 97 % del pico');
    expect(TABLES[1].source.text).toContain('$w$ = 60,8 °C');
    expect(TABLES[1].source.text).toContain('Autosport (Noble, 2019), fuente 1');
  });

  test('mur-carga: the tyres.ini keys of mur_2019 as the file writes them', () => {
    expect(bodyRows(2)).toEqual([
      ['Delantera', 'FZ0', '1915'],
      ['Delantera', 'DY_REF', '1.80'],
      ['Delantera', 'LS_EXPY', '0.49'],
      ['Trasera', 'FZ0', '2142'],
      ['Trasera', 'LS_EXPY', '0.60'],
    ]);
    expect(TABLES[2].source.text).toContain('fuente 3');
  });

  test('mur-temperatura: the temperature|multiplier pairs, with the unit marked as my assumption', () => {
    expect(bodyRows(3)).toEqual([
      ['0', '0.80'],
      ['40', '0.96'],
      ['75', '1.0'],
      ['100', '1.0'],
      ['140', '0.97'],
      ['240', '0.80'],
    ]);
    const { caption } = TABLES[3];
    expect(TABLES[3].rows).toEqual(MUR_GRIP_CURVE.values);
    expect(caption).toContain(
      'PERFORMANCE_CURVE=tcurve_F3soft.lut ;File to use for temperature/grip relation',
    );
    expect(caption).toContain('copio seis de sus pares');
    expect(caption).toContain('sin unidad impresa (supongo °C)');
    expect(caption).toContain(
      'entre 75 y 100 la llanta da todo su agarre; fría o recalentada, menos',
    );
  });
});
