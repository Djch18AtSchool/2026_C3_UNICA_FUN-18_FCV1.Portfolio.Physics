// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { createFrameStore } from '../../lab/frameStore';
import { SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX } from '../../lab/scaleBarMath';
import HabitatScene, { type HabitatSceneProps } from './HabitatScene';
import { personHeight } from './habitatRing';

/** The scene measures 400 px: the ring square is 400 × 400 and the zoom's viewport is the same. */
const WIDTH = 400;
const ZOOM_STEP = Math.SQRT2;

function stubResizeObserver(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        const contentRect = { width: WIDTH, height: WIDTH };
        this.callback([{ target, contentRect } as ResizeObserverEntry], this as never);
      }
      unobserve() {}
      disconnect() {}
    },
  );
}

const PROPS: HabitatSceneProps = {
  r: 894.6,
  rpm: 1,
  omega: 0.1047,
  frame: createFrameStore(),
  gRatio: 1,
  showVectors: true,
  decimals: 2,
  refit: 0,
  onRadiusChange: () => undefined,
};

const renderScene = (props: Partial<HabitatSceneProps> = {}) =>
  render(<HabitatScene {...PROPS} {...props} />);

const button = (name: string) => screen.getByRole('button', { name });
const zoomIn = (times: number) => {
  for (let step = 0; step < times; step += 1) fireEvent.click(button('Acercar'));
};

/** The ring's floor radius on screen: the inner circle of the ring path (outer minus the band). */
function ringRadius(): number {
  const d = screen.getByTestId('habitat-ring').getAttribute('d') ?? '';
  const [, outer, inner] =
    /a([\d.]+) [\d.]+ 0 1 0 [-\d.]+ 0 a[-\d.]+ [-\d.]+ 0 1 0 [-\d.]+ 0 Z M[-\d.]+ [-\d.]+ a([\d.]+)/u.exec(
      d,
    ) ?? [];
  expect(outer).toBeDefined();
  return Number(inner);
}

/** The scale bar: its drawn length in px and its round value in metres. */
function scaleBar() {
  const bar = document.querySelector('div[data-scale-bar]') as HTMLElement;
  const px = Number(
    (bar.querySelector('[data-scale-bar-line]') as HTMLElement).style.width.replace('px', ''),
  );
  const text = (bar.textContent ?? '').replace(/\s/gu, ' ').trim();
  const [, digits, unit] = /^([\d ]+) (m|km)$/u.exec(text) ?? [];
  const value = Number(digits.replace(/\s/gu, ''));
  return { px, metres: unit === 'km' ? value * 1000 : value, text };
}

const personHead = () => Number(document.querySelector('[data-person] circle')?.getAttribute('r'));

