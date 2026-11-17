/**
 * What Tema 6's lab tests share: the rendered lab and its queries, the suite's set-up and clean-up,
 * and the animation-frame queue they drive playback with.
 */
import { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import RegenLab from './RegenLab';

/**
 * Replaces requestAnimationFrame with a queue the test flushes at chosen timestamps (ms);
 * cancelAnimationFrame removes a queued frame, as the browser does.
 */
export function installFrameQueue() {
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

export const USAGE = 'En «Tramo» la reproducción va a velocidad real.';
export const LEFT_OUT = 'Pendiente, viento y temperatura.';

/** Identity CTM on every svg: client pixels are viewBox units, so DOM coordinates are pointer ones. */
export function mockIdentityCtm(): void {
  for (const svg of document.querySelectorAll('svg')) {
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
    });
  }
}

export function renderLab() {
  const view = render(createElement(RegenLab, { usage: USAGE, leftOut: LEFT_OUT }));
  mockIdentityCtm();
  return view;
}

export const BATTERY = 'Energía a la batería $E_\\text{batería}$';
export const FRICTION = 'Calor de fricción $E_\\text{fricción}$';
export const LOSS = 'Pérdidas de conversión $E_\\text{conversión}$';
export const RECOVERED = 'Recuperado en el ciclo, % de la tracción';
/** The same readouts in «Tramo»: the stretch's, from its start. */
export const STRETCH_BATTERY = 'Energía a la batería en el tramo $E_\\text{batería}$';
export const STRETCH_FRICTION = 'Calor de fricción en el tramo $E_\\text{fricción}$';
export const STRETCH_LOSS = 'Pérdidas de conversión en el tramo $E_\\text{conversión}$';
export const STRETCH_RECOVERED = 'Recuperado en el tramo, % del frenado en las ruedas';
export const STRETCH_BARS = 'Energías acumuladas en el tramo, hasta t';
export const CYCLE_BARS = 'Energías acumuladas hasta t';
export const POWER = 'Potencia en las ruedas $P$';
export const SPEED = 'Velocidad $v$';

export const lab = () => screen.getByTestId('regen-lab');
export const etaSlider = () => screen.getByRole('slider', { name: /^Rendimiento/ });
export const pMaxField = () =>
  screen.getByRole('textbox', { name: /^Potencia máxima de regeneración/ });
export const timeCursor = () => screen.getByRole('slider', { name: 'Tiempo' });
export const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
export const timelineText = () =>
  (timeline().getAttribute('aria-valuetext') ?? '').replace(/\s/g, ' ');
export const presetSelect = () =>
  screen.getByRole('combobox', { name: 'Valores de referencia' }) as HTMLSelectElement;
/** The text of the option the select shows: «Personalizado» once an edit left every preset. */
export const presetShown = () => presetSelect().selectedOptions[0].textContent;
export async function choosePreset(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.selectOptions(presetSelect(), screen.getByRole('option', { name }));
}
export const flow = (id: string) =>
  screen.getByTestId('regen-scene').querySelector(`[data-flow="${id}"]`) as SVGGElement;

/** The view on show: the checked segment of «Vista», under the parameters. */
export const shownView = () =>
  within(screen.getByRole('radiogroup', { name: 'Vista' })).getByRole('radio', { checked: true });
/** Picks a view in the scenario («Vista»). */
export function chooseView(view: 'Tramo' | 'Ciclo'): void {
  fireEvent.click(
    within(screen.getByRole('radiogroup', { name: 'Vista' })).getByRole('radio', { name: view }),
  );
}
/** The drive cycle select, in the scenario beside the view. */
export const cycleSelect = () => screen.getByRole('combobox', { name: 'Ciclo de manejo (EPA)' });
export const region = (name: string) => screen.getByRole('region', { name });
/** Shows the whole cycle («Ciclo»). */
export const showCycle = () => chooseView('Ciclo');
/** Moves the energy cursor to the end of the cycle with the keyboard, in the view «Ciclo». */
export function seekToEnd(): void {
  if (shownView().getAttribute('value') !== 'ciclo') showCycle();
  timeCursor().focus();
  fireEvent.keyDown(timeCursor(), { key: 'End' });
}
/** The badge's visible text, factor and words, as the canvas shows it. */
export const badgeText = () =>
  [...(lab().querySelector('[data-time-scale-badge]')?.children ?? [])]
    .map((part) => part.textContent?.replace(/\s/g, ' '))
    .join(' ');
export const marks = () => lab().querySelectorAll('[data-transport-mark]');
export const nextEvent = () => screen.getByRole('button', { name: 'Evento siguiente' });
export const previousEvent = () => screen.getByRole('button', { name: 'Evento anterior' });
/** Moves the transport to a timeline position (of 1000), as a drag would. */
export const scrubTo = (position: number) =>
  fireEvent.change(timeline(), { target: { value: String(position) } });

/** Each test opens the drawer's dialog on a fresh lab: polyfill, then clean timers and settings. */
export function installRegenLabLifecycle(): void {
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
}
