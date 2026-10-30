/** A data table as Markdown (for "Copiar Markdown") and as read text (for the reading time). */
import { formatNumber } from '../format';
import { tableById } from './index';
import type { DataTableSpec, TableCell, TableColumn } from './types';

/** `<DataTable id="…" />` in an MDX body; the first group is the table id. */
export const DATA_TABLE_TAG = /<DataTable\s+id="([^"]+)"\s*\/>/g;

const GFM_ALIGNMENT = { text: ':--', num: '--:' } as const;

/** A cell as printed: numbers with the column's precision (comma decimals), text as written. */
export function formatCell(column: TableColumn, value: TableCell): string {
  if (typeof value === 'string') return value;
  return formatNumber(value, { precision: column.precision });
}

/** The column header: "Energía (kWh)" when the column has a unit. */
export function columnHeader(column: TableColumn): string {
  return column.unit ? `${column.label} (${column.unit})` : column.label;
}

const escapeCell = (text: string): string => text.replaceAll('|', '\\|');
const markdownRow = (cells: readonly string[]): string => `| ${cells.join(' | ')} |`;

export function tableMarkdown(spec: DataTableSpec): string {
  const header = markdownRow(spec.columns.map((column) => escapeCell(columnHeader(column))));
  const alignment = markdownRow(spec.columns.map((column) => GFM_ALIGNMENT[column.align]));
  const rows = spec.rows.map((row) =>
    markdownRow(spec.columns.map((column) => escapeCell(formatCell(column, row[column.key])))),
  );
  return [
    `Tabla: ${spec.caption}`,
    [header, alignment, ...rows].join('\n'),
    `Fuente: ${spec.source.text}`,
  ].join('\n\n');
}

/** What a reader reads: caption, column labels and text cells; the numbers are looked at, not read. */
export function tableReadingText(spec: DataTableSpec): string {
  const textColumns = spec.columns.filter((column) => column.align === 'text');
  const cells = spec.rows.flatMap((row) => textColumns.map((column) => String(row[column.key])));
  return [spec.caption, ...spec.columns.map((column) => column.label), ...cells].join(' ');
}

/** Replace every `<DataTable id="…" />` tag in `body` with `render` of its registry table. */
export function expandTables(body: string, render: (spec: DataTableSpec) => string): string {
  return body.replace(DATA_TABLE_TAG, (_tag, id: string) => render(tableById(id)));
}
