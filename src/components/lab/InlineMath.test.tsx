// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import InlineMath from './InlineMath';
import { loadedTexRenderer, loadTexRenderer, resetTexRendererForTests } from './texRenderer';

/** The HTML the server sends: rendered with KaTeX at hand. */
async function serverHtml(text: string): Promise<string> {
  await loadTexRenderer();
  const html = renderToString(
    <p>
      <InlineMath text={text} />
    </p>,
  );
  resetTexRendererForTests();
  return html;
}

describe('InlineMath', () => {
  beforeEach(resetTexRendererForTests);
  afterEach(cleanup);

  test('plain text renders as a text node, with no wrapper', () => {
    const { container } = render(
      <p>
        <InlineMath text="Rapidez de la Voyager 2" />
      </p>,
    );

    expect(container.querySelector('p')?.innerHTML).toBe('Rapidez de la Voyager 2');
  });

  test('the server typesets $…$ with KaTeX between the plain parts, with MathML', async () => {
    const html = await serverHtml('Suma $\\vec v = \\vec V_p$ antes');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const p = doc.querySelector('p');

    expect(p?.firstChild?.textContent).toBe('Suma ');
    expect(p?.querySelector('.inline-math .katex')).not.toBeNull();
    expect(p?.querySelector('math annotation')?.textContent).toBe('\\vec v = \\vec V_p');
    expect(p?.lastChild?.textContent).toBe(' antes');
  });

  test('a hydrated formula keeps the server HTML and never loads KaTeX', async () => {
    const container = document.createElement('div');
    container.innerHTML = await serverHtml('a $x^2$ b');
    document.body.append(container);

    await act(async () => {
      hydrateRoot(
        container,
        <p>
          <InlineMath text="a $x^2$ b" />
        </p>,
      );
    });

    expect(container.querySelector('.inline-math .katex')).not.toBeNull();
    expect(loadedTexRenderer()).toBeUndefined();
    container.remove();
  });

  test('a formula mounted in the browser loads KaTeX and shows once it arrives', async () => {
    const { container } = render(<InlineMath text="$v_\infty$" />);

    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull());
    expect(loadedTexRenderer()).toBeDefined();
  });

  test('a formula that changes after hydration is typeset again', async () => {
    const container = document.createElement('div');
    container.innerHTML = await serverHtml('$x$');
    document.body.append(container);
    const root = await act(async () =>
      hydrateRoot(
        container,
        <p>
          <InlineMath text="$x$" />
        </p>,
      ),
    );

    await act(async () =>
      root.render(
        <p>
          <InlineMath text="$y$" />
        </p>,
      ),
    );

    await waitFor(() => expect(container.querySelector('annotation')?.textContent).toBe('y'));
    container.remove();
  });
});

describe('InlineMath punctuation', () => {
  afterEach(cleanup);

  test('keeps the period after a formula on its line', async () => {
    await loadTexRenderer();
    const { container } = render(<InlineMath text="entre $\vec V_p$. Un" />);
    const group = container.querySelector('.whitespace-nowrap');

    expect(group?.querySelector('.katex')).not.toBeNull();
    expect(group?.lastChild?.textContent).toBe('.');
  });
});
