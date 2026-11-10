// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import InlineMath from './InlineMath';
import { loadTexRenderer, resetTexRendererForTests, setTexImporterForTests } from './texRenderer';
import TexSeed, { formulasOf, readTexSeed } from './TexSeed';

/** The HTML a server sends for the seed: rendered with KaTeX at hand. */
async function seedHtml(formulas: readonly string[]): Promise<string> {
  await loadTexRenderer();
  const html = renderToString(<TexSeed formulas={formulas} />);
  resetTexRendererForTests();
  return html;
}

describe('formulasOf', () => {
  test('lists each distinct formula of a text, in order, and none for plain text', () => {
    expect(formulasOf('Con $v_x$ y $a_x$, otra vez $v_x$ y \\$5')).toEqual(['v_x', 'a_x']);
    expect(formulasOf('Sin matemáticas')).toEqual([]);
  });
});

describe('TexSeed', () => {
  beforeEach(resetTexRendererForTests);
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    setTexImporterForTests(undefined);
  });

  test('the server writes the typeset formulas as JSON that cannot close its script', async () => {
    const html = await seedHtml(['a<b', 'v_x']);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const script = doc.querySelector('script[data-tex-seed]');

    expect(script?.getAttribute('type')).toBe('application/json');
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(Object.keys(JSON.parse(script?.textContent ?? '{}'))).toEqual(['a<b', 'v_x']);
  });

  test('a formula that was seeded is typeset at once, without ever loading KaTeX', async () => {
    document.body.innerHTML = await seedHtml(['v_x']);
    const importer = vi.fn();
    setTexImporterForTests(importer);

    readTexSeed();
    const { container } = render(
      <p>
        <InlineMath text="Rapidez $v_x$" />
      </p>,
    );
    await act(async () => {});

    expect(container.querySelector('.inline-math .katex')).not.toBeNull();
    expect(container.querySelector('annotation')?.textContent).toBe('v_x');
    expect(importer).not.toHaveBeenCalled();
  });

  test('a formula that was not seeded still loads KaTeX', async () => {
    document.body.innerHTML = await seedHtml(['v_x']);
    const importer = vi.fn(() => import('../../lib/texHtml'));
    setTexImporterForTests(importer);

    readTexSeed();
    render(<InlineMath text="Otra $a_y$" />);
    await act(async () => {});

    expect(importer).toHaveBeenCalledOnce();
  });

  test('reading a page without a seed, or with a broken one, changes nothing', () => {
    document.body.innerHTML = '<script type="application/json" data-tex-seed>{not json</script>';

    expect(() => readTexSeed()).not.toThrow();
    readTexSeed(document.createElement('div'));
  });

  test('without KaTeX at hand the client writes nothing, so the server markup stays', async () => {
    await loadTexRenderer();
    const withKatex = render(<TexSeed formulas={['v_x']} />);
    const typeset = withKatex.container.querySelector('script')?.textContent;
    cleanup();
    resetTexRendererForTests();
    const withoutKatex = render(<TexSeed formulas={['v_x']} />);

    expect(typeset).toContain('v_x');
    expect(withoutKatex.container.querySelector('script')?.textContent).toBe('');
  });
});