describe('the habitat scene zoom', () => {
  beforeEach(() => {
    setSettings({ motion: 'reduced' });
    stubResizeObserver();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('the ring is a zoomable canvas with the shared buttons, «Ajustar» and no «1:1»', () => {
    renderScene();

    const canvas = screen.getByRole('group', { name: 'Anillo del hábitat' });
    expect(canvas).toHaveAttribute('aria-roledescription', 'lienzo con zoom');
    expect(canvas).toContainElement(screen.getByTestId('habitat-scene'));
    const zoom = screen.getByRole('group', { name: 'Zoom' });
    for (const name of ['Acercar', 'Alejar', 'Ajustar']) {
      expect(within(zoom).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(within(zoom).queryByRole('button', { name: /1:1/u })).not.toBeInTheDocument();
    expect(button('Alejar')).toHaveAttribute('aria-disabled', 'true');
    expect(button('Ajustar')).toHaveAttribute('aria-disabled', 'true');
  });

  test('the radius bar and the zoom buttons are outside the canvas, so neither can pan the other', () => {
    renderScene();

    const canvas = screen.getByRole('group', { name: 'Anillo del hábitat' });
    expect(canvas).not.toContainElement(screen.getByTestId('radius-handle'));
    expect(canvas).not.toContainElement(button('Acercar'));
  });

  test('«Acercar» scales the ring and the person by √2 about the person at rest, not the hub (R33)', () => {
    renderScene();
    const ring = ringRadius();
    const head = personHead();
    const hub = document.querySelector('[data-hub]') as SVGCircleElement;
    const hubAt = () => ({ x: Number(hub.getAttribute('cx')), y: Number(hub.getAttribute('cy')) });
    // The middle of the person, on the floor under the hub: the point the buttons keep in place.
    const middle = () => ({
      x: hubAt().x,
      y: hubAt().y + ringRadius() - (personHeight(ring) * ringRadius()) / ring / 2,
    });
    const start = middle();

    for (let step = 1; step <= 3; step += 1) {
      zoomIn(1);
      expect(ringRadius()).toBeCloseTo(ring * ZOOM_STEP ** step, 6);
      expect(middle().x).toBeCloseTo(start.x, 6);
      expect(middle().y).toBeCloseTo(start.y, 6);
    }
    expect(personHead()).toBeCloseTo(head * ZOOM_STEP ** 3, 6);
    expect(hubAt().y).toBeLessThan(WIDTH / 2);
  });

  test('the scale bar is as long, in metres, as the ring radius says: its px over the ring px', () => {
    for (const r of [5, 223.6, 894.6, 4000]) {
      renderScene({ r });
      let steps = 0;
      for (const times of [0, 1, 2, 4, 6]) {
        zoomIn(times - steps);
        steps = times;
        const bar = scaleBar();

        // The floor radius is r metres long on screen, whatever the zoom.
        expect(bar.px / ringRadius(), `${bar.text} at r = ${r} after ${times} steps`).toBeCloseTo(
          bar.metres / r,
          6,
        );
        expect(bar.px).toBeGreaterThanOrEqual(SCALE_BAR_MIN_PX);
        expect(bar.px).toBeLessThanOrEqual(SCALE_BAR_MAX_PX + 1e-6);
      }
      cleanup();
    }
  });

  test('the bar says its length in words for screen readers', () => {
    renderScene();

    expect(screen.getByText(/^Barra de escala: /u)).toHaveTextContent(
      /^Barra de escala: \d+ (m|km)$/u,
    );
  });

  test('«Ajustar» goes back to the ring as the scene frames it', () => {
    renderScene();
    const ring = ringRadius();
    zoomIn(3);
    expect(ringRadius()).toBeGreaterThan(ring);

    fireEvent.click(button('Ajustar'));

    expect(ringRadius()).toBeCloseTo(ring, 6);
    expect(button('Ajustar')).toHaveAttribute('aria-disabled', 'true');
  });

  test('a new refit counter frames the ring again, the first value does not', () => {
    const { rerender } = renderScene({ refit: 3 });
    const ring = ringRadius();
    zoomIn(2);

    rerender(<HabitatScene {...PROPS} refit={4} />);

    expect(ringRadius()).toBeCloseTo(ring, 6);
  });

  test('a radius picked on the bar still reaches the lab, with the ring zoomed', () => {
    const onRadiusChange = vi.fn();
    renderScene({ onRadiusChange });
    zoomIn(3);

    fireEvent.keyDown(screen.getByTestId('radius-handle'), { key: 'Home' });

    expect(onRadiusChange).toHaveBeenCalledWith(5);
  });

  test('the ring is drawn from the view: a smaller radius at the same zoom is a smaller ring', () => {
    const { rerender } = renderScene({ r: 4000 });
    zoomIn(2);
    const large = ringRadius();

    rerender(<HabitatScene {...PROPS} r={50} />);

    expect(ringRadius()).toBeLessThan(large);
  });

  test('the largest ring leaves 72 px between its floor and the square, for the outward vector and the labels', () => {
    renderScene({ r: 4000 });

    // 400 px square: the floor of the largest ring is 200 − 72 = 128 px from the hub.
    expect(ringRadius()).toBeCloseTo(128, 6);
  });
});

describe('the habitat scene vectors', () => {
  beforeEach(() => {
    setSettings({ motion: 'reduced' });
    stubResizeObserver();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  /** The shaft of a vector: where it starts and how long it is, in screen px. */
  function shaft(name: 'ac' | 'gap') {
    const line = document.querySelector(`[data-vector="${name}"] line`) as SVGLineElement;
    const [x1, y1, y2] = ['x1', 'y1', 'y2'].map((key) => Number(line.getAttribute(key)));
    return { x: x1, length: Math.abs(y2 - y1) };
  }
  const hubX = () => Number((document.querySelector('[data-hub]') as Element).getAttribute('cx'));

  test('1 g is drawn 0,3 of the largest ring radius long, and a_c and g_ap sit 9 px to each side of the person', () => {
    renderScene({ r: 4000, gRatio: 1 });

    // The largest ring is 128 px, so 1 g is 38,4 px.
    expect(shaft('ac').length).toBeCloseTo(38.4, 6);
    expect(shaft('gap').length).toBeCloseTo(38.4, 6);
    expect(shaft('ac').x - hubX()).toBeCloseTo(9, 6);
    expect(hubX() - shaft('gap').x).toBeCloseTo(9, 6);
  });

  test('the vectors and their separation grow with the zoom', () => {
    renderScene({ r: 4000, gRatio: 1 });

    zoomIn(2);

    expect(shaft('ac').length).toBeCloseTo(38.4 * 2, 6);
    expect(shaft('ac').x - hubX()).toBeCloseTo(9 * 2, 6);
    expect(hubX() - shaft('gap').x).toBeCloseTo(9 * 2, 6);
  });

  test('a vector longer than 1,5 g is drawn at 1,5 g', () => {
    renderScene({ r: 4000, gRatio: 4.5 });

    expect(shaft('ac').length).toBeCloseTo(1.5 * 38.4, 6);
  });
});

describe('the habitat scene scale note', () => {
  beforeEach(() => {
    setSettings({ motion: 'reduced' });
    stubResizeObserver();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  const note = () => screen.getByTestId('habitat-note');

  test('says what is to scale and what is a symbol, in two short lines', () => {
    renderScene();

    const lines = [...note().querySelectorAll('text')].map((line) => line.textContent);
    expect(lines).toEqual(['radio a escala (ver barra)', 'persona y aro, simbólicos']);
  });

  test('sits on a plate of the surface that holds both lines, so the spokes never cross it', () => {
    renderScene();

    const plate = note().querySelector('[data-habitat-note-plate]');
    expect(plate).toHaveAttribute('fill', 'var(--bg-elevated)');
    expect(plate?.compareDocumentPosition(note().querySelector('text') as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    const top = Number(plate?.getAttribute('y'));
    const bottom = top + Number(plate?.getAttribute('height'));
    for (const line of note().querySelectorAll('text')) {
      const y = Number(line.getAttribute('y'));
      expect(y).toBeGreaterThan(top);
      expect(y).toBeLessThan(bottom);
    }
    // Wide enough for the longer line in 12 px mono (~7,2 px a glyph).
    expect(Number(plate?.getAttribute('width'))).toBeGreaterThan(26 * 7);
  });

  test('the accessible description says the same', () => {
    renderScene({ r: 894.6 });

    const description = (screen.getByRole('img').getAttribute('aria-label') ?? '').replace(
      /\s/gu,
      ' ',
    );
    expect(description).toContain('de radio 894,6 m');
    expect(description).toContain('con el radio a escala (la barra de escala lo mide)');
    expect(description).toContain('la persona y el aro simbólicos');
    expect(description).not.toContain('no a escala');
  });

  test('is painted after the ring, the turning parts and the hub, so the ring never covers it', () => {
    renderScene();

    const after = (earlier: Element) =>
      Boolean(earlier.compareDocumentPosition(note()) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(after(screen.getByTestId('habitat-ring'))).toBe(true);
    expect(after(document.querySelector('[data-spinning]') as Element)).toBe(true);
    expect(after(document.querySelector('[data-hub]') as Element)).toBe(true);
  });

  test('has a halo of the surface, drawn under the text, to read over the ring', () => {
    renderScene();

    for (const line of note().querySelectorAll('text')) {
      expect(line).toHaveAttribute('paint-order', 'stroke');
      expect(line.getAttribute('stroke')).toMatch(/--bg-elevated|surface/u);
      expect(Number(line.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(3);
    }
  });
});
