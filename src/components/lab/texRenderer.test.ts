// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  loadedTexRenderer,
  loadTexRenderer,
  resetTexRendererForTests,
  seedTexHtml,
  typesetNow,
} from './texRenderer';

describe('typesetNow', () => {
  beforeEach(resetTexRendererForTests);
  afterEach(resetTexRendererForTests);

  test('is undefined for a formula nobody has typeset or seeded', () => {
    expect(typesetNow('x^2')).toBeUndefined();
  });

  test('gives a seeded formula without KaTeX being loaded', () => {
    seedTexHtml({ 'x^2': '<span>seeded</span>' });

    expect(typesetNow('x^2')).toBe('<span>seeded</span>');
    expect(loadedTexRenderer()).toBeUndefined();
  });

  test('typesets any formula once KaTeX is loaded, and prefers the seed', async () => {
    seedTexHtml({ 'x^2': '<span>seeded</span>' });
    await loadTexRenderer();

    expect(typesetNow('x^2')).toBe('<span>seeded</span>');
    expect(typesetNow('y^2')).toContain('katex');
  });

  test('forgets the seed with the rest', () => {
    seedTexHtml({ 'x^2': '<span>seeded</span>' });
    resetTexRendererForTests();

    expect(typesetNow('x^2')).toBeUndefined();
  });
});
