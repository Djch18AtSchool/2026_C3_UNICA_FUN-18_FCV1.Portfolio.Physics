// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import DroneLab from './DroneLab';

const FOOTNOTE = 'Mi dron se detiene en cada vértice y no hay viento.';

/** Identity CTM on every svg: client pixels are viewBox units, so DOM coordinates are pointer ones. */
function mockIdentityCtm(): void {
  for (const svg of document.querySelectorAll('svg')) {
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
    });
  }
}

/** Renders the lab and waits for the lazily loaded declared route. */
async function renderLab() {
  const view = render(<DroneLab footnote={FOOTNOTE} />);
  await screen.findByTestId('drone-lab');
  mockIdentityCtm();
  return view;
}

/** The value text of a LabShell readout row, normalised to plain spaces. */
function readout(label: string): string {
  const row = screen.getByText(label, { selector: 'span' }).parentElement as HTMLElement;
  return (row.lastElementChild?.textContent ?? '').replace(/\s/g, ' ');
}

function knobCentre(testId: string): { x: number; y: number } {
  const knob = screen.getByTestId(testId).querySelector('[data-knob]') as SVGCircleElement;
  return { x: Number(knob.getAttribute('cx')), y: Number(knob.getAttribute('cy')) };
}

function dragTo(testId: string, to: { x: number; y: number }): void {
  const handle = screen.getByTestId(testId);
  const start = knobCentre(testId);
  fireEvent.pointerDown(handle, { pointerId: 1, clientX: start.x, clientY: start.y });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(handle, { pointerId: 1, clientX: to.x, clientY: to.y });
}

function dragBy(testId: string, dx: number, dy: number): void {
  const start = knobCentre(testId);
  dragTo(testId, { x: start.x + dx, y: start.y + dy });
}

/** aria-valuetext with every space (formatNumber uses no-break ones) as a plain space. */
const valueText = (element: Element) =>
  (element.getAttribute('aria-valuetext') ?? '').replace(/\s/g, ' ');

const DECLARED_DURATION = '387,43 s';
const modifiedNote = () => screen.queryByTestId('route-modified');
const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });

