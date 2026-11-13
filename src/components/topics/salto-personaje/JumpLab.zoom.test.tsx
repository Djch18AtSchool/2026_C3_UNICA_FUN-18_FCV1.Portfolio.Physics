// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { mathSourceText } from '../../../test-inline-math';
import { readout } from '../../../test-readout';
import JumpLab from './JumpLab';
import { ZOOM_STRIP_PX } from './jumpZoom';

/**
 * The plot reports the width it is laid out in (the wide layout); the zoom viewport, the plot area
 * the plot draws, as a browser's ResizeObserver does once the layout has settled: read from the
 * clip rect, at the start and whenever the test calls `reportPlotSize` (the plot's height changes
 * with the jump's shape, and the observer says so a render later).
 */
const SVG_WIDTH = 520;
const PLOT_AREA = { width: 408, height: 204 };
const STEPS_TO_X4 = 4;
const STEPS_TO_LIMIT = 6;
const PX_SLACK = 0.01;
const KEY_PRESSES = 24;

type FakeObserver = { callback: ResizeObserverCallback; targets: Element[] };
let observers: FakeObserver[] = [];

/** The plot area the plot draws now, from its clip rect. */
function drawnPlotArea(): { width: number; height: number } {
  const rect = document.querySelector('[data-testid="jump-plot"] svg[role="img"] clipPath rect');
  return rect
    ? { width: Number(rect.getAttribute('width')), height: Number(rect.getAttribute('height')) }
    : PLOT_AREA;
}

function entryFor(target: Element): ResizeObserverEntry {
  const contentRect = target.hasAttribute('data-zoom-viewport')
    ? drawnPlotArea()
    : { width: SVG_WIDTH, height: PLOT_AREA.height };
  return { target, contentRect } as unknown as ResizeObserverEntry;
}

/** What the browser does a frame after the plot changed size: every observer reports. */
function reportPlotSize(): void {
  act(() =>
    observers.forEach((observer) =>
      observer.callback(observer.targets.map(entryFor), observer as unknown as ResizeObserver),
    ),
  );
}

function stubObservers(): void {
  observers = [];
  vi.stubGlobal(
    'ResizeObserver',
    class implements FakeObserver {
      targets: Element[] = [];
      constructor(readonly callback: ResizeObserverCallback) {
        observers.push(this);
      }
      observe(target: Element) {
        this.targets.push(target);
        this.callback([entryFor(target)], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {
        observers = observers.filter((observer) => observer !== (this as FakeObserver));
      }
    },
  );
}

/** Identity CTM on every svg: client pixels are viewBox units, so DOM coordinates are pointer ones. */
function mockIdentityCtm(container: HTMLElement): void {
  for (const svg of container.querySelectorAll('svg')) {
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
    });
  }
}

function renderLab() {
  const view = render(<JumpLab />);
  mockIdentityCtm(view.container);
  // The first report came with the server's 720 px layout; the browser reports again once measured.
  reportPlotSize();
  return view;
}

const button = (name: string) => screen.getByRole('button', { name });
const viewport = () => screen.getByRole('group', { name: 'Trayectoria del salto' });
const factor = () => (document.querySelector('[data-zoom-factor]')?.textContent ?? '').trim();
/** The text of the scale bar as a screen reader gets it, spaces plain. */
const scaleBar = () =>
  (screen.getByText(/^Barra de escala:/).textContent ?? '').replace(/\s/g, ' ');
const knob = (testId: string) =>
  screen.getByTestId(testId).querySelector('[data-knob]') as SVGCircleElement;
const centre = (testId: string) => ({
  x: Number(knob(testId).getAttribute('cx')),
  y: Number(knob(testId).getAttribute('cy')),
});
/** The marker's group is translated to the body; its knob sits at the group's origin. */
function markerAt(): { x: number; y: number } {
  const group = screen.getByTestId('jump-marker').querySelector('g[transform]');
  const [x, y] = (
    /translate\(([-\d.]+) ([-\d.]+)\)/.exec(group?.getAttribute('transform') ?? '') ?? []
  )
    .slice(1)
    .map(Number);
  return { x, y };
}
/** Pixels from the launch point (the marker at t = 0) to the launch vector's tip. */
const vectorLength = () => {
  const tip = centre('launch-handle');
  const origin = markerAt();
  return Math.hypot(tip.x - origin.x, tip.y - origin.y);
};
/** The numbers on the plot's axes: x ticks then y ticks, in drawing order. */
function axisNumbers(container: HTMLElement): number[] {
  const svg = container.querySelector('[data-testid="jump-plot"] svg[role="img"]') as SVGSVGElement;
  return [...svg.querySelectorAll('text')]
    .map((text) => (text.textContent ?? '').replace(/[\s  ]/g, '').replace(',', '.'))
    .map((text) => Number(text.replace('−', '-')))
    .filter((value) => Number.isFinite(value));
}
/** The plot area as the clip rect gives it, in viewBox px. */
function plotArea(container: HTMLElement) {
  const rect = container.querySelector(
    '[data-testid="jump-plot"] svg[role="img"] clipPath rect',
  ) as SVGRectElement;
  const [x, y, width, height] = ['x', 'y', 'width', 'height'].map((name) =>
    Number(rect.getAttribute(name)),
  );
  return { x, y, width, height };
}

