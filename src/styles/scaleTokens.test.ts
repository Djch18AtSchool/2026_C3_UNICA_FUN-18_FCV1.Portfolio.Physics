/**
 * The scale's tokens (scale.css, tokens.css, global.css): one place for the type sizes, the
 * vertical rhythm, the separator stroke, radii, borders, icons and the paper grid, all on the
 * scale Dylan set (root and reading size 16 px, 2026-11-10; audit §6.2).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { resolveCssLength } from '../test-css-length';

const read = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`./${name}`, import.meta.url)), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

/** The custom properties of the first rule whose selector is exactly `selector`. */
function properties(css: string, selector: string): Map<string, string> {
  const rule = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
    ([, head]) => head.trim() === selector,
  );
  if (!rule) throw new Error(`no hay regla ${selector}`);
  return new Map(
    [...rule[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim(),
    ]),
  );
}

const scale = properties(read('scale.css'), ':root');
const vars = Object.fromEntries(scale);
const px = (name: string): number =>
  resolveCssLength(`var(${name})`, { container: 0, rem: 16, vars });

describe('scale.css', () => {
  test('type: reading 16, titles 36 / 24 / 20 / 18, auxiliary 14 and 12', () => {
    expect(
      [
        '--text-body',
        '--text-h1',
        '--text-h2',
        '--text-h3',
        '--text-h4',
        '--text-aux',
        '--text-aux-small',
      ].map(px),
    ).toEqual([16, 36, 24, 20, 18, 14, 12]);
  });

  test('spacing steps follow Tailwind’s names: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64', () => {
    expect([1, 2, 3, 4, 6, 8, 12, 16].map((step) => px(`--space-${step}`))).toEqual([
      4, 8, 12, 16, 24, 32, 48, 64,
    ]);
  });

  test('vertical rhythm: 24 between blocks, 48 between steps, 64 before the use case', () => {
    expect(['--flow', '--flow-step', '--flow-section'].map(px)).toEqual([24, 48, 64]);
  });

  test('one separator stroke: 1 px solid in the border color, 2 px under a table header', () => {
    expect(scale.get('--rule')).toBe('var(--rule-width) solid var(--rule-color)');
    expect(px('--rule-width')).toBe(1);
    expect(scale.get('--rule-color')).toBe('var(--border)');
  });

  test('inline code: 14 px in the reading text', () => {
    expect(px('--text-code')).toBe(14);
  });

  test('radii 4 and 8, borders 1 and 2, icons 20, icon buttons 40 and 44', () => {
    expect(
      [
        '--radius-card',
        '--border-thin',
        '--border-thick',
        '--icon',
        '--icon-button',
        '--icon-button-touch',
      ].map(px),
    ).toEqual([8, 1, 2, 20, 40, 44]);
  });

  test('paper grid of 16 with a heavier line every 80', () => {
    expect(px('--grid-cell')).toBe(16);
    expect(
      resolveCssLength('var(--grid-cell) * var(--grid-major-every)', { container: 0, vars }),
    ).toBe(80);
  });
});

describe('tokens.css and global.css', () => {
  test('--radius is 4 px in both themes', () => {
    const tokens = read('tokens.css');
    expect(properties(tokens, ':root').get('--radius')).toBe('4px');
    expect(properties(tokens, ":root[data-theme='dark']").get('--radius')).toBe('4px');
  });

  test('the root keeps the browser’s 16 px: no font-size on html', () => {
    const html = /(?:^|[}\s])html\s*\{([^}]*)\}/.exec(read('global.css'));
    expect(html?.[1]).not.toMatch(/font-size/);
  });

  test('global.css imports the scale before the content styles', () => {
    const css = read('global.css');
    expect(css.indexOf("@import './scale.css'")).toBeGreaterThan(-1);
    expect(css.indexOf("@import './scale.css'")).toBeLessThan(
      css.indexOf("@import './content.css'"),
    );
  });
});
