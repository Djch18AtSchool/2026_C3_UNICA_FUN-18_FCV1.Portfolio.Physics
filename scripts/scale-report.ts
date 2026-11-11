/**
 * The measurement scale's report (src/styles/scale.test.ts):
 *
 *   pnpm run scale:report            violations left, by directory, file and rule, and the total;
 *                                    the named exceptions (scale-exempt) and drift from the baseline
 *   pnpm run scale:report --files    also every violation with its line
 *   pnpm run scale:prune             lowers src/styles/scale.baseline.json to what is left (never
 *                                    adds: a new violation is fixed or named, not listed)
 *   pnpm run scale:report --init     writes the baseline from scratch; refuses if one exists
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  compareToBaseline,
  countViolations,
  formatBaseline,
  pruneBaseline,
  readBaseline,
  type ScaleCounts,
} from '../src/styles/scaleBaseline';
import type { ScaleViolation } from '../src/styles/scaleScan';
import { scanTree } from '../src/styles/scaleTree';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASELINE_PATH = fileURLToPath(new URL('../src/styles/scale.baseline.json', import.meta.url));
const args = new Set(process.argv.slice(2));

/** The sweep's unit: a topic, or a directory of src/components, or one of src. */
export function sweepArea(file: string): string {
  const parts = file.split('/');
  if (parts[1] === 'components' && parts[2] === 'topics' && parts.length > 4) {
    return parts.slice(0, 4).join('/');
  }
  if (parts[1] === 'components' && parts.length > 3) return parts.slice(0, 3).join('/');
  return parts.length > 2 ? parts.slice(0, 2).join('/') : file;
}

function total(keys: Readonly<Record<string, number>>): number {
  return Object.values(keys).reduce((sum, count) => sum + count, 0);
}

function byRule(keys: Readonly<Record<string, number>>): string {
  const rules = Object.entries(keys).reduce<Record<string, number>>((acc, [key, count]) => {
    const rule = key.split(' ')[0];
    return { ...acc, [rule]: (acc[rule] ?? 0) + count };
  }, {});
  return Object.entries(rules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([rule, count]) => `${rule} ${count}`)
    .join(', ');
}

function printCounts(counts: ScaleCounts): void {
  const areas = Object.entries(counts).reduce<Record<string, Record<string, number>>>(
    (acc, [file, keys]) => {
      const area = sweepArea(file);
      const merged = Object.entries(keys).reduce(
        (sum, [key, count]) => ({ ...sum, [key]: (sum[key] ?? 0) + count }),
        acc[area] ?? {},
      );
      return { ...acc, [area]: merged };
    },
    {},
  );
  for (const [area, keys] of Object.entries(areas).sort(([a], [b]) => a.localeCompare(b))) {
    console.info(`${area}: ${total(keys)} (${byRule(keys)})`);
    for (const [file, fileKeys] of Object.entries(counts).filter(([f]) => sweepArea(f) === area)) {
      console.info(`  ${file}: ${total(fileKeys)} (${byRule(fileKeys)})`);
    }
  }
  console.info(`Total: ${Object.values(counts).reduce((sum, keys) => sum + total(keys), 0)}`);
}

function printLines(scanned: Record<string, ScaleViolation[]>): void {
  for (const [file, violations] of Object.entries(scanned)) {
    for (const { rule, value, line, exempt } of violations) {
      const note = exempt === undefined ? '' : ` [exempt: ${exempt}]`;
      console.info(`${file}:${line} ${rule} ${value}${note}`);
    }
  }
}

function printExemptions(scanned: Record<string, ScaleViolation[]>): void {
  const exempt = Object.entries(scanned).flatMap(([file, violations]) =>
    violations
      .filter((v) => v.exempt !== undefined)
      .map((v) => `  ${file}:${v.line} ${v.value} — ${v.exempt}`),
  );
  console.info(`Named exceptions (scale-exempt): ${exempt.length}`);
  exempt.forEach((line) => console.info(line));
}

function main(): void {
  const scanned = scanTree(REPO_ROOT);
  const actual = countViolations(scanned);
  if (args.has('--init')) {
    if (existsSync(BASELINE_PATH)) {
      throw new Error('scale.baseline.json ya existe: usa pnpm run scale:prune');
    }
    writeFileSync(BASELINE_PATH, formatBaseline(actual));
    console.info(`Baseline written: ${BASELINE_PATH}`);
    return;
  }
  const baseline = readBaseline(readFileSync(BASELINE_PATH, 'utf8'));
  if (args.has('--prune')) {
    writeFileSync(BASELINE_PATH, formatBaseline(pruneBaseline(actual, baseline)));
    console.info(`Baseline pruned: ${BASELINE_PATH}`);
    return;
  }
  printCounts(actual);
  printExemptions(scanned);
  if (args.has('--files')) printLines(scanned);
  const { added, stale } = compareToBaseline(actual, baseline);
  console.info(
    `Against the baseline: ${added.length} new, ${stale.length} cleaned but still listed`,
  );
  added.forEach(({ file, key, actual: now, baseline: listed }) =>
    console.info(`  new: ${file}: ${key} (${listed} → ${now})`),
  );
  stale.forEach(({ file, key, actual: now, baseline: listed }) =>
    console.info(`  cleaned, run scale:prune: ${file}: ${key} (${listed} → ${now})`),
  );
}

main();
