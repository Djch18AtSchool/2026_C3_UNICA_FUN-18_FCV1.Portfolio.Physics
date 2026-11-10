import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * KaTeX draws \max and \min as «max» and «min»: English. The site writes them in Spanish, as
 * `$\text{máx}$` and `$\text{mín}$` (the same convention as L_\text{máx}). sin, cos, tan, log, exp
 * and ln are the same words in a Spanish textbook, so they stay.
 */
const ENGLISH_OPERATORS = /\\(max|min|arg|sup|inf|lim|limsup|liminf|det|deg|dim|ker)(?![A-Za-z])/g;
const SOURCE_ROOT = join(process.cwd(), 'src');
const SCANNED = /\.(ts|tsx|astro|mdx)$/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return SCANNED.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('math operators', () => {
  test('no TeX in the site writes an operator in English where Spanish has its own word', () => {
    const found = sourceFiles(SOURCE_ROOT).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(ENGLISH_OPERATORS)].map(
        (match) => `${file.replace(SOURCE_ROOT, 'src')}: ${match[0]}`,
      ),
    );

    expect(found).toEqual([]);
  });
});
