// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  loadedTexRenderer,
  loadTexRenderer,
  reportTexError,
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

describe('reportTexError', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('goes to the page error handlers through reportError when the browser has it', () => {
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    const failure = new Error('chunk failed');

    reportTexError(failure);

    expect(reportError).toHaveBeenCalledExactlyOnceWith(failure);
  });

  test('without reportError it rethrows from a microtask, so it is never swallowed', () => {
    vi.stubGlobal('reportError', undefined);
    const queued: (() => void)[] = [];
    vi.stubGlobal('queueMicrotask', (task: () => void) => queued.push(task));
    const failure = new Error('chunk failed');

    reportTexError(failure);

    expect(queued).toHaveLength(1);
    expect(queued[0]).toThrow(failure);
  });
});
