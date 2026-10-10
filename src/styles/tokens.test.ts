import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { contrastRatio } from '../lib/color';

const LIGHT = ':root';
const DARK = ':root[data-theme="dark"]';
const COLOR_TOKENS = [
  'bg',
  'bg-elevated',
  'fg',
  'fg-muted',
  'border',
  'accent',
  'accent-fg',
  'sim',
  'viz',
  'diag',
  'media',
  'grid',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
] as const;
const HEX = /^#[0-9a-f]{6}$/i;
/** Marks beside a text label (resource swatches) and chart series: WCAG 1.4.11 non-text contrast. */
const MARK_TOKENS = [
  'sim',
  'viz',
  'diag',
  'media',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
] as const;
const SURFACES = ['bg', 'bg-elevated'] as const;
const NON_TEXT_MIN = 3;

/** Map each rule's selector (quotes normalized to `"`) to its custom properties (`--name` → value). */
function parseCustomProperties(css: string): Map<string, Map<string, string>> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = new Map<string, Map<string, string>>();
  for (const [, selector, body] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const props = new Map(
      [...body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [
        name,
        value.trim(),
      ]),
    );
    blocks.set(selector.trim().replaceAll("'", '"'), props);
  }
  return blocks;
}

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');
const blocks = parseCustomProperties(css);

function token(selector: string, name: string): string {
  const value = blocks.get(selector)?.get(name);
  if (value === undefined) throw new Error(`--${name} is missing from ${selector}`);
  return value;
}

describe('tokens.css', () => {
  test('declares only the light and the dark blocks', () => {
    expect([...blocks.keys()]).toEqual([LIGHT, DARK]);
  });

  describe.each([
    ['light', LIGHT],
    ['dark', DARK],
  ])('%s theme', (_name, selector) => {
    test('defines every color token as a 6-digit hex', () => {
      for (const name of COLOR_TOKENS) expect(token(selector, name)).toMatch(HEX);
    });
    test('defines the radius', () => {
      expect(token(selector, 'radius')).toBeTruthy();
    });
    test('fg on bg reaches 7:1 (AAA)', () => {
      expect(contrastRatio(token(selector, 'fg'), token(selector, 'bg'))).toBeGreaterThanOrEqual(7);
    });
    test('fg-muted on bg reaches 4.5:1 (AA)', () => {
      expect(
        contrastRatio(token(selector, 'fg-muted'), token(selector, 'bg')),
      ).toBeGreaterThanOrEqual(4.5);
    });
    // Plot tick labels (fg-muted) and titles, legends and labels (fg) sit on the figure surface;
    // axe does not measure SVG text, so the pair is checked here.
    test.each(['fg', 'fg-muted'])('%s on bg-elevated reaches 4.5:1 (plot text, AA)', (text) => {
      expect(
        contrastRatio(token(selector, text), token(selector, 'bg-elevated')),
      ).toBeGreaterThanOrEqual(4.5);
    });
    test('accent on bg reaches 4.5:1 (AA)', () => {
      expect(
        contrastRatio(token(selector, 'accent'), token(selector, 'bg')),
      ).toBeGreaterThanOrEqual(4.5);
    });
    test.each(MARK_TOKENS.flatMap((mark) => SURFACES.map((surface) => [mark, surface])))(
      '%s on %s reaches 3:1 (non-text contrast)',
      (mark, surface) => {
        expect(
          contrastRatio(token(selector, mark), token(selector, surface)),
        ).toBeGreaterThanOrEqual(NON_TEXT_MIN);
      },
    );
    test('accent-fg on accent reaches 4.5:1 (AA)', () => {
      expect(
        contrastRatio(token(selector, 'accent-fg'), token(selector, 'accent')),
      ).toBeGreaterThanOrEqual(4.5);
    });
  });
});
