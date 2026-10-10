// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import TyreFigure from './TyreFigure';

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

describe('TyreFigure', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('box: friction follows the push to 39,2 N, then drops to 29,4 N', () => {
    const { container } = render(<TyreFigure variant="caja" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    expect(legend).toHaveTextContent('Fricción sobre la caja f');
    expect(legend).toHaveTextContent('Límite estático μ_s n');
    expect(strokeOf(container, 'limite')).toBe('var(--chart-2)');
    expect(screen.getByText('f_s,máx = 39,2 N')).toBeInTheDocument();
    expect(screen.getByText('f_k = 29,4 N')).toBeInTheDocument();
    expect(screen.getByText('Fuerza aplicada F (N)')).toBeInTheDocument();
  });

  test('load: the linear and load-sensitive models cross at 4 000 N', () => {
    const { container } = render(<TyreFigure variant="carga" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    expect(legend).toHaveTextContent('Modelo lineal F = μ₀ F_z');
    expect(legend).toHaveTextContent('Con sensibilidad a la carga');
    expect(strokeOf(container, 'lineal')).toBe('var(--chart-1)');
    expect(strokeOf(container, 'real')).toBe('var(--chart-2)');
    expect(screen.getByText('6 400 N a 4 000 N')).toBeInTheDocument();
    expect(screen.getByText('11 943 N')).toBeInTheDocument();
    expect(screen.getByText('Carga vertical F_z (N)')).toBeInTheDocument();
  });

  test('temperature: the C3 window band and the cold and hot readings', () => {
    render(<TyreFigure variant="temperatura" />);

    expect(screen.getByText('Ventana de trabajo C3 (2019)')).toBeInTheDocument();
    expect(screen.getByText('60 °C: 1,11')).toBeInTheDocument();
    expect(screen.getByText('160 °C: 1,45')).toBeInTheDocument();
    expect(screen.getByText('Temperatura T (°C)')).toBeInTheDocument();
  });

  test('on a phone-width plot the figure gets taller', () => {
    render(<TyreFigure variant="carga" />);
    const wide = screen.getByRole('img').getAttribute('viewBox');
    cleanup();
    stubWidth(320);

    render(<TyreFigure variant="carga" />);
    const [, , width, height] = (screen.getByRole('img').getAttribute('viewBox') ?? '')
      .split(' ')
      .map(Number);

    expect(height / width).toBeGreaterThan(1 / 1.6);
    expect(wide).not.toBeNull();
  });
});
