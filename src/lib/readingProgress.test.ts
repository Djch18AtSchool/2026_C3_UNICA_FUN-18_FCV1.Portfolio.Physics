import { describe, expect, test } from 'vitest';
import { readingProgress } from './readingProgress';

/** Header top at 200, body bottom at 2200, 800 px viewport: reading spans scrollY 200 to 1400. */
const LAYOUT = { start: 200, end: 2200, viewportHeight: 800 };

describe('readingProgress', () => {
  test('is 0 while the header start is below the top edge', () => {
    // Act
    const progress = readingProgress({ ...LAYOUT, scrollY: 0 });

    // Assert
    expect(progress).toBe(0);
  });

  test('is 0 when the header start sits exactly on the top edge', () => {
    expect(readingProgress({ ...LAYOUT, scrollY: 200 })).toBe(0);
  });

  test('grows linearly with the scroll between the two anchors', () => {
    expect(readingProgress({ ...LAYOUT, scrollY: 500 })).toBeCloseTo(0.25);
    expect(readingProgress({ ...LAYOUT, scrollY: 800 })).toBeCloseTo(0.5);
    expect(readingProgress({ ...LAYOUT, scrollY: 1100 })).toBeCloseTo(0.75);
  });

  test('is 1 when the body end reaches the bottom of the viewport', () => {
    expect(readingProgress({ ...LAYOUT, scrollY: 1400 })).toBe(1);
  });

  test('stays at 1 past the end of the body', () => {
    expect(readingProgress({ ...LAYOUT, scrollY: 5000 })).toBe(1);
  });

  test('clamps a negative scroll (overscroll) to 0', () => {
    expect(readingProgress({ ...LAYOUT, scrollY: -40 })).toBe(0);
  });

  test('content shorter than the viewport is 0 at the start and 1 once scrolled past it', () => {
    // Arrange
    const short = { start: 100, end: 600, viewportHeight: 900 };

    // Act / Assert
    expect(readingProgress({ ...short, scrollY: 100 })).toBe(0);
    expect(readingProgress({ ...short, scrollY: 101 })).toBe(1);
  });

  test.each([
    ['start is NaN', { ...LAYOUT, start: Number.NaN, scrollY: 800 }],
    ['end is NaN', { ...LAYOUT, end: Number.NaN, scrollY: 800 }],
    ['scrollY is NaN', { ...LAYOUT, scrollY: Number.NaN }],
    ['viewport height is NaN', { ...LAYOUT, viewportHeight: Number.NaN, scrollY: 800 }],
    ['end is infinite', { ...LAYOUT, end: Number.POSITIVE_INFINITY, scrollY: 800 }],
    ['viewport height is zero', { ...LAYOUT, viewportHeight: 0, scrollY: 800 }],
    ['viewport height is negative', { ...LAYOUT, viewportHeight: -5, scrollY: 800 }],
  ])('is 0 when %s', (_name, input) => {
    expect(readingProgress(input)).toBe(0);
  });
});
