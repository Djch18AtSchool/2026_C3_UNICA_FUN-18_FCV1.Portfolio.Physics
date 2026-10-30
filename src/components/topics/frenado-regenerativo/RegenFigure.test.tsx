// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import RegenFigure from './RegenFigure';

const strokeOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-series="${id}"]`)?.getAttribute('stroke');

/** A ResizeObserver that reports every observed element at `width` px, as on a phone. */
function stubWidth(width: number): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(element: Element) {
        this.callback(
          [{ target: element, contentRect: { width } } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      disconnect() {}
      unobserve() {}
    },
  );
}

describe('RegenFigure', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('energia-cinetica: K(t) over the first 200 s, the drops marked and the largest labelled', () => {
    const { container } = render(<RegenFigure variant="energia-cinetica" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    expect(legend).toHaveTextContent('Energía cinética K = ½ m v²');
    expect(legend).toHaveTextContent('Frenadas: K baja');
    expect(screen.getByText('Tiempo t (s)')).toBeInTheDocument();
    expect(screen.getByText('Energía cinética K (kJ)')).toBeInTheDocument();
    expect(screen.getByText('−202 kJ en 12 s')).toBeInTheDocument();
    expect(strokeOf(container, 'k')).toBe('var(--chart-1)');
    expect(strokeOf(container, 'frenadas')).toBe('var(--fg)');
    expect(screen.getByRole('img', { name: /202\skJ/ })).toBeInTheDocument();
  });

  test('carga-carretera: F_RL(v) and its three terms with the EPA coefficients', () => {
    const { container } = render(<RegenFigure variant="carga-carretera" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    for (const name of [
      'F_RL = A + Bv + Cv²',
      'A = 120,19 N (rodadura)',
      'Bv, B = 2,8587 N·s/m',
      'Cv², C = 0,27155 N·s²/m² (aire)',
    ]) {
      expect(legend).toHaveTextContent(name);
    }
    expect(strokeOf(container, 'total')).toBe('var(--chart-4)');
    expect(screen.getByText('Velocidad v (m/s)')).toBeInTheDocument();
    expect(screen.getByText('Cv² = A a 21,0 m/s')).toBeInTheDocument();
  });

  test('frenada: the largest UDDS stop split into battery, conversion losses and friction', () => {
    const { container } = render(<RegenFigure variant="frenada" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    expect(legend).toHaveTextContent('Fricción (calor): P_freno − P_regen');
    expect(legend).toHaveTextContent('Pérdidas de conversión: (1 − η) P_regen');
    expect(legend).toHaveTextContent('A la batería: η P_regen');
    expect(strokeOf(container, 'bateria')).toBe('var(--chart-3)');
    expect(strokeOf(container, 'friccion')).toBe('var(--chart-2)');
    expect(container.querySelectorAll('[data-area]')).toHaveLength(3);
    expect(screen.getByText('Potencia P (kW)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /224\skJ/ })).toBeInTheDocument();
  });

  test('on a phone the plots get taller and no figure loses its axis titles', () => {
    render(<RegenFigure variant="frenada" />);
    const wide = (screen.getByRole('img').getAttribute('viewBox') ?? '').split(' ').map(Number);
    cleanup();
    stubWidth(320);

    render(<RegenFigure variant="frenada" />);
    const [, , width, height] = (screen.getByRole('img').getAttribute('viewBox') ?? '')
      .split(' ')
      .map(Number);

    expect(height / width).toBeGreaterThan(wide[3] / wide[2]);
    expect(screen.getByText('Tiempo t (s)')).toBeInTheDocument();
  });
});
