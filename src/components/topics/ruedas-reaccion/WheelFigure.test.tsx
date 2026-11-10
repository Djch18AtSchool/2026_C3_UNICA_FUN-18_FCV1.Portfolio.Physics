// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { svgText } from '../../../test-svg-text';
import WheelFigure from './WheelFigure';

/** Length and unit direction of a vector drawn as <g data-vector> around one <line>. */
function vectorOf(container: HTMLElement, name: string) {
  const line = container.querySelector(`[data-vector="${name}"] line`);
  if (!line) throw new Error(`no vector ${name}`);
  const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((key) => Number(line.getAttribute(key)));
  const length = Math.hypot(x2 - x1, y2 - y1);
  return { length, ux: (x2 - x1) / length, uy: (y2 - y1) / length };
}

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

/** Width of one character of the 12 px mono note font. */
const NOTE_CHAR = 7.2;
/** SvgPlot's compact margins below 480 px. */
const COMPACT = { right: 14, bottom: 50 } as const;

/** Horizontal extent of a note (a group of one MathText per line) from its anchor and longest line. */
function noteExtent(note: Element) {
  const texts = [...note.querySelectorAll('text')];
  const x = Number(texts[0].getAttribute('x'));
  const lines = texts.map((text) => text.getAttribute('data-notation') ?? text.textContent ?? '');
  const width = Math.max(...lines.map((line) => line.trim().length)) * NOTE_CHAR;
  const anchor = texts[0].getAttribute('text-anchor');
  const left = anchor === 'end' ? x - width : anchor === 'middle' ? x - width / 2 : x;
  return { left, right: left + width, lines };
}

const viewBoxOf = (svg: Element | null) =>
  (svg?.getAttribute('viewBox') ?? '').split(' ').map(Number);

