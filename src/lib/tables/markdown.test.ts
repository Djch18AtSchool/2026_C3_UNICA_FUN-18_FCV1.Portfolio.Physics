import { describe, expect, test, vi } from 'vitest';
import type { DataTableSpec } from './types';

const spec: DataTableSpec = {
  id: 't-x',
  caption: 'Balance del ciclo',
  source: { text: 'Cálculo propio' },
  columns: [
    { key: 'ciclo', label: 'Ciclo', align: 'text' },
    { key: 'e', label: 'Energía', unit: 'kWh', align: 'num', precision: 3 },
  ],
  rows: [{ ciclo: 'UDDS', e: 0.6953 }],
};

vi.mock('./index', () => ({
  tableById: (id: string) => {
    if (id !== 't-x') throw new Error(`DataTable: no existe la tabla "${id}"`);
    return spec;
  },
}));

const { expandTables, tableMarkdown, tableReadingText } = await import('./markdown');

describe('tableMarkdown', () => {
  test('renders caption, a GFM table with units and aligned columns, and the source', () => {
    // Act
    const markdown = tableMarkdown(spec);

    // Assert
    expect(markdown).toBe(
      'Tabla: Balance del ciclo\n\n| Ciclo | Energía (kWh) |\n| :-- | --: |\n| UDDS | 0,695 |\n\nFuente: Cálculo propio',
    );
  });

  test('escapes pipes in text cells so a row keeps its columns', () => {
    // Arrange
    const piped = { ...spec, rows: [{ ciclo: 'a|b', e: 1 }] };

    // Act + Assert
    expect(tableMarkdown(piped)).toContain('| a\\|b | 1,000 |');
  });

  test('prints a non-finite number as a dash instead of NaN', () => {
    expect(tableMarkdown({ ...spec, rows: [{ ciclo: 'x', e: Number.NaN }] })).toContain(
      '| x | — |',
    );
  });
});

describe('tableReadingText', () => {
  test('is the caption, the column labels and the text cells, never the numbers', () => {
    expect(tableReadingText(spec)).toBe('Balance del ciclo Ciclo Energía UDDS');
  });
});

describe('expandTables', () => {
  test('replaces every DataTable tag with the rendered table', () => {
    expect(expandTables('a <DataTable id="t-x" /> b', () => 'T')).toBe('a T b');
    expect(expandTables('<DataTable id="t-x"/>\n\n<DataTable id="t-x" />', () => 'T')).toBe(
      'T\n\nT',
    );
  });

  test('hands the registry spec to the renderer', () => {
    expect(expandTables('<DataTable id="t-x" />', (table) => table.caption)).toBe(
      'Balance del ciclo',
    );
  });

  test('leaves a body without tables untouched', () => {
    expect(expandTables('Texto <Figure caption="x" />', () => 'T')).toBe(
      'Texto <Figure caption="x" />',
    );
  });

  test('fails loudly on an id the registry does not know', () => {
    expect(() => expandTables('<DataTable id="nope" />', () => 'T')).toThrow(
      'DataTable: no existe la tabla "nope"',
    );
  });
});
