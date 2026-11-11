// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { readout } from '../../../test-readout';
import RegenLab from './RegenLab';
import { installFrameQueue } from './regenLabTestKit';

const lab = () => screen.getByTestId('regen-lab');
const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const timelineText = () => (timeline().getAttribute('aria-valuetext') ?? '').replace(/\s/g, ' ');
const pedal = (name: 'Freno' | 'Acelerador') => screen.getByRole('button', { name });
const status = () => screen.getByTestId('drive-status');
/** The status line as written, each formula back to `$tex$`, with plain spaces. */
const statusText = () => mathSourceText(status()).replace(/\s/g, ' ');
const depth = (id: 'brake' | 'throttle') =>
  (lab().querySelector(`[data-pedal="${id}"] [data-pedal-depth]`) as HTMLElement).style.transform;
const carX = () => Number(screen.getByTestId('regen-car').getAttribute('data-x'));
const ghostX = () => Number(screen.getByTestId('regen-ghost').getAttribute('data-x'));
const badgeText = () =>
  [...(lab().querySelector('[data-time-scale-badge]')?.children ?? [])]
    .map((part) => part.textContent?.replace(/\s/g, ' '))
    .join(' ');

const BATTERY = 'Energía a la batería en tu conducción $E_\\text{batería}$';
const FRICTION = 'Calor de fricción en tu conducción $E_\\text{fricción}$';
const RECOVERED = 'Recuperado en tu conducción, % del frenado en las ruedas';
const REFERENCE = 'Recuperado en el tramo del UDDS, % del frenado en las ruedas';
const LINE = 'Hasta la línea de detención';

