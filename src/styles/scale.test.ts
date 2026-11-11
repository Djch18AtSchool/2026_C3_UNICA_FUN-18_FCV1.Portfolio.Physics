/**
 * The measurement scale as a ratchet (plan C4, audit §6.2), in the spirit of tokens.test.ts for
 * colors: every length in `src` sits on the scale, except the violations `scale.baseline.json`
 * still lists. A violation not in the list fails (nothing new off the scale); a listed one that
 * is gone fails too, so the list only shrinks (`pnpm run scale:prune` drops what was cleaned).
 * When the list is empty the test is strict. The rules and what they leave out are in
 * scaleRules.ts and scaleScan.ts; `pnpm run scale:report` prints what is left, by directory.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  compareToBaseline,
  countViolations,
  readBaseline,
  type BaselineDrift,
} from './scaleBaseline';
import { scanTree } from './scaleTree';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const BASELINE_PATH = fileURLToPath(new URL('./scale.baseline.json', import.meta.url));

function describeDrift(drift: readonly BaselineDrift[]): string {
  return drift
    .map(({ file, key, actual, baseline }) => `${file}: ${key} (${baseline} → ${actual})`)
    .join('\n');
}

describe('the measurement scale over src', () => {
  const actual = countViolations(scanTree(REPO_ROOT));
  const baseline = readBaseline(readFileSync(BASELINE_PATH, 'utf8'));
  const { added, stale } = compareToBaseline(actual, baseline);

  test('nothing new off the scale (fix it, or name an exception with scale-exempt)', () => {
    expect(describeDrift(added)).toBe('');
  });

  test('the baseline lists nothing already cleaned (run pnpm run scale:prune)', () => {
    expect(describeDrift(stale)).toBe('');
  });
});
