// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MOTION_SPRING_TESTS } from '../../../lib/data/springReferences';
import { plexViolations } from '../../../test-glyphs';
import SpringFigure, { type SpringFigureVariant } from './SpringFigure';
import { BEZIER_COLOR, REGIME_COLORS } from './springPlots';

const VARIANTS: readonly SpringFigureVariant[] = [
  'libre',
  'amortiguado',
  'regimenes',
  'interrupcion',
];

/** A ResizeObserver that reports every observed element at `width` px. */
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

const strokeOf = (container: HTMLElement, id: string) =>
  [...container.querySelectorAll(`[data-series="${id}"]`)].map((path) =>
    path.getAttribute('stroke'),
  );

/** Every color a figure paints with: tokens only, never a hex value. */
const paints = (container: HTMLElement) =>
  [...container.querySelectorAll('[fill], [stroke]')].flatMap((element) =>
    ['fill', 'stroke'].map((name) => element.getAttribute(name) ?? ''),
  );

/** The source notation of every SVG label MathText drew. */
const notations = (container: HTMLElement) =>
  [...container.querySelectorAll('text[data-notation]')].map(
    (text) => text.getAttribute('data-notation') ?? '',
  );

describe('SpringFigure', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test.each(VARIANTS)('%s: every character outside KaTeX is one IBM Plex draws', (variant) => {
    const { container } = render(<SpringFigure variant={variant} />);

    expect(plexViolations(container)).toEqual([]);
    const stray = [...container.querySelectorAll('*')]
      .flatMap((element) => [...element.childNodes])
      .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.includes('$'))
      .filter((node) => !node.parentElement?.closest('.katex'));
    expect(stray.map((node) => node.textContent)).toEqual([]);
  });

  test.each(VARIANTS)('%s: paints with color tokens only', (variant) => {
    const { container } = render(<SpringFigure variant={variant} />);

    const hex = paints(container).filter((paint) => /#[0-9a-f]{3,8}/i.test(paint));
    expect(hex).toEqual([]);
  });

  test.each(VARIANTS)(
    '%s: names its plots for a screen reader, with no raw notation',
    (variant) => {
      render(<SpringFigure variant={variant} />);

      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
      for (const image of images) {
        const name = image.getAttribute('aria-label') ?? '';
        expect(name.length).toBeGreaterThan(40);
        expect(name).not.toMatch(/[$_^\\]/);
      }
    },
  );

  test('libre: the undamped cosine in the undamped color, with the target band and T₀', () => {
    const { container } = render(<SpringFigure variant="libre" />);

    expect(strokeOf(container, 'sin-amortiguar')).toEqual([REGIME_COLORS['sin-amortiguar']]);
    expect(container.querySelector('[data-band="reposo"]')).not.toBeNull();
    expect(notations(container)).toContain(String.raw`$T_0$ = 0,63 s`);
    expect(screen.getByRole('img', { name: /nunca se queda en la banda/ })).toBeTruthy();
  });

  test('amortiguado: the damped curve and its dashed envelope in the underdamped color', () => {
    const { container } = render(<SpringFigure variant="amortiguado" />);

    expect(strokeOf(container, 'amortiguado')).toEqual([REGIME_COLORS.subamortiguado]);
    expect(strokeOf(container, 'envolvente')).toEqual([REGIME_COLORS.subamortiguado]);
    expect(
      container.querySelector('[data-series="envolvente"]')?.getAttribute('stroke-dasharray'),
    ).not.toBeNull();
    expect(notations(container)).toContain('$t$ = 0,81 s');
  });

  test("regimenes: one curve per regime in its color, and the dots of Motion's tests", () => {
    const { container } = render(<SpringFigure variant="regimenes" />);

    for (const id of ['subamortiguado', 'critico', 'sobreamortiguado'] as const) {
      expect(strokeOf(container, id)).toEqual([REGIME_COLORS[id]]);
    }
    const dots = MOTION_SPRING_TESTS.flatMap(({ id, expected }) =>
      expected.map((_, i) => `${id}-${i}`),
    );
    expect(
      [...container.querySelectorAll('[data-point]')].map((dot) => dot.getAttribute('data-point')),
    ).toEqual(dots);
  });

  test('interrupcion: position and velocity panels, the spring against the Bézier, and t*', () => {
    const { container } = render(<SpringFigure variant="interrupcion" />);

    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(strokeOf(container, 'resorte')).toEqual([
      REGIME_COLORS.subamortiguado,
      REGIME_COLORS.subamortiguado,
    ]);
    expect(strokeOf(container, 'bezier')).toEqual([BEZIER_COLOR, BEZIER_COLOR]);
    expect(container.querySelectorAll('[data-mark="interrupcion"]')).toHaveLength(2);
    expect(screen.getByRole('img', { name: /la de la curva cae a 0/ })).toBeTruthy();
  });

  test('on a phone the plots get a squarer aspect, and still draw every series', () => {
    stubWidth(360);
    const { container } = render(<SpringFigure variant="interrupcion" />);

    expect(container.querySelectorAll('[data-series]').length).toBeGreaterThanOrEqual(4);
    expect(plexViolations(container)).toEqual([]);
  });
});
