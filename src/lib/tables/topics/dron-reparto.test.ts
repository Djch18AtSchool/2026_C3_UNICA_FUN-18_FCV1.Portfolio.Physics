import { describe, expect, test } from 'vitest';
import { tableById } from '../index';
import { uncoveredChars } from '../../typography';
import { tableMarkdown } from '../markdown';
import { TABLES } from './dron-reparto';

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

describe('dron-reparto tables', () => {
  test('both tables are in the registry under the topic slug', () => {
    expect(TABLES.map((table) => table.id)).toEqual([
      'dron-reparto-tramos',
      'dron-reparto-limites',
    ]);
    expect(tableById('dron-reparto-limites')).toBe(TABLES[1]);
  });

  test('tramos: every leg of the declared route with its arrival, length, heading and duration', () => {
    const [header, , ...rows] = markdownRows(tableMarkdown(TABLES[0]));

    expect(header).toEqual([
      'Tramo',
      'Llegada, x (m)',
      'Llegada, y (m)',
      'Longitud d (m)',
      'Rumbo θ (°)',
      '$a_x$ al arrancar (m/s²)',
      '$a_y$ al arrancar (m/s²)',
      'Crucero, $d - 2d_a$ (m)',
      'Duración T (s)',
      'Entrega al llegar (s)',
    ]);
    expect(rows).toEqual([
      ['De Depósito a A', '600', '200', '632,5', '18,4', '2,37', '0,79', '592,5', '67,2', '20'],
      ['De A a B', '900', '800', '670,8', '63,4', '1,12', '2,24', '630,8', '71,1', '20'],
      ['De B a C', '300', '1 100', '670,8', '153,4', '−2,24', '1,12', '630,8', '71,1', '20'],
      ['De C a Depósito', '0', '0', '1 140,2', '−105,3', '−0,66', '−2,41', '1 100,2', '118,0', '0'],
      ['Suma de los tramos', '—', '—', '3 114,3', '—', '—', '—', '—', '327,4', '60'],
    ]);
  });

  test('tramos: the caption states the limits, that no leg is triangular and the 387,4 s total', () => {
    const caption = spaced(TABLES[0].caption);

    expect(caption).toContain('$v_\\text{máx}$ = 10 m/s');
    expect(caption).toContain('$a_\\text{máx}$ = 2,5 m/s²');
    expect(caption).toContain('592,5 m de crucero');
    expect(caption).toContain('ningún tramo es triangular');
    expect(caption).toContain('387,4 s');
  });

  test('limites: ArduPilot 4.6.3 and PX4 defaults at their source precision, with the names', () => {
    const [header, , arduPilot, px4] = markdownRows(tableMarkdown(TABLES[1]));

    expect(header).toEqual([
      'Autopiloto',
      'Rapidez en misión (m/s)',
      'Rapidez horizontal máx. general (m/s)',
      'Aceleración horizontal (m/s²)',
      'Sobreaceleración, jerk (m/s³)',
      'Parámetros',
    ]);
    expect(arduPilot.slice(0, 5)).toEqual(['ArduPilot Copter 4.6.3', '10', '—', '2,5', '1']);
    expect(arduPilot[5]).toContain('WPNAV_SPEED = 1 000 cm/s, rapidez máxima en misión');
    expect(arduPilot[5]).toContain('WPNAV_ACCEL = 250 cm/s²');
    expect(arduPilot[5]).toContain('WP_SPD, WP_ACC y WP_JERK');
    expect(px4.slice(0, 5)).toEqual(['PX4', '5', '12', '3', '4']);
    expect(px4[5]).toContain('MPC_XY_CRUISE, rapidez de crucero en misión');
  });

  test('limites: caption explains the jerk and the source names the four documents', () => {
    const [, limits] = TABLES;

    expect(limits.caption).toContain('el ritmo de cambio de la aceleración horizontal');
    expect(limits.caption).toContain('ArduPilot vuela con WP_SPD como rapidez horizontal máxima');
    expect(limits.source.text).toContain('fuentes 1, 2 y 3');
    expect(limits.source.text).toContain('fuente 5');
  });

  test('captions, headers and text cells leave IBM Plex only inside $…$ (KaTeX)', () => {
    const outsideKatex = (text: string) => text.replace(/\$[^$]*\$/g, '');

    for (const table of TABLES) {
      const texts = [
        table.caption,
        ...table.columns.map((column) => column.label),
        ...table.rows.flatMap((row) => table.columns.map((column) => String(row[column.key]))),
      ];
      expect(texts.flatMap((text) => uncoveredChars(outsideKatex(text), 'sans'))).toEqual([]);
    }
  });
});