/** Focuses `element` inside a press, so the canvas reveals nothing for the focus (R30). */
function focusByPress(element: HTMLElement | SVGElement): void {
  fireEvent.mouseDown(element);
  act(() => element.focus());
  fireEvent.mouseUp(element);
}

/** Arrow presses on the focused canvas that carry a ×8 view away from the launch point. */
const PAN_AWAY_PRESSES = 6;

/** Pans the zoomed plot to the right, as ArrowRight on the focused canvas does (48 px each). */
function panRight(presses: number): void {
  act(() => viewport().focus());
  for (let press = 0; press < presses; press += 1) {
    fireEvent.keyDown(viewport(), { key: 'ArrowRight' });
  }
}

async function zoomIn(steps: number): Promise<void> {
  for (let i = 0; i < steps; i += 1) await userEvent.click(button('Acercar'));
}

describe('the trajectory zoom', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
    stubObservers();
    // Buttons and keys glide; under reduced motion they jump, so a test reads the end at once.
    setSettings({ motion: 'reduced' });
  });
  afterEach(() => {
    cleanup();
    uninstall();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('puts the plot in a zoomable group, its buttons under it, the factor and a scale bar in metres', () => {
    renderLab();

    expect(viewport()).toHaveAttribute('aria-roledescription', 'lienzo con zoom');
    expect(button('Acercar')).toBeInTheDocument();
    expect(button('Alejar')).toBeInTheDocument();
    expect(button('Ajustar')).toBeInTheDocument();
    expect(factor()).toBe('×1');
    expect(scaleBar()).toMatch(/^Barra de escala: \d[\d,]* m$/);
    // The buttons are not over the plot: the viewport (the plot area) does not contain them.
    expect(within(viewport()).queryByRole('button', { name: 'Acercar' })).toBeNull();
  });

  test('keeps the buttons in a strip of fixed height under the plot', () => {
    renderLab();

    const strip = button('Acercar').closest('[data-zoom-strip]') as HTMLElement;
    expect(strip.style.height).toBe(`${ZOOM_STRIP_PX}px`);
  });

  test('leaves «1:1» out: the whole jump is both the fit and the nominal scale', () => {
    renderLab();

    expect(screen.queryByRole('button', { name: /1:1/ })).toBeNull();
  });

  test('zooming in narrows the axes to the metres on show and the scale bar to a shorter round length', async () => {
    const { container } = renderLab();
    const whole = axisNumbers(container);
    const metres = (text: string) => Number(/(\d[\d,]*) m$/.exec(text)?.[1].replace(',', '.'));
    const wholeBar = metres(scaleBar());

    await zoomIn(STEPS_TO_X4);

    const zoomed = axisNumbers(container);
    expect(Math.max(...zoomed) - Math.min(...zoomed)).toBeLessThan(
      Math.max(...whole) - Math.min(...whole),
    );
    expect(factor()).toBe('×4');
    expect(metres(scaleBar())).toBeLessThan(wholeBar);
  });

  test('«Ajustar» brings back the whole window', async () => {
    const { container } = renderLab();
    const whole = axisNumbers(container);
    await zoomIn(2);

    await userEvent.click(button('Ajustar'));

    expect(axisNumbers(container)).toEqual(whole);
  });

  test('the keys + and 0 zoom the focused plot in and fit it', () => {
    const { container } = renderLab();
    const whole = axisNumbers(container);

    act(() => viewport().focus());
    fireEvent.keyDown(viewport(), { key: '+' });
    fireEvent.keyDown(viewport(), { key: '+' });
    expect(axisNumbers(container)).not.toEqual(whole);
    fireEvent.keyDown(viewport(), { key: '0' });

    expect(axisNumbers(container)).toEqual(whole);
  });

  test('the launch vector keeps its length on screen at any zoom', async () => {
    renderLab();
    const whole = vectorLength();
    expect(whole).toBeGreaterThan(0);

    await zoomIn(STEPS_TO_X4);
    expect(Math.abs(vectorLength() - whole)).toBeLessThan(PX_SLACK);

    await zoomIn(STEPS_TO_LIMIT - STEPS_TO_X4);
    expect(Math.abs(vectorLength() - whole)).toBeLessThan(PX_SLACK);
  });

  test('a drag of the handle means the same change in v0 at ×4 as at ×1', async () => {
    renderLab();
    const dragUp = (px: number) => {
      const handle = screen.getByTestId('launch-handle');
      const start = centre('launch-handle');
      fireEvent.pointerDown(handle, { pointerId: 1, clientX: start.x, clientY: start.y });
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: start.x, clientY: start.y - px });
      fireEvent.pointerUp(handle, { pointerId: 1, clientX: start.x, clientY: start.y - px });
    };
    const v0 = () =>
      Number((screen.getByRole('slider', { name: /Impulso de salto/ }) as HTMLInputElement).value);
    const start = v0();
    dragUp(20);
    const atOne = v0() - start;
    await userEvent.click(button('Restablecer'));
    await zoomIn(STEPS_TO_X4);

    dragUp(20);

    expect(atOne).toBeGreaterThan(0);
    expect(v0() - start).toBeCloseTo(atOne, 1);
  });

  test('a key that moves the launch handle out of the zoomed window brings it back into view', async () => {
    const { container } = renderLab();
    await zoomIn(STEPS_TO_LIMIT);
    panRight(PAN_AWAY_PRESSES);
    const area = plotArea(container);
    const isInside = ({ x, y }: { x: number; y: number }) =>
      x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height;
    // Panned to the right of the launch point (the buttons zoom about it, R33), the tip is outside.
    expect(isInside(centre('launch-handle'))).toBe(false);

    const handle = screen.getByTestId('launch-handle');
    focusByPress(handle);
    fireEvent.keyDown(handle, { key: 'ArrowUp' });

    expect(isInside(centre('launch-handle'))).toBe(true);
  });

  test.each(['Tierra', 'Luna'])(
    '%s at ×4: 24 ↑ and 24 ↓ leave the launch handle in view once the plot has settled, after each key',
    async (world) => {
      const { container } = renderLab();
      await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${world}`) }));
      reportPlotSize();
      await zoomIn(STEPS_TO_X4);
      const handle = screen.getByTestId('launch-handle');
      focusByPress(handle);

      for (const key of ['ArrowUp', 'ArrowDown']) {
        for (let i = 0; i < KEY_PRESSES; i += 1) {
          fireEvent.keyDown(handle, { key });
          reportPlotSize();
          const area = plotArea(container);
          const { x, y } = centre('launch-handle');
          const isInside =
            x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height;
          expect(isInside, `${world}: ${key} ${i + 1}`).toBe(true);
        }
      }
    },
  );

  test('a key that seeks the marker out of the zoomed window brings it back into view', async () => {
    const { container } = renderLab();
    await zoomIn(STEPS_TO_LIMIT);
    // About the launch point (R33) the marker, at the start, stays in view: pan away from it.
    panRight(PAN_AWAY_PRESSES);
    const area = plotArea(container);
    const isInside = ({ x, y }: { x: number; y: number }) =>
      x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height;
    expect(isInside(markerAt())).toBe(false);

    const marker = screen.getByTestId('jump-marker');
    focusByPress(marker);
    fireEvent.keyDown(marker, { key: 'End' });

    expect(isInside(markerAt())).toBe(true);
  });

  test('a preset, and «Restablecer», frame the new jump whole', async () => {
    renderLab();
    await zoomIn(STEPS_TO_X4);
    expect(factor()).toBe('×4');

    await userEvent.click(screen.getByRole('button', { name: /^Luna/ }));
    expect(factor()).toBe('×1');

    await zoomIn(2);
    await userEvent.click(button('Restablecer'));
    expect(factor()).toBe('×1');
    expect(readout('Altura máxima')).toBe('0,76 m');
  });

  test('a slider changes the jump and keeps the zoom', async () => {
    renderLab();
    await zoomIn(STEPS_TO_X4);

    fireEvent.change(screen.getByRole('slider', { name: /Gravedad g/ }), {
      target: { value: '60' },
    });

    expect(factor()).toBe('×4');
  });

  test('says the gestures in «Cómo se usa», after the drag of the handles', () => {
    const { container } = renderLab();

    const usage = container.querySelector('details[data-lab-note="usage"]') as HTMLElement;
    const hint = mathSourceText(usage).replace(/\s/g, ' ');
    expect(hint).toContain('Acerca la gráfica con los botones, Ctrl y la rueda, o pellizcando');
    expect(hint).toContain('+ y − acercan y alejan, 0 ajusta');
    expect(hint).toContain('Las flechas de $\\vec v_0$ y $\\vec v$ no crecen al acercar');
    // One «con» in the first sentence, and the canvas is «enfocada desde el teclado».
    expect(hint).not.toContain('con el teclado');
    expect(hint.indexOf('Acerca la gráfica')).toBeGreaterThan(hint.indexOf('Inicio y Fin'));
  });
});
