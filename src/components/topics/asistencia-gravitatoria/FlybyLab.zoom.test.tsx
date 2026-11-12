// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PLANETS } from '../../../lib/data/planets';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX } from '../../lab/scaleBarMath';
import FlybyLab from './FlybyLab';
import { ZOOM_STRIP_PX } from './planetZoom';

/** The widest frame (MAX_SIDE): the drawing's square, which is also the canvas the zoom measures. */
const WIDTH = 380;
const ZOOM_STEP = Math.SQRT2;
const PX_SLACK = 0.5;

/**
 * What jsdom cannot lay out: every element is a 380 px square, except a canvas that holds the
 * buttons' strip, which is that much taller. The strip belongs outside the canvas: inside it the
 * zoom would measure the square and the strip together.
 */
const canvasHeight = (element: Element) =>
  WIDTH + (element.querySelector('[data-zoom-controls]') ? ZOOM_STRIP_PX : 0);

function stubResizeObserver(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        const contentRect = { width: WIDTH, height: canvasHeight(target) };
        this.callback([{ target, contentRect } as ResizeObserverEntry], this as never);
      }
      unobserve() {}
      disconnect() {}
    },
  );
}

/**
 * jsdom has no layout: the canvas is at the page's origin and everything else sits well inside
 * it, so focusing the knob (a drag starts by focusing it) does not make the view reveal it.
 */
let isKnobAtEdge = false;
function stubRects(): void {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.hasAttribute('data-zoom-viewport')) return rect(0, 0, WIDTH, canvasHeight(this));
    // The knob 4 px from the left edge: the canvas' own reveal (16 px of margin) would pan for it.
    return this.getAttribute('data-testid') === 'periapsis-handle' && isKnobAtEdge
      ? rect(4, WIDTH / 2, 8, 8)
      : rect(WIDTH / 2, WIDTH / 2, 8, 8);
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
  const view = render(<FlybyLab leftOut="Nota." />);
  mockIdentityCtm();
  return view;
}

const frame = () => screen.getByTestId('flyby-planet-frame');
const handle = () => screen.getByTestId('periapsis-handle');
const button = (name: string) => screen.getByRole('button', { name });

function centre(testId: string): { x: number; y: number } {
  const circle = screen.getByTestId(testId) as unknown as SVGCircleElement;
  return { x: Number(circle.getAttribute('cx')), y: Number(circle.getAttribute('cy')) };
}

function knobCentre(): { x: number; y: number } {
  const knob = handle().querySelector('[data-knob]') as SVGCircleElement;
  return { x: Number(knob.getAttribute('cx')), y: Number(knob.getAttribute('cy')) };
}

const planetRadius = () => Number(screen.getByTestId('flyby-planet').getAttribute('r'));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** The scale bar drawn in the frame: its length in px, its value and the unit it is written in. */
function scaleBar() {
  const group = frame().querySelector('g[data-scale-bar]') as SVGGElement;
  const path = group.querySelector('path')?.getAttribute('d') ?? '';
  const [, left, right] = /^M([\d.-]+) [\d.-]+V[\d.-]+H([\d.-]+)V/u.exec(path) ?? [];
  const notation = group.querySelector('text')?.getAttribute('data-notation') ?? '';
  const [, digits, unit] = /^([\d\s,]+)\s(R_[A-Z]|km)$/u.exec(notation) ?? [];
  return {
    px: Number(right) - Number(left),
    value: Number(digits.replace(/\s/gu, '').replace(',', '.')),
    unit,
    notation,
  };
}

/** The bar's length in planet radii, whichever unit it is written in. */
const barRadii = (bar: ReturnType<typeof scaleBar>, radiusKm: number) =>
  bar.unit === 'km' ? bar.value / radiusKm : bar.value;

function zoomIn(times: number): void {
  for (let step = 0; step < times; step += 1) fireEvent.click(button('Acercar'));
}

function choosePreset(name: string): void {
  const select = screen.getByRole('combobox', { name: 'Valores de referencia' });
  const option = within(select).getByRole('option', { name });
  fireEvent.change(select, { target: { value: option.getAttribute('value') } });
}

