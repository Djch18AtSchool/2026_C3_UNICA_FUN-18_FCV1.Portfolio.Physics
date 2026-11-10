import { describe, expect, test } from 'vitest';
import { resolveCssLength } from './test-css-length';

describe('resolveCssLength', () => {
  test('calc with px, rem and cqw', () => {
    expect(
      resolveCssLength('calc(80px + 0.5 * (100cqw - 2rem - 68px))', { container: 400, rem: 17 }),
    ).toBe(80 + 0.5 * (400 - 34 - 68));
  });

  test('min, max and clamp, nested in calc', () => {
    expect(
      resolveCssLength(
        'calc(min(100cqw, 440px) + 84px + clamp(0px, (440px - 100cqw) * 1000, 16px))',
        {
          container: 336,
        },
      ),
    ).toBe(336 + 84 + 16);
    expect(resolveCssLength('max(10px, 50cqw)', { container: 100 })).toBe(50);
  });

  test('custom properties by value, also inside one another', () => {
    expect(
      resolveCssLength('calc(100cqw / var(--a) + var(--b))', {
        container: 300,
        vars: { '--a': 1.25, '--b': 'calc(1rem + 2px)' },
      }),
    ).toBe(300 / 1.25 + 18);
  });

  test('throws on what it cannot read, and on a missing custom property', () => {
    expect(() => resolveCssLength('calc(10vw + 2px)', { container: 100 })).toThrow(/simple/);
    expect(() => resolveCssLength('var(--x)', { container: 100 })).toThrow(/--x/);
  });
});
