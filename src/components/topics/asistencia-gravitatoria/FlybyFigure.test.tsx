// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { monoTextWidth } from '../../lab/plotScales';
import FlybyFigure from './FlybyFigure';
import { segmentHitsBox, type Segment } from '../../lab/labelClearance';

/** OverlayMarks' Label: 13 px mono text; its box runs about 10 px above the baseline and 3 below. */
const LABEL_SIZE = 13;
const ASCENT = 10;
const DESCENT = 3;
/** The chart frame's padding and border on each side, between a figure's cell and its plotter. */
const FRAME_INSET = 17;

type Box = { left: number; right: number; top: number; bottom: number };

/**
 * A phone-width layout: a triangle cell (or any outer wrapper) measures `width`, and the plotter
 * inside its chart frame measures the frame's inner width.
 */
function stubWidths(width: number): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        const isPlot = target.classList.contains('relative');
        const measured = isPlot ? width - 2 * FRAME_INSET : width;
        const entry = {
          target,
          contentRect: { width: measured },
        } as unknown as ResizeObserverEntry;
        this.callback([entry], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    },
  );
}

/** The plot area of one plotter, from the clip of its overlay layer. */
function plotArea(overlay: Element): Box {
  const rect = overlay.querySelector('clipPath rect') as SVGRectElement;
  const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((k) => Number(rect.getAttribute(k)));
  return { left: x, right: x + w, top: y, bottom: y + h };
}

function labelBox(text: Element): Box {
  const x = Number(text.getAttribute('x'));
  const y = Number(text.getAttribute('y'));
  const width = monoTextWidth(text.textContent ?? '', LABEL_SIZE);
  const anchor = text.getAttribute('text-anchor');
  const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  return { left, right: left + width, top: y - ASCENT, bottom: y + DESCENT };
}

const inside = (box: Box, area: Box) =>
  box.left >= area.left &&
  box.right <= area.right &&
  box.top >= area.top &&
  box.bottom <= area.bottom;

/** Vertices of an SVG path "M x y L x y …". */
function pathPoints(d: string): { x: number; y: number }[] {
  return [...d.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
}

const PHONE_WIDTHS = [260, 300, 360];
/** The combining vector arrow: Plex has no glyph for it and Windows draws a box (auditoría §5.1). */
const COMBINING_ARROW = '\u20D7';
const NAME_ATTRIBUTES = ['aria-label', 'aria-description', 'title'];

/** Every straight piece of an SVG path "M x y L x y … M x y L …" (M starts a new piece). */
function pathSegments(d: string): Segment[] {
  const commands = [...d.matchAll(/([ML])([-\d.]+) ([-\d.]+)/g)];
  return commands.flatMap((m, i): Segment[] => {
    if (m[1] !== 'L' || i === 0) return [];
    const previous = commands[i - 1];
    return [
      [
        { x: Number(previous[2]), y: Number(previous[3]) },
        { x: Number(m[2]), y: Number(m[3]) },
      ],
    ];
  });
}

/** The lines the hyperbola draws: path, asymptotes, arrow shafts and heads, rₚ and the δ arc. */
function hyperbolaLines(container: HTMLElement, overlay: Element): Segment[] {
  const fromPath = ['trayectoria', 'asintotas'].flatMap((id) =>
    pathSegments(container.querySelector(`[data-series="${id}"]`)?.getAttribute('d') ?? ''),
  );
  const fromLines = [...overlay.querySelectorAll('line')].map((line): Segment => [
    { x: Number(line.getAttribute('x1')), y: Number(line.getAttribute('y1')) },
    { x: Number(line.getAttribute('x2')), y: Number(line.getAttribute('y2')) },
  ]);
  const fromPolys = [...overlay.querySelectorAll('polygon, polyline')].flatMap((shape) => {
    const points = (shape.getAttribute('points') ?? '')
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(',').map(Number))
      .map(([x, y]) => ({ x, y }));
    const closed = shape.tagName === 'polygon' ? [...points, points[0]] : points;
    return closed.slice(1).map((p, i): Segment => [closed[i], p]);
  });
  return [...fromPath, ...fromLines, ...fromPolys];
}

const strokeOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-series="${id}"]`)?.getAttribute('stroke');

describe('FlybyFigure', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('vis-viva: data dots on the bound orbit before Jupiter and on a hyperbolic one after', () => {
    const { container } = render(<FlybyFigure variant="vis-viva" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    expect(legend).toHaveTextContent('Datos de Horizons');
    expect(legend).toHaveTextContent('Solo el Sol antes de Júpiter');
    expect(legend).toHaveTextContent('Después de Júpiter');
    expect(legend).toHaveTextContent('Escape');
    expect(strokeOf(container, 'despues')).toBe('var(--jupiter)');
    expect(strokeOf(container, 'escape')).toBe('var(--sun)');
    expect(container.querySelectorAll('[data-dot]').length).toBeGreaterThan(40);
    expect(screen.getByText(`Afelio: 6,29 UA, 6,21 km/s`)).toBeInTheDocument();
    expect(screen.getByText('r (UA)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /ε = −121,7/ })).toBeInTheDocument();
  });

  test('hiperbola: the V2 path in Jupiter frame with r_p, e and δ, and equal v∞ arrows', () => {
    const { container } = render(<FlybyFigure variant="hiperbola" />);

    expect(container.querySelector('[data-planet="jupiter"]')?.getAttribute('fill')).toBe(
      'var(--jupiter)',
    );
    expect(screen.getByRole('list', { name: 'Leyenda' })).toHaveTextContent(
      'hipérbola con e = 1,330',
    );
    expect(screen.getByText('δ = 97,5°')).toBeInTheDocument();
    expect(screen.getByText(`rₚ = 10,09 R_J`)).toBeInTheDocument();
    expect(screen.getAllByText('v∞')).toHaveLength(2);
    expect(screen.getByRole('list', { name: 'Leyenda' })).toHaveTextContent(
      'v∞ al entrar y al salir: 7,62 km/s',
    );
    // The v∞ arrows are keyed by an arrow, not by the trajectory's plain line.
    const keys = within(screen.getByRole('list', { name: 'Leyenda' }))
      .getAllByRole('listitem')
      .map((item) => (item.querySelector('polygon') ? 'flecha' : 'línea'));
    expect(keys).toEqual(['línea', 'flecha', 'línea']);
    expect(screen.getByRole('img', { name: /721\u202f375\u202fkm/ })).toBeInTheDocument();
  });

  test('triangulo: Jupiter gains +9,91 km/s and Neptune loses 2,13 km/s, side by side', () => {
    const { container } = render(<FlybyFigure variant="triangulo" />);

    expect(screen.getByText(`Júpiter (V2): +9,91 km/s`)).toBeInTheDocument();
    expect(screen.getByText(`Neptuno (V2): −2,13 km/s`)).toBeInTheDocument();
    expect(strokeOf(container, 'vp-jupiter')).toBe('var(--jupiter)');
    expect(strokeOf(container, 'vp-neptune')).toBe('var(--neptune)');
    expect(screen.getByRole('img', { name: /Neptuno.*giro fuera del plano/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Júpiter/ })).not.toHaveAccessibleName(
      /fuera del plano/,
    );
    expect(screen.getByText(/4,4·10⁻²¹\sm\/s/)).toBeInTheDocument();
  });

  test.each(['vis-viva', 'hiperbola', 'triangulo'] as const)(
    '%s: no rendered text or accessible name carries the combining arrow U+20D7',
    (variant) => {
      const { container } = render(<FlybyFigure variant={variant} />);
      const names = [...container.querySelectorAll('[aria-label], [aria-description], [title]')]
        .flatMap((el) => NAME_ATTRIBUTES.map((attribute) => el.getAttribute(attribute) ?? ''))
        .join(' ');

      expect(container.textContent).not.toContain(COMBINING_ARROW);
      expect(names).not.toContain(COMBINING_ARROW);
    },
  );

  test.each(PHONE_WIDTHS)('triangulo at %i px: every label stays inside its plot', (width) => {
    stubWidths(width);
    const { container } = render(<FlybyFigure variant="triangulo" />);
    const overlays = [...container.querySelectorAll('svg[role="presentation"]')];

    expect(overlays).toHaveLength(2);
    for (const overlay of overlays) {
      const area = plotArea(overlay);
      const labels = [...overlay.querySelectorAll('text')];
      expect(labels.length).toBe(3);
      for (const label of labels) {
        expect(inside(labelBox(label), area), `${label.textContent} at ${width} px`).toBe(true);
      }
    }
  });

  test.each(PHONE_WIDTHS)(
    'hiperbola at %i px: no label overlaps another, and the rₚ labels stay clear of the path',
    (width) => {
      stubWidths(width);
      const { container } = render(<FlybyFigure variant="hiperbola" />);
      const overlay = container.querySelector('svg[role="presentation"]') as Element;
      const path = pathPoints(
        container.querySelector('[data-series="trayectoria"]')?.getAttribute('d') ?? '',
      );
      const rpLabels = [...overlay.querySelectorAll('text')].filter((t) =>
        t.textContent?.startsWith('rₚ'),
      );

      expect(path.length).toBeGreaterThan(100);
      const boxes = [...overlay.querySelectorAll('text')].map((t) => ({
        text: t.textContent,
        ...labelBox(t),
      }));
      for (const box of boxes) {
        for (const other of boxes) {
          if (other === box) continue;
          const isApart =
            other.left >= box.right ||
            box.left >= other.right ||
            other.top >= box.bottom ||
            box.top >= other.bottom;
          expect(isApart, `${box.text} / ${other.text} at ${width} px`).toBe(true);
        }
      }
      expect(rpLabels).toHaveLength(2);
      for (const label of rpLabels) {
        const box = labelBox(label);
        expect(inside(box, plotArea(overlay)), label.textContent ?? '').toBe(true);
        const hits = path.filter(
          (p) => p.x >= box.left && p.x <= box.right && p.y >= box.top && p.y <= box.bottom,
        );
        expect(hits, `${label.textContent} at ${width} px`).toHaveLength(0);
      }
    },
  );

  test.each([...PHONE_WIDTHS, 720])(
    'hiperbola at %i px: each v∞ tag crosses no path, asymptote or arrow',
    (width) => {
      stubWidths(width);
      const { container } = render(<FlybyFigure variant="hiperbola" />);
      const overlay = container.querySelector('svg[role="presentation"]') as Element;
      const lines = hyperbolaLines(container, overlay);
      const tags = [...overlay.querySelectorAll('text')].filter((t) => t.textContent === 'v∞');

      expect(lines.length).toBeGreaterThan(100);
      expect(tags).toHaveLength(2);
      for (const tag of tags) {
        const box = labelBox(tag);
        expect(inside(box, plotArea(overlay))).toBe(true);
        const hits = lines.filter((segment) => segmentHitsBox(segment, box));
        expect(
          hits,
          `v∞ at (${tag.getAttribute('x')}, ${tag.getAttribute('y')}), ${width} px`,
        ).toHaveLength(0);
      }
    },
  );
});
