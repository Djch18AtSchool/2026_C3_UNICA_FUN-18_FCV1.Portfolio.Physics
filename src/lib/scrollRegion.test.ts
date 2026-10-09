// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { SCROLL_LABEL_SELECTOR, syncScrollRegion, syncScrollRegions } from './scrollRegion';

const LABEL = 'Ecuación desplazable';

function region(scrollWidth: number, clientWidth: number): HTMLElement {
  const element = document.createElement('div');
  element.dataset.scrollLabel = LABEL;
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth });
  return element;
}

function resize(element: HTMLElement, scrollWidth: number, clientWidth: number): void {
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('syncScrollRegion', () => {
  test('an overflowing element becomes a focusable, labelled region', () => {
    const element = region(640, 300);

    syncScrollRegion(element);

    expect(element).toHaveAttribute('tabindex', '0');
    expect(element).toHaveAttribute('role', 'region');
    expect(element).toHaveAttribute('aria-label', LABEL);
  });

  test('an element that fits stays out of the tab order', () => {
    const element = region(300, 300);

    syncScrollRegion(element);

    expect(element).not.toHaveAttribute('tabindex');
    expect(element).not.toHaveAttribute('role');
    expect(element).not.toHaveAttribute('aria-label');
  });

  test('a subpixel rounding difference does not count as overflow', () => {
    const element = region(301, 300);

    syncScrollRegion(element);

    expect(element).not.toHaveAttribute('tabindex');
  });

  test('drops the tab stop again when the element stops overflowing', () => {
    const element = region(640, 300);
    syncScrollRegion(element);

    resize(element, 640, 700);
    syncScrollRegion(element);

    expect(element).not.toHaveAttribute('tabindex');
    expect(element).not.toHaveAttribute('role');
    expect(element).not.toHaveAttribute('aria-label');
  });
});

describe('syncScrollRegions', () => {
  test('syncs every element that carries a scroll label', () => {
    const wide = region(640, 300);
    const narrow = region(200, 300);
    const unlabelled = document.createElement('div');
    document.body.append(wide, narrow, unlabelled);

    const synced = syncScrollRegions(document);

    expect(synced).toEqual([wide, narrow]);
    expect(wide).toHaveAttribute('tabindex', '0');
    expect(narrow).not.toHaveAttribute('tabindex');
    expect(unlabelled.matches(SCROLL_LABEL_SELECTOR)).toBe(false);
  });
});
