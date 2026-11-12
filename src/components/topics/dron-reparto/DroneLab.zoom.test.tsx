// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import DroneLab from './DroneLab';

/** The size every observed element reports: the svg's width and the plot area's, for the zoom. */
const SVG_WIDTH = 700;
const PLOT_HEIGHT = 300;
const LAB_READY_TIMEOUT_MS = 5_000;
const TEST_TIMEOUT_MS = LAB_READY_TIMEOUT_MS + 10_000;
/** Stop A's y (m): where the first leg ends. */
const A_Y = 200;

beforeAll(async () => {
  await import('../../../data/drone-route.json');
});

function stubObservers(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        const contentRect = { width: SVG_WIDTH, height: PLOT_HEIGHT };
        this.callback(
          [{ target, contentRect } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
}

async function renderLab() {
  const view = render(<DroneLab />);
  await screen.findByTestId('drone-lab', {}, { timeout: LAB_READY_TIMEOUT_MS });
  return view;
}

const button = (name: string) => screen.getByRole('button', { name });
const viewport = () => screen.getByRole('group', { name: 'Mapa de la ruta' });
/** The text of the scale bar as a screen reader gets it, spaces plain. */
const scaleBar = () =>
  (screen.getByText(/^Barra de escala:/).textContent ?? '').replace(/\s/g, ' ');
/** The numbers on the plot's axes, in drawing order: x ticks then y ticks. */
function axisNumbers(container: HTMLElement): number[] {
  const svg = container.querySelector('svg[role="img"]') as SVGSVGElement;
  return [...svg.querySelectorAll('text')]
    .map((text) => (text.textContent ?? '').replace(/[\s  ]/g, '').replace(',', '.'))
    .map((text) => Number(text.replace('−', '-')))
    .filter((value) => Number.isFinite(value));
}

describe('the route map zoom', { timeout: TEST_TIMEOUT_MS }, () => {
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
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('puts the map in a zoomable group with its buttons, the factor and a scale bar in metres', async () => {
    await renderLab();

    expect(viewport()).toHaveAttribute('aria-roledescription', 'lienzo con zoom');
    expect(within(viewport()).getByRole('button', { name: 'Acercar' })).toBeInTheDocument();
    expect(button('Alejar')).toBeInTheDocument();
    expect(button('Ajustar')).toBeInTheDocument();
    expect(scaleBar()).toBe('Barra de escala: 200 m');
  });

  test('leaves «1:1» out: the whole window is both the fit and the nominal scale', async () => {
    await renderLab();

    expect(screen.queryByRole('button', { name: /1:1/ })).toBeNull();
  });

  test('zooming in moves the axes to the metres on show and the scale bar to round metres', async () => {
    const { container } = await renderLab();
    const whole = axisNumbers(container);

    for (let step = 0; step < 4; step += 1) await userEvent.click(button('Acercar'));

    const zoomed = axisNumbers(container);
    expect(Math.max(...zoomed) - Math.min(...zoomed)).toBeLessThan(
      Math.max(...whole) - Math.min(...whole),
    );
    // Four steps of √2 are ×4: 1,47 px per metre, so 100 m measure 147 px.
    expect(scaleBar()).toBe('Barra de escala: 100 m');
  });

  test('«Ajustar» brings back the whole map window', async () => {
    const { container } = await renderLab();
    const whole = axisNumbers(container);
    await userEvent.click(button('Acercar'));
    await userEvent.click(button('Acercar'));

    await userEvent.click(button('Ajustar'));

    expect(axisNumbers(container)).toEqual(whole);
  });

  test('the keys + and 0 zoom the focused map in and fit it', async () => {
    const { container } = await renderLab();
    const whole = axisNumbers(container);

    act(() => viewport().focus());
    fireEvent.keyDown(viewport(), { key: '+' });
    fireEvent.keyDown(viewport(), { key: '+' });
    expect(axisNumbers(container)).not.toEqual(whole);
    fireEvent.keyDown(viewport(), { key: '0' });

    expect(axisNumbers(container)).toEqual(whole);
  });

  test('another view of the route, and «Restablecer», take the map back to its whole window', async () => {
    const { container } = await renderLab();
    const whole = axisNumbers(container);

    await userEvent.click(button('Acercar'));
    await userEvent.click(screen.getByRole('radio', { name: 'Ruta' }));
    await waitFor(() => expect(axisNumbers(container)).toEqual(whole));

    await userEvent.click(button('Acercar'));
    expect(axisNumbers(container)).not.toEqual(whole);
    await userEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
    await waitFor(() => expect(axisNumbers(container)).toEqual(whole));
  });

  test('a key that moves a stop out of the zoomed window brings it back into view', async () => {
    const { container } = await renderLab();
    for (let step = 0; step < 6; step += 1) await userEvent.click(button('Acercar'));
    const before = axisNumbers(container);
    // Stop C (300 m, 1 100 m) is far from the centre of the ×8 window.
    expect(Math.max(...before)).toBeLessThan(1_100);

    const stop = screen.getByTestId('stop-C');
    act(() => stop.focus());
    fireEvent.keyDown(stop, { key: 'ArrowRight' });

    await waitFor(() => expect(Math.max(...axisNumbers(container))).toBeGreaterThanOrEqual(1_000));
  });

  test('the drone marker keeps the map on it when a key seeks away', async () => {
    const { container } = await renderLab();
    for (let step = 0; step < 6; step += 1) await userEvent.click(button('Acercar'));

    const drone = screen.getByTestId('drone-marker');
    act(() => drone.focus());
    const before = axisNumbers(container);
    expect(Math.min(...before)).toBeGreaterThan(A_Y);
    fireEvent.keyDown(drone, { key: 'End' });

    // «Tramo» opens on the first leg: its end is stop A (600 m, 200 m), and the window moves to it.
    await waitFor(() => expect(Math.min(...axisNumbers(container))).toBeLessThanOrEqual(A_Y));
  });

  test('says the gestures in «Cómo se usa», after the drag of the stops', async () => {
    await renderLab();

    const usage = screen.getByText(/Acerca el mapa con los botones/);
    expect(usage.textContent).toContain('Ctrl y la rueda');
    expect(usage.textContent).toContain('+ y − acercan y alejan, 0 ajusta');
  });
});