function chooseView(view: 'tramo' | 'ciclo' | 'conducir'): void {
  fireEvent.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByRole('combobox', { name: 'Vista' }), {
    target: { value: view },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar ajustes' }));
}

/** Renders the lab in «Conducir» with a frame queue to play it. */
function renderDrive() {
  const frames = installFrameQueue();
  render(<RegenLab />);
  chooseView('conducir');
  return frames;
}

/** Flushes frames every 100 ms from `from` to `to` (ms): the clock syncs at each. */
function playFrames(frames: ReturnType<typeof installFrameQueue>, from: number, to: number) {
  for (let now = from; now <= to; now += 100) frames.flush(now);
}

describe('RegenLab «Conducir»', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('opens at the stretch’s start in real time, pedals in the canvas, no events, the hint said', () => {
    renderDrive();
    const canvas = lab().querySelector('[data-lab-canvas]') as HTMLElement;

    expect(
      within(screen.getByRole('group', { name: 'Ajustes activos' })).getByRole('button', {
        name: 'Vista Conducir',
      }),
    ).toBeVisible();
    expect(badgeText()).toBe('×1 velocidad real');
    expect(timelineText()).toBe('t = 376,00 s');
    expect(lab().querySelectorAll('[data-transport-mark]')).toHaveLength(0);
    expect(within(canvas).getByRole('group', { name: 'Pedales' })).toBeVisible();
    expect(pedal('Freno')).toHaveAttribute('aria-keyshortcuts', 'ArrowDown');
    expect(pedal('Acelerador')).toHaveAttribute('aria-keyshortcuts', 'ArrowUp');
    expect(statusText()).toMatch(/^Mantén pulsado el freno o el acelerador para arrancar/);
    expect(readout('Velocidad v')).toBe('57,94 km/h');
    expect(readout(LINE)).toBe('236 m');
    expect(screen.getByTestId('drive-canvas-note')).toHaveTextContent('contorno discontinuo');
  });

  test('↓ on a focused pedal plays and brakes: the depth sinks, the battery fills, nothing is said per frame', () => {
    const frames = renderDrive();
    pedal('Freno').focus();

    fireEvent.keyDown(pedal('Freno'), { key: 'ArrowDown' });
    expect(lab()).toHaveAttribute('data-playing', 'true');
    playFrames(frames, 1000, 3000);
    const said = statusText();
    playFrames(frames, 3100, 4000);

    expect(statusText()).toBe(said);
    expect(depth('brake')).toMatch(/^scaleX\(1\.000\)|^scaleX\(0\.[5-9]/);
    expect(readout(BATTERY)).not.toBe('0,0 kJ');
    expect(Number.parseFloat(readout('Velocidad v').replace(',', '.'))).toBeLessThan(57.9);
    fireEvent.keyUp(pedal('Freno'), { key: 'ArrowDown' });
    playFrames(frames, 4100, 4700);
    expect(depth('brake')).toBe('scaleX(0.000)');
  });

  test('the accelerator held with a pointer pushes the car ahead of the cycle’s; releasing lets go', () => {
    const frames = renderDrive();

    fireEvent.pointerDown(pedal('Acelerador'), { pointerId: 7, pointerType: 'mouse', button: 0 });
    playFrames(frames, 1000, 3000);

    expect(lab()).toHaveAttribute('data-playing', 'true');
    expect(carX()).toBeGreaterThan(ghostX());
    expect(Number.parseFloat(readout('Velocidad v').replace(',', '.'))).toBeGreaterThan(57.9);
    fireEvent.pointerUp(pedal('Acelerador'), { pointerId: 7 });
    playFrames(frames, 3100, 3800);
    expect(depth('throttle')).toBe('scaleX(0.000)');
  });

  test('a cancelled or lost pointer lets go; a long press opens no context menu', () => {
    const frames = renderDrive();
    const brake = pedal('Freno');

    fireEvent.pointerDown(brake, { pointerId: 3, pointerType: 'touch', button: 0 });
    playFrames(frames, 1000, 1500);
    fireEvent.pointerCancel(brake, { pointerId: 3 });
    playFrames(frames, 1600, 2300);
    expect(depth('brake')).toBe('scaleX(0.000)');

    fireEvent.pointerDown(brake, { pointerId: 4, pointerType: 'touch', button: 0 });
    playFrames(frames, 2400, 2900);
    fireEvent.lostPointerCapture(brake, { pointerId: 4 });
    playFrames(frames, 3000, 3700);
    expect(depth('brake')).toBe('scaleX(0.000)');
    expect(fireEvent.contextMenu(brake)).toBe(false);
  });

  test('Space held on a pedal works like a press; a right click does nothing', () => {
    const frames = renderDrive();

    fireEvent.pointerDown(pedal('Freno'), { pointerId: 2, pointerType: 'mouse', button: 2 });
    expect(lab()).toHaveAttribute('data-playing', 'false');
    fireEvent.keyDown(pedal('Freno'), { key: ' ' });
    playFrames(frames, 1000, 2000);
    expect(depth('brake')).not.toBe('scaleX(0.000)');
    fireEvent.keyUp(pedal('Freno'), { key: ' ' });
    playFrames(frames, 2100, 2800);
    expect(depth('brake')).toBe('scaleX(0.000)');
  });

  test('losing the focus, the window or the page releases every pedal', () => {
    const frames = renderDrive();
    pedal('Acelerador').focus();
    fireEvent.keyDown(pedal('Acelerador'), { key: 'ArrowUp' });
    playFrames(frames, 1000, 1500);

    act(() => pedal('Acelerador').blur());
    playFrames(frames, 1600, 2400);
    expect(depth('throttle')).toBe('scaleX(0.000)');

    fireEvent.keyDown(pedal('Acelerador'), { key: 'ArrowUp' });
    playFrames(frames, 2500, 3000);
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    playFrames(frames, 3100, 3900);
    expect(depth('throttle')).toBe('scaleX(0.000)');

    fireEvent.keyDown(pedal('Acelerador'), { key: 'ArrowUp' });
    playFrames(frames, 4000, 4500);
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    visibility.mockRestore();
    playFrames(frames, 4600, 5400);
    expect(depth('throttle')).toBe('scaleX(0.000)');
  });

  test('pausing says a summary once: distance, the line, energy and both shares', () => {
    const frames = renderDrive();
    fireEvent.keyDown(pedal('Freno'), { key: 'ArrowDown' });
    playFrames(frames, 1000, 3000);

    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));

    expect(status()).toHaveAttribute('role', 'status');
    expect(statusText()).toMatch(
      /^En pausa en t = 378,\d\d s: llevas \d+ m y vas a \d+ km\/h, \d+ m antes de la línea\./,
    );
    expect(statusText()).toMatch(
      /A la batería llegaron [\d,]+ kJ, el [\d,]+ % del frenado en las ruedas/,
    );
    expect(readout(RECOVERED)).toMatch(/%$/);
  });

  test('at the end it sums up the run against the cycle’s car: 75,0 % in the UDDS', () => {
    const frames = renderDrive();
    fireEvent.keyDown(pedal('Freno'), { key: 'ArrowDown' });
    playFrames(frames, 1000, 6000);
    fireEvent.keyUp(pedal('Freno'), { key: 'ArrowDown' });
    playFrames(frames, 6100, 29_000);

    expect(lab()).toHaveAttribute('data-playing', 'false');
    expect(timelineText()).toBe('t = 402,00 s');
    expect(statusText()).toMatch(/^Fin del tramo: recorriste \d+ m y te detuviste/);
    expect(statusText()).toMatch(/el auto del UDDS en el tramo: 168,1 kJ y 75,0 %\.$/);
    expect(readout(REFERENCE)).toBe('75,0 %');
    expect(plexViolations(lab())).toEqual([]);
  });

  test('a cold battery (P_máx 10 kW) limits the brake: said once per run, the pads take the rest', () => {
    const frames = installFrameQueue();
    render(<RegenLab />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Valores de referencia' }), {
      target: { value: 'cold-battery' },
    });
    chooseView('conducir');
    fireEvent.keyDown(pedal('Freno'), { key: 'ArrowDown' });
    playFrames(frames, 1000, 2000);

    expect(statusText()).toBe(
      'Freno limitado por la batería: pasa de $P_\\text{máx}$ = 10 kW y el resto lo disipan las pastillas.',
    );
    expect(readout(FRICTION)).not.toBe('0,0 kJ');
    expect(plexViolations(lab())).toEqual([]);
    // Braking on to rest: each limit is said once, and a said one never comes back.
    const said = [statusText()];
    for (let now = 2100; now <= 6000; now += 100) {
      frames.flush(now);
      if (statusText() !== said.at(-1)) said.push(statusText());
    }
    expect(new Set(said).size).toBe(said.length);
  });

  test('the timeline only reaches what was driven; replaying keeps the run until it plays again', () => {
    const frames = renderDrive();
    fireEvent.change(timeline(), { target: { value: '999' } });
    expect(timelineText()).toBe('t = 376,00 s');

    fireEvent.keyDown(pedal('Freno'), { key: 'ArrowDown' });
    playFrames(frames, 1000, 3000);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    const driven = timelineText();
    fireEvent.change(timeline(), { target: { value: '999' } });
    expect(timelineText()).toBe(driven);

    fireEvent.change(timeline(), { target: { value: '20' } });
    expect(timelineText()).toBe('t = 376,52 s');
    expect(readout('Velocidad v')).not.toBe('57,94 km/h');
  });

  test('changing P_máx after a run recomputes the same pedals with the new model', () => {
    const frames = renderDrive();
    fireEvent.keyDown(pedal('Freno'), { key: 'ArrowDown' });
    playFrames(frames, 1000, 3500);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    const before = readout(FRICTION);

    const field = screen.getByRole('textbox', { name: /^Potencia máxima de regeneración/ });
    fireEvent.change(field, { target: { value: '5' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(readout(FRICTION)).not.toBe(before);
    expect(statusText()).toMatch(/^En pausa en t = 378/);
  });

  test('compares your speed with the cycle’s data in a plot named in its legend', () => {
    renderDrive();
    const plot = screen.getByTestId('drive-speed-plot');

    expect(plot).toHaveTextContent('Tu conducción');
    expect(plot).toHaveTextContent('Auto del UDDS (dato real)');
    expect(screen.getByTestId('regen-stop-line')).toBeInTheDocument();
  });

  test('back to «Tramo» brings its event back; Restablecer returns to «Tramo»', () => {
    renderDrive();

    chooseView('tramo');
    expect(lab().querySelectorAll('[data-transport-mark]')).toHaveLength(1);
    chooseView('conducir');
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
    expect(screen.queryByRole('group', { name: 'Pedales' })).toBeNull();
  });

  test('under reduced motion the model keeps running, in the clock’s steps', () => {
    vi.useFakeTimers();
    setSettings({ motion: 'reduced' });
    renderDrive();

    expect(badgeText()).toBe('×1,7 cámara rápida');
    fireEvent.keyDown(pedal('Freno'), { key: 'ArrowDown' });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(timelineText()).not.toBe('t = 376,00 s');
    expect(readout(BATTERY)).not.toBe('0,0 kJ');
  });
});
