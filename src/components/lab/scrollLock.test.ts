// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { lockPageScroll } from './scrollLock';

const root = () => document.documentElement;

/** jsdom has no layout: fake a classic scrollbar of `width` px by shrinking clientWidth. */
function fakeScrollbar(width: number): void {
  vi.spyOn(root(), 'clientWidth', 'get').mockReturnValue(window.innerWidth - width);
}

describe('lockPageScroll', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    root().removeAttribute('style');
  });

  test('hides the page overflow and restores the previous value on release', () => {
    // Arrange
    root().style.overflow = 'clip';

    // Act
    const release = lockPageScroll();
    const whileLocked = root().style.overflow;
    release();

    // Assert
    expect(whileLocked).toBe('hidden');
    expect(root().style.overflow).toBe('clip');
  });

  test('keeps a classic scrollbar gutter so the page does not shift sideways', () => {
    // Arrange
    fakeScrollbar(15);

    // Act
    const release = lockPageScroll();
    const gutter = root().style.scrollbarGutter;
    release();

    // Assert
    expect(gutter).toBe('stable');
    expect(root().style.scrollbarGutter).toBe('');
  });

  test('adds no gutter when the scrollbar overlays the page (phones) or there is none', () => {
    // Arrange
    fakeScrollbar(0);

    // Act
    const release = lockPageScroll();

    // Assert
    expect(root().style.scrollbarGutter).toBe('');
    release();
  });

  test('a second release is harmless', () => {
    // Arrange
    const release = lockPageScroll();
    release();
    root().style.overflow = 'auto';

    // Act
    release();

    // Assert
    expect(root().style.overflow).toBe('auto');
  });
  test('nested locks keep the page locked until the last one is released, in any order', () => {
    // Arrange
    root().style.overflow = 'auto';
    const first = lockPageScroll();
    const second = lockPageScroll();

    // Act
    first();
    const afterFirst = root().style.overflow;
    first();
    const afterRepeat = root().style.overflow;
    second();

    // Assert
    expect(afterFirst).toBe('hidden');
    expect(afterRepeat).toBe('hidden');
    expect(root().style.overflow).toBe('auto');
  });
});
