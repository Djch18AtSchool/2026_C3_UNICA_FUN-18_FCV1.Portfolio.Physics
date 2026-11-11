/**
 * The ratchet's baseline (scale.baseline.json): the violations that existed when the scale test
 * arrived, counted per file and per `rule value`, so a moved line does not count as new. The
 * test fails on a count above the baseline (a new violation) and on one below it (a cleaned one
 * the list still holds); `pruneBaseline` lowers the list to what is left and never raises it.
 */
import type { ScaleViolation } from './scaleScan';

/** file → `rule value` → how many times. */
export type ScaleCounts = Readonly<Record<string, Readonly<Record<string, number>>>>;

export interface BaselineDrift {
  file: string;
  key: string;
  actual: number;
  baseline: number;
}

export function violationKey({ rule, value }: Pick<ScaleViolation, 'rule' | 'value'>): string {
  return `${rule} ${value}`;
}

/** Counts per file, leaving out the exempt violations and the files without any. */
export function countViolations(
  byFile: Readonly<Record<string, readonly ScaleViolation[]>>,
): ScaleCounts {
  const entries = Object.entries(byFile).flatMap(([file, violations]) => {
    const counted = violations.filter((violation) => violation.exempt === undefined);
    if (counted.length === 0) return [];
    const counts = counted.reduce<Record<string, number>>((acc, violation) => {
      const key = violationKey(violation);
      return { ...acc, [key]: (acc[key] ?? 0) + 1 };
    }, {});
    return [[file, counts] as const];
  });
  return Object.fromEntries(entries);
}

function pairs(counts: ScaleCounts): { file: string; key: string; count: number }[] {
  return Object.entries(counts).flatMap(([file, keys]) =>
    Object.entries(keys).map(([key, count]) => ({ file, key, count })),
  );
}

const countOf = (counts: ScaleCounts, file: string, key: string): number =>
  counts[file]?.[key] ?? 0;

export function compareToBaseline(
  actual: ScaleCounts,
  baseline: ScaleCounts,
): { added: BaselineDrift[]; stale: BaselineDrift[] } {
  const added = pairs(actual)
    .filter(({ file, key, count }) => count > countOf(baseline, file, key))
    .map(({ file, key, count }) => ({
      file,
      key,
      actual: count,
      baseline: countOf(baseline, file, key),
    }));
  const stale = pairs(baseline)
    .filter(({ file, key, count }) => count > countOf(actual, file, key))
    .map(({ file, key, count }) => ({
      file,
      key,
      actual: countOf(actual, file, key),
      baseline: count,
    }));
  return { added, stale };
}

function sortedRecord<T>(record: Readonly<Record<string, T>>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

/** The baseline lowered to what is left: never above it, never a key it did not list. */
export function pruneBaseline(actual: ScaleCounts, baseline: ScaleCounts): ScaleCounts {
  const entries = Object.entries(baseline).flatMap(([file, keys]) => {
    const kept = Object.entries(keys).flatMap(([key, count]) => {
      const left = Math.min(count, countOf(actual, file, key));
      return left > 0 ? [[key, left] as const] : [];
    });
    return kept.length > 0 ? [[file, sortedRecord(Object.fromEntries(kept))] as const] : [];
  });
  return sortedRecord(Object.fromEntries(entries));
}

/** Sorted, two-space JSON with a final newline (what Prettier writes). */
export function formatBaseline(counts: ScaleCounts): string {
  const sorted = sortedRecord(
    Object.fromEntries(Object.entries(counts).map(([file, keys]) => [file, sortedRecord(keys)])),
  );
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

function isCountRecord(value: unknown): value is Record<string, number> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((count) => Number.isInteger(count) && count > 0)
  );
}

/** Parses scale.baseline.json, failing loudly on anything but file → key → positive count. */
export function readBaseline(json: string): ScaleCounts {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('scale.baseline.json: se esperaba un objeto archivo → infracción → recuento');
  }
  for (const [file, keys] of Object.entries(parsed)) {
    if (!isCountRecord(keys)) {
      throw new Error(`scale.baseline.json: ${file} debe listar recuentos enteros positivos`);
    }
  }
  return parsed as ScaleCounts;
}
