/** One column of a data table; `key` names the cell in every row. */
export interface TableColumn {
  key: string;
  label: string;
  unit?: string;
  /** 'text' columns align left (the first one names the row); 'num' columns right, tabular. */
  align: 'text' | 'num';
  /** Decimals printed for the column's numbers. Required for 'num' columns (tables ignore the global decimals setting). */
  precision?: number;
}

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
