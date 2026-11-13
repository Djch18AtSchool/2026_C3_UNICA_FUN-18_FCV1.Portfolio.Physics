// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  segmentHitsBox,
  segmentsOf,
  textBox,
  type Box,
  type Segment,
} from '../../lab/labelClearance';
import { monoTextWidth } from '../../lab/plotScales';
import BounceFigure from './BounceFigure';
import { mathSourceText } from '../../../test-inline-math';
import { plexViolations } from '../../../test-glyphs';
import { svgText } from '../../../test-svg-text';

/** BounceFigure's apex labels are 12 px. */
const APEX_LABEL_SIZE = 12;
/** A label's source: its notation when MathText drew it, else its text. */
const notationOf = (text: Element) => text.getAttribute('data-notation') ?? text.textContent ?? '';

/** A label set on the plot's edge may sit there up to float round-off. */
const EPSILON = 1e-6;

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

/** Every color a figure paints with: tokens only, never a hex value. */
function paints(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[fill], [stroke]')].flatMap((element) =>
    ['fill', 'stroke'].map((name) => element.getAttribute(name) ?? ''),
  );
}

/** End-anchored texts: the y tick labels in the left margin, among others. */
function yTickLabels(container: HTMLElement): SVGTextElement[] {
  return [...container.querySelectorAll<SVGTextElement>('text[text-anchor="end"]')];
}

