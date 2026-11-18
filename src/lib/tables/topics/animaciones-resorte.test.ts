import { describe, expect, test } from 'vitest';
import { SPRING_PRESETS } from '../../data/springPresets';
import { dampingRatio } from '../../physics/dampedSpring';
import { tableById } from '../index';
import { tableMarkdown } from '../markdown';
import type { DataTableSpec } from '../types';
import { uncoveredChars } from '../../typography';
import { TABLES } from './animaciones-resorte';

const byId = (id: string): DataTableSpec => {
  const table = TABLES.find((candidate) => candidate.id === id);
  if (!table) throw new Error(`missing ${id}`);
  return table;
};

const column = (table: DataTableSpec, key: string) => table.rows.map((row) => row[key]);

/** What a text shows outside its `$…$` formulas, which KaTeX draws. */
const outsideKatex = (text: string) => text.replace(/\$[^$]*\$/g, '');

describe('animaciones-resorte tables', () => {
  test('captions, headers, cells and sources leave IBM Plex only inside $…$ (KaTeX)', () => {
    for (const table of TABLES) {
      const texts = [
        table.caption,
        table.source.text,
        ...table.columns.map((item) => item.label),
        ...table.rows.flatMap((row) => table.columns.map((item) => String(row[item.key]))),
      ];
      expect(texts.flatMap((text) => uncoveredChars(outsideKatex(text), 'sans'))).toEqual([]);
    }
  });

  test('registers the presets and the conversion tables, in that order', () => {
    expect(TABLES.map((table) => table.id)).toEqual([
      'animaciones-resorte-preajustes',
      'animaciones-resorte-conversion',
    ]);
    expect(tableById('animaciones-resorte-preajustes')).toBe(TABLES[0]);
    expect(tableById('animaciones-resorte-conversion')).toBe(TABLES[1]);
  });

  describe('preajustes', () => {
    const table = byId('animaciones-resorte-preajustes');

    test('has k, b, m, ζ, M_p, t_s at 2 %, origin and source columns', () => {
      expect(table.columns.map((item) => [item.key, item.align, item.unit])).toEqual([
        ['preajuste', 'text', undefined],
        ['k', 'num', 'N/m'],
        ['b', 'num', 'N·s/m'],
        ['m', 'num', 'kg'],
        ['zeta', 'num', undefined],
        ['mp', 'num', '%'],
        ['ts', 'num', 's'],
        ['origen', 'text', undefined],
        ['fuente', 'text', undefined],
      ]);
    });

    test('one row per preset of the data module, named as it is, its symbols as formulas', () => {
      expect(column(table, 'preajuste')).toEqual([
        'Motion, por omisión',
        'Motion, posición $x$ e $y$',
        'Motion, escala hacia 0',
        'Apple, ejemplo de la documentación',
        'Sobreamortiguado',
      ]);
      expect(SPRING_PRESETS.map((preset) => preset.label)[1]).toBe('Motion, posición x e y');
      expect(column(table, 'fuente')).toEqual(SPRING_PRESETS.map((preset) => preset.source));
    });

    test('k and b with the decimals they need: Apple’s 157,91 and 17,59, Motion’s 2√550', () => {
      expect(column(table, 'k')).toEqual(['100', '500', '550', '157,91', '100']);
      expect(column(table, 'b')).toEqual(['10', '25', '46,90', '17,59', '40']);
      expect(column(table, 'm')).toEqual(['1', '1', '1', '1', '1']);
    });

    test('ζ, the overshoot (10.7) and the 2 % settling time come from the core', () => {
      expect(column(table, 'zeta')).toEqual(
        SPRING_PRESETS.map((preset) => dampingRatio(preset.params)),
      );
      expect(tableMarkdown(table)).toContain('| 0,56 |');
      expect(column(table, 'mp')).toEqual(['16,30', '12,03', '0', '4,60', '0']);
      expect(tableMarkdown(table)).toContain('| 0,808 |');
      expect(tableMarkdown(table)).toContain('| 0,476 |');
      expect(tableMarkdown(table)).toContain('| 1,488 |');
    });

    test('says which presets are the product and which one is an illustrative assumption', () => {
      expect(column(table, 'origen')).toEqual([
        'Producto',
        'Producto',
        'Producto',
        'Producto',
        'Ilustrativo',
      ]);
      expect(table.source.text).toContain('cálculo propio');
      expect(table.source.text).toContain('v14.14.0');
    });
  });

  describe('conversion', () => {
    const table = byId('animaciones-resorte-conversion');

    test('has the call, the conversion, my result and what the source publishes', () => {
      expect(table.columns.map((item) => [item.key, item.align])).toEqual([
        ['llamada', 'text'],
        ['conversion', 'text'],
        ['calculo', 'text'],
        ['publicado', 'text'],
        ['fuente', 'text'],
      ]);
    });

    test("Apple's two documented examples, as Apple writes them, and (10.10) agreeing", () => {
      const [forward, inverse] = table.rows;

      expect(forward.llamada).toBe('Apple, SwiftUI: Spring(duration: 0.5, bounce: 0.3)');
      expect(forward.calculo).toBe('$k$ = 157,91 N/m, $b$ = 17,59 N·s/m');
      expect(forward.publicado).toBe('(1.0, 157.9, 17.6)');
      expect(inverse.llamada).toBe('Apple, SwiftUI: Spring(mass: 1, stiffness: 100, damping: 10)');
      expect(inverse.calculo).toBe(String.raw`$d$ = 0,63 s, $\beta$ = 0,5`);
      expect(inverse.publicado).toBe('(0.63, 0.5)');
    });

    test("Motion's default visualDuration spring, and its own 96,68 % test", () => {
      const [, , visual, check] = table.rows;

      expect(visual.calculo).toBe('$k$ = 304,62 N/m, $b$ = 24,43 N·s/m');
      expect(visual.publicado).toBe('—');
      expect(check.calculo).toBe('96,68 % del recorrido');
      expect(check.publicado).toBe('«bounce 0 is 96.68% of the way at visualDuration»');
    });

    test('exports as Markdown with the formulas kept as math', () => {
      const markdown = tableMarkdown(table);

      expect(markdown).toContain(String.raw`$k = m\,(2\pi/d)^2$`);
      expect(markdown).toContain('| (0.63, 0.5) |');
    });
  });
});
