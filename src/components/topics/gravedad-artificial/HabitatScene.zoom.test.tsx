// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { createFrameStore } from '../../lab/frameStore';
import { SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX } from '../../lab/scaleBarMath';
import HabitatScene, { type HabitatSceneProps } from './HabitatScene';

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

  test('«Acercar» scales the ring and the person by √2 and keeps the hub at the centre', () => {
    renderScene();
    const ring = ringRadius();
    const head = personHead();

    zoomIn(1);

    expect(ringRadius()).toBeCloseTo(ring * ZOOM_STEP, 6);
    expect(personHead()).toBeCloseTo(head * ZOOM_STEP, 6);
    const hub = document.querySelector('[data-hub]') as SVGCircleElement;
    expect(Number(hub.getAttribute('cx'))).toBeCloseTo(WIDTH / 2, 6);
    expect(Number(hub.getAttribute('cy'))).toBeCloseTo(WIDTH / 2, 6);
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
});
