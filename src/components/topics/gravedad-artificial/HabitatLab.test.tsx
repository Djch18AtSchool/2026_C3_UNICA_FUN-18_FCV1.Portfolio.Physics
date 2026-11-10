// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import HabitatLab from './HabitatLab';
import { readout } from '../../../test-readout';

const USAGE = 'La reproducción va 6 veces más rápida que el giro real.';
const LEFT_OUT = 'No calcula el efecto Coriolis.';

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
  const view = render(<HabitatLab usage={USAGE} leftOut={LEFT_OUT} />);
  mockIdentityCtm();
  return view;
}

const rpmSlider = () => screen.getByRole('slider', { name: /^Velocidad de giro/ });
const radiusField = () => screen.getByRole('textbox', { name: /^Radio del piso/ });
const lockSwitch = () => screen.getByRole('switch', { name: 'Fijar 1 g' });
const handle = () => screen.getByTestId('radius-handle');
const timelineText = () =>
  (
    screen.getByRole('slider', { name: 'Línea de tiempo' }).getAttribute('aria-valuetext') ?? ''
  ).replace(/\s/g, ' ');

/** Replaces requestAnimationFrame with a queue the test flushes at chosen timestamps (ms). */
function installFrameQueue() {
  let queue: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  return {
    flush(now: number) {
      const pending = queue;
      queue = [];
      act(() => pending.forEach((callback) => callback(now)));
    },
    restore: () => vi.unstubAllGlobals(),
  };
}

function knobCentre(): { x: number; y: number } {
  const knob = handle().querySelector('[data-knob]') as SVGCircleElement;
  return { x: Number(knob.getAttribute('cx')), y: Number(knob.getAttribute('cy')) };
}

function dragHandleBy(dx: number): void {
  const start = knobCentre();
  fireEvent.pointerDown(handle(), { pointerId: 1, clientX: start.x, clientY: start.y });
  fireEvent.pointerMove(handle(), { pointerId: 1, clientX: start.x + dx, clientY: start.y });
  fireEvent.pointerUp(handle(), { pointerId: 1, clientX: start.x + dx, clientY: start.y });
}

