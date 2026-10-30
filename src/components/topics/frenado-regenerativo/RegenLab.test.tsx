// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import RegenLab, { TIME_LAPSE } from './RegenLab';

const FOOTNOTE = 'La reproducción va 20 veces más rápida que el ciclo.';

/** Identity CTM on every svg: client pixels are viewBox units, so DOM coordinates are pointer ones. */
function mockIdentityCtm(): void {
  for (const svg of document.querySelectorAll('svg')) {
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
    });
  }
}

function renderLab() {
  const view = render(<RegenLab footnote={FOOTNOTE} />);
  mockIdentityCtm();
  return view;
}

/** The value text of a LabShell readout row, normalised to plain spaces. */
function readout(label: string): string {
  const row = screen.getByText(label, { selector: 'span' }).parentElement as HTMLElement;
  return (row.lastElementChild?.textContent ?? '').replace(/\s/g, ' ');
}

const BATTERY = 'Energía a la batería E_batería';
const FRICTION = 'Calor de fricción E_fricción';
const LOSS = 'Pérdidas de conversión E_conversión';
const RECOVERED = 'Recuperado, % de la tracción';
const POWER = 'Potencia en las ruedas P';
const SPEED = 'Velocidad v';

const lab = () => screen.getByTestId('regen-lab');
const etaSlider = () => screen.getByRole('slider', { name: /^Rendimiento/ });
const pMaxField = () => screen.getByRole('textbox', { name: /^Potencia máxima de regeneración/ });
const timeCursor = () => screen.getByRole('slider', { name: 'Tiempo' });
const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const timelineText = () => (timeline().getAttribute('aria-valuetext') ?? '').replace(/\s/g, ' ');
const preset = (name: RegExp) =>
  within(screen.getByRole('group', { name: 'Valores de referencia' })).getByRole('button', {
    name,
  });
const flow = (id: string) =>
  screen.getByTestId('regen-scene').querySelector(`[data-flow="${id}"]`) as SVGGElement;

/** Moves the energy cursor to the end of the cycle with the keyboard. */
function seekToEnd(): void {
  timeCursor().focus();
  fireEvent.keyDown(timeCursor(), { key: 'End' });
}

/**
 * Replaces requestAnimationFrame with a queue the test flushes at chosen timestamps (ms);
 * cancelAnimationFrame removes a queued frame, as the browser does.
 */
function installFrameQueue() {
  let queue = new Map<number, FrameRequestCallback>();
  let nextId = 0;
  const request = vi.fn((callback: FrameRequestCallback) => {
    nextId += 1;
    queue.set(nextId, callback);
    return nextId;
  });
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => queue.delete(id));
  return {
    request,
    flush(now: number) {
      const pending = [...queue.values()];
      queue = new Map();
      act(() => pending.forEach((callback) => callback(now)));
    },
    get pending() {
      return queue.size;
    },
  };
}

