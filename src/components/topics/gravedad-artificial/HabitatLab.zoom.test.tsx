// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import HabitatLab from './HabitatLab';

const WIDTH = 400;

function stubResizeObserver(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        const contentRect = { width: WIDTH, height: WIDTH };
        this.callback([{ target, contentRect } as ResizeObserverEntry], this as never);
      }
      unobserve() {}
      disconnect() {}
    },
  );
}

const button = (name: string) => screen.getByRole('button', { name });
const zoomedBy = () => screen.getByText(/^×/u).textContent;

describe('the habitat lab zoom', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
    setSettings({ motion: 'reduced' });
    stubResizeObserver();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('«Cómo se usa» says how to zoom, that the person is for a paused ring and what the bar measures', () => {
    const { container } = render(<HabitatLab />);

    const usage = container.querySelector('details[data-lab-note="usage"]');
    expect(usage).toHaveTextContent('El anillo se acerca con los botones');
    expect(usage).toHaveTextContent('Con la reproducción en pausa puedes acercarte a la persona');
    expect(usage).toHaveTextContent('la barra de escala mide el radio r');
    expect(plexViolations(container)).toEqual([]);
  });

  test('a preset frames the ring again', async () => {
    render(<HabitatLab />);
    fireEvent.click(button('Acercar'));
    fireEvent.click(button('Acercar'));
    expect(zoomedBy()).not.toBe('×1');

    await userEvent.click(screen.getByRole('button', { name: /^Toro de Stanford/ }));

    expect(zoomedBy()).toBe('×1');
  });

  test('Restablecer frames the ring again', async () => {
    render(<HabitatLab />);
    fireEvent.click(button('Acercar'));
    expect(zoomedBy()).not.toBe('×1');

    await userEvent.click(button('Restablecer'));

    expect(zoomedBy()).toBe('×1');
  });

  test('changing the radius keeps the zoom: the view is on the screen, the ring is redrawn under it', () => {
    render(<HabitatLab />);
    fireEvent.click(button('Acercar'));
    const before = zoomedBy();

    fireEvent.keyDown(screen.getByTestId('radius-handle'), { key: 'ArrowLeft' });

    expect(zoomedBy()).toBe(before);
  });
});
