// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { mathSourceText } from '../../../test-inline-math';
import { plexViolations } from '../../../test-glyphs';
import { formulasOf } from '../../lab/TexSeed';
import DroneLab from './DroneLab';
import { DRONE_LAB_FORMULAS } from './droneLabFormulas';
import { readout } from '../../../test-readout';

const USAGE = 'La reproducción va 20 veces más rápida que el vuelo.';
const LEFT_OUT = 'Mi dron se detiene en cada vértice y no hay viento.';
/**
 * The declared route is a large JSON the lab imports lazily; under coverage instrumentation the
 * first import can outlast findBy's 1 s default. The dataset is warmed in beforeAll, and this
 * timeout is the margin left for the render itself.
 */
const LAB_READY_TIMEOUT_MS = 5_000;

// Load the dataset once, so the lab's own dynamic import resolves from the module cache.
beforeAll(async () => {
  await import('../../../data/drone-route.json');
});

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
  const view = render(<DroneLab usage={USAGE} leftOut={LEFT_OUT} />);
  await screen.findByTestId('drone-lab', {}, { timeout: LAB_READY_TIMEOUT_MS });
  mockIdentityCtm();
  return view;
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
    render(<DroneLab usage={USAGE} leftOut={LEFT_OUT} />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando los datos de la ruta…');

    await screen.findByTestId('drone-lab', {}, { timeout: LAB_READY_TIMEOUT_MS });

    expect(readout('Duración de la ruta')).toBe(DECLARED_DURATION);
    // The opening seek is an effect after the first ready commit; wait for it rather than race it.
    await waitFor(() => expect(valueText(timeline())).toBe('t = 30,0 s'));
    expect(screen.getByText(/crucero \(a = 0\)/)).toBeInTheDocument();
    expect(readout('Rapidez |v|')).toBe('10,00 m/s');
    expect(modifiedNote()).toBeNull();
    expect(screen.queryByTestId('lab-footnote')).toBeNull();
    expect(screen.getByTestId('drone-profiles')).toBeInTheDocument();
  });

  test('lays out two levels, with no scenario: v_máx and a_máx, then the readouts', async () => {
    const { container } = await renderLab();
    const region = (name: string) => screen.getByRole('region', { name });

    expect(
      within(region('Parámetros')).getByRole('slider', { name: /Rapidez máxima/ }),
    ).toBeTruthy();
    expect(
      within(region('Parámetros')).getByRole('slider', { name: /Aceleración máxima/ }),
    ).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Escenario' })).toBeNull();
    expect(container.querySelector('[data-lab-level="scenario"]')).toBeNull();
    expect(within(region('Lecturas')).getByText('Duración de la ruta')).toBeInTheDocument();
  });

  test('the legend, the phase and the notes on the route read the map, in the canvas notes', async () => {
    const { container } = await renderLab();
    const notes = container.querySelector('[data-lab-canvas-notes]') as HTMLElement;

    expect(within(notes).getByRole('list', { name: 'Leyenda del mapa' })).toBeInTheDocument();
    expect(notes).toHaveTextContent('Fase: crucero (a = 0)');
    expect(within(notes).getByRole('alert')).toBeEmptyDOMElement();
    expect(screen.getByTestId('route-map').closest('[data-lab-canvas]')).not.toContainElement(
      notes,
    );
    dragBy('stop-A', 60, -40);
    expect(within(notes).getByTestId('route-modified')).toBeInTheDocument();
  });

  test('beside the gear, the chips «vectores», «rastro» and «1×» follow the drawer', async () => {
    const user = userEvent.setup();
    await renderLab();
    const chips = () =>
      within(screen.getByRole('group', { name: 'Ajustes activos' }))
        .getAllByRole('button')
        .map((chip) => chip.textContent);
    expect(chips()).toEqual(['vectores', 'rastro', '1×']);

    await user.click(screen.getByRole('button', { name: 'rastro' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('switch', { name: 'Rastro' }));

    expect(chips()).toEqual(['vectores', '1×']);
  });

  test('how to use it and what the model leaves out wait in two closed disclosures', async () => {
    const { container } = await renderLab();
    const [usage, leftOut] = [...container.querySelectorAll('details')];

    expect(usage.open || leftOut.open).toBe(false);
    expect(usage).toHaveTextContent('Arrastra las paradas A, B y C');
    expect(usage).toHaveTextContent('La ruta se recalcula al soltar.');
    expect(usage).toHaveTextContent(USAGE);
    expect(leftOut).toHaveTextContent(LEFT_OUT);
  });

  test('the loading skeleton already has the stage and the panel, so the lab does not move the page', () => {
    render(<DroneLab usage={USAGE} leftOut={LEFT_OUT} />);

    const skeleton = screen.getByTestId('drone-lab-loading');
    expect(skeleton.querySelector('[data-skeleton="stage"]')).not.toBeNull();
    expect(skeleton.querySelector('[data-skeleton="panel"]')).not.toBeNull();
    expect(within(skeleton).getByRole('status')).toHaveTextContent(
      'Cargando los datos de la ruta…',
    );
  });

  test('at t ≈ 65 s the drone brakes into A: |a| = 2,5 m/s² opposite to v', async () => {
    await renderLab();

    // The timeline runs 0–1000 over the route's 387,43 s: 168 is t ≈ 65,09 s.
    fireEvent.change(timeline(), { target: { value: '168' } });

    expect(valueText(timeline())).toMatch(/^t = 65,\d s$/);
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
    const text = mathSourceText(legend).replace(/\s/g, ' ');
    expect(text).toContain('Velocidad $\\vec v$: 1 m/s = 15 m');
    expect(text).toContain('Aceleración $\\vec a$: 1 m/s² = 60 m');
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
    expect(valueText(timeline())).not.toBe('t = 30,0 s');
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

  test('every character of the lab, the settings and the charts outside KaTeX is one IBM Plex draws', async () => {
    const user = userEvent.setup();
    await renderLab();
    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));

    expect(plexViolations(document.body)).toEqual([]);
  });

  test('every formula of the labels that mount after the data is one the skeleton seeds', async () => {
    const user = userEvent.setup();
    const usage = 'La reproducción va más rápida: $t_b$ y $v_y$.';
    const leftOut = 'El dron no frena en $t_a$ y la nota usa $v_x$.';
    render(<DroneLab usage={usage} leftOut={leftOut} />);
    await screen.findByTestId('drone-lab', {}, { timeout: LAB_READY_TIMEOUT_MS });
    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));

    const shown = formulasOf(mathSourceText(document.body));
    const seeded = [...DRONE_LAB_FORMULAS, ...formulasOf(usage), ...formulasOf(leftOut)];

    expect(shown).toContain('v_\\text{máx}');
    expect(shown.filter((tex) => !seeded.includes(tex))).toEqual([]);
    expect(DRONE_LAB_FORMULAS.filter((tex) => !shown.includes(tex))).toEqual([]);
  });
});