describe('RegenLab', () => {
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

  test('plays the cycle 20 times faster than real time', () => {
    expect(TIME_LAPSE).toBe(20);
  });

  test('opens on the Model 3 in the UDDS at its hardest braking, t = 116 s, with f(v) on', () => {
    renderLab();

    expect(timelineText()).toBe('t = 116,000 s');
    expect(readout(SPEED)).toBe('46,03 km/h');
    expect(readout(POWER)).toBe('−33,20 kW');
    expect(readout(BATTERY)).toBe('0,032 kWh');
    expect(readout(LOSS)).toBe('0,008 kWh');
    expect(readout(FRICTION)).toBe('0,001 kWh');
    expect(readout(RECOVERED)).toBe('22,8 %');
    expect(preset(/^Model 3 · ciudad \(UDDS\)/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('lab-footnote')).toHaveTextContent(FOOTNOTE);
  });

  test('the hint ties "no friction without f(v)" to the default 239 kW cap, not to any P_máx', () => {
    const { container } = renderLab();

    expect((container.textContent ?? '').replace(/\s+/g, ' ')).toContain(
      'f(v) apaga la regeneración cerca de detenerse; sin él, con el tope de 239 kW, la fricción no haría falta en estos ciclos.',
    );
  });

  test('the regime and the car line are HTML above the drawing, so they wrap on a phone', () => {
    renderLab();

    const phase = screen.getByText('Frenando con el motor y con fricción');
    expect(phase.closest('svg')).toBeNull();
    const title = screen.getByText('Tesla Model 3 Long Range RWD 2025 · UDDS');
    expect(title.closest('svg')).toBeNull();
  });

  test('the power flow runs wheels → motor → battery with widths proportional to |P|', () => {
    renderLab();

    expect(flow('motor-wheels')).toHaveAttribute('data-kind', 'regen');
    expect(flow('battery-motor')).toHaveAttribute('data-kind', 'regen');
    // f(v) = 0,98 at road speed: 2 % of the 33,20 kW, 0,66 kW, goes to the friction brakes.
    expect(flow('wheels-brakes')).toHaveAttribute('data-kind', 'friction');
    expect(flow('wheels-brakes')).toHaveTextContent(/0,7\skW/);
    const width = (id: string) => Number(flow(id).getAttribute('data-width'));
    // 32,54 kW into the motor and 0,80 of it, 26,03 kW, into the battery, at 4 kW per pixel.
    expect(width('motor-wheels')).toBeCloseTo(8.13, 2);
    expect(width('battery-motor')).toBeCloseTo(6.51, 2);
    expect(flow('battery-motor')).toHaveTextContent(/26,0\skW/);
  });

  test('play advances t and stops at the end of the cycle without repeating', () => {
    const frames = installFrameQueue();
    renderLab();

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    frames.flush(1000);
    frames.flush(1050);
    // One 50 ms frame at 20× is one second of the cycle.
    expect(timelineText()).toBe('t = 117,000 s');

    fireEvent.change(timeline(), { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    for (const now of [2000, 2050, 2100, 2150]) frames.flush(now);

    expect(timelineText()).toBe('t = 1 369,000 s');
    expect(lab()).toHaveAttribute('data-playing', 'false');
    expect(frames.pending).toBe(0);
    expect(readout(BATTERY)).toBe('0,645 kWh');
    expect(readout(LOSS)).toBe('0,161 kWh');
    expect(readout(FRICTION)).toBe('0,062 kWh');
    expect(readout(RECOVERED)).toBe('40,4 %');
  });

  test('"Batería fría o llena" caps P_máx at 10 kW: 0,448 kWh reach the battery over the UDDS', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(preset(/^Batería fría o llena/));
    seekToEnd();

    expect(pMaxField()).toHaveValue('10');
    expect(preset(/^Batería fría o llena/)).toHaveAttribute('aria-pressed', 'true');
    expect(readout(BATTERY)).toBe('0,448 kWh');
    expect(readout(FRICTION)).toBe('0,308 kWh');
    expect(readout(RECOVERED)).toBe('28,1 %');
  });

  test('the highway and aggressive presets recover 12,5 % and 30,7 % of the traction', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(preset(/^Model 3 · carretera \(HWFET\)/));
    expect(timelineText()).toBe('t = 0,000 s');
    seekToEnd();
    expect(timelineText()).toBe('t = 765,000 s');
    expect(readout(RECOVERED)).toBe('12,5 %');

    await user.click(preset(/^Model 3 · agresivo \(US06\)/));
    seekToEnd();
    expect(readout(RECOVERED)).toBe('30,7 %');
  });

  test('the Nissan LEAF preset swaps the car: 0,555 kWh, 34,6 %, back in the UDDS', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(preset(/^Nissan LEAF 2025 · ciudad/));
    seekToEnd();

    expect(readout(BATTERY)).toBe('0,555 kWh');
    expect(readout(RECOVERED)).toBe('34,6 %');
    expect(screen.getByTestId('regen-scene')).toHaveTextContent('Nissan LEAF 2025');
  });

  test('η = 0 recovers 0 % with no NaN, and says why', () => {
    renderLab();

    fireEvent.change(etaSlider(), { target: { value: '0' } });
    seekToEnd();

    expect(readout(RECOVERED)).toBe('0,0 %');
    expect(readout(BATTERY)).toBe('0,000 kWh');
    // All the motor takes, 0,806 kWh, is lost converting.
    expect(readout(LOSS)).toBe('0,806 kWh');
    expect(lab().textContent).not.toMatch(/NaN|Infinity/);
    expect(screen.getByRole('note')).toHaveTextContent(/η = 0/);
    expect(preset(/^Model 3 · ciudad/)).toHaveAttribute('aria-pressed', 'false');
  });

  test('P_máx = 0 sends all the braking to the friction brakes', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.clear(pMaxField());
    await user.type(pMaxField(), '0{Enter}');

    expect(flow('wheels-brakes')).toHaveAttribute('data-kind', 'friction');
    expect(flow('motor-wheels')).toHaveAttribute('data-kind', 'idle');
    seekToEnd();
    expect(readout(FRICTION)).toBe('0,869 kWh');
    expect(readout(LOSS)).toBe('0,000 kWh');
    expect(readout(RECOVERED)).toBe('0,0 %');
    expect(screen.getByRole('note')).toHaveTextContent(/P_máx = 0/);
    expect(lab().textContent).not.toMatch(/NaN|Infinity/);
  });

  test('the energy cursor takes the keyboard: Home, arrows (1 % of the cycle) and End seek', () => {
    renderLab();
    const before = readout(BATTERY);
    const cursor = timeCursor();
    cursor.focus();

    fireEvent.keyDown(cursor, { key: 'Home' });
    expect(timelineText()).toBe('t = 0,000 s');
    expect(readout(BATTERY)).toBe('0,000 kWh');
    expect(readout(RECOVERED)).toBe('0,0 %');

    fireEvent.keyDown(cursor, { key: 'ArrowRight' });
    expect(timelineText()).toBe('t = 13,690 s');

    fireEvent.keyDown(cursor, { key: 'End' });
    expect(readout(BATTERY)).not.toBe(before);
    expect(timelineText()).toBe('t = 1 369,000 s');
  });

  test('dragging the energy cursor seeks and pauses playback', () => {
    installFrameQueue();
    renderLab();
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(lab()).toHaveAttribute('data-playing', 'true');
    const cursor = timeCursor();
    const knob = cursor.querySelector('[data-knob]') as SVGCircleElement;
    const x = Number(knob.getAttribute('cx'));

    fireEvent.pointerDown(cursor, { pointerId: 1, clientX: x, clientY: 0 });
    fireEvent.pointerMove(cursor, { pointerId: 1, clientX: x + 120, clientY: 0 });
    fireEvent.pointerUp(cursor, { pointerId: 1, clientX: x + 120, clientY: 0 });

    expect(lab()).toHaveAttribute('data-playing', 'false');
    expect(timelineText()).not.toBe('t = 116,000 s');
  });

  test('with motion "reduced" playback advances in discrete steps, with no frame loop', () => {
    vi.useFakeTimers();
    setSettings({ motion: 'reduced' });
    const frames = installFrameQueue();
    renderLab();

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    act(() => vi.advanceTimersByTime(250));

    // One step is 1/60 of the cycle: 1369/60 = 22,817 s.
    expect(timelineText()).toBe('t = 138,817 s');
    expect(frames.request).not.toHaveBeenCalled();
  });

  test('the settings drawer opens and closes with the keyboard and returns focus', async () => {
    const user = userEvent.setup();
    renderLab();
    const gear = screen.getByRole('button', { name: 'Ajustes del simulador' });
    gear.focus();

    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByRole('combobox', { name: 'Ciclo de manejo (EPA)' })).toHaveValue(
      'udds',
    );
    expect(
      within(dialog).getByRole('switch', { name: 'Desvanecimiento a baja velocidad f(v)' }),
    ).toBeChecked();
    expect(within(dialog).getByRole('switch', { name: 'Repetir' })).not.toBeChecked();
    expect(
      within(within(dialog).getByRole('combobox', { name: 'Velocidad' })).getByRole('option', {
        name: '4×',
      }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(dialog).not.toHaveAttribute('open');
    expect(gear).toHaveFocus();
  });

  test('choosing another cycle in the drawer restarts it at t = 0 on its own road', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    const dialog = screen.getByRole('dialog');

    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Ciclo de manejo (EPA)' }),
      'hwfet',
    );
    await user.keyboard('{Escape}');

    expect(timelineText()).toBe('t = 0,000 s');
    expect(screen.getByTestId('regen-scene')).toHaveTextContent(/16,51\skm/);
    expect(preset(/^Model 3 · carretera/)).toHaveAttribute('aria-pressed', 'true');
  });

  test('turning f(v) off shows the simple model: 0,695 kWh and no friction at all in the UDDS', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));

    await user.click(
      within(screen.getByRole('dialog')).getByRole('switch', {
        name: 'Desvanecimiento a baja velocidad f(v)',
      }),
    );
    await user.keyboard('{Escape}');
    seekToEnd();

    expect(readout(BATTERY)).toBe('0,695 kWh');
    expect(readout(FRICTION)).toBe('0,000 kWh');
    expect(readout(RECOVERED)).toBe('43,5 %');
    expect(preset(/^Model 3 · ciudad/)).toHaveAttribute('aria-pressed', 'false');
  });

  test('the cumulative bars follow t and name each energy', () => {
    renderLab();
    const bars = screen.getByRole('list', { name: 'Energías acumuladas hasta t' });

    for (const name of [
      'Tracción en las ruedas',
      'Carga en carretera',
      'Frenado en las ruedas',
      'A la batería',
      'Pérdidas de conversión (1 − η)',
      'Calor de fricción',
    ]) {
      expect(within(bars).getByText(name)).toBeInTheDocument();
    }
    const battery = () => bars.querySelector('[data-energy="eBattery"]') as HTMLElement;
    expect(battery()).toHaveTextContent(/0,032\skWh/);

    seekToEnd();
    expect(battery()).toHaveTextContent(/0,645\skWh/);
  });

  test('the braking bar is split into battery, conversion loss and friction, which fill it', () => {
    renderLab();
    seekToEnd();
    const brake = screen
      .getByRole('list', { name: 'Energías acumuladas hasta t' })
      .querySelector('[data-energy="eBrake"]') as HTMLElement;

    const parts = [...brake.querySelectorAll<HTMLElement>('[data-part]')];
    expect(parts.map((part) => part.dataset.part)).toEqual([
      'eBattery',
      'eConversionLoss',
      'eFriction',
    ]);
    const widths = parts.map((part) => parseFloat(part.style.width));
    // 0,869 kWh on a 0–2 kWh scale: 43,4 % of the bar, split 0,645 + 0,161 + 0,062.
    expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(43.43, 1);
    expect(widths[0]).toBeCloseTo(32.26, 1);
    expect(screen.getByText(/lo disipado/)).toBeInTheDocument();
  });

  test('moving a parameter pauses playback', () => {
    installFrameQueue();
    renderLab();
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(lab()).toHaveAttribute('data-playing', 'true');

    fireEvent.change(etaSlider(), { target: { value: '0.7' } });

    expect(lab()).toHaveAttribute('data-playing', 'false');
  });

  test('Restablecer returns to the Model 3 in the UDDS at t = 116 s', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(preset(/^Nissan LEAF/));
    fireEvent.change(etaSlider(), { target: { value: '0.5' } });

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(timelineText()).toBe('t = 116,000 s');
    expect(etaSlider()).toHaveValue('0.8');
    expect(preset(/^Model 3 · ciudad/)).toHaveAttribute('aria-pressed', 'true');
    expect(readout(POWER)).toBe('−33,20 kW');
  });

  test('the car rides along the road and stays on it at the end of the cycle', () => {
    renderLab();
    const car = screen.getByTestId('regen-car');
    const x = () => Number(car.getAttribute('data-x'));
    const start = x();

    seekToEnd();

    expect(x()).toBeGreaterThan(start);
    const road = screen.getByTestId('regen-road');
    expect(x()).toBeLessThanOrEqual(Number(road.getAttribute('data-x1')));
  });
});
