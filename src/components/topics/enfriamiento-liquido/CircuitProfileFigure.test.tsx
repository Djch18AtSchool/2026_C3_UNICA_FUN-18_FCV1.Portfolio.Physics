// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { RD109, UQD04 } from '../../../lib/data/liquidCooling';
import { PARAMETER_ROWS } from '../../../lib/tables/topics/enfriamiento-liquido';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { svgText } from '../../../test-svg-text';
import CircuitProfileFigure from './CircuitProfileFigure';

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

const legend = () => screen.getByRole('toolbar', { name: 'Leyenda: realzar una serie' });
const view = (name: string) => screen.getByRole('button', { name });
const strip = (container: HTMLElement) => container.querySelector('[data-section-strip]');

describe('CircuitProfileFigure: v(x) and p(x) along the circuit (the prescribed resource)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('both axes of both panels say their magnitude and unit', () => {
    render(<CircuitProfileFigure />);

    expect(screen.getByText(svgText('Velocidad media v (m/s)'))).toBeInTheDocument();
    expect(screen.getByText(svgText('Presión absoluta p (kPa)'))).toBeInTheDocument();
    expect(screen.getByText(svgText('Posición en el recorrido x (m)'))).toBeInTheDocument();
  });

  test('the legend names the supply, the return and Bernoulli without losses', () => {
    render(<CircuitProfileFigure />);

    const text = mathSourceText(legend());
    expect(text).toContain('Impulsión, del CDU a la placa fría: $v$ y $p$ real');
    expect(text).toContain('Retorno, de la placa fría al CDU: $v$ y $p$ real');
    expect(text).toContain('$p$ ideal de Bernoulli, sin pérdidas');
  });

  test('supply in blue, return in orange-red, the ideal pressure dashed and muted', () => {
    const { container } = render(<CircuitProfileFigure />);
    const paths = (id: string) => [...container.querySelectorAll(`path[data-series="${id}"]`)];

    expect(paths('impulsion')).toHaveLength(2);
    expect(paths('retorno')).toHaveLength(2);
    for (const path of paths('impulsion')) expect(path).toHaveAttribute('stroke', 'var(--chart-1)');
    for (const path of paths('retorno')) expect(path).toHaveAttribute('stroke', 'var(--chart-2)');
    expect(paths('ideal')).toHaveLength(1);
    expect(paths('ideal')[0]).toHaveAttribute('stroke', 'var(--fg-muted)');
    expect(paths('ideal')[0]).toHaveAttribute('stroke-dasharray');
  });

  test('the drawing says the numbers in words: 400,0 kPa out, 220,1 back, Bernoulli closing at 400,0', () => {
    render(<CircuitProfileFigure />);

    const name = screen.getByRole('img').getAttribute('aria-label') ?? '';
    expect(name).toMatch(/400,0\skPa/);
    expect(name).toMatch(/220,1\skPa/);
    expect(name).toMatch(/1,80\sbar/);
  });

  test('it names every parameter it is computed with, all declared in tables 13.1 to 13.3', () => {
    const { container } = render(<CircuitProfileFigure />);

    const ids = (
      container.querySelector('[data-parameters]')?.getAttribute('data-parameters') ?? ''
    )
      .split(' ')
      .filter(Boolean);
    expect(ids.length).toBeGreaterThan(25);
    for (const id of ids)
      expect(PARAMETER_ROWS[id as keyof typeof PARAMETER_ROWS], id).toBeDefined();
  });

  test('three views; the server one shows the UQD04 and the plate in the strip', () => {
    const { container } = render(<CircuitProfileFigure />);

    expect(view('Todo el circuito')).toHaveAttribute('aria-pressed', 'true');
    expect(within(strip(container) as HTMLElement).getByText(svgText('Rack'))).toBeInTheDocument();

    fireEvent.click(view('Servidor'));

    expect(view('Servidor')).toHaveAttribute('aria-pressed', 'true');
    expect(view('Todo el circuito')).toHaveAttribute('aria-pressed', 'false');
    const pieces = within(strip(container) as HTMLElement);
    expect(pieces.getAllByText(svgText('UQD04'))).toHaveLength(2);
    expect(pieces.getByText(svgText('Placa fría'))).toBeInTheDocument();
    expect(pieces.getAllByText(svgText('D = 7,24 mm'))).toHaveLength(2);
  });

  test('the strip draws each section to scale in diameter: the main pipe 18 times the UQD bore', () => {
    const { container } = render(<CircuitProfileFigure />);
    const height = (id: string) =>
      Number(container.querySelector(`[data-section="${id}"]`)?.getAttribute('height'));

    const main = RD109.mainPipeDiameter.value;

    expect(height('tuberia-impulsion') / height('uqd-impulsion')).toBeCloseTo(
      main / UQD04.bore.value,
      9,
    );
    expect(main / UQD04.bore.value).toBeCloseTo(18.08, 2);
    expect(height('manguera-rack-impulsion') / height('tuberia-impulsion')).toBeCloseTo(
      RD109.rackHoseDiameter.value / main,
      9,
    );
  });

  test.each(['Todo el circuito', 'Rack', 'Servidor'])(
    '%s: every character outside KaTeX is one IBM Plex draws',
    (name) => {
      const { container } = render(<CircuitProfileFigure />);
      fireEvent.click(view(name));

      expect(plexViolations(container)).toEqual([]);
    },
  );

  test('on a phone the strip numbers its sections and a key under it names them', () => {
    stubWidth(264);
    const { container } = render(<CircuitProfileFigure />);
    fireEvent.click(view('Rack'));

    const key = screen.getByRole('list', { name: 'Tramos de la franja' });
    expect(within(strip(container) as HTMLElement).getByText(svgText('3'))).toBeInTheDocument();
    expect(mathSourceText(key).replace(/\s+/g, ' ')).toContain('Manifold, $D_h$ = 37,7 mm');
    expect(within(key).getAllByRole('listitem')).toHaveLength(5);
  });

  test('on a desktop the names fit under the strip and there is no key', () => {
    render(<CircuitProfileFigure />);

    expect(screen.queryByRole('list', { name: 'Tramos de la franja' })).toBeNull();
  });
});
