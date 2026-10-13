// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { goToTop } from './backToTop';

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