describe('the planet frame zoom', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
    setSettings({ motion: 'reduced' });
    stubResizeObserver();
    isKnobAtEdge = false;
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

  test('the frame is a zoomable canvas with the shared buttons, «Ajustar» and no «1:1»', () => {
    renderLab();

    const canvas = screen.getByRole('group', { name: 'Marco de Júpiter' });
    expect(canvas).toHaveAttribute('aria-roledescription', 'lienzo con zoom');
    expect(canvas).toContainElement(frame());
    // The buttons are the canvas' sibling, in the same box: the zoom's canvas is the drawing's square.
    const zoom = screen.getByRole('group', { name: 'Zoom' });
    expect(canvas).not.toContainElement(zoom);
    expect(canvas.parentElement).toContainElement(zoom);
    for (const name of ['Acercar', 'Alejar', 'Ajustar']) {
      expect(within(zoom).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(within(zoom).queryByRole('button', { name: /1:1/u })).not.toBeInTheDocument();
    // At the lab's own framing «Alejar» and «Ajustar» have nothing to do.
    expect(button('Alejar')).toHaveAttribute('aria-disabled', 'true');
    expect(button('Ajustar')).toHaveAttribute('aria-disabled', 'true');
  });

  test('«Acercar» scales the planet by √2 about the centre and keeps the probe and the knob on the track', () => {
    renderLab();
    choosePreset('V2 · Neptuno');
    const before = { planet: planetRadius(), centre: centre('flyby-planet') };
    const probe = centre('flyby-probe');
    const knob = knobCentre();

    zoomIn(1);

    expect(planetRadius()).toBeCloseTo(before.planet * ZOOM_STEP, 6);
    // Every point maps through one view: distances from the planet grow by the same √2.
    const planet = centre('flyby-planet');
    expect(distance(centre('flyby-probe'), planet)).toBeCloseTo(
      distance(probe, before.centre) * ZOOM_STEP,
      1,
    );
    expect(distance(knobCentre(), planet)).toBeCloseTo(
      distance(knob, before.centre) * ZOOM_STEP,
      1,
    );
  });

  test('the scale bar is the true length of its value at every zoom (the planet is its own ruler)', () => {
    renderLab();
    choosePreset('V2 · Neptuno');
    const { radiusKm } = PLANETS.neptune;

    let steps = 0;
    for (const times of [0, 1, 2, 4, 6]) {
      zoomIn(times - steps);
      steps = times;
      const bar = scaleBar();

      // The planet's radius on screen is one R_N long, so the bar is `value` of them.
      expect(bar.px / planetRadius(), `${bar.notation} after ${times} steps`).toBeCloseTo(
        barRadii(bar, radiusKm),
        4,
      );
      expect(bar.px).toBeGreaterThanOrEqual(SCALE_BAR_MIN_PX);
      expect(bar.px).toBeLessThanOrEqual(SCALE_BAR_MAX_PX + 1e-6);
    }
  });

  test('the bar says its length in words for screen readers, in the unit it is written in', () => {
    renderLab();
    const spoken = () => screen.getByText(/^Barra de escala: /u);

    expect(scaleBar().unit).toBe('R_J');
    expect(spoken()).toHaveTextContent(/^Barra de escala: \d+ R sub J$/u);

    zoomIn(6);

    expect(scaleBar().unit).toBe('R_J');
    expect(spoken()).toHaveTextContent(/^Barra de escala: \d+ R sub J$/u);
  });

  test("«Ajustar» goes back to the encounter's own framing", () => {
    renderLab();
    const start = { planet: centre('flyby-planet'), radius: planetRadius() };
    zoomIn(2);
    expect(button('Ajustar')).not.toHaveAttribute('aria-disabled');

    fireEvent.click(button('Ajustar'));

    expect(centre('flyby-planet')).toEqual(start.planet);
    expect(planetRadius()).toBeCloseTo(start.radius, 6);
    expect(button('Ajustar')).toHaveAttribute('aria-disabled', 'true');
  });

  test('dragging the knob at ×2 puts it where the pointer is: r_p is read in the drawing, not on screen', () => {
    renderLab();
    zoomIn(2);
    const planet = centre('flyby-planet');
    const knob = knobCentre();
    const target = {
      x: planet.x + (knob.x - planet.x) * 1.4,
      y: planet.y + (knob.y - planet.y) * 1.4,
    };

    fireEvent.pointerDown(handle(), { pointerId: 1, clientX: knob.x, clientY: knob.y });
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: target.x, clientY: target.y });

    // The planet is held while dragging; the knob is as far from it as the pointer is.
    expect(centre('flyby-planet')).toEqual(planet);
    expect(Math.abs(distance(knobCentre(), planet) - distance(target, planet))).toBeLessThan(
      PX_SLACK,
    );
    fireEvent.pointerUp(handle(), { pointerId: 1, clientX: target.x, clientY: target.y });
    expect(Number(handle().getAttribute('aria-valuenow'))).toBeGreaterThan(10.09);
  });

  test('the knob keeps its keys when the drawing is zoomed', () => {
    renderLab();
    zoomIn(2);

    fireEvent.keyDown(handle(), { key: 'End' });

    expect(handle()).toHaveAttribute('aria-valuenow', '100');
    expect(button('Ajustar')).not.toHaveAttribute('aria-disabled');
  });

  test('a key that moves the knob out of the view brings it back, clear of the corner texts', () => {
    renderLab();
    zoomIn(6);
    // At ×8 about the centre the knob (45 px from the planet at ×1) is far off the panel.
    expect(knobCentre().x).toBeLessThan(0);

    fireEvent.keyDown(handle(), { key: 'Home' });

    const at = knobCentre();
    // The 11 px of its ring, the 30 px band of the corner texts and the view's 16 px of margin.
    const margin = 11 + 30 + 16;
    expect(at.x).toBeGreaterThanOrEqual(margin);
    expect(at.x).toBeLessThanOrEqual(WIDTH - margin);
    expect(at.y).toBeGreaterThanOrEqual(margin);
    expect(at.y).toBeLessThanOrEqual(WIDTH - margin);
  });

  test('focusing the knob at the edge of the view does not pan it: a press to drag it keeps the view', () => {
    renderLab();
    zoomIn(4);
    isKnobAtEdge = true;
    const before = centre('flyby-planet');

    fireEvent.focus(handle());

    expect(centre('flyby-planet')).toEqual(before);
  });

  test('the planet is «agrandado» only while its true size is under 4 px on screen', () => {
    renderLab();
    fireEvent.keyDown(handle(), { key: 'End' });
    const note = () => within(frame()).queryByText('planeta agrandado');
    expect(note()).toBeInTheDocument();
    expect(planetRadius()).toBe(4);

    zoomIn(6);

    expect(note()).not.toBeInTheDocument();
    expect(planetRadius()).toBeGreaterThan(4);
  });

  test('a vector label whose arrow has left the panel is not drawn at its edge', () => {
    renderLab();
    const labels = () => frame().querySelectorAll('[data-vector^="vinf"] text');
    const before = labels().length;
    expect(before).toBeGreaterThan(0);

    zoomIn(6);

    expect(labels().length).toBeLessThan(before);
    for (const label of labels()) {
      const x = Number(label.getAttribute('x'));
      const y = Number(label.getAttribute('y'));
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(WIDTH);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(WIDTH);
    }
  });

  test('a new encounter frames the drawing again, and so does «Restablecer»', () => {
    renderLab();
    zoomIn(3);
    expect(button('Ajustar')).not.toHaveAttribute('aria-disabled');

    choosePreset('V2 · Saturno');
    expect(button('Ajustar')).toHaveAttribute('aria-disabled', 'true');

    zoomIn(3);
    expect(button('Ajustar')).not.toHaveAttribute('aria-disabled');
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
    expect(button('Ajustar')).toHaveAttribute('aria-disabled', 'true');
  });

  test('«Cómo se usa» says how the frame zooms', () => {
    const { container } = renderLab();

    const usage = container.querySelector('[data-lab-note="usage"]');
    expect(usage).toHaveTextContent(/marco del planeta/iu);
    expect(usage).toHaveTextContent(/Ctrl/u);
  });
});
