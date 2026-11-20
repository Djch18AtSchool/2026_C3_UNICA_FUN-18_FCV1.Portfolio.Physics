import { describe, expect, test } from 'vitest';
import { tableById } from '../index';
import { tableMarkdown } from '../markdown';
import { TABLES } from './sintesis-sonido';

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

const rowsOf = (index: number) => markdownRows(tableMarkdown(TABLES[index]));
const plain = (text: string) => text.replace(/[  ]/g, ' ');

describe('sintesis-sonido tables', () => {
  test('the three tables are in the registry under the topic slug', () => {
    expect(TABLES.map((table) => table.id)).toEqual([
      'sintesis-sonido-recetas',
      'sintesis-sonido-armonicos',
      'sintesis-sonido-muestras',
    ]);
    expect(tableById('sintesis-sonido-muestras')).toBe(TABLES[2]);
  });

  test('recetas: the four Web Audio recipes, n = 1…12, as the specification gives them (product values)', () => {
    const [header, , ...rows] = rowsOf(0);

    expect(header[0]).toBe('Armónico $n$');
    expect(header.slice(1).map((label) => label.split(',')[0])).toEqual([
      'Seno',
      'Cuadrada',
      'Diente de sierra',
      'Triangular',
    ]);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual(['1', '1,000', '1,273', '0,637', '0,811']);
    expect(rows[1]).toEqual(['2', '0,000', '0,000', '−0,318', '0,000']);
    expect(rows[2]).toEqual(['3', '0,000', '0,424', '0,212', '−0,090']);
    expect(TABLES[0].caption).toContain('los coeficientes $b_n$ de cada armónico');
    expect(TABLES[0].caption).toContain('valores del producto');
    expect(TABLES[0].source.text).toContain('§1.28.6');
    expect(TABLES[0].source.text).toContain('L408-L428');
  });

  test('armonicos: both measured recipes with each harmonic’s range, the research table to 0,1 dB', () => {
    const [header, , ...rows] = rowsOf(1);

    expect(header).toEqual([
      'Armónico $n$',
      'Flauta, $A_n/A_1$ (dB)',
      'Flauta, rango (dB)',
      'Clarinete en si$\\flat$, $A_n/A_1$ (dB)',
      'Clarinete en si$\\flat$, rango (dB)',
    ]);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual(['1', '0,0', 'referencia', '0,0', 'referencia']);
    expect(rows[1]).toEqual(['2', '3,7', '0,9 a 5,1', '−34,1', '−35,9 a −29,0']);
    expect(rows[2]).toEqual(['3', '0,8', '−4,2 a 4,2', '3,3', '1,9 a 4,2']);
    expect(rows[4]).toEqual(['5', '−0,3', '−18,5 a 5,6', '−7,8', '−9,7 a −5,7']);
    expect(TABLES[1].caption).toContain('cálculo propio');
  });

  test('muestras: file, performer, format, f₁, T, odd/even, symmetry, attack, release, clip, origin and permission', () => {
    const rows = rowsOf(2).map((row) => row.map(plain));
    const byName = Object.fromEntries(rows.slice(2).map(([name, ...cells]) => [name, cells]));

    expect(rows[0]).toEqual(['Dato', 'Flauta', 'Clarinete en si$\\flat$']);
    expect(byName['Archivo del MIS']).toEqual([
      'Flute.nonvib.ff.Eb4.stereo.aif',
      'BbClarinet.ff.Eb4.stereo.aif',
    ]);
    expect(byName['Fundamental $f_1$']).toEqual(['310,34 Hz', '310,10 Hz']);
    expect(byName['Periodo $T = 1/f_1$']).toEqual(['3,222 ms', '3,225 ms']);
    expect(byName['Impares sobre pares ($n \\le 10$)']).toEqual(['−0,7 dB', '25,7 dB']);
    expect(byName['Correlación de $y(t)$ y $-y(t + T/2)$']).toEqual(['−0,084', '0,992']);
    expect(byName['Ataque, 10 → 90 %']).toEqual(['0,12 s', '0,40 s']);
    expect(byName['Caída, 90 → 10 %']).toEqual(['0,29 s', '0,11 s']);
    expect(byName['Audio publicado']).toEqual([
      'desde 0,10 s del original; 2,86 s, MP3 mono a −20 LUFS',
      'desde 0,38 s del original; 2,52 s, MP3 mono a −20 LUFS',
    ]);
    expect(byName['Formato del original']).toEqual([
      'AIFF de 24 bits a 44 100 Hz, dos canales idénticos',
      'AIFF de 24 bits a 44 100 Hz, dos canales idénticos',
    ]);
    expect(byName['Intérprete y fecha']).toEqual([
      'Sonja Feig, abril de 2000',
      'Christine Bellomy, clarinete Buffet R13, 3 de agosto de 1998',
    ]);
    expect(byName['Origen de los números'][0]).toBe('Medida propia (cálculo propio)');
    expect(byName['Permiso de uso'][0]).toContain(
      '«may be downloaded and used for any projects, without restrictions»',
    );
  });
});
