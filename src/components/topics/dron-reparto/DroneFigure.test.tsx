// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { monoTextWidth } from '../../lab/plotScales';
import DroneFigure from './DroneFigure';
import { mathSourceText } from '../../../test-inline-math';
import { plexViolations } from '../../../test-glyphs';
import { svgText } from '../../../test-svg-text';

const strokeOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-series="${id}"]`)?.getAttribute('stroke');

describe('DroneFigure', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('route: the declared stops on an x–y map with the position vector of B', () => {
    const { container } = render(<DroneFigure variant="ruta" />);

    expect(screen.getByText('x (este) (m)')).toBeInTheDocument();
    expect(strokeOf(container, 'ruta')).toBe('var(--chart-1)');
    expect(screen.getByText('B (900; 800)')).toBeInTheDocument();
    expect(screen.getByText(svgText('r'))).toBeInTheDocument();
    expect(screen.getByText(svgText('v'))).toBeInTheDocument();
    expect(screen.getByText('x = 900 m')).toBeInTheDocument();
    expect(screen.getByText('y = 800 m')).toBeInTheDocument();
  });

  test('jumps: v_x and v_y step at eight instants, marked as infinite accelerations', () => {
    const { container } = render(<DroneFigure variant="saltos" />);
    const legend = screen.getByRole('toolbar', { name: 'Leyenda: realzar una serie' });

    expect(legend).toHaveTextContent('Saltos de v: a = dv/dt infinita');
    expect(mathSourceText(legend)).toContain('$v_x$');
    expect(mathSourceText(legend)).toContain('$v_y$');
    expect(strokeOf(container, 'saltos')).toBe('var(--chart-4)');
    const spikes = container.querySelector('[data-series="saltos"]')?.getAttribute('d') ?? '';
    expect(spikes.match(/M/g)).toHaveLength(8);
    expect(screen.getByRole('img', { name: /8 instantes/ })).toBeInTheDocument();
  });

  test('profile: the trapezoid of the first leg with t_a and T labelled', () => {
    const { container } = render(<DroneFigure variant="perfil" />);

    expect(strokeOf(container, 'trapecio')).toBe('var(--chart-3)');
    expect(screen.getByText(svgText(/^ta = 4,0\ss$/))).toBeInTheDocument();
    expect(screen.getByText(/T = 67,2\ss/)).toBeInTheDocument();
    expect(screen.getByText(svgText(/^d\/vmáx = 63,2\ss$/))).toBeInTheDocument();
  });
  test('route on a phone: the x component letter clears the depot label', () => {
    // The figure's plot is about 290 px wide on a 375 px phone.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: ResizeObserverCallback) {}
        observe(target: Element) {
          const entry = { target, contentRect: { width: 290 } } as unknown as ResizeObserverEntry;
          this.callback([entry], this as unknown as ResizeObserver);
        }
        unobserve() {}
        disconnect() {}
      },
    );
    render(<DroneFigure variant="ruta" />);
    const depot = screen.getByText('Depósito');
    const letter = screen.getByText('x', { selector: 'text' });
    const depotRight = Number(depot.getAttribute('x')) + monoTextWidth('Depósito', 13);
    const letterLeft = Number(letter.getAttribute('x')) - monoTextWidth('x', 13) / 2;

    // Both sit on the same line below the x axis; the halos (2 px each side) must not touch.
    expect(letterLeft - depotRight).toBeGreaterThanOrEqual(8);
  });

  test.each(['ruta', 'saltos', 'perfil'] as const)(
    '%s: every character outside KaTeX is one IBM Plex draws',
    (variant) => {
      const { container } = render(<DroneFigure variant={variant} />);

      expect(plexViolations(container)).toEqual([]);
    },
  );
});
