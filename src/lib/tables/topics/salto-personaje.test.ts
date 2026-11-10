import { describe, expect, test } from 'vitest';
import { CELESTE_JUMP, JUMP_PRESETS } from '../../data/jumpPresets';
import { tableById } from '../index';
import { uncoveredChars } from '../../typography';
import { tableMarkdown } from '../markdown';
import { GAME_CONSTANTS, TABLES, toSi } from './salto-personaje';

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
const constant = (name: string) => {
  const found = GAME_CONSTANTS.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`no constant ${name}`);
  return found;
};
const SMB = JUMP_PRESETS.find((preset) => preset.id === 'super-mario-bros')?.values;

describe('salto-personaje tables', () => {
  test('the constants table is in the registry under the topic slug', () => {
    expect(TABLES.map((table) => table.id)).toEqual(['salto-personaje-constantes']);
    expect(tableById('salto-personaje-constantes')).toBe(TABLES[0]);
  });

  test('every constant as the code prints it and in SI with the declared scales', () => {
    const [header, , ...rows] = markdownRows(tableMarkdown(TABLES[0]));

    expect(header).toEqual(['Constante', 'Juego', 'En el código', 'En SI']);
    expect(rows).toEqual([
      ['Gravity', 'Celeste', '900 px/s²', '112,5 m/s²'],
      ['JumpSpeed', 'Celeste', '−105 px/s', '13,1 m/s'],
      ['MaxRun', 'Celeste', '90 px/s', '11,25 m/s'],
      ['HalfGravThreshold', 'Celeste', '40 px/s', '5 m/s'],
      ['VarJumpTime', 'Celeste', '0,2 s', '0,2 s'],
      ['MaxFall', 'Celeste', '160 px/s', '20 m/s'],
      ['Salto parado', 'Super Mario Bros.', '4 px/cuadro', '15 m/s'],
      ['Gravedad con A sostenido', 'Super Mario Bros.', '0,125 px/cuadro²', '28,1 m/s²'],
      [
        'Gravedad al soltar A o al empezar a caer',
        'Super Mario Bros.',
        '0,4375 px/cuadro²',
        '98,4 m/s²',
      ],
    ]);
  });

  test('the conversions are the ones the simulator presets use', () => {
    expect(toSi(constant('Gravity'))).toBe(CELESTE_JUMP.g);
    expect(toSi(constant('JumpSpeed'))).toBeCloseTo(CELESTE_JUMP.v0, 1);
    expect(toSi(constant('MaxRun'))).toBe(CELESTE_JUMP.vx);
    expect(toSi(constant('Salto parado'))).toBe(SMB?.v0);
    expect(toSi(constant('Gravedad con A sostenido'))).toBeCloseTo(SMB?.g ?? 0, 1);
    expect(
      toSi(constant('Gravedad al soltar A o al empezar a caer')) /
        toSi(constant('Gravedad con A sostenido')),
    ).toBe(SMB?.fallMultiplier);
  });

  test('the caption gives both scales and why JumpSpeed is negative; the source, both games', () => {
    const [table] = TABLES;

    expect(spaced(table.caption)).toContain('8 px = 1 m');
    expect(spaced(table.caption)).toContain('16 px = 1 m (el lado de un bloque) y 60 cuadros/s');
    expect(table.caption).toContain('en pantalla +y apunta hacia abajo');
    expect(table.source.text).toContain('Player.cs (fuente 1)');
    expect(table.source.text).toContain('Super Mario Bros. (fuente 3)');
    expect(table.source.text).toContain('escalas que supongo yo y que el código no fija');
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
