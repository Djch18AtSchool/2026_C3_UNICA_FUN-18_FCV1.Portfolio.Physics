/**
 * Walks `src` for the scale test and `pnpm run scale:report`. Scanned: .astro, .tsx, .ts, .css and
 * .mdx. Left out: tests (`*.test.*`), test kits and helpers (`*TestKit.ts`, `src/test-*.ts`), which
 * describe or fake the product rather than style it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { scanSource, type ScaleViolation } from './scaleScan';

const SCANNED = /\.(astro|tsx|ts|css|mdx)$/;
const LEFT_OUT = [/\.test\.[^/]+$/, /TestKit\.ts$/, /^src\/test-[^/]+\.ts$/];

/** Repo-relative paths (forward slashes) of the scanned files under `src`, sorted. */
export function scaleSources(repoRoot: string): string[] {
  return readdirSync(join(repoRoot, 'src'), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(repoRoot, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .filter((path) => SCANNED.test(path) && !LEFT_OUT.some((pattern) => pattern.test(path)))
    .sort();
}

/** Every scanned file with its violations (exempt ones included, marked). */
export function scanTree(repoRoot: string): Record<string, ScaleViolation[]> {
  return Object.fromEntries(
    scaleSources(repoRoot).map((path) => [
      path,
      scanSource(path, readFileSync(join(repoRoot, path), 'utf8')),
    ]),
  );
}