describe('BounceFigure', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test.each(['rebote', 'choque', 'umbral'] as const)(
    '%s: every character outside KaTeX is one IBM Plex draws',
    (variant) => {
      const { container } = render(<BounceFigure variant={variant} />);

      expect(plexViolations(container)).toEqual([]);
      const stray = [...container.querySelectorAll('*')]
        .flatMap((element) => [...element.childNodes])
        .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.includes('$'))
        .filter((node) => !node.parentElement?.closest('.katex'));
      expect(stray.map((node) => node.textContent)).toEqual([]);
    },
  );

  describe('rebote (Paso 1)', () => {
    test('draws y(t) of the ITF tennis ball in the tennis color, with its apexes labelled', () => {
      const { container } = render(<BounceFigure variant="rebote" />);

      expect(screen.getByText('t (s)')).toBeInTheDocument();
      expect(screen.getByText('y (m)')).toBeInTheDocument();
      expect(strokeOf(container, 'tenis-itf')).toBe('var(--tennis)');
      for (const label of ['h_0 = 2,54 m', 'h_1 = 1,41 m', 'h_2 = 0,78 m', 'h_3 = 0,43 m']) {
        expect(container.querySelector(`[data-notation="${label}"]`), label).not.toBeNull();
      }
      expect(screen.getByText(svgText('h1 = 1,41 m'))).toBeInTheDocument();
    });

    test('marks the rebound band the ITF admits and the time T when the bounces end', () => {
      const { container } = render(<BounceFigure variant="rebote" />);

      expect(container.querySelector('[data-band="itf"]')).not.toBeNull();
      expect(screen.getByText('Rebote ITF: 1,35–1,47 m')).toBeInTheDocument();
      expect(screen.getByText('T = 4,92 s')).toBeInTheDocument();
    });

    test('names the figure with its numbers', () => {
      render(<BounceFigure variant="rebote" />);

      expect(
        screen.getByRole('img', { name: /2,54 m.*e = 0,745.*1,41 m.*0,78 m.*T = 4,92 s/ }),
      ).toBeInTheDocument();
    });
  });

  describe('choque (Paso 2)', () => {
    test('shows the state before and after for e = 0, 0,75 and 1', () => {
      render(<BounceFigure variant="choque" />);
      const diagram = screen.getByRole('img', { name: /choque/i });

      expect(diagram).toHaveTextContent('Antes');
      expect(diagram).toHaveTextContent('e = 0');
      expect(diagram).toHaveTextContent('e = 0,75');
      expect(diagram).toHaveTextContent('e = 1');
      expect(diagram.querySelector('[data-notation="m_1 = 2 kg"]')).not.toBeNull();
      expect(diagram.querySelector('[data-notation="m_2 = 1 kg"]')).not.toBeNull();
      expect(diagram).toHaveTextContent('1,25 m/s');
      expect(diagram).toHaveTextContent('3,5 m/s');
    });

    test('the momentum arrow has the same length in every row', () => {
      const { container } = render(<BounceFigure variant="choque" />);
      const lengths = [...container.querySelectorAll('[data-momentum]')].map((arrow) =>
        Number(arrow.getAttribute('data-length')),
      );

      expect(lengths).toHaveLength(4);
      expect(new Set(lengths).size).toBe(1);
      expect(screen.getAllByText('6 kg·m/s')).toHaveLength(4);
      expect(screen.getByText('Momento p')).toBeInTheDocument();
    });

    test('the kinetic energy bar shrinks as e falls; the centre-of-mass part never does', () => {
      const { container } = render(<BounceFigure variant="choque" />);
      const width = (row: string, part: string) =>
        Number(
          container
            .querySelector(`[data-row="${row}"] [data-kinetic="${part}"]`)
            ?.getAttribute('width'),
        );

      expect(width('e-0', 'total')).toBeLessThan(width('e-0,75', 'total'));
      expect(width('e-0,75', 'total')).toBeLessThan(width('e-1', 'total'));
      expect(width('e-1', 'total')).toBeCloseTo(width('antes', 'total'), 6);
      expect(width('e-0', 'cm')).toBeCloseTo(width('antes', 'cm'), 6);
      expect(screen.getByText('K = 9 J')).toBeInTheDocument();
      expect(screen.getByText('K′ = 6 J')).toBeInTheDocument();
      expect(screen.getByText('K′ = 7,69 J')).toBeInTheDocument();
      expect(screen.getByText('K′ = 9 J')).toBeInTheDocument();
    });

    test('on a phone the momentum and energy go under the balls, labelled, inside the column', () => {
      stubWidth(300);
      const { container } = render(<BounceFigure variant="choque" />);
      const svg = screen.getByRole('img', { name: /choque/i });
      const [, , width] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number);

      expect(svg).toHaveAttribute('data-layout', 'narrow');
      expect(width).toBe(260);
      expect(screen.getAllByText('p = 6 kg·m/s')).toHaveLength(4);
      for (const text of container.querySelectorAll<SVGTextElement>('text')) {
        const half = monoTextWidth(text.textContent ?? '', 11) / 2;
        const x = Number(text.getAttribute('x'));
        const anchor =
          text.getAttribute('text-anchor') ??
          text.closest('[text-anchor]')?.getAttribute('text-anchor');
        const [from, to] = anchor === 'middle' ? [x - half, x + half] : [x, x + 2 * half];
        expect(from, text.textContent ?? '').toBeGreaterThanOrEqual(0);
        expect(to, text.textContent ?? '').toBeLessThanOrEqual(width);
      }
    });

    test.each(['antes', 'e-0', 'e-0,75', 'e-1'])(
      'wide layout, %s: the velocity arrow of m₂ ends at least 16 px before the momentum arrow',
      (row) => {
        const { container } = render(<BounceFigure variant="choque" />);
        const group = container.querySelector(`[data-row="${row}"]`) as SVGGElement;
        const tip = Number(
          group.querySelector('[data-velocity="2"] line')?.getAttribute('x2') ?? 0,
        );
        const start = Number(group.querySelector('[data-momentum]')?.getAttribute('data-start'));
        const ball = group.querySelector('[data-body="2"] circle') as SVGCircleElement;
        const ballRight = Number(ball.getAttribute('cx')) + Number(ball.getAttribute('r'));

        expect(screen.getByRole('img', { name: /choque/i })).toHaveAttribute('data-layout', 'wide');
        expect(start - Math.max(tip, ballRight)).toBeGreaterThanOrEqual(16);
      },
    );

    test('paints with theme tokens only', () => {
      const { container } = render(<BounceFigure variant="choque" />);

      for (const paint of paints(container)) expect(paint).not.toMatch(/#[0-9a-f]{3,8}/i);
    });
  });

  describe('umbral (Paso 3)', () => {
    test('puts h_n on a logarithmic axis labelled by decades of centimetres', () => {
      const { container } = render(<BounceFigure variant="umbral" />);
      const decades = yTickLabels(container).filter((text) =>
        ['0,1', '1', '10', '100'].includes(text.textContent ?? ''),
      );
      const ys = decades.map((text) => Number(text.getAttribute('y')));

      expect(decades.map((text) => text.textContent)).toEqual(['0,1', '1', '10', '100']);
      expect(ys[0] - ys[1]).toBeCloseTo(ys[1] - ys[2], 6);
      expect(ys[1] - ys[2]).toBeCloseTo(ys[2] - ys[3], 6);
      expect(screen.getByText(svgText('hn (cm, escala logarítmica)'))).toBeInTheDocument();
      expect(screen.getByText('n (número de rebote)')).toBeInTheDocument();
    });

    test('the ideal series and both thresholds, each named in the legend', () => {
      const { container } = render(<BounceFigure variant="umbral" />);
      const legend = screen.getByRole('toolbar', { name: 'Leyenda: realzar una serie' });

      expect(mathSourceText(legend)).toContain('Ideal, sin umbral: $h_n = e^{2n} h_0$');
      expect(legend).toHaveTextContent(
        'Umbral de 1 m/s (Box2D v3): 15 rebotes, el último de 4,2 cm',
      );
      expect(legend).toHaveTextContent(
        'Umbral de 2 m/s (Unity 3D): 8 rebotes, el último de 18,5 cm',
      );
      expect(container.querySelector('[data-series="ideal"]')).not.toBeNull();
      expect(strokeOf(container, 'box2d')).toMatch(/^var\(--/);
      expect(strokeOf(container, 'unity')).toMatch(/^var\(--/);
      expect(strokeOf(container, 'box2d')).not.toBe(strokeOf(container, 'unity'));
    });

    test('draws each threshold as the height it equals, and where the ball stops dead', () => {
      const { container } = render(<BounceFigure variant="umbral" />);

      expect(screen.getByText('5,1 cm')).toBeInTheDocument();
      expect(screen.getByText('20,4 cm')).toBeInTheDocument();
      expect(container.querySelectorAll('[data-stop]')).toHaveLength(2);
      expect(
        screen.getByRole('img', { name: /escala logarítmica.*18,5 cm.*4,2 cm/ }),
      ).toBeInTheDocument();
    });

    test('every mark and legend key is drawn at full opacity', () => {
      const { container } = render(<BounceFigure variant="umbral" />);
      const faded = [
        ...container.querySelectorAll('[opacity], [stroke-opacity], [fill-opacity]'),
      ].filter((element) =>
        ['opacity', 'stroke-opacity', 'fill-opacity'].some((name) => {
          const value = element.getAttribute(name);
          return value !== null && Number(value) < 1;
        }),
      );

      expect(faded).toEqual([]);
    });

    test('paints with theme tokens only', () => {
      const { container } = render(<BounceFigure variant="umbral" />);

      for (const paint of paints(container)) expect(paint).not.toMatch(/#[0-9a-f]{3,8}/i);
    });

    test('on a phone the plot is drawn at its real width and keeps the decades', () => {
      stubWidth(320);
      const { container } = render(<BounceFigure variant="umbral" />);
      const svg = container.querySelector('svg[role="img"]');
      const [, , width, height] = (svg?.getAttribute('viewBox') ?? '').split(' ').map(Number);

      expect(width).toBe(320);
      expect(height).toBeGreaterThanOrEqual(width * 0.9);
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('20,4 cm')).toBeInTheDocument();
    });
  });

  /** The plot's series path in viewBox pixels, as segments. */
  function pathSegments(container: HTMLElement, id: string): Segment[] {
    const d = container.querySelector(`[data-series="${id}"]`)?.getAttribute('d') ?? '';
    const points = [...d.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map(([, x, y]) => ({
      x: Number(x),
      y: Number(y),
    }));
    return segmentsOf(points);
  }

  /** The plot area: the overlay's clip rectangle. */
  function plotArea(container: HTMLElement): Box {
    const rect = container.querySelectorAll('svg')[1].querySelector('clipPath rect') as Element;
    const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((name) =>
      Number(rect.getAttribute(name)),
    );
    return { left: x, top: y, right: x + w, bottom: y + h };
  }

  function apexBox(label: SVGTextElement): Box {
    const anchor = (label.getAttribute('text-anchor') ?? 'start') as 'start' | 'middle' | 'end';
    const at = { x: Number(label.getAttribute('x')), y: Number(label.getAttribute('y')) };
    return textBox(at, notationOf(label), APEX_LABEL_SIZE, anchor);
  }

  test.each([
    [240, ' m'],
    [254, ' m'],
    [294, ' m'],
    [320, ' m'],
    [720, ' m'],
  ])(
    'at %i px (240 is the narrowest plot) the apex labels keep «%s» and clear every arc',
    (width, unit) => {
      stubWidth(width);
      const { container } = render(<BounceFigure variant="rebote" />);
      const labels = [...container.querySelectorAll<SVGTextElement>('[data-apex] text')];
      const arcs = pathSegments(container, 'tenis-itf');
      const area = plotArea(container);

      expect(labels.map(notationOf)).toEqual(
        ['h_0 = 2,54', 'h_1 = 1,41', 'h_2 = 0,78', 'h_3 = 0,43'].map((label) => `${label}${unit}`),
      );
      for (const label of labels) {
        const box = apexBox(label);
        expect(box.left, notationOf(label)).toBeGreaterThanOrEqual(area.left - EPSILON);
        expect(box.right, notationOf(label)).toBeLessThanOrEqual(area.right + EPSILON);
        expect(box.top, notationOf(label)).toBeGreaterThanOrEqual(area.top - EPSILON);
        for (const arc of arcs) {
          expect(segmentHitsBox(arc, box), `${notationOf(label)} on an arc`).toBe(false);
        }
      }
    },
  );

  test('on a phone the band label shortens and the apex labels stay in the plot', () => {
    stubWidth(320);
    const { container } = render(<BounceFigure variant="rebote" />);
    const labels = [...container.querySelectorAll<SVGTextElement>('[data-apex] text')];

    expect(screen.getByText('ITF: 1,35–1,47 m')).toBeInTheDocument();
    for (const label of labels) {
      expect(Number(label.getAttribute('x'))).toBeLessThanOrEqual(320);
      expect(Number(label.getAttribute('x'))).toBeGreaterThanOrEqual(0);
    }
  });
});