describe('HabitatLab', () => {
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

  test('opens with "fijar 1 g" on at 1 rpm: 894,6 m, 1 g and a 60 s revolution', () => {
    renderLab();

    expect(lockSwitch()).toBeChecked();
    expect(radiusField()).toHaveValue('894,6');
    expect(readout('Gravedad aparente $a_c/g$')).toBe('1,00 g');
    expect(readout('Período T')).toBe('60,00 s');
    expect(handle()).toHaveAttribute('aria-valuenow', '894.6');
  });

  test('lays out the three levels: N, r and the 1 g switch, then the presets, then the readouts', () => {
    renderLab();
    const region = (name: string) => screen.getByRole('region', { name });

    expect(within(region('Parámetros')).getByRole('slider', { name: /^Velocidad de giro/ })).toBe(
      rpmSlider(),
    );
    expect(within(region('Parámetros')).getByRole('textbox', { name: /^Radio del piso/ })).toBe(
      radiusField(),
    );
    expect(within(region('Parámetros')).getByRole('switch', { name: 'Fijar 1 g' })).toBe(
      lockSwitch(),
    );
    expect(within(region('Parámetros')).getByText(/Con 1 g fijo/)).toBeInTheDocument();
    expect(
      within(region('Escenario')).getByRole('group', { name: 'Valores de referencia' }),
    ).toBeInTheDocument();
    expect(within(region('Lecturas')).getByText('Período T')).toBeInTheDocument();
  });

  test('the legend and the note on the apparent gravity read the drawing, in the canvas notes', () => {
    const { container } = renderLab();
    const notes = container.querySelector('[data-lab-canvas-notes]') as HTMLElement;

    expect(within(notes).getByRole('list', { name: 'Leyenda del hábitat' })).toBeInTheDocument();
    expect(notes).toHaveTextContent('ninguna fuerza tira de ella hacia afuera');
    expect(screen.getByTestId('habitat-scene').closest('[data-lab-canvas]')).not.toContainElement(
      notes,
    );
  });

  test('the presets are chips with one line under them: the note and its source as a link', async () => {
    const user = userEvent.setup();
    renderLab();
    const group = screen.getByRole('group', { name: 'Valores de referencia' });
    expect(within(group).getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByTestId('preset-note')).toBeNull();

    await user.click(screen.getByRole('button', { name: /^Toro de Stanford/ }));

    const note = screen.getByTestId('preset-note');
    expect(note).toHaveTextContent(/0,95 ± 0,05 g/);
    expect(note).toHaveTextContent('Fuente: NASA SP-413 (1977)');
    expect(within(note).getByRole('link')).toHaveAttribute(
      'href',
      'https://ntrs.nasa.gov/citations/19770014162',
    );
  });

  test('beside the gear, the chips «vectores» and «1×» follow the drawer', async () => {
    const user = userEvent.setup();
    renderLab();
    const chips = () =>
      within(screen.getByRole('group', { name: 'Ajustes activos' }))
        .getAllByRole('button')
        .map((chip) => chip.textContent);
    expect(chips()).toEqual(['vectores', '1×']);

    await user.click(screen.getByRole('button', { name: 'vectores' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('switch', {
        name: 'Vectores a sub c y gravedad aparente',
      }),
    );

    expect(chips()).toEqual(['1×']);
  });

  test('how to use it and what the model leaves out wait in two closed disclosures', () => {
    const { container } = renderLab();
    const [usage, leftOut] = [...container.querySelectorAll('details')];

    expect(usage.open || leftOut.open).toBe(false);
    expect(usage).toHaveTextContent('Arrastra el manejador sobre la barra logarítmica');
    expect(usage).toHaveTextContent('apaga «Fijar 1 g»');
    expect(usage).toHaveTextContent(USAGE);
    expect(leftOut).toHaveTextContent(LEFT_OUT);
  });

  test('without the MDX texts it still says how to use it, and drops the empty disclosure', () => {
    const { container } = render(<HabitatLab />);

    const notes = [...container.querySelectorAll('details')];
    expect(notes.map((details) => details.getAttribute('data-lab-note'))).toEqual(['usage']);
  });

  test('with "fijar 1 g" on, 2 rpm shows a radius of 223,6 m', () => {
    renderLab();

    fireEvent.change(rpmSlider(), { target: { value: '2' } });

    expect(radiusField()).toHaveValue('223,6');
    expect(handle()).toHaveAttribute('aria-valuenow', '223.6');
    expect(readout('Período T')).toBe('30,00 s');
    expect(readout('Velocidad tangencial v')).toBe('46,83 m/s');
  });

  test('with "fijar 1 g" off, dragging the radius handle changes a_c/g', () => {
    renderLab();
    fireEvent.click(lockSwitch());
    const before = readout('Gravedad aparente $a_c/g$');

    dragHandleBy(-120);

    expect(readout('Gravedad aparente $a_c/g$')).not.toBe(before);
    expect(Number(handle().getAttribute('aria-valuenow'))).toBeLessThan(894.6);
    expect(Number(handle().getAttribute('aria-valuenow')) % 5).toBe(0);
    expect(rpmSlider()).toHaveValue('1');
  });

  test('with "fijar 1 g" on, dragging the radius solves the spin and keeps 1 g', () => {
    renderLab();

    dragHandleBy(-120);

    expect(readout('Gravedad aparente $a_c/g$')).toBe('1,00 g');
    expect(rpmSlider()).not.toHaveValue('1');
  });

  test('the radius handle is a slider over 5–4 000 m that takes the arrow keys', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(lockSwitch());
    const radius = handle();
    expect(radius).toHaveAttribute('role', 'slider');
    expect(radius).toHaveAttribute('aria-valuemin', '5');
    expect(radius).toHaveAttribute('aria-valuemax', '4000');

    radius.focus();
    await user.keyboard('{Home}');
    expect(radius).toHaveAttribute('aria-valuenow', '5');
    await user.keyboard('{ArrowRight}');
    expect(radius).toHaveAttribute('aria-valuenow', '10');
    await user.keyboard('{End}');
    expect(radius).toHaveAttribute('aria-valuenow', '4000');
    expect(radius.getAttribute('aria-valuetext')?.replace(/\s/g, ' ')).toBe('r = 4 000,0 m');
  });

  test('a preset loads its published pair and turns "fijar 1 g" off', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(screen.getByRole('button', { name: /^Toro de Stanford/ }));

    expect(lockSwitch()).not.toBeChecked();
    expect(radiusField()).toHaveValue('830');
    expect(readout('Gravedad aparente $a_c/g$')).toBe('0,93 g');
    expect(screen.getByText(/0,95 ± 0,05 g/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Centrífuga pequeña/ }));
    expect(readout('Diferencia cabeza–pies h/r')).toBe('18,00 %');
  });

  test('turning "fijar 1 g" back on solves from the last edited parameter', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('button', { name: /^Toro de Stanford/ }));

    await user.click(lockSwitch());

    expect(radiusField()).toHaveValue('894,6');
    expect(readout('Gravedad aparente $a_c/g$')).toBe('1,00 g');
  });

  test('Restablecer returns to 1 rpm with "fijar 1 g" on', async () => {
    const user = userEvent.setup();
    renderLab();
    fireEvent.change(rpmSlider(), { target: { value: '5' } });
    await user.click(lockSwitch());

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(lockSwitch()).toBeChecked();
    expect(radiusField()).toHaveValue('894,6');
  });

  test('the scene draws both vectors with a legend and the log bar label', () => {
    renderLab();

    const legend = screen.getByRole('list', { name: 'Leyenda del hábitat' });
    expect(mathSourceText(legend)).toContain('Aceleración centrípeta $a_c$, hacia el eje');
    expect(mathSourceText(legend)).toContain(
      'Gravedad aparente $g_\\text{ap} = -a_c$, hacia afuera',
    );
    expect(screen.getByTestId('habitat-scene').querySelector('[data-vector="ac"]')).not.toBeNull();
    expect(screen.getByTestId('habitat-scene').querySelector('[data-vector="gap"]')).not.toBeNull();
    expect(screen.getByText('escala logarítmica')).toBeInTheDocument();
  });

  test('the drawer offers speeds up to 8×, loop off, and hides the vectors', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    const dialog = screen.getByRole('dialog');
    const speed = within(dialog).getByRole('combobox', { name: 'Velocidad' });
    expect(within(speed).getByRole('option', { name: '8×' })).toBeInTheDocument();
    expect(within(dialog).getByRole('switch', { name: 'Repetir' })).not.toBeChecked();

    await user.click(
      within(dialog).getByRole('switch', { name: 'Vectores a sub c y gravedad aparente' }),
    );

    expect(screen.getByTestId('habitat-scene').querySelector('[data-vector="ac"]')).toBeNull();
  });

  test('typing a radius with "fijar 1 g" on solves the spin: 100 m needs 2,991 rpm', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.clear(radiusField());
    await user.type(radiusField(), '100{Enter}');

    expect(screen.getByRole('textbox', { name: /^Velocidad de giro/ })).toHaveValue('2,991');
    expect(readout('Gravedad aparente $a_c/g$')).toBe('1,00 g');
  });

  test('the speed setting reaches the clock: one 100 ms frame at 8× advances 6 · 8 · 0,1 s', async () => {
    const frames = installFrameQueue();
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    const speed = within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Velocidad' });
    await user.selectOptions(speed, '8');
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Reproducir' }));
    frames.flush(1000);
    // The settled time the transport reads is synced every 100 ms of playback.
    frames.flush(1100);

    expect(timelineText()).toBe('t = 4,80 s');
    frames.restore();
  });

  test('a slow spin of 0,5 RPM (T = 120 s) keeps the t readout in seconds, as the page states', () => {
    renderLab();
    fireEvent.change(rpmSlider(), { target: { value: '0.5' } });

    fireEvent.change(screen.getByRole('slider', { name: 'Línea de tiempo' }), {
      target: { value: '1000' },
    });

    expect(timelineText()).toBe('t = 120,0 s');
  });

  test('at 1× the same frame advances only 6 · 0,1 s', async () => {
    const frames = installFrameQueue();
    const user = userEvent.setup();
    renderLab();

    await user.click(screen.getByRole('button', { name: 'Reproducir' }));
    frames.flush(1000);
    frames.flush(1100);

    expect(timelineText()).toBe('t = 0,60 s');
    frames.restore();
  });

  test('moving a parameter pauses playback', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(screen.getByTestId('habitat-lab')).toHaveAttribute('data-playing', 'true');

    fireEvent.change(rpmSlider(), { target: { value: '3' } });

    expect(screen.getByTestId('habitat-lab')).toHaveAttribute('data-playing', 'false');
  });

  test('every character of the lab, its notes and the settings outside KaTeX is one IBM Plex draws', async () => {
    const user = userEvent.setup();
    renderLab();

    expect(plexViolations(document.body)).toEqual([]);
    await user.click(lockSwitch());
    expect(plexViolations(document.body)).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    expect(plexViolations(document.body)).toEqual([]);
  });

  test('the fixed-1-g note writes its two equations in KaTeX', () => {
    renderLab();
    const note = mathSourceText(screen.getByText(/Con 1 g fijo/));

    expect(note).toContain('$r = g/\\omega^2$');
    expect(note).toContain('$\\omega = \\sqrt{g/r}$');
  });
});
