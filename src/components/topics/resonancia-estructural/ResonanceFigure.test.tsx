// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { svgText } from '../../../test-svg-text';
import ResonanceFigure, { type ResonanceFigureVariant } from './ResonanceFigure';
import TacomaMeasurement from './TacomaMeasurement';

const VARIANTS: readonly ResonanceFigureVariant[] = ['libre', 'curva', 'tropa', 'autoexcitacion'];

const strokeOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-series="${id}"]`)?.getAttribute('stroke');

/** Every color a figure paints with: tokens only, never a hex value. */
const paints = (container: HTMLElement) =>
  [...container.querySelectorAll('[fill], [stroke]')].flatMap((element) =>
    ['fill', 'stroke'].map((name) => element.getAttribute(name) ?? ''),
  );

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

describe('ResonanceFigure', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('libre: the vertical mode in blue and the torsion in orange, each with its period', () => {
    const { container } = render(<ResonanceFigure variant="libre" />);

    expect(screen.getByTestId('resonance-figure-libre')).toBeInTheDocument();
    expect(legend()).toHaveTextContent('Modo vertical, 37 ciclos/min');
    expect(legend()).toHaveTextContent('Torsión de un nodo, 12 ciclos/min');
    expect(strokeOf(container, 'vertical')).toBe('var(--chart-1)');
    expect(strokeOf(container, 'torsion')).toBe('var(--chart-2)');
    expect(screen.getByText(svgText('T0 = 5,0 s'))).toBeInTheDocument();
    expect(screen.getByText(svgText('T0 = 1,6 s'))).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /cada 5,0 s/ })).toBeInTheDocument();
  });

  test('curva: Klipper’s three ζ, orange to green as damping grows, peaks 6,7, 5,0 and 3,3', () => {
    const { container } = render(<ResonanceFigure variant="curva" />);

    expect(mathSourceText(legend())).toContain('$\\zeta$ = 0,075');
    expect(mathSourceText(legend())).toContain('$\\zeta$ = 0,15');
    expect(legend()).not.toHaveTextContent('0,150');
    expect(mathSourceText(legend())).toContain('$\\zeta$ = 0,1, la de Klipper por omisión');
    expect(strokeOf(container, 'zeta-0.075')).toBe('var(--chart-2)');
    expect(strokeOf(container, 'zeta-0.1')).toBe('var(--chart-1)');
    expect(strokeOf(container, 'zeta-0.15')).toBe('var(--chart-3)');
    for (const peak of ['6,7', '5,0', '3,3']) {
      expect(screen.getByText(svgText(peak))).toBeInTheDocument();
    }
    expect(screen.getByRole('img', { name: /1 sobre 2 zeta|6,7/ })).toBeInTheDocument();
  });

  test('tropa: N·F1 in orange, √N·F1 in green, seeded draws and the 60 of Broughton', () => {
    const { container } = render(<ResonanceFigure variant="tropa" />);

    expect(strokeOf(container, 'al-paso')).toBe('var(--chart-2)');
    expect(strokeOf(container, 'rompiendo')).toBe('var(--chart-3)');
    expect(container.querySelectorAll('[data-draw]')).toHaveLength(20);
    expect(screen.getByText(svgText('16,8 kN'))).toBeInTheDocument();
    expect(screen.getByText(svgText('2,2 kN'))).toBeInTheDocument();
    expect(screen.getByText(svgText(/^60 soldados/))).toBeInTheDocument();
  });

  test('autoexcitación: decays below the critical wind, grows above it', () => {
    const { container } = render(<ResonanceFigure variant="autoexcitacion" />);

    expect(strokeOf(container, 'u-17')).toBe('var(--chart-3)');
    expect(strokeOf(container, 'u-30.6')).toBe('var(--chart-2)');
    expect(strokeOf(container, 'u-42')).toBe('var(--chart-2)');
    expect(
      container.querySelector('[data-series="u-42"]')?.getAttribute('stroke-dasharray'),
    ).toBeTruthy();
    expect(mathSourceText(legend())).toContain('42 mph, extrapolado');
    expect(screen.getByText(svgText('×0,93'))).toBeInTheDocument();
    expect(screen.getByText(svgText('×1,8'))).toBeInTheDocument();
    expect(screen.getByText(svgText('×3,5'))).toBeInTheDocument();
  });

  test.each(VARIANTS)('%s: paints with tokens only', (variant) => {
    const { container } = render(<ResonanceFigure variant={variant} />);

    expect(paints(container).filter((paint) => paint.startsWith('#'))).toEqual([]);
  });

  test.each(VARIANTS)('%s: every character outside KaTeX is one IBM Plex draws', (variant) => {
    const { container } = render(<ResonanceFigure variant={variant} />);

    expect(plexViolations(container)).toEqual([]);
  });

  test.each([
    ['libre', ['T0 = 5,0 s', 'T0 = 1,6 s']],
    ['curva', ['6,7', '5,0', '3,3', 'ωd = ω0']],
    ['tropa', ['16,8 kN', '2,2 kN', '60 soldados']],
    ['autoexcitacion', ['×0,93', '×1,8', '×3,5']],
  ] as const)('%s: on a phone (340 px) the plot keeps its labels', (variant, labels) => {
    stubWidth(340);
    const { container } = render(<ResonanceFigure variant={variant} />);

    for (const label of labels) expect(screen.getByText(svgText(label))).toBeInTheDocument();
    expect(plexViolations(container)).toEqual([]);
  });
});

describe('TacomaMeasurement', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('the raw series in grey, my corrected measurement in its own purple, Farquharson’s 5 s in blue', () => {
    const { container } = render(<TacomaMeasurement />);

    expect(screen.getByTestId('tacoma-measurement')).toBeInTheDocument();
    expect(strokeOf(container, 'video')).toBe('var(--fg-muted)');
    expect(strokeOf(container, 'real')).toBe('var(--chart-4)');
    expect(strokeOf(container, 'farquharson')).toBe('var(--chart-1)');
    const text = mathSourceText(legend());
    expect(text).toContain('Tal como corre el video ($T$ = 3,43 s)');
    expect(text).toContain('Corregida a tiempo real ($T$ = 5,15 s)');
    expect(text).toContain('Cosenoide de 5,0 s de Farquharson');
    expect(screen.getByRole('img', { name: /1,5/ })).toBeInTheDocument();
  });

  test('its x axis reads seconds and the y axis the deck edge in pixels', () => {
    render(<TacomaMeasurement />);

    expect(screen.getByText(svgText(/^Tiempo desde el inicio de la toma/))).toBeInTheDocument();
    expect(screen.getByText(svgText('Altura del borde del tablero (px)'))).toBeInTheDocument();
  });

  test('every character outside KaTeX is one IBM Plex draws, also on a phone', () => {
    const { container, unmount } = render(<TacomaMeasurement />);
    expect(plexViolations(container)).toEqual([]);
    unmount();

    stubWidth(340);
    const phone = render(<TacomaMeasurement />);
    expect(plexViolations(phone.container)).toEqual([]);
  });
});
