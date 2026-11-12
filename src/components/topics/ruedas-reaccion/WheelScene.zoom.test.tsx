// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX } from '../../lab/scaleBarMath';
import WheelLab from './WheelLab';
import { BODY_FOOTPRINT, DEG } from './wheelScene';
import { KNOB_REVEAL_RADIUS, ZOOM_ROW_PX } from './wheelZoom';

/** The widest scene (MAX_SIDE): every observed element is 400 px wide, the zoom's canvas 400 tall. */
const SIDE = 400;
const ZOOM_STEP = Math.SQRT2;
const CM_PER_M = 100;
const SLACK = 1e-6;

function stubResizeObserver(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        const contentRect = { width: SIDE, height: SIDE };
        this.callback([{ target, contentRect } as ResizeObserverEntry], this as never);
      }
      unobserve() {}
      disconnect() {}
    },
  );
}

/**
 * jsdom has no layout: the canvas fills the square at the page's origin and everything else sits
 * well inside it, so focusing the knob does not make the view reveal it by itself.
 */
function stubRects(): void {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return this.hasAttribute('data-zoom-viewport')
      ? rect(0, 0, SIDE, SIDE)
      : rect(SIDE / 2, SIDE / 2, 8, 8);
  });
}

function mockIdentityCtm(): void {
  for (const svg of document.querySelectorAll('svg')) {
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
    });
  }
}

function renderLab() {
  const view = render(<WheelLab leftOut="Nota." />);
  mockIdentityCtm();
  return view;
}

type Point = { x: number; y: number };

const scene = () => screen.getByTestId('wheel-scene');
const handle = () => screen.getByTestId('target-handle');
const button = (name: string) => screen.getByRole('button', { name });
const zoomIn = (times: number) => {
  for (let step = 0; step < times; step += 1) fireEvent.click(button('Acercar'));
};

const dialCentre = (): Point => {
  const dial = screen.getByTestId('wheel-dial');
  return { x: Number(dial.dataset.cx), y: Number(dial.dataset.cy) };
};
const dialRadius = () => Number(scene().querySelector('[data-dial]')?.getAttribute('r'));
const knob = () => handle().querySelector('[data-knob]') as SVGCircleElement;
const knobCentre = (): Point => ({
  x: Number(knob().getAttribute('cx')),
  y: Number(knob().getAttribute('cy')),
});

/** The live body's first two corners (front-left, back-left): its long side, in px. */
function bodyLongPx(): number {
  const polygon = scene().querySelector('[data-body="live"] polygon') as SVGPolygonElement;
  const [front, back] = (polygon.getAttribute('points') ?? '')
    .trim()
    .split(/\s+/u)
    .map((pair) => pair.split(',').map(Number));
  return Math.hypot(front[0] - back[0], front[1] - back[1]);
}

/** The scale bar in the strip: its length in px, its value in cm and its text. */
function scaleBar() {
  const root = document.querySelector('[data-scale-bar]') as HTMLElement;
  const line = root.querySelector('[data-scale-bar-line]') as HTMLElement;
  const text = (root.textContent ?? '').replace(/\s/gu, ' ');
  return {
    px: parseFloat(line.style.width),
    value: Number(text.replace(' cm', '').replace(',', '.')),
    text,
  };
}

