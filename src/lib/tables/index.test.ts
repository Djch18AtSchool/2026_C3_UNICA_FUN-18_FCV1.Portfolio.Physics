import { describe, expect, test } from 'vitest';
import { ALL_TABLES, collectTables, tableById } from './index';
import type { DataTableSpec } from './types';

const fixture = (id: string): DataTableSpec => ({
  id,
  caption: `Tabla ${id}`,
  source: { text: 'Fuente' },
  columns: [{ key: 'a', label: 'A', align: 'text' }],
  rows: [{ a: 'x' }],
});

describe('tableById', () => {
  test('throws a Spanish error naming the missing id', () => {
    expect(() => tableById('nope')).toThrow('DataTable: no existe la tabla "nope"');
  });
});

describe('collectTables', () => {
  test('joins the TABLES of every topic module in path order', () => {
    // Arrange
    const modules = {
      './topics/b.ts': { TABLES: [fixture('b-uno')] },
      './topics/a.ts': { TABLES: [fixture('a-uno'), fixture('a-dos')] },
    };

    // Act + Assert
    expect(collectTables(modules).map((table) => table.id)).toEqual(['a-uno', 'a-dos', 'b-uno']);
  });

  test('rejects a module that does not export TABLES', () => {
    expect(() => collectTables({ './topics/x.ts': {} })).toThrow(
      'tables: ./topics/x.ts no exporta TABLES',
    );
  });
});

describe('ALL_TABLES', () => {
  test('every spec is complete: caption, source, unique id, precision on numbers, every cell', () => {
    const ids = ALL_TABLES.map((table) => table.id);
    expect(new Set(ids).size, 'ids únicos').toBe(ids.length);
    for (const table of ALL_TABLES) {
      expect(table.caption.trim(), `${table.id}: caption`).not.toBe('');
      expect(table.source.text.trim(), `${table.id}: fuente`).not.toBe('');
      for (const column of table.columns) {
        if (column.align !== 'num') continue;
        expect(column.precision, `${table.id}.${column.key}: precision`).toBeTypeOf('number');
      }
      for (const row of table.rows) {
        for (const column of table.columns) {
          expect(row, `${table.id}: celda ${column.key}`).toHaveProperty(column.key);
        }
      }
    }
  });

  test('every caption is a finished sentence: it ends with a period', () => {
    for (const table of ALL_TABLES) {
      expect(table.caption.trimEnd(), `${table.id}: caption`).toMatch(/\.$/);
    }
  });

  test('every id of a table ends in a kebab-case name after its topic slug', () => {
    for (const table of ALL_TABLES) {
      expect(table.id, table.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)+$/);
    }
  });
});
