import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * KaTeX draws \max and \min as «max» and «min»: English. The site writes them in Spanish, as
 * `$\text{máx}$` and `$\text{mín}$` (the same convention as L_\text{máx}). Forbidden: the
 * operators whose Spanish word differs (máx, mín, ínf, lím, grad, cosec, cotg), as commands or
 * spelt unaccented in \operatorname, \mathrm or \text. det, dim, ker, arg, sup, sin, cos, tan,
 * sec, log, exp and ln are the same words in a Spanish textbook, so they stay.
 */
const ENGLISH_COMMANDS = /\\(max|min|inf|lim|limsup|liminf|deg|argmax|argmin|csc|cot)(?![A-Za-z])/g;
const ENGLISH_WORDS =
  /\\(?:operatorname\*?|mathrm|text|textrm)\{\s*(max|min|inf|lim|deg|argmax|argmin|csc|cot)\s*\}/g;
const SOURCE_ROOT = join(process.cwd(), 'src');
const SCANNED = /\.(ts|tsx|astro|mdx)$/;

/** The English operators in a TeX source, as written. */
function englishOperators(source: string): string[] {
  return [...source.matchAll(ENGLISH_COMMANDS), ...source.matchAll(ENGLISH_WORDS)].map(
    (match) => match[0],
  );
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return SCANNED.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('math operators', () => {
  test('finds the English operators, commands or spelt out, and only those', () => {
    expect(
      englishOperators(
        String.raw`\max(a) \min_x \lim \liminf \deg p \csc x \cot x \argmax \operatorname{max} \mathrm{min} \text{lim} \operatorname*{argmin}`,
      ),
    ).toEqual([
      '\\max',
      '\\min',
      '\\lim',
      '\\liminf',
      '\\deg',
      '\\csc',
      '\\cot',
      '\\argmax',
      '\\operatorname{max}',
      '\\mathrm{min}',
      '\\text{lim}',
      '\\operatorname*{argmin}',
    ]);
  });

  test('leaves the Spanish words, the operators Spanish shares, and longer commands alone', () => {
    expect(
      englishOperators(
        String.raw`\text{máx} \text{mín} \det A \dim V \ker f \arg z \sup S \sin \cos \tan \sec x \log \exp \ln \limits \infty \supset \minus \text{maxima}`,
      ),
    ).toEqual([]);
  });

  test('no TeX in the site writes an operator in English where Spanish has its own word', () => {
    const found = sourceFiles(SOURCE_ROOT).flatMap((file) =>
      englishOperators(readFileSync(file, 'utf8')).map(
        (operator) => `${file.replace(SOURCE_ROOT, 'src')}: ${operator}`,
      ),
    );

    expect(found).toEqual([]);
  });
});
