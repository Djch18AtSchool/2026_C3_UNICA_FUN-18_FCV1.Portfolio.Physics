// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import TyreFigure from './TyreFigure';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { svgText } from '../../../test-svg-text';

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
    expect(mathSourceText(legend)).toContain('Límite estático $\\mu_s n$');
    expect(strokeOf(container, 'limite')).toBe('var(--chart-2)');
    expect(screen.getByText(svgText('fs,máx = 39,2 N'))).toBeInTheDocument();
    expect(screen.getByText(svgText('fk = 29,4 N'))).toBeInTheDocument();
    expect(screen.getByText('Fuerza aplicada F (N)')).toBeInTheDocument();
  });

  test('load: the linear and load-sensitive models cross at 4 000 N', () => {
    const { container } = render(<TyreFigure variant="carga" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    expect(mathSourceText(legend)).toContain('Modelo lineal $F = \\mu_0 F_z$');
    expect(mathSourceText(legend)).toContain('Con sensibilidad a la carga, $F = \\mu(F_z) F_z$');
    expect(mathSourceText(legend)).not.toContain('f(T)');
    expect(strokeOf(container, 'lineal')).toBe('var(--chart-1)');
    expect(strokeOf(container, 'real')).toBe('var(--chart-2)');
    expect(screen.getByText('6 400 N a 4 000 N')).toBeInTheDocument();
    expect(screen.getByText('11 943 N')).toBeInTheDocument();
    expect(screen.getByText(svgText('Carga vertical Fz (N)'))).toBeInTheDocument();
  });

  test('temperature: the C3 window band and the cold and hot readings', () => {
    render(<TyreFigure variant="temperatura" />);

    expect(screen.getByText('Ventana de trabajo C3 (2019)')).toBeInTheDocument();
    expect(screen.getByText('60 °C: 1,11')).toBeInTheDocument();
    expect(screen.getByText('160 °C: 1,45')).toBeInTheDocument();
    expect(screen.getByText('Temperatura T (°C)')).toBeInTheDocument();
  });

  test("temperature: the six pairs of MUR's tcurve_F3soft.lut are drawn and named in the legend", () => {
    const { container } = render(<TyreFigure variant="temperatura" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });
    const pairs = container.querySelectorAll('[data-point^="lut-"]');
    const guide = container.querySelector('[data-series="lut-mur"]');

    expect(mathSourceText(legend)).toContain('Modelo $\\mu(T)$, ecuación (4.3)');
    expect(mathSourceText(legend)).toContain(
      'tcurve_F3soft.lut de MUR, multiplicador × $\\mu_\\text{pico}$',
    );
    expect(pairs).toHaveLength(6);
    expect([...pairs].map((p) => p.getAttribute('data-point'))).toEqual([
      'lut-0',
      'lut-40',
      'lut-75',
      'lut-100',
      'lut-140',
      'lut-240',
    ]);
    for (const pair of pairs) {
      expect(pair.querySelector('circle')).toHaveAttribute('fill', 'var(--chart-2)');
    }
    expect(strokeOf(container, 'mu')).toBe('var(--chart-1)');
    expect(guide).toHaveAttribute('stroke', 'var(--chart-2)');
    expect(guide).toHaveAttribute('stroke-dasharray');
    expect(
      screen.getByRole('img', { name: /tcurve_F3soft\.lut.*mu sub pico/ }),
    ).toBeInTheDocument();
  });

  test('temperature: the plateau pairs sit at μ_pico, the 0 and 240 pairs at 0,8 of it on the plot edges', () => {
    const { container } = render(<TyreFigure variant="temperatura" />);
    const circle = (id: string) => container.querySelector(`[data-point="${id}"] circle`);
    const cy = (id: string) => Number(circle(id)?.getAttribute('cy'));
    const cx = (id: string) => Number(circle(id)?.getAttribute('cx'));
    // The model is sampled over the same 0–240: its path starts at the y axis and ends at the
    // plot area's right edge, so the coldest and hottest pairs must sit on those two x.
    const path = container.querySelector('[data-series="mu"]')?.getAttribute('d') ?? '';
    const xs = [...path.matchAll(/[ML](-?[\d.]+) /g)].map((m) => Number(m[1]));
    const [axisX, rightEdgeX] = [xs[0], xs.at(-1)];

    expect(cy('lut-75')).toBeCloseTo(cy('lut-100'), 6);
    expect(cy('lut-0')).toBeCloseTo(cy('lut-240'), 6);
    expect(cy('lut-0')).toBeGreaterThan(cy('lut-75'));
    expect(xs.length).toBeGreaterThan(2);
    expect(cx('lut-0')).toBeCloseTo(axisX ?? Number.NaN, 1);
    expect(cx('lut-240')).toBeCloseTo(rightEdgeX ?? Number.NaN, 1);
    expect(cx('lut-40')).toBeGreaterThan(axisX ?? Number.NaN);
    expect(cx('lut-140')).toBeLessThan(rightEdgeX ?? Number.NaN);
  });

  test('pacejka: the curve of (4.4) with its peak near x = 0,18 and 0,91 at x = 1', () => {
    const { container } = render(<TyreFigure variant="pacejka" />);

    expect(screen.getByTestId('tyre-figure-pacejka')).toBeInTheDocument();
    expect(strokeOf(container, 'pacejka')).toBe('var(--chart-1)');
    expect(screen.getByText(svgText('Pico: x ≈ 0,18; y = 1,00'))).toBeInTheDocument();
    expect(screen.getByText('x = 1: y = 0,91')).toBeInTheDocument();
    expect(screen.getByText('Deslizamiento x (adimensional)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /en x aproximadamente 0,18/ })).toBeInTheDocument();
  });

  test.each(['caja', 'carga', 'temperatura', 'pacejka'] as const)(
    '%s: every character outside KaTeX is one IBM Plex draws',
    (variant) => {
      const { container } = render(<TyreFigure variant={variant} />);

      expect(plexViolations(container)).toEqual([]);
    },
  );

  test('box: the figure name says the limit in words, not as notation', () => {
    render(<TyreFigure variant="caja" />);

    expect(screen.getByRole('img', { name: /el límite mu sub s n; entonces/ })).toBeInTheDocument();
  });

  test('on a phone the temperature readings shorten to their value, each on its own side', () => {
    // The figure's measured width on a 375 px phone (the page's gutters taken off).
    stubWidth(340);
    const { container } = render(<TyreFigure variant="temperatura" />);
    const cold = container.querySelector('[data-point="t-60"] text');
    const hot = container.querySelector('[data-point="t-160"] text');

    expect(cold).toHaveTextContent(/^1,11$/);
    expect(cold).toHaveAttribute('text-anchor', 'end');
    expect(hot).toHaveTextContent(/^1,45$/);
    expect(hot).toHaveAttribute('text-anchor', 'start');
  });

  test('on a phone the crossing label shortens to its force, clear of the curves', () => {
    stubWidth(300);
    const { container } = render(<TyreFigure variant="carga" />);
    const label = container.querySelector('[data-point="referencia"] text');

    expect(label).toHaveTextContent(/^6\s400\sN$/);
    expect(label).toHaveAttribute('text-anchor', 'start');
    expect(screen.getByText(svgText('Fuerza lateral máx. Fy (N)'))).toBeInTheDocument();
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
