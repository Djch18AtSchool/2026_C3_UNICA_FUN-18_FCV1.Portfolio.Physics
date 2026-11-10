// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_REGEN } from '../../../lib/physics/energy';
import { regenModelText } from '../../../lib/physics/regenModelText';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { svgText } from '../../../test-svg-text';
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

    expect(mathSourceText(legend)).toContain('Energía cinética $K = \\tfrac12 m v^2$');
    expect(legend).toHaveTextContent('Frenadas: K baja');
    expect(screen.getByText('Tiempo t (s)')).toBeInTheDocument();
    expect(screen.getByText('Energía cinética K (kJ)')).toBeInTheDocument();
    expect(screen.getByText('−202 kJ en 12 s')).toBeInTheDocument();
    expect(strokeOf(container, 'k')).toBe('var(--chart-1)');
    expect(strokeOf(container, 'frenadas')).toBe('var(--fg)');
    expect(screen.getByRole('img', { name: /202\skJ/ })).toBeInTheDocument();
  });

  test.each(['energia-cinetica', 'carga-carretera', 'frenada'] as const)(
    '%s: every character outside KaTeX is one IBM Plex draws',
    (variant) => {
      const { container } = render(<RegenFigure variant={variant} />);

      expect(plexViolations(container)).toEqual([]);
    },
  );

  test('carga-carretera: the figure name says F_RL in words', () => {
    render(<RegenFigure variant="carga-carretera" />);

    expect(screen.getByRole('img', { name: /F sub RL vale 120\sN en reposo/ })).toBeInTheDocument();
  });

  test('carga-carretera: F_RL(v) and its three terms with the EPA coefficients', () => {
    const { container } = render(<RegenFigure variant="carga-carretera" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    for (const name of [
      '$F_\\text{RL} = A + Bv + Cv^2$',
      '$A$ = 120,19 N (rodadura)',
      '$Bv$, $B$ = 2,8587 N·s/m',
      '$Cv^2$, $C$ = 0,27155 N·s²/m² (aire)',
    ]) {
      expect(mathSourceText(legend).replace(/\s+/g, ' ')).toContain(name);
    }
    expect(strokeOf(container, 'total')).toBe('var(--fg)');
    expect(strokeOf(container, 'lineal')).not.toBe('var(--chart-6)');
    expect(screen.getByText('Velocidad v (m/s)')).toBeInTheDocument();
    expect(screen.getByText(svgText('Cv2 = A a 21,0 m/s'))).toBeInTheDocument();
  });

  test('frenada: the largest UDDS stop with the site model, P_freno as the outer edge', () => {
    const { container } = render(<RegenFigure variant="frenada" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    const title = mathSourceText(container.querySelector('figcaption')).replace(/\s+/g, ' ');
    expect(title).toContain(regenModelText(DEFAULT_REGEN).replace(/\s+/g, ' '));
    const source = mathSourceText(legend);
    expect(source).toContain('Calor de fricción: $P_\\text{freno} - P_\\text{regen}$');
    expect(source).toContain('Pérdidas de conversión: $(1 - \\eta) P_\\text{regen}$');
    expect(source).toContain('A la batería: $\\eta P_\\text{regen}$');
    expect(source).toContain('Borde superior: $P_\\text{freno}$, frenado en las ruedas');
    expect(source).toContain('A la batería sin $f(v)$, contraste');
    expect(strokeOf(container, 'bateria')).toBe('var(--chart-3)');
    expect(strokeOf(container, 'perdidas')).toBe('var(--chart-6)');
    expect(strokeOf(container, 'friccion')).toBe('var(--chart-2)');
    expect(strokeOf(container, 'freno')).toBe('var(--chart-4)');
    expect(container.querySelector('[data-series="sin-fv"]')).toHaveAttribute('stroke-dasharray');
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
