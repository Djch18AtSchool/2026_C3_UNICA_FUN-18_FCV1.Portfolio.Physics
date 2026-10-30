/**
 * The table registry. Every `topics/<slug>.ts` exports `TABLES: readonly DataTableSpec[]` and is
 * picked up by the glob below, so a topic adds its tables without anyone editing this file.
 */
import type { DataTableSpec } from './types';

export type { DataTableSpec, TableCell, TableColumn } from './types';

interface TableModule {
  TABLES?: readonly DataTableSpec[];
}

/** Join the `TABLES` of each module, in path order so the registry never depends on glob order. */
export function collectTables(
  modules: Readonly<Record<string, TableModule>>,
): readonly DataTableSpec[] {
  return Object.keys(modules)
    .sort()
    .flatMap((path) => {
      const tables = modules[path].TABLES;
      if (!tables) throw new Error(`tables: ${path} no exporta TABLES`);
      return tables;
    });
}

export const ALL_TABLES: readonly DataTableSpec[] = collectTables(
  import.meta.glob<TableModule>(['./topics/*.ts', '!./topics/*.test.ts'], { eager: true }),
);

/** The table a `<DataTable id="…" />` names; an unknown id stops the build. */
export function tableById(id: string): DataTableSpec {
  const table = ALL_TABLES.find((candidate) => candidate.id === id);
  if (!table) throw new Error(`DataTable: no existe la tabla "${id}"`);
  return table;
}
