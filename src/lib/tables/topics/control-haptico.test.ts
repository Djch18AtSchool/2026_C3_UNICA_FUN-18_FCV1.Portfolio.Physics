import { describe, expect, test } from 'vitest';
import { tableById } from '../index';
import { tableMarkdown } from '../markdown';
import { TABLES } from './control-haptico';

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

describe('control-haptico tables', () => {
  test('the three tables are in the registry under the topic slug', () => {
    expect(TABLES.map((table) => table.id)).toEqual([
      'control-haptico-vibracion',
      'control-haptico-energia',
      'control-haptico-gatillo',
    ]);
    expect(tableById('control-haptico-gatillo')).toBe(TABLES[2]);
  });

  test('vibracion: 1,6 N of vibration everywhere; the 400 N/m spring gives 0,8 N at 2 mm and 3,2 N at 8 mm', () => {
    const [header, , ...rows] = rowsOf(0);

    expect(header).toEqual([
      'Desplazamiento x (mm)',
      'Vibración fija, amplitud F₀ (N)',
      'Resorte de 400 N/m, k x (N)',
    ]);
    expect(rows).toEqual([
      ['2', '1,6', '0,8'],
      ['4', '1,6', '1,6'],
      ['8', '1,6', '3,2'],
    ]);
  });

  test('vibracion: the caption says F₀ is a model assumption matched to the spring at 4 mm', () => {
    const { caption, source } = TABLES[0];

    expect(caption.replace(/\s/g, ' ')).toContain(
      'F₀ = 1,6 N es un supuesto del modelo, igual a la fuerza del resorte a 4 mm',
    );
    expect(source.text).toContain('recorrido de 8 mm, k y F₀ ilustrativos');
  });

  test('energia: 1,6 N and 3,2 N, 12,8 mJ stored at the bottom and −12,8 mJ of work by the spring', () => {
    const [header, , ...rows] = rowsOf(1);

    expect(header).toEqual([
      'Punto del recorrido',
      'Desplazamiento x (mm)',
      'Fuerza, k x (N)',
      'Energía guardada, U = ½ k x² (mJ)',
      'Trabajo de la fuerza elástica (mJ)',
    ]);
    expect(rows).toEqual([
      ['A mitad', '4', '1,6', '3,2', '−3,2'],
      ['Al fondo', '8', '3,2', '12,8', '−12,8'],
    ]);
    expect(TABLES[1].caption).toContain('Módulo 2, Tema 03, concepto 03');
    expect(TABLES[1].caption).toContain(
      'F = 400 · 0,008 = 3,2 N y U = ½ · 400 · 0,008² = 0,0128 J = 12,8 mJ',
    );
    expect(TABLES[1].source.text).toContain('Serway y Jewett (2018), fuente 5');
  });

  test('gatillo: at the bottom, 3,2 N and 12,8 mJ from rest; 2,0 N and 5,0 mJ with x₀ = 3 mm', () => {
    const [header, , ...rows] = rowsOf(2);

    expect(header).toEqual([
      'Preajuste',
      'k (N/m)',
      'x₀ (mm)',
      'F al fondo (N)',
      'Trabajo del dedo al fondo (mJ)',
    ]);
    expect(rows).toEqual([
      ['Resorte ideal', '400', '0', '3,2', '12,8'],
      ['Resorte tardío', '400', '3', '2,0', '5,0'],
    ]);
    expect(TABLES[2].caption).toContain('ilustrativ');
  });
});
