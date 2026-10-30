import { describe, expect, test } from 'vitest';
import { COMFORT } from '../../../components/topics/gravedad-artificial/habitatFigures';
import { tableById } from '../index';
import { tableMarkdown } from '../markdown';
import { HABITAT_PRESETS } from '../../data/habitatPresets';
import { COMFORT_CRITERIA, STANFORD_TORUS, TABLES } from './gravedad-artificial';

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

const spaced = (text: string): string => text.replace(/\s+/g, ' ');
const range = (values: readonly (number | null)[]) => {
  const given = values.filter((value): value is number => value !== null);
  return [Math.min(...given), Math.max(...given)];
};

describe('gravedad-artificial tables', () => {
  test('the three tables are in the registry under the topic slug', () => {
    expect(TABLES.map((table) => table.id)).toEqual([
      'gravedad-artificial-habitats',
      'gravedad-artificial-toro',
      'gravedad-artificial-confort',
    ]);
    expect(tableById('gravedad-artificial-confort')).toBe(TABLES[2]);
  });

  test('habitats: 223,6 m at 2 RPM, 894,6 m at 1 RPM and the torus at 0,93 g', () => {
    const [header, , ...rows] = markdownRows(tableMarkdown(TABLES[0]));

    expect(header).toEqual([
      'Hábitat',
      'Radio r (m)',
      'Giro N (RPM)',
      'ω (rad/s)',
      'Rapidez del piso v (m/s)',
      'Período T (s)',
      'a_c (m/s²)',
      'a_c/g',
      'Gradiente h/r (%)',
    ]);
    expect(rows).toEqual([
      ['Centrífuga pequeña', '10', '9,46', '0,9905', '9,9', '6,3', '9,81', '1,00', '18,0'],
      ['1 g a 100 m', '100', '2,99', '0,3132', '31,3', '20,1', '9,81', '1,00', '1,8'],
      ['1 g a 2 RPM', '223,6', '2,00', '0,2094', '46,8', '30,0', '9,81', '1,00', '0,8'],
      [
        'Toro de Stanford: pared interior del tubo',
        '765',
        '1,00',
        '0,1047',
        '80,1',
        '60,0',
        '8,39',
        '0,86',
        '0,2',
      ],
      [
        'Toro de Stanford: radio mayor R',
        '830',
        '1,00',
        '0,1047',
        '86,9',
        '60,0',
        '9,10',
        '0,93',
        '0,2',
      ],
      ['1 g a 1 RPM', '894,6', '1,00', '0,1047', '93,7', '60,0', '9,81', '1,00', '0,2'],
      [
        'Límite de SP-413: punto más exterior del tubo',
        '895',
        '1,00',
        '0,1047',
        '93,7',
        '60,0',
        '9,81',
        '1,00',
        '0,2',
      ],
    ]);
  });

  test('habitats: the caption states g, h and the torus range against the report', () => {
    const caption = spaced(TABLES[0].caption);

    expect(caption).toContain('g = 9,81 m/s²');
    expect(caption).toContain('h = 1,80 m');
    expect(caption).toContain('de 0,93 a 1,00 g, dentro de los 0,95 ± 0,05 g');
    expect(caption).toContain('0,86 g');
  });

  test('toro: the radii are the ones the lab presets load', () => {
    const presetRadius = (id: string) =>
      HABITAT_PRESETS.find((preset) => preset.id === id)?.values.r;

    expect(STANFORD_TORUS.R).toBe(presetRadius('toro-stanford'));
    expect(STANFORD_TORUS.R + STANFORD_TORUS.tubeRadius).toBe(presetRadius('limite-sp413'));
  });

  test('toro: R = 830 m and a 65 m tube, at 1 RPM', () => {
    expect(STANFORD_TORUS).toEqual({ R: 830, tubeRadius: 65, rpm: 1 });
  });

  test('toro: the SP-413 facts; Coriolis stays in the caption of figure 3.3, after step 3', () => {
    const rows = markdownRows(tableMarkdown(TABLES[1])).slice(2);
    const text = rows.map((row) => row.join(' ')).join(' ');

    expect(text).toContain('830 m');
    expect(text).toContain('65 m');
    expect(text).toContain('130 m');
    expect(text).toContain('1 800 m');
    expect(text).toContain('seis');
    expect(text).toContain('entre 0,9 y 1 g');
    expect(text).toContain('0,95 ± 0,05 g a 1 RPM');
    expect(text).not.toContain('Coriolis');
    expect(TABLES[1].caption).toContain('1975');
    expect(TABLES[1].caption).toContain('1977');
  });

  test('confort: the five authors, and their spread is the band the figure draws', () => {
    const [header, , ...rows] = markdownRows(tableMarkdown(TABLES[2]));

    expect(header).toEqual([
      'Autor',
      'Radio mínimo (m)',
      'Giro máximo (RPM)',
      'Velocidad tangencial mínima (m/s)',
    ]);
    expect(rows).toEqual([
      ['Hill y Schnitzer (1962)', '—', '4', '6'],
      ['Gilruth (1969)', '12', '6', '—'],
      ['Gordon y Gervais (1969)', '12', '6', '7'],
      ['Stone (1973)', '4', '6', '10'],
      ['Cramer (1985)', '—', '3', '7'],
    ]);
    expect(range(COMFORT_CRITERIA.map((author) => author.rpmMax))).toEqual(COMFORT.rpmMax);
    expect(range(COMFORT_CRITERIA.map((author) => author.rMin))).toEqual(COMFORT.rMin);
    expect(range(COMFORT_CRITERIA.map((author) => author.vMin))).toEqual(COMFORT.vMin);
  });

  test('confort: the caption gives the three spreads and the source dates SpinCalc', () => {
    const caption = spaced(TABLES[2].caption);

    expect(caption).toContain('de 3 a 6 RPM');
    expect(caption).toContain('de 4 a 12 m');
    expect(caption).toContain('de 6 a 10 m/s');
    expect(TABLES[2].source.text).toContain('desde 2000; última revisión de 2018');
  });
});
