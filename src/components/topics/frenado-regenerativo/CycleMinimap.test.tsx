// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DRIVE_CYCLES } from '../../../lib/data/driveCycles';
import { createFrameStore } from '../../lab/frameStore';
import { plexViolations } from '../../../test-glyphs';
import CycleMinimap, { minimapX, speedPath, MINIMAP } from './CycleMinimap';
import { brakingStretch, cycleStops } from './regenStretch';

const UDDS = DRIVE_CYCLES.udds;
const STOPS = cycleStops(UDDS.samples);
const STRETCH = brakingStretch(UDDS.samples);
const WIDTH = 362;

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

/** The map of the view «Tramo» (its clock starts at the stretch), or of «Ciclo» with `isCycle`. */
function renderMap(isCycle = false) {
  const stretch = isCycle ? undefined : STRETCH;
  const offset = stretch?.start ?? 0;
  const frame = createFrameStore();
  const view = render(
    <CycleMinimap
      samples={UDDS.samples}
      stops={STOPS}
      stretch={stretch}
      cycleName={UDDS.name}
      live={{ frame, toCycle: (t) => offset + t }}
    />,
  );
  return { ...view, frame };
}

const svg = () => screen.getByTestId('regen-minimap').querySelector('svg') as SVGSVGElement;
/** The image's name with the narrow no-break spaces of the numbers as plain spaces. */
const imageName = () =>
  (screen.getByRole('img').getAttribute('aria-label') ?? '').replace(/\u202f/g, ' ');
const attr = (selector: string, name: string) =>
  Number(svg().querySelector(selector)?.getAttribute(name));

describe('minimap geometry', () => {
  test('times map onto the strip, 1 px in from each edge so a 2 px mark stays whole', () => {
    const x = minimapX(1369, WIDTH);

    expect(x(0)).toBe(1);
    expect(x(1369)).toBe(WIDTH - 1);
    expect(x(-5)).toBe(1);
    expect(x(2000)).toBe(WIDTH - 1);
  });

  test('the speed path has one vertex per sample: rest on the baseline, the top speed on the top line', () => {
    const path = speedPath(UDDS.samples, WIDTH);
    const vertices = path.split(/[ML]/).filter(Boolean);
    const ys = vertices.map((vertex) => Number(vertex.trim().split(' ')[1]));

    expect(vertices).toHaveLength(UDDS.samples.length);
    expect(path.startsWith(`M1 ${MINIMAP.baseline}`)).toBe(true);
    expect(Math.min(...ys)).toBe(MINIMAP.curveTop);
    expect(Math.max(...ys)).toBe(MINIMAP.baseline);
  });

  test('the strip is 48 px high, labels and drawing, on the 4/8 scale', () => {
    expect(MINIMAP.height).toBe(48);
    expect(MINIMAP.labelRow + MINIMAP.drawing).toBe(MINIMAP.height);
    for (const value of Object.values(MINIMAP)) expect(value % 4).toBe(0);
  });
});

describe('CycleMinimap', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('is one image that says the cycle, its stops and the stretch in words', () => {
    renderMap();

    expect(imageName()).toBe(
      'Velocidad en el ciclo UDDS: 1 369 s y 17 detenciones; el tramo va de 376 a 402 s.',
    );
  });

  test('one stop is «1 detención», singular', () => {
    const frame = createFrameStore();
    render(
      <CycleMinimap
        samples={DRIVE_CYCLES.hwfet.samples}
        stops={cycleStops(DRIVE_CYCLES.hwfet.samples)}
        cycleName="HWFET"
        live={{ frame, toCycle: (t) => t }}
      />,
    );

    expect(imageName()).toBe('Velocidad en el ciclo HWFET: 765 s y 1 detención.');
  });

  test('without a stretch (the whole cycle) it names no stretch and draws no band', () => {
    renderMap(true);

    expect(imageName()).toBe('Velocidad en el ciclo UDDS: 1 369 s y 17 detenciones.');
    expect(svg().querySelector('[data-stretch]')).toBeNull();
  });

  test('draws a mark under the curve at each of the 17 stops, where the speed is 0', () => {
    stubWidth(WIDTH);
    renderMap();
    const x = minimapX(1369, WIDTH);
    const marks = [...svg().querySelectorAll('[data-stop]')];

    expect(marks).toHaveLength(17);
    expect(marks.map((mark) => Number(mark.getAttribute('x1')))).toEqual(STOPS.map((t) => x(t)));
    for (const mark of marks) {
      expect(Number(mark.getAttribute('y1'))).toBe(MINIMAP.baseline);
    }
  });

  test('a band over the stretch situates it in the cycle, at least 4 px wide on a phone', () => {
    stubWidth(WIDTH);
    renderMap();
    const x = minimapX(1369, WIDTH);
    const left = attr('[data-stretch]', 'x');
    const width = attr('[data-stretch]', 'width');

    expect(left + width / 2).toBeCloseTo((x(376) + x(402)) / 2, 6);
    expect(width).toBeGreaterThanOrEqual(4);
    expect(screen.getByTestId('regen-minimap').textContent?.replace(/\u202f/g, ' ')).toContain(
      'Tramo 376–402 s',
    );
  });

  test('the playhead follows the live clock of the view, in the cycle’s time', () => {
    stubWidth(WIDTH);
    const { frame } = renderMap();
    const x = minimapX(1369, WIDTH);

    expect(attr('[data-playhead]', 'x1')).toBeCloseTo(x(376), 6);
    act(() => frame.set(21));
    expect(attr('[data-playhead]', 'x1')).toBeCloseTo(x(397), 6);
  });

  test('is drawn at the width it measures, at a fixed height (no shift when it hydrates)', () => {
    stubWidth(WIDTH);
    renderMap();

    expect(svg().getAttribute('viewBox')).toBe(`0 0 ${WIDTH} 32`);
    expect(svg().getAttribute('height')).toBe('32');
  });

  test('before it measures, the drawing fills its box and its labels are HTML at their own size', () => {
    renderMap();
    const labels = screen.getByTestId('regen-minimap').querySelector('p') as HTMLElement;

    expect(svg().getAttribute('viewBox')).toBe('0 0 720 32');
    expect(svg().getAttribute('preserveAspectRatio')).toBe('none');
    expect(svg().querySelector('text')).toBeNull();
    expect(labels).toHaveAttribute('aria-hidden', 'true');
    expect(labels.style.height).toBe('16px');
    expect(labels).toHaveTextContent('Velocidad del UDDS');
    for (const line of svg().querySelectorAll('line, path, rect')) {
      expect((line as SVGElement).style.vectorEffect).toBe('non-scaling-stroke');
    }
  });

  test('every character it prints is one IBM Plex draws', () => {
    const { container } = renderMap();

    expect(plexViolations(container)).toEqual([]);
  });
});
