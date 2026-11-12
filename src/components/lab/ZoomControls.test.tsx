// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../lib/settingsStore';
import { plexViolations } from '../../test-glyphs';
import ZoomControls, { ZOOM_ANNOUNCE_DELAY_MS, ZOOM_INSTRUCTIONS } from './ZoomControls';
import type { CanvasCorner } from './canvasCorner';
import { useZoomPan, type ZoomPanOptions } from './useZoomPan';

const NAMES = ['Acercar', 'Alejar', 'Ajustar', 'Tamaño real 1:1'] as const;
/** A lab that declares what «Ajustar» frames: «1:1» is then a button of its own. */
const WITH_FIT = { fit: { x: 0, y: 0, width: 400, height: 300 } };

function Canvas({
  corner,
  orientation,
  options = WITH_FIT,
}: {
  corner?: CanvasCorner;
  orientation?: 'column' | 'row';
  options?: Partial<ZoomPanOptions>;
}) {
  const zoom = useZoomPan({ label: 'Mapa de prueba', ...options });
  return (
    <div data-testid="viewport" {...zoom.viewportProps}>
      <ZoomControls zoom={zoom} corner={corner} orientation={orientation} />
      <span data-testid="transform">{zoom.transform}</span>
    </div>
  );
}

class FakeResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe() {
    this.callback(
      [{ contentRect: { width: 400, height: 300 } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  disconnect() {}
  unobserve() {}
}

const button = (name: string) => screen.getByRole('button', { name });
const factor = (container: HTMLElement) =>
  container.querySelector('[data-zoom-factor]')?.textContent;
const status = (container: HTMLElement) =>
  container.querySelector('[data-zoom-controls] ~ [role="status"]');

describe('ZoomControls', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('a named group with «Acercar», «Alejar», «Ajustar» and «Tamaño real 1:1», in that order', () => {
    render(<Canvas />);

    const group = screen.getByRole('group', { name: 'Zoom' });
    const names = [...group.querySelectorAll('button')].map((node) =>
      node.getAttribute('aria-label'),
    );

    expect(names).toEqual(NAMES);
    for (const node of group.querySelectorAll('button')) {
      expect(node).toHaveAttribute('type', 'button');
      expect(node.className).toContain('size-10');
      expect(node.querySelector('svg')?.getAttribute('class') ?? 'size-5').toContain('size-5');
    }
  });

  test('the visible «1:1» is part of its name (WCAG 2.5.3) and each button shows its key', () => {
    render(<Canvas />);

    expect(button('Tamaño real 1:1')).toHaveTextContent('1:1');
    expect(button('Acercar')).toHaveAttribute('title', 'Acercar (+)');
    expect(button('Alejar')).toHaveAttribute('title', 'Alejar (−)');
    expect(button('Ajustar')).toHaveAttribute('title', 'Ajustar (0)');
  });

  test('at the lab’s framing, «Alejar», «Ajustar» and «1:1» are inert with aria-disabled', () => {
    render(<Canvas />);

    expect(button('Acercar')).not.toHaveAttribute('aria-disabled');
    for (const name of NAMES.slice(1)) {
      expect(button(name)).toHaveAttribute('aria-disabled', 'true');
      expect(button(name)).not.toBeDisabled();
    }
  });

  test('«Acercar» zooms and shows the factor; at ×8 it turns inert and keeps its focus', () => {
    const { container } = render(<Canvas />);
    expect(factor(container)).toBe('×1');

    fireEvent.click(button('Acercar'));
    expect(factor(container)).toBe('×1,4');
    expect(button('Alejar')).not.toHaveAttribute('aria-disabled');

    button('Acercar').focus();
    for (let i = 0; i < 8; i += 1) fireEvent.click(button('Acercar'));
    expect(factor(container)).toBe('×8');
    expect(button('Acercar')).toHaveAttribute('aria-disabled', 'true');
    expect(document.activeElement).toBe(button('Acercar'));
  });

  test('an inert button does nothing when pressed', () => {
    const { container } = render(<Canvas />);

    fireEvent.click(button('Alejar'));

    expect(factor(container)).toBe('×1');
  });

  test('«Alejar», «Ajustar» and «1:1» bring the drawing back', () => {
    const { container } = render(<Canvas />);

    for (const name of ['Alejar', 'Ajustar', 'Tamaño real 1:1']) {
      fireEvent.click(button('Acercar'));
      fireEvent.click(button('Acercar'));
      fireEvent.click(button(name));
      expect(factor(container)).toBe(name === 'Alejar' ? '×1,4' : '×1');
    }
  });

  test.each(['row', 'column'] as const)(
    'in a %s, the factor reads «Zoom ×1», not a bare «×1» like the time badge’s (R31)',
    (orientation) => {
      const { container } = render(<Canvas orientation={orientation} />);
      const label = container.querySelector('[data-zoom-factor-label]');

      expect(label).toHaveTextContent(/^Zoom ×1$/u);
      expect(label?.querySelector('[data-zoom-factor]')).toHaveTextContent('×1');
      fireEvent.click(button('Acercar'));
      expect(label).toHaveTextContent(/^Zoom ×1,4$/u);
    },
  );

  test('in a row, the factor keeps its width from ×1 to ×5,7, so the buttons never move', () => {
    const { container } = render(<Canvas orientation="row" />);

    const number = container.querySelector('[data-zoom-factor]');

    expect(number?.className).toMatch(/min-w-\[4ch\]/u);
  });

  test('the factor is drawing only; its words are read in the canvas', () => {
    const { container } = render(<Canvas />);

    expect(
      container.querySelector('[data-zoom-factor]')?.closest('[aria-hidden="true"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-zoom-words]')).toHaveTextContent(
      'Zoom: escala del dibujo',
    );
  });

  test('says a new zoom once it settles, never at load', () => {
    vi.useFakeTimers();
    const { container } = render(<Canvas />);
    act(() => vi.advanceTimersByTime(ZOOM_ANNOUNCE_DELAY_MS * 2));
    expect(status(container)).toBeEmptyDOMElement();

    fireEvent.click(button('Acercar'));
    fireEvent.click(button('Acercar'));
    act(() => vi.advanceTimersByTime(ZOOM_ANNOUNCE_DELAY_MS));

    expect(status(container)).toHaveTextContent('Zoom: 2 veces la escala del dibujo');
  });

  test('holds the canvas’ instructions under the id the canvas names', () => {
    const { getByTestId } = render(<Canvas />);
    const id = getByTestId('viewport').getAttribute('aria-describedby')!;

    expect(document.getElementById(id)).toHaveTextContent(ZOOM_INSTRUCTIONS);
    expect(ZOOM_INSTRUCTIONS).toMatch(/\+.*−.*0.*flechas/u);
  });

  test('sits in the corner it is given, bottom-right and in a column by default', () => {
    const { container, rerender } = render(<Canvas />);
    const group = () => container.querySelector('[data-zoom-controls]')!;
    expect(group().className).toMatch(/\bbottom-2\b.*\bright-2\b|\bright-2\b.*\bbottom-2\b/u);
    expect(group().className).toContain('flex-col');

    rerender(<Canvas corner="top-left" orientation="row" />);

    expect(group().className).toMatch(/\btop-2\b/u);
    expect(group().className).toMatch(/\bleft-2\b/u);
    expect(group().className).toContain('flex-row');
  });

  test('the server sends the same group, at ×1', () => {
    const html = renderToString(<Canvas />);

    expect(html).toContain('data-zoom-controls');
    expect(html).toContain('×1');
    expect(html).toContain('aria-label="Acercar"');
  });

  test('a drag that starts on the factor or the group’s edge does not pan the drawing', () => {
    const { container, getByTestId } = render(<Canvas />);
    fireEvent.click(button('Acercar'));
    fireEvent.click(button('Acercar'));
    getByTestId('viewport').getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 400, height: 300 }) as DOMRect;
    const before = getByTestId('transform').textContent;

    for (const start of ['[data-zoom-factor]', '[data-zoom-controls]']) {
      const target = container.querySelector(start)!;
      fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientX: 380, clientY: 200 });
      fireEvent.pointerMove(target, { pointerId: 1, clientX: 300, clientY: 120 });
      fireEvent.pointerUp(target, { pointerId: 1, clientX: 300, clientY: 120 });
    }

    expect(getByTestId('viewport')).not.toHaveAttribute('data-zoom-panning');
    expect(getByTestId('transform').textContent).toBe(before);
    expect(factor(container)).toBe('×2');
  });

  test('without a fit or bounds of its own the group leaves «1:1» out (it would repeat «Ajustar»)', () => {
    render(<Canvas options={{}} />);

    const group = screen.getByRole('group', { name: 'Zoom' });
    const names = [...group.querySelectorAll('button')].map((node) =>
      node.getAttribute('aria-label'),
    );

    expect(names).toEqual(NAMES.slice(0, 3));
  });

  test('every character is one IBM Plex draws', () => {
    const { container } = render(<Canvas />);

    expect(plexViolations(container)).toEqual([]);
  });
});
