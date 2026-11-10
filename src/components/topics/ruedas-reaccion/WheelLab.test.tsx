// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { svgText } from '../../../test-svg-text';
import { disturbanceTimeline, MIN_DUMP_PLAYBACK, playbackTimeAt } from './disturbanceTimeline';
import WheelLab, { DAY_LAPSE } from './WheelLab';
import type { DumpActuator } from './wheelLabModel';

const FOOTNOTE = 'Rueda partiendo de 0 rpm; un eje.';
/** The readout labels, as written (with `$…$` for KaTeX). */
const OMEGA_PEAK = String.raw`$\omega_w$ máxima de la maniobra`;
const SHARE = String.raw`Porcentaje de $L_\text{máx}$`;
const THETA_S = String.raw`Ángulo de la nave $\theta_s$`;
const OMEGA_W = String.raw`Velocidad de la rueda $\omega_w$`;
const TORQUE = String.raw`Torque del motor sobre la rueda $\tau$`;
/** The timeline maps [0, duration] onto 0..1000. */
const TIMELINE_MAX = 1000;

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
  const view = render(<WheelLab footnote={FOOTNOTE} />);
  mockIdentityCtm();
  return view;
}

/** The value text of a LabShell readout row, normalised to plain spaces. */
function readout(label: string): string {
  const row = [...document.querySelectorAll<HTMLElement>('[data-readout]')].find(
    (candidate) => mathSourceText(candidate.firstElementChild) === label,
  );
  if (!row) throw new Error(`No readout labelled «${label}»`);
  return (row.lastElementChild?.textContent ?? '').replace(/\s/g, ' ');
}
/** The readout's leading number: a unit may follow after a space or, for °, attached (R39). */
const readoutNumber = (label: string) =>
  Number((/^[−\d,]+/.exec(readout(label))?.[0] ?? 'NaN').replace(',', '.').replace('−', '-'));

const handle = () => screen.getByTestId('target-handle');
const lab = () => screen.getByTestId('wheel-lab');
const thetaField = () => screen.getByRole('textbox', { name: /^Ángulo objetivo theta/ });
const durationField = () => screen.getByRole('textbox', { name: /^Duración de la maniobra T/ });
const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const timelineText = () => (timeline().getAttribute('aria-valuetext') ?? '').replace(/\s/g, ' ');
const preset = (name: RegExp) =>
  within(screen.getByRole('group', { name: 'Valores de referencia' })).getByRole('button', {
    name,
  });

function typeInto(field: HTMLElement, text: string): void {
  fireEvent.change(field, { target: { value: text } });
  fireEvent.keyDown(field, { key: 'Enter' });
}