describe('DroneLab', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('announces the loading state, then opens on the declared route cruising on leg 1', async () => {
    render(<DroneLab footnote={FOOTNOTE} />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando los datos de la ruta…');

    await screen.findByTestId('drone-lab');

    expect(readout('Duración de la ruta')).toBe(DECLARED_DURATION);
    expect(valueText(timeline())).toBe('t = 30,000 s');
    expect(screen.getByText(/crucero \(a = 0\)/)).toBeInTheDocument();
    expect(readout('Rapidez |v|')).toBe('10,00 m/s');
    expect(modifiedNote()).toBeNull();
    expect(screen.getByTestId('lab-footnote')).toHaveTextContent(FOOTNOTE);
    expect(screen.getByTestId('drone-profiles')).toBeInTheDocument();
  });

  test('at t ≈ 65 s the drone brakes into A: |a| = 2,5 m/s² opposite to v', async () => {
    await renderLab();

    // The timeline runs 0–1000 over the route's 387,43 s: 168 is t ≈ 65,09 s.
    fireEvent.change(timeline(), { target: { value: '168' } });

    expect(valueText(timeline())).toMatch(/^t = 65,\d{3} s$/);
    expect(screen.getByText(/frenando \(a opuesta a v\)/)).toBeInTheDocument();
    expect(readout('Aceleración |a|')).toBe('2,50 m/s²');
  });

  test('the drone marker is drawn after the stops, so it stays on top where they meet', async () => {
    await renderLab();
    const drone = screen.getByTestId('drone-marker');

    for (const stop of ['stop-A', 'stop-B', 'stop-C']) {
      const position = screen.getByTestId(stop).compareDocumentPosition(drone);
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING, stop).toBeTruthy();
    }
  });

  test('the legend states the scale of both vectors', async () => {
    await renderLab();

    const legend = screen.getByRole('list', { name: 'Leyenda del mapa' });
    expect(legend).toHaveTextContent('Velocidad v: 1 m/s = 15 m');
    expect(legend).toHaveTextContent('Aceleración a: 1 m/s² = 60 m');
  });

  test('dragging stop A marks the route as modified and changes its duration; Restablecer undoes it', async () => {
    const user = userEvent.setup();
    await renderLab();

    dragBy('stop-A', 60, -40);

    expect(modifiedNote()).toHaveTextContent('Ruta modificada');
    expect(readout('Duración de la ruta')).not.toBe(DECLARED_DURATION);

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(modifiedNote()).toBeNull();
    expect(readout('Duración de la ruta')).toBe(DECLARED_DURATION);
  });

  test('a stop moves 10 m per arrow key and 100 m with Shift', async () => {
    const user = userEvent.setup();
    await renderLab();
    const stopB = screen.getByTestId('stop-B');
    stopB.focus();

    await user.keyboard('{ArrowRight}{Shift>}{ArrowUp}{/Shift}');

    expect(valueText(stopB)).toBe('x = 910 m, y = 900 m');
    expect(modifiedNote()).toBeInTheDocument();
  });

  test('moving a stop with the arrow keys pauses playback, like a drag', async () => {
    const user = userEvent.setup();
    await renderLab();
    await user.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(screen.getByTestId('drone-lab')).toHaveAttribute('data-playing', 'true');

    screen.getByTestId('stop-A').focus();
    await user.keyboard('{ArrowUp}');

    expect(screen.getByTestId('drone-lab')).toHaveAttribute('data-playing', 'false');
  });

  test('dropping B on C keeps the last valid route and says why', async () => {
    await renderLab();
    const before = readout('Duración de la ruta');

    dragTo('stop-B', knobCentre('stop-C'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La parada B y la parada C coinciden: no hay tramo entre ellas.',
    );
    expect(readout('Duración de la ruta')).toBe(before);
    expect(valueText(screen.getByTestId('stop-B'))).toBe('x = 900 m, y = 800 m');
  });

  test('a valid edit after a rejected one clears the message', async () => {
    await renderLab();
    dragTo('stop-B', knobCentre('stop-C'));

    dragBy('stop-B', 30, 0);

    expect(screen.getByRole('alert')).toHaveTextContent('');
    expect(modifiedNote()).toBeInTheDocument();
  });

  test('a new vₘₐₓ regenerates the route', async () => {
    await renderLab();
    const vMax = screen.getByRole('slider', { name: /Rapidez máxima/ });

    fireEvent.change(vMax, { target: { value: '5' } });

    await screen.findByTestId('route-modified');
    expect(
      Number(readout('Duración de la ruta').replace(',', '.').replace(' s', '')),
    ).toBeGreaterThan(600);
  });

  test('dragging the drone along the route seeks t and pauses a playing clock', async () => {
    const user = userEvent.setup();
    await renderLab();
    await user.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(screen.getByTestId('drone-lab')).toHaveAttribute('data-playing', 'true');

    dragTo('drone-marker', knobCentre('stop-B'));

    expect(screen.getByTestId('drone-lab')).toHaveAttribute('data-playing', 'false');
    expect(valueText(timeline())).not.toBe('t = 30,000 s');
  });

  test('a finger on a stop or on the drone does not pan the page', async () => {
    await renderLab();

    for (const testId of ['stop-A', 'stop-B', 'stop-C', 'drone-marker']) {
      const notCancelled = fireEvent.touchStart(screen.getByTestId(testId), {
        touches: [{ clientX: 0, clientY: 0 }],
      });
      expect(notCancelled, testId).toBe(false);
    }
  });

  test('the local settings hold vectors, vector scale, trail, speed and repeat', async () => {
    const user = userEvent.setup();
    await renderLab();

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByRole('switch', { name: 'Vectores v y a' })).toBeChecked();
    expect(within(dialog).getByRole('slider', { name: /Escala de vectores/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('switch', { name: 'Rastro' })).toBeChecked();
    expect(within(dialog).getByRole('combobox', { name: 'Velocidad' })).toHaveValue('1');
    expect(within(dialog).getByRole('switch', { name: 'Repetir' })).not.toBeChecked();

    await user.click(within(dialog).getByRole('switch', { name: 'Vectores v y a' }));
    act(() => undefined);
    expect(document.querySelector('[data-vectors]')).toBeNull();
  });
});