describe('the wheel scene zoom', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
    setSettings({ motion: 'reduced' });
    stubResizeObserver();
    stubRects();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('the scene is a zoomable canvas with the shared buttons, «Ajustar» and no «1:1»', () => {
    renderLab();

    const canvas = screen.getByRole('group', { name: 'Escena de la nave y la rueda' });
    expect(canvas).toHaveAttribute('aria-roledescription', 'lienzo con zoom');
    expect(canvas).toContainElement(scene());
    const zoom = screen.getByRole('group', { name: 'Zoom' });
    for (const name of ['Acercar', 'Alejar', 'Ajustar']) {
      expect(within(zoom).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(within(zoom).queryByRole('button', { name: /1:1/u })).not.toBeInTheDocument();
    expect(button('Alejar')).toHaveAttribute('aria-disabled', 'true');
    expect(button('Ajustar')).toHaveAttribute('aria-disabled', 'true');
  });

  test('at the lab framing nothing moves: the dial is centred and the bar says 20 cm', () => {
    renderLab();

    expect(dialCentre()).toEqual({ x: SIDE / 2, y: SIDE / 2 });
    expect(dialRadius()).toBe(SIDE / 2 - 34);
    expect(scaleBar().text).toBe('20 cm');
  });

  test('«Acercar» grows the dial, the body and the wheel by √2 about the centre', () => {
    renderLab();
    const before = { dial: dialRadius(), body: bodyLongPx() };
    const wheel = () => Number(scene().querySelector('[data-wheel] circle')?.getAttribute('r'));
    const wheelBefore = wheel();

    zoomIn(1);

    expect(dialRadius()).toBeCloseTo(before.dial * ZOOM_STEP, 6);
    expect(bodyLongPx()).toBeCloseTo(before.body * ZOOM_STEP, 1);
    expect(wheel()).toBeCloseTo(wheelBefore * ZOOM_STEP, 6);
    expect(dialCentre().x).toBeCloseTo(SIDE / 2, 6);
  });

  test('the strokes and the knob keep their size: only the geometry follows the view', () => {
    renderLab();
    const strokes = () =>
      [...scene().querySelectorAll('polygon, circle[fill="none"]')].map((node) =>
        node.getAttribute('stroke-width'),
      );
    const before = { strokes: strokes(), knob: knob().getAttribute('r') };

    zoomIn(4);

    expect(strokes()).toEqual(before.strokes);
    expect(knob().getAttribute('r')).toBe(before.knob);
  });

  test('the bar is the body’s own length: its px over the body’s px is its cm over 36,6 cm, at every zoom', () => {
    renderLab();
    const bodyCm = BODY_FOOTPRINT.long * CM_PER_M;

    let steps = 0;
    for (const times of [0, 1, 2, 3, 4, 6]) {
      zoomIn(times - steps);
      steps = times;
      const bar = scaleBar();

      expect(bar.px / bodyLongPx(), `${bar.text} after ${times} steps`).toBeCloseTo(
        bar.value / bodyCm,
        4,
      );
      expect(bar.px).toBeGreaterThanOrEqual(SCALE_BAR_MIN_PX);
      expect(bar.px).toBeLessThanOrEqual(SCALE_BAR_MAX_PX + SLACK);
    }
  });

  test('the bar reads 2 cm at ×8 and says it in words for screen readers', () => {
    renderLab();

    zoomIn(6);

    expect(scaleBar().text).toBe('2 cm');
    expect(screen.getByText(/^Barra de escala: /u)).toHaveTextContent('Barra de escala: 2 cm');
  });

  test('«Ajustar» goes back to the lab framing', () => {
    renderLab();
    const start = { centre: dialCentre(), dial: dialRadius() };
    zoomIn(3);

    fireEvent.click(button('Ajustar'));

    expect(dialCentre()).toEqual(start.centre);
    expect(dialRadius()).toBeCloseTo(start.dial, 6);
  });

  test('«Restablecer» frames the scene again and keeps nothing of the zoom', () => {
    renderLab();
    zoomIn(3);
    expect(dialRadius()).toBeGreaterThan(SIDE);

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(dialRadius()).toBeCloseTo(SIDE / 2 - 34, 6);
  });

  test('dragging the knob at ×2 reads the angle about the dial’s centre on screen', () => {
    renderLab();
    zoomIn(2);
    const c = dialCentre();
    const start = knobCentre();

    fireEvent.pointerDown(handle(), { pointerId: 1, clientX: start.x, clientY: start.y });
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: c.x + 60, clientY: c.y - 60 });
    fireEvent.pointerUp(handle(), { pointerId: 1, clientX: c.x + 60, clientY: c.y - 60 });

    expect(handle()).toHaveAttribute('aria-valuenow', '45');
  });

  test('a key that takes the knob out of the view brings it back, clear of the corner texts', () => {
    renderLab();
    zoomIn(6);
    handle().focus();
    const band = (point: Point) => Math.min(point.x, point.y, SIDE - point.x, SIDE - point.y);

    fireEvent.keyDown(handle(), { key: 'End' });

    expect(handle()).toHaveAttribute('aria-valuenow', '180');
    expect(band(knobCentre())).toBeGreaterThanOrEqual(KNOB_REVEAL_RADIUS - 1);
  });

  test('the knob’s angle is still the pointer’s: the dial’s centre moves with the pan', () => {
    renderLab();
    zoomIn(2);
    const before = dialCentre();

    fireEvent.keyDown(screen.getByRole('group', { name: 'Escena de la nave y la rueda' }), {
      key: 'ArrowLeft',
    });

    expect(dialCentre().x).not.toBe(before.x);
    const c = dialCentre();
    expect(Math.atan2(c.y - knobCentre().y, knobCentre().x - c.x) / DEG).toBeCloseTo(90, 5);
  });

  test('the bar and the buttons sit in two rows of fixed height under the square', () => {
    renderLab();

    const strip = document.querySelector('[data-wheel-zoom-strip]') as HTMLElement;
    const heights = [...strip.children].map((row) => (row as HTMLElement).style.height);
    expect(heights).toEqual([`${ZOOM_ROW_PX}px`, `${ZOOM_ROW_PX}px`]);
    expect(strip.previousElementSibling).toContainElement(scene());
    expect(strip.previousElementSibling).not.toContainElement(strip);
  });

  test('in the disturbance the field lines follow the dial out of the view, and B goes with the first one in', () => {
    renderLab();
    fireEvent.click(screen.getByRole('radio', { name: 'Perturbación y descarga' }));
    const arrows = () => scene().querySelectorAll('[data-field="B"] > g, [data-field="B"] > line');
    const label = () => scene().querySelector('[data-field="B"] text');
    expect(label()).not.toBeNull();
    const before = arrows().length;

    zoomIn(6);

    expect(arrows().length).toBeLessThan(before);
  });
});