describe('WheelFigure', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('exchange: wheel and body turn opposite ways with equal and opposite L on the z axis', () => {
    const { container } = render(<WheelFigure variant="intercambio" />);
    const figure = screen.getByRole('img', { name: /momento angular de la nave y de la rueda/i });

    const wheel = vectorOf(container, 'L-rueda');
    const body = vectorOf(container, 'L-nave');
    expect(wheel.length).toBeCloseTo(body.length, 6);
    expect(wheel.ux * body.ux + wheel.uy * body.uy).toBeCloseTo(-1, 6);
    expect(figure.querySelector('[data-spin="rueda"]')?.getAttribute('data-sense')).toBe(
      'antihorario',
    );
    expect(figure.querySelector('[data-spin="nave"]')?.getAttribute('data-sense')).toBe('horario');
    expect(figure).toHaveTextContent('= 0');
    // The ratio prints as every number on the site: true minus and a U+202F thousands space.
    expect(
      within(figure).getByText(
        svgText('ω_w ≈ −1\u202f940 ω_s'.replace('_w', 'w').replace('_s', 's')),
      ),
    ).toBeInTheDocument();
    expect(figure.getAttribute('aria-label')).toContain('unas 1\u202f940 veces');
  });

  test.each(['intercambio', 'maniobra', 'saturacion'] as const)(
    '%s: every character outside KaTeX is one IBM Plex draws',
    (variant) => {
      const { container } = render(<WheelFigure variant={variant} />);

      expect(plexViolations(container)).toEqual([]);
      const stray = [...container.querySelectorAll('*')]
        .flatMap((element) => [...element.childNodes])
        .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.includes('$'))
        .filter((node) => !node.parentElement?.closest('.katex'));
      expect(stray.map((node) => node.textContent)).toEqual([]);
    },
  );

  test('exchange: the figure is named in words, not in notation', () => {
    render(<WheelFigure variant="intercambio" />);
    const name = screen.getByRole('img', { name: /momento angular/i }).getAttribute('aria-label');

    expect(name).toContain('L sub w hacia arriba y L sub s hacia abajo');
    expect(name).not.toMatch(/[_≈]/);
  });

  test('exchange: the wheel wears the wheel token and the body the body token', () => {
    const { container } = render(<WheelFigure variant="intercambio" />);

    expect(container.querySelector('[data-vector="L-rueda"]')?.getAttribute('stroke')).toBe(
      'var(--chart-4)',
    );
    expect(container.querySelector('[data-vector="L-nave"]')?.getAttribute('stroke')).toBe(
      'var(--chart-6)',
    );
  });

  test('maneuver: θ_s(t) and ω_w(t) as two plots, each with its peak marked', () => {
    const { container } = render(<WheelFigure variant="maniobra" />);

    expect(screen.getByRole('img', { name: /ángulo de la nave/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /velocidad de la rueda/i })).toBeInTheDocument();
    expect(container.querySelector('[data-series="theta-nave"]')).not.toBeNull();
    expect(container.querySelector('[data-series="omega-rueda"]')).not.toBeNull();
    expect(container.querySelector('[data-note="theta-pico"]')).toHaveTextContent('45° a los 30 s');
    expect(container.querySelector('[data-note="omega-pico"]')).toHaveTextContent(
      '−970 rpm a los 30 s',
    );
  });

  test('saturation: L_w ramps to the L_max line in the warning tone, with the turn peak for contrast', () => {
    const { container } = render(<WheelFigure variant="saturacion" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    expect(screen.getByRole('img', { name: /se satura/i })).toBeInTheDocument();
    expect(container.querySelector('[data-series="limite"]')?.getAttribute('stroke')).toBe(
      'var(--chart-2)',
    );
    expect(container.querySelector('[data-series="momento-rueda"]')?.getAttribute('stroke')).toBe(
      'var(--chart-4)',
    );
    expect(mathSourceText(legend)).toContain(String.raw`$L_\text{máx}$ = 0,050 N·m·s`);
    expect(mathSourceText(legend)).toContain(
      String.raw`$L_w$ con $\tau_\text{ext}$ = $2{,}28 \cdot 10^{-7}$ N·m constante`,
    );
    expect(legend).toHaveTextContent('19 %');
    const note = container.querySelector('[data-note="saturacion"]') as Element;
    expect(
      [...note.querySelectorAll('text')].map((text) => text.getAttribute('data-notation')),
    ).toEqual(['≈ 2,5 días', null]);
    expect(note).toHaveTextContent('≈ 2,5 díasen el peor caso');
  });

  test('on a phone the plots get taller than wide, so the saturation note keeps its headroom', () => {
    stubWidth(300);
    render(<WheelFigure variant="saturacion" />);
    const [, , width, height] = viewBoxOf(screen.getByRole('img', { name: /se satura/i }));

    expect(height).toBeGreaterThan(width);
  });

  test('on a wide column the plots keep the landscape aspect', () => {
    stubWidth(700);
    render(<WheelFigure variant="maniobra" />);
    const [, , width, height] = viewBoxOf(screen.getByRole('img', { name: /ángulo de la nave/i }));

    expect(height).toBeLessThan(width);
  });

  test('on a phone the turn notes split in two lines and stay inside the plot', () => {
    stubWidth(320);
    const { container } = render(<WheelFigure variant="maniobra" />);

    for (const id of ['theta-pico', 'omega-pico']) {
      const note = container.querySelector(`[data-note="${id}"] [data-lines]`) as SVGGElement;
      const svg = note.closest('svg') as SVGSVGElement;
      const [, , width, height] = viewBoxOf(svg);
      const { left, right, lines } = noteExtent(note);
      const firstBaseline = Number(note.querySelector('text')?.getAttribute('y'));
      const lastBaseline = firstBaseline + (lines.length - 1) * 15;

      expect(lines, id).toHaveLength(2);
      expect(left, id).toBeGreaterThanOrEqual(0);
      expect(right, id).toBeLessThanOrEqual(width - COMPACT.right);
      expect(lastBaseline, id).toBeLessThan(height - COMPACT.bottom);
    }
  });

  test('saturation: the band says "saturada" and "la nave deriva" sits inside the band', () => {
    stubWidth(320);
    const { container } = render(<WheelFigure variant="saturacion" />);
    const band = container.querySelector('[data-band="saturada"]') as SVGRectElement;
    const note = container.querySelector('[data-note="deriva"] [data-lines]') as SVGGElement;
    const bandLeft = Number(band.getAttribute('x'));
    const bandRight = bandLeft + Number(band.getAttribute('width'));
    const { left, right } = noteExtent(note);

    expect(note).toHaveTextContent(/la nave\s*deriva/);
    expect(left).toBeGreaterThanOrEqual(bandLeft);
    expect(right).toBeLessThanOrEqual(bandRight);
  });
});
