// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BACK_TO_TOP_REVEAL_PX, goToTop, isBackToTopShown, overlapsAny } from './backToTop';

const scrollTo = vi.fn();

beforeEach(() => {
  document.body.innerHTML = '<a id="first" href="#c">Saltar</a><button id="other">x</button>';
  vi.spyOn(window, 'scrollTo').mockImplementation(scrollTo);
});

afterEach(() => {
  vi.restoreAllMocks();
  scrollTo.mockClear();
  document.body.removeAttribute('tabindex');
  document.body.removeAttribute('style');
});

describe('goToTop', () => {
  test('cancels the link navigation and scrolls to the top', () => {
    const event = { preventDefault: vi.fn() };

    goToTop(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  test('moves focus to the body, with no focus ring', () => {
    document.querySelector<HTMLElement>('#other')!.focus();

    goToTop({ preventDefault: vi.fn() });

    expect(document.activeElement).toBe(document.body);
    expect(document.body.style.outline).toBe('none');
  });

  test('restores the body once focus leaves it', () => {
    goToTop({ preventDefault: vi.fn() });

    document.querySelector<HTMLElement>('#first')!.focus();

    expect(document.body.hasAttribute('tabindex')).toBe(false);
    expect(document.body.style.outline).toBe('');
  });

  test('does nothing more than cancel the event when the document has no window', () => {
    const detached = document.implementation.createHTMLDocument('x');
    const event = { preventDefault: vi.fn() };

    goToTop(event, detached);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('isBackToTopShown', () => {
  test('is hidden at the very top of the page', () => {
    expect(isBackToTopShown(0)).toBe(false);
  });

  test('stays hidden until the reader has scrolled past the reveal distance', () => {
    expect(isBackToTopShown(BACK_TO_TOP_REVEAL_PX)).toBe(false);
    expect(isBackToTopShown(BACK_TO_TOP_REVEAL_PX + 1)).toBe(true);
  });

  test('is shown far down the page', () => {
    expect(isBackToTopShown(12_000)).toBe(true);
  });

  test('is hidden for a negative scroll (rubber-banding past the top) or an invalid one', () => {
    expect(isBackToTopShown(-40)).toBe(false);
    expect(isBackToTopShown(Number.NaN)).toBe(false);
  });
});

describe('overlapsAny', () => {
  const button = { left: 1216, right: 1263, top: 740, bottom: 784 };

  test('true when any box covers part of the button, by even a few pixels', () => {
    const lab = { left: 400, right: 1226, top: 100, bottom: 900 };
    expect(overlapsAny(button, [lab])).toBe(true);
  });

  test('false when the boxes only touch it or lie elsewhere', () => {
    const touching = { left: 400, right: 1216, top: 100, bottom: 900 };
    const above = { left: 1000, right: 1300, top: 0, bottom: 740 };
    expect(overlapsAny(button, [touching, above])).toBe(false);
    expect(overlapsAny(button, [])).toBe(false);
  });
});
