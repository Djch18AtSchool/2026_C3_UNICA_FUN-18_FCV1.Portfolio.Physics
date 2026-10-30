interface TableColumnBase {
  /** Names the column's cell in every row. */
  key: string;
  label: string;
  unit?: string;
  /**
   * Narrowest the column may get, in ch: on a phone a table that scrolls anyway would otherwise
   * squeeze a column of names to a word per line.
   */
  minWidthCh?: number;
}

/** A column of words; the first one names the row and aligns left. */
export interface TextColumn extends TableColumnBase {
  align: 'text';
}

/** A column of numbers, right-aligned and tabular. Its precision is mandatory (tables ignore the global decimals setting). */
export interface NumericColumn extends TableColumnBase {
  align: 'num';
  /** Decimals printed for the column's numbers. */
  precision: number;
}

export type TableColumn = TextColumn | NumericColumn;

export type TableCell = string | number;

/** A numbered data table ("Tabla N.k"); topics write `<DataTable id="…" />` in their MDX. */
export interface DataTableSpec {
  /** `<slug>-<name>`, unique across topics. */
  id: string;
  caption: string;
  columns: readonly TableColumn[];
  rows: readonly Readonly<Record<string, TableCell>>[];
  source: { text: string; url?: string };
}