/** Replaces requestAnimationFrame with a queue the test flushes at chosen timestamps (ms). */
function installFrameQueue() {
  let queue: FrameRequestCallback[] = [];
  const request = vi.fn((callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  return {
    request,
    flush(now: number) {
      const pending = queue;
      queue = [];
      act(() => pending.forEach((callback) => callback(now)));
    },
    get pending() {
      return queue.length;
    },
  };
}

function dialCentre(): { x: number; y: number } {
  const dial = screen.getByTestId('wheel-dial');
  return { x: Number(dial.getAttribute('data-cx')), y: Number(dial.getAttribute('data-cy')) };
}

function knobCentre(): { x: number; y: number } {
  const knob = handle().querySelector('[data-knob]') as SVGCircleElement;
  return { x: Number(knob.getAttribute('cx')), y: Number(knob.getAttribute('cy')) };
}

function dragHandleTo(point: { x: number; y: number }): void {
  const start = knobCentre();
  fireEvent.pointerDown(handle(), { pointerId: 1, clientX: start.x, clientY: start.y });
  fireEvent.pointerMove(handle(), { pointerId: 1, clientX: point.x, clientY: point.y });
  fireEvent.pointerUp(handle(), { pointerId: 1, clientX: point.x, clientY: point.y });
}

/** Seeks the disturbance clock to an orbit time, through the stretched playback timeline. */
function seekHours(hours: number, actuator: DumpActuator = 'magnetopar'): void {
  const warp = disturbanceTimeline(actuator);
  const u = playbackTimeAt(warp, hours * 3600);
  fireEvent.change(timeline(), { target: { value: String((u / warp.duration) * TIMELINE_MAX) } });
}

const scene = () => screen.getByTestId('wheel-scene');

describe('WheelLab', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('opens on "90° en 60 s": the target at 90°, the plan readouts and the footnote', () => {
    renderLab();

    expect(preset(/^90° en 60 s/)).toHaveAttribute('aria-pressed', 'true');
    expect(handle()).toHaveAttribute('role', 'slider');
    expect(handle()).toHaveAttribute('aria-valuenow', '90');
    expect(readout(OMEGA_PEAK)).toBe('−969,54 rpm');
    expect(readout('Vueltas de la rueda')).toBe('0,0 vueltas');
    expect(readout(SHARE)).toBe('0,0 %');
    expect(screen.getByTestId('lab-footnote')).toHaveTextContent(FOOTNOTE);
    expect(screen.queryByText(/la rueda no alcanza/i)).toBeNull();
  });

  test('the target handle takes the keyboard: arrows 1°, Shift 10°, and the peak ω_w follows', () => {
    renderLab();
    const before = readout(OMEGA_PEAK);

    handle().focus();
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    expect(handle()).toHaveAttribute('aria-valuenow', '91');
    fireEvent.keyDown(handle(), { key: 'ArrowDown', shiftKey: true });

    expect(handle()).toHaveAttribute('aria-valuenow', '81');
    expect(handle().getAttribute('aria-valuetext')?.replace(/\s/g, ' ')).toBe(
      'theta objetivo = 81°',
    );
    expect(thetaField()).toHaveValue('81');
    expect(readout(OMEGA_PEAK)).not.toBe(before);
    expect(readoutNumber(OMEGA_PEAK)).toBeCloseTo((-969.54 * 81) / 90, 1);
  });

  test('dragging the target handle to 45° halves the peak ω_w', () => {
    renderLab();
    const c = dialCentre();

    dragHandleTo({ x: c.x + 60, y: c.y - 60 });

    expect(handle()).toHaveAttribute('aria-valuenow', '45');
    expect(readout(OMEGA_PEAK)).toBe('−484,77 rpm');
    expect(preset(/^90° en 60 s/)).toHaveAttribute('aria-pressed', 'false');
  });

  test('a maneuver of T = 150 s keeps the transport in seconds, like the plot cursor', () => {
    renderLab();
    typeInto(durationField(), '150');

    fireEvent.change(timeline(), { target: { value: '1000' } });

    expect(timelineText()).toBe('t = 150,0 s');
  });

  test('T = 8 s is below T_min: the warning fills a live region already in the page, no NaN', () => {
    renderLab();
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();

    typeInto(durationField(), '8');
    fireEvent.change(timeline(), { target: { value: '500' } });

    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent(/la rueda no alcanza: se satura o le falta torque/i);
    expect(lab().textContent).not.toMatch(/NaN|Infinity/);
    expect(readoutNumber(SHARE)).toBeGreaterThan(100);
    expect(screen.getByTestId('momentum-gauge')).toHaveAttribute('data-exceeds', 'true');
  });

  test('writes the limits with accented subscripts, as the other topics do: L_máx, τ_máx, T_mín', () => {
    renderLab();
    typeInto(durationField(), '8');

    const text = mathSourceText(lab());
    expect(text).toContain(String.raw`$L_\text{máx}$`);
    expect(text).toContain(String.raw`$\tau_\text{máx}$`);
    expect(text).toContain(String.raw`$T_\text{mín}$`);
    expect(text).not.toMatch(/_(max|min)\b/);
  });

  test('every character outside KaTeX, in both modes, with the warning, the thruster and the settings, is one IBM Plex draws', async () => {
    const user = userEvent.setup();
    renderLab();
    expect(plexViolations(document.body), 'maniobra').toEqual([]);

    typeInto(durationField(), '8');
    expect(plexViolations(document.body), 'warning').toEqual([]);
    fireEvent.change(timeline(), { target: { value: String(TIMELINE_MAX / 2) } });
    expect(screen.getByTestId('momentum-gauge')).toHaveAttribute('data-exceeds', 'true');
    expect(plexViolations(document.body), 'over the limit').toEqual([]);

    await user.click(screen.getByRole('radio', { name: 'Perturbación y descarga' }));
    expect(plexViolations(document.body), 'magnetopar').toEqual([]);
    await user.click(screen.getByRole('radio', { name: 'Propulsor' }));
    await user.click(screen.getByRole('button', { name: 'Ir a la descarga' }));
    expect(plexViolations(document.body), 'propulsor').toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    expect(plexViolations(document.body), 'settings').toEqual([]);
  });

  test('"El giro más rápido" sits just above T_min: no warning, about 96 % of L_max at T/2', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(preset(/^El giro más rápido/));
    fireEvent.change(timeline(), { target: { value: '500' } });

    expect(durationField()).toHaveValue('12,1');
    expect(screen.queryByText(/la rueda no alcanza/i)).toBeNull();
    expect(readoutNumber(SHARE)).toBeCloseTo(96.2, 0);
  });

  test('the disturbance fills the wheel to the 80 % threshold, then the magnetorquer dumps it', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(screen.getByRole('radio', { name: 'Perturbación y descarga' }));
    expect(screen.getByText(/umbral de descarga \(elección de diseño\)/i)).toBeInTheDocument();
    expect(screen.queryByTestId('target-handle')).toBeNull();

    seekHours(48.5);
    const full = readoutNumber(SHARE);
    const fullMomentum = readoutNumber('Momento angular de la rueda $L_w$');
    expect(full).toBeGreaterThan(79);
    expect(full).toBeLessThan(80);
    expect(readout(THETA_S)).toBe('0,00°');

    seekHours(49);
    expect(readoutNumber(SHARE)).toBeLessThan(full);
    expect(readoutNumber('Momento angular de la rueda $L_w$')).toBeLessThan(fullMomentum);
    expect(screen.getByTestId('wheel-phase')).toHaveTextContent(/descargando/i);
    expect(readoutNumber(TORQUE)).toBeLessThan(0);

    seekHours(50);
    expect(screen.getByTestId('wheel-phase')).toHaveTextContent(/acumulando/i);
    expect(lab().textContent).not.toMatch(/NaN/);
  });

  test('the thruster dumps in seconds, so an hour after the threshold the wheel is refilling', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('radio', { name: 'Perturbación y descarga' }));

    await user.click(screen.getByRole('radio', { name: 'Propulsor' }));
    seekHours(49, 'propulsor');

    expect(readoutNumber(SHARE)).toBeLessThan(1);
    expect(scene().querySelector('[data-actuator="propulsor"]')).toBeNull();
    expect(mathSourceText(screen.getByTestId('wheel-lab'))).toMatch(
      /\$\\tau_\\text\{máx\}\$ de la rueda \(8\smN·m\)/,
    );
  });

  test('"Ir a la descarga" shows the thruster firing: the jet, τ = r × F and the phase', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('radio', { name: 'Perturbación y descarga' }));
    await user.click(screen.getByRole('radio', { name: 'Propulsor' }));

    await user.click(screen.getByRole('button', { name: 'Ir a la descarga' }));

    expect(scene().querySelector('[data-actuator="propulsor"]')).not.toBeNull();
    expect(within(scene()).getByText(svgText('τ = r × F'))).toBeInTheDocument();
    expect(screen.getByTestId('wheel-phase')).toHaveTextContent(/descargando con el propulsor/i);
    expect(readoutNumber(TORQUE)).toBeLessThan(-7.99);
    expect(readoutNumber('Tiempo en órbita')).toBeCloseTo(48.63, 1);
  });

  test('under reduced motion the stepped playback still lands on the 5 s thruster dump', async () => {
    setSettings({ motion: 'reduced' });
    const frames = installFrameQueue();
    vi.useFakeTimers();
    renderLab();
    fireEvent.click(screen.getByRole('radio', { name: 'Perturbación y descarga' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Propulsor' }));

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    let sawFiring = false;
    for (let step = 0; step < 70 && !sawFiring; step++) {
      act(() => {
        vi.advanceTimersByTime(250);
      });
      sawFiring = scene().querySelector('[data-actuator="propulsor"]') !== null;
    }

    expect(sawFiring).toBe(true);
    expect(screen.getByTestId('wheel-phase')).toHaveTextContent(/descargando con el propulsor/i);
    expect(frames.request).not.toHaveBeenCalled();
  });

  test('"Tres días de perturbación con descarga" switches to the time-lapsed disturbance', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(preset(/^Tres días de perturbación con descarga/));

    expect(screen.getByRole('radio', { name: 'Perturbación y descarga' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Magnetopar' })).toBeChecked();
    expect(DAY_LAPSE).toBe(7200);
    expect(MIN_DUMP_PLAYBACK).toBe(2);
    expect(
      screen.getByText(/A 1×, 2 h de órbita por segundo \(un día en 12 s\)/),
    ).toBeInTheDocument();
    expect(mathSourceText(lab())).toContain(String.raw`$2{,}28 \cdot 10^{-7}$ N·m`);
    expect(mathSourceText(lab())).not.toMatch(/2\{,\}3 \\cdot|2\{,\}29 \\cdot/);
  });

  test('the time-lapse statement follows the speed setting: at 4×, 8 h of orbit per second', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('radio', { name: 'Perturbación y descarga' }));

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    await user.selectOptions(
      within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Velocidad' }),
      '4',
    );
    await user.keyboard('{Escape}');

    expect(
      screen.getByText(/a 4×, 8 h de órbita por segundo \(un día en 3 s\)/),
    ).toBeInTheDocument();
  });

  test('in the disturbance the plot cursor scrubs orbit hours, and 8× plays a day in 1,5 s', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('radio', { name: 'Perturbación y descarga' }));
    const cursor = within(screen.getByTestId('wheel-plot')).getByRole('slider');

    cursor.focus();
    fireEvent.keyDown(cursor, { key: 'ArrowRight', shiftKey: true });
    expect(readout('Tiempo en órbita')).toBe('7,20 h');

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    await user.selectOptions(
      within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Velocidad' }),
      '8',
    );
    await user.keyboard('{Escape}');
    expect(
      screen.getByText(/a 8×, 16 h de órbita por segundo \(un día en 1,5 s\)/),
    ).toBeInTheDocument();
  });

  test('the plot cursor scrubs the clock from the keyboard', () => {
    renderLab();
    const cursor = within(screen.getByTestId('wheel-plot')).getByRole('slider');

    cursor.focus();
    fireEvent.keyDown(cursor, { key: 'ArrowRight', shiftKey: true });

    expect(timelineText()).toBe('t = 6,00 s');
    expect(readoutNumber(THETA_S)).toBeCloseTo(1.8, 6);
  });

  test('with reduced motion playback steps every 250 ms and never asks for animation frames', async () => {
    setSettings({ motion: 'reduced' });
    const frames = installFrameQueue();
    vi.useFakeTimers();
    renderLab();

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(timelineText()).toBe('t = 1,00 s');
    expect(frames.request).not.toHaveBeenCalled();
  });

  test('play runs in real time and stops at the end of the maneuver, on the target', () => {
    const frames = installFrameQueue();
    renderLab();
    typeInto(durationField(), '5');

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    frames.flush(0);
    // The transport's settled time is synced every 100 ms of playback.
    frames.flush(100);
    expect(timelineText()).toBe('t = 0,100 s');
    for (let now = 100; frames.pending > 0 && now < 20_000; now += 50) frames.flush(now);

    expect(lab()).toHaveAttribute('data-playing', 'false');
    expect(timelineText()).toBe('t = 5,000 s');
    expect(readout(THETA_S)).toBe('90,00°');
    expect(readout(OMEGA_W)).toBe('0,00 rpm');
  });

  test('the drawer opens from the keyboard, offers 8× and hides the plot, and Escape returns focus', async () => {
    const user = userEvent.setup();
    renderLab();
    const gear = screen.getByRole('button', { name: 'Ajustes del simulador' });

    gear.focus();
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog');
    const speed = within(dialog).getByRole('combobox', { name: 'Velocidad' });
    expect(within(speed).getByRole('option', { name: '8×' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('switch', { name: 'Gráfica de L sub w(t)' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('wheel-plot')).toBeNull();
    expect(gear).toHaveFocus();
  });

  test('moving a parameter pauses playback and Restablecer returns to 90° in 60 s', async () => {
    const user = userEvent.setup();
    installFrameQueue();
    renderLab();
    await user.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(lab()).toHaveAttribute('data-playing', 'true');

    fireEvent.change(screen.getByRole('slider', { name: /^Ángulo objetivo theta/ }), {
      target: { value: '-30' },
    });
    expect(lab()).toHaveAttribute('data-playing', 'false');
    expect(readoutNumber(OMEGA_PEAK)).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));
    expect(handle()).toHaveAttribute('aria-valuenow', '90');
    expect(durationField()).toHaveValue('60');
  });
});
