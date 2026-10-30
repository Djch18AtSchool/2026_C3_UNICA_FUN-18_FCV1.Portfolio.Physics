import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { contrastRatio } from '../lib/color';

/** Real-world bodies and objects: the color names the thing, never the series order. */
const BODY_TOKENS = [
  'sun',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'tennis',
  'basketball',
] as const;
const MIN_DELTA_E = 15;
const MIN_BASKETBALL_DELTA_E = 18;
const MIN_PLANET_DELTA_E = 20;
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
  ...BODY_TOKENS,
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
  ...BODY_TOKENS,
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

/** CIE76 ΔE between two #rrggbb colors (sRGB, D65). */
function deltaE(hexA: string, hexB: string): number {
  const lab = (hex: string): number[] => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
    const f = (t: number): number =>
      t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  };
  const [a, b] = [lab(hexA), lab(hexB)];
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');
const blocks = parseCustomProperties(css);

function token(selector: string, name: string): string {
  const value = blocks.get(selector)?.get(name);
  if (value === undefined) throw new Error(`--${name} is missing from ${selector}`);
  return value;
}

describe('deltaE', () => {
  test('is 0 for identical colors and 100 for white vs black', () => {
    expect(deltaE('#2a78d6', '#2a78d6')).toBe(0);
    expect(deltaE('#ffffff', '#000000')).toBeCloseTo(100, 1);
  });
});

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
    test('--neptune stays distinct from the Earth blue (--chart-1)', () => {
      expect(deltaE(token(selector, 'neptune'), token(selector, 'chart-1'))).toBeGreaterThanOrEqual(
        MIN_DELTA_E,
      );
    });
    test('--basketball stays distinct from the Mars orange (--chart-2)', () => {
      expect(
        deltaE(token(selector, 'basketball'), token(selector, 'chart-2')),
      ).toBeGreaterThanOrEqual(MIN_BASKETBALL_DELTA_E);
    });
    test('--jupiter stays distinct from --saturn (side-by-side markers)', () => {
      expect(deltaE(token(selector, 'jupiter'), token(selector, 'saturn'))).toBeGreaterThanOrEqual(
        MIN_PLANET_DELTA_E,
      );
    });
    test('--jupiter stays distinct from --basketball', () => {
      expect(
        deltaE(token(selector, 'jupiter'), token(selector, 'basketball')),
      ).toBeGreaterThanOrEqual(MIN_DELTA_E);
    });
    test('accent-fg on accent reaches 4.5:1 (AA)', () => {
      expect(
        contrastRatio(token(selector, 'accent-fg'), token(selector, 'accent')),
      ).toBeGreaterThanOrEqual(4.5);
    });
  });
});
