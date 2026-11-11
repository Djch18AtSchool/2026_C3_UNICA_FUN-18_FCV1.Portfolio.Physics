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

const USAGE = 'La vista «Ruta» va 4 veces más rápida que el vuelo.';
const LEFT_OUT = 'Mi dron se detiene en cada vértice y no hay viento.';
/**
 * The declared route is a large JSON the lab imports lazily; under coverage instrumentation the
 * first import can outlast findBy's 1 s default. The dataset is warmed in beforeAll, and this
 * timeout is the margin left for the render itself.
 */
const LAB_READY_TIMEOUT_MS = 5_000;
/** A state the lab reaches in an effect after a render (the opening seek, an edited route). */
const SETTLE_TIMEOUT_MS = 3_000;
/**
 * Each test may wait for the lab, then for a settled state, then act: more than vitest's 5 s
 * default, which equals the lab's own wait and left no room for the rest under coverage.
 */
const TEST_TIMEOUT_MS = LAB_READY_TIMEOUT_MS + 2 * SETTLE_TIMEOUT_MS + 5_000;

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

/** The transport's reading once the lab has made its opening seek (to 30 s, cruising on leg 1). */
const OPENING_TIME = /^t = 30,00\s+s$/;

/**
 * Renders the lab, waits for the lazily loaded declared route and for the opening seek, an effect
 * after the first ready commit: a test that read the phase or the readouts before it raced it.
 */
async function renderLab() {
  const view = render(<DroneLab usage={USAGE} leftOut={LEFT_OUT} />);
  await screen.findByTestId('drone-lab', {}, { timeout: LAB_READY_TIMEOUT_MS });
  await waitFor(
    () =>
      expect(screen.getByRole('slider', { name: 'Línea de tiempo' })).toHaveAttribute(
        'aria-valuetext',
        expect.stringMatching(OPENING_TIME),
      ),
    { timeout: SETTLE_TIMEOUT_MS },
  );
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

describe('DroneLab', { timeout: TEST_TIMEOUT_MS }, () => {
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
    await waitFor(() => expect(valueText(timeline())).toBe('t = 30,00 s'), {
      timeout: SETTLE_TIMEOUT_MS,
    });
    expect(mathSourceText(screen.getByTestId('drone-lab'))).toContain('crucero ($\\vec a = 0$)');
    expect(readout('Rapidez |v|')).toBe('10,00 m/s');
    expect(modifiedNote()).toBeNull();
    expect(screen.getByTestId('drone-profiles')).toBeInTheDocument();
  });

  test('lays out three levels: v_máx and a_máx, the scenario with the view, then the readouts', async () => {
    const { container } = await renderLab();
    const region = (name: string) => screen.getByRole('region', { name });

    expect(
      within(region('Parámetros')).getByRole('slider', { name: /Rapidez máxima/ }),
    ).toBeTruthy();
    expect(
      within(region('Parámetros')).getByRole('slider', { name: /Aceleración máxima/ }),
    ).toBeTruthy();
    const levels = [...container.querySelectorAll('[data-lab-level]')].map((level) =>
      level.getAttribute('data-lab-level'),
    );
    expect(levels).toEqual(['params', 'scenario', 'readouts']);
    expect(
      within(region('Escenario')).getByRole('radiogroup', { name: 'Vista' }),
    ).toBeInTheDocument();
    expect(within(region('Lecturas')).getByText('Duración de la ruta')).toBeInTheDocument();
    expect(within(region('Lecturas')).getByText('Instante en la ruta')).toBeInTheDocument();
  });

  test('the legend, the phase and the notes on the route read the map, in the canvas notes', async () => {
    const { container } = await renderLab();
    const notes = container.querySelector('[data-lab-canvas-notes]') as HTMLElement;

    expect(within(notes).getByRole('list', { name: 'Leyenda del mapa' })).toBeInTheDocument();
    expect(mathSourceText(notes)).toContain('Fase: crucero ($\\vec a = 0$)');
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

  test('at the end of the first leg the drone brakes into A: |a| = 2,5 m/s² opposite to v', async () => {
    await renderLab();

    // «Tramo» spreads 0–1000 over the leg's 67,25 s: 950 is t ≈ 63,9 s, in the braking.
    fireEvent.change(timeline(), { target: { value: '950' } });

    expect(valueText(timeline())).toMatch(/^t = 63,\d+ s$/);
    expect(mathSourceText(screen.getByTestId('drone-lab'))).toContain(
      'frenando ($\\vec a$ opuesta a $\\vec v$)',
    );
    expect(readout('Aceleración |a|')).toBe('2,50 m/s²');
  });

  test('in «Ruta» the same braking is at t ≈ 65 s of the whole route', async () => {
    const user = userEvent.setup();
    await renderLab();
    await user.click(screen.getByRole('radio', { name: 'Ruta' }));

    // The timeline runs 0–1000 over the route's 387,43 s: 168 is t ≈ 65,09 s.
    fireEvent.change(timeline(), { target: { value: '168' } });

    expect(valueText(timeline())).toMatch(/^t = 65,\d+ s$/);
    expect(mathSourceText(screen.getByTestId('drone-lab'))).toContain(
      'frenando ($\\vec a$ opuesta a $\\vec v$)',
    );
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

    await screen.findByTestId('route-modified', {}, { timeout: SETTLE_TIMEOUT_MS });
    expect(
      Number(readout('Duración de la ruta').replace(',', '.').replace(' s', '')),
    ).toBeGreaterThan(600);
  });

  test('a new aₘₐₓ regenerates the route: gentler braking takes longer', async () => {
    await renderLab();
    const aMax = screen.getByRole('slider', { name: /Aceleración máxima/ });

    fireEvent.change(aMax, { target: { value: '1' } });

    await screen.findByTestId('route-modified', {}, { timeout: SETTLE_TIMEOUT_MS });
    expect(
      Number(readout('Duración de la ruta').replace(',', '.').replace(' s', '')),
    ).toBeGreaterThan(400);
  });

  test('dragging the drone along the route seeks t and pauses a playing clock', async () => {
    const user = userEvent.setup();
    await renderLab();
    await user.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(screen.getByTestId('drone-lab')).toHaveAttribute('data-playing', 'true');

    dragTo('drone-marker', knobCentre('stop-B'));

    expect(screen.getByTestId('drone-lab')).toHaveAttribute('data-playing', 'false');
    expect(valueText(timeline())).not.toBe('t = 30,00 s');
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

  describe('the views «Tramo» and «Ruta»', () => {
    const marks = () => document.querySelectorAll('[data-transport-mark]').length;
    const badge = () =>
      [...(document.querySelector('[data-time-scale-badge]')?.children ?? [])]
        .map((part) => part.textContent)
        .join(' ')
        .replace(/\s/g, ' ');
    const choose = (name: string | RegExp) => userEvent.click(screen.getByRole('radio', { name }));
    const nextEvent = () =>
      userEvent.click(screen.getByRole('button', { name: 'Evento siguiente' }));

    test('opens on «Tramo», the first leg at real speed, with its four marks and the scale on the map', async () => {
      await renderLab();

      expect(screen.getByRole('radio', { name: 'Tramo' })).toBeChecked();
      expect(screen.getByRole('combobox', { name: 'Tramo mostrado' })).toHaveValue('0');
      expect(marks()).toBe(4);
      expect(badge()).toBe('×1 velocidad real');
      expect(screen.getByTestId('drone-view-note')).toHaveTextContent(
        'Sale en t = 0,0 s de la ruta y dura 67,2 s.',
      );
      expect(screen.getByTestId('route-map').closest('.relative')).toContainElement(
        document.querySelector('[data-time-scale-badge]') as HTMLElement,
      );
    });

    test('«Ruta» plays the whole route at ×4, with a mark on the departure and each arrival', async () => {
      await renderLab();

      await choose('Ruta');

      expect(marks()).toBe(5);
      expect(badge()).toBe('×4 cámara rápida');
      expect(screen.queryByRole('combobox', { name: 'Tramo mostrado' })).toBeNull();
      expect(screen.getByTestId('drone-view-note')).toHaveTextContent(
        'La ruta entera dura 387,4 s.',
      );
    });

    test('switching view keeps the drone where it is on the route', async () => {
      await renderLab();
      const position = () => [readout('Posición x'), readout('Posición y')];
      const before = position();

      await choose('Ruta');

      expect(readout('Instante en la ruta')).toBe('30,00 s');
      expect(position()).toEqual(before);
    });

    test('«Evento siguiente» in «Ruta» goes to the arrival at A, the drone at rest on it', async () => {
      await renderLab();
      await choose('Ruta');

      await nextEvent();

      expect(readout('Instante en la ruta')).toBe('67,30 s');
      // The mark is a sample of the flight, so the stop reads exactly at rest.
      expect(readout('Rapidez |v|')).toBe('0,00 m/s');
      expect(readout('Aceleración |a|')).toBe('0,00 m/s²');
      expect(mathSourceText(screen.getByTestId('drone-lab'))).toContain('detenido en un vértice');
      expect(readout('Posición x')).toBe('600,00 m');
      expect(readout('Posición y')).toBe('200,00 m');
    });

    test('«Evento siguiente» in «Tramo» goes through the end of the acceleration, the braking and the arrival', async () => {
      await renderLab();
      await userEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
      const times: string[] = [];

      for (let i = 0; i < 3; i += 1) {
        await nextEvent();
        times.push(valueText(timeline()));
      }

      expect(times).toEqual([
        't = 4,00 s · Fin de la aceleración',
        't = 63,30 s · Inicio del frenado',
        't = 67,30 s · Llegada a A',
      ]);
    });

    test('from «Ruta» to «Tramo» the leg is the one the drone is on, and time carries over', async () => {
      await renderLab();
      await choose('Ruta');
      fireEvent.change(timeline(), { target: { value: '300' } });
      const at = readout('Instante en la ruta');

      await choose('Tramo');

      expect(screen.getByRole('combobox', { name: 'Tramo mostrado' })).toHaveValue('1');
      expect(readout('Instante en la ruta')).toBe(at);
      expect(marks()).toBe(4);
    });

    test('choosing another leg opens it cruising, with its own start on the route', async () => {
      await renderLab();

      fireEvent.change(screen.getByRole('combobox', { name: 'Tramo mostrado' }), {
        target: { value: '3' },
      });

      expect(valueText(timeline())).toBe('t = 299,40 s');
      expect(readout('Instante en la ruta')).toBe('299,40 s');
      expect(screen.getByTestId('drone-view-note')).toHaveTextContent(
        'Sale en t = 269,4 s de la ruta y dura 118,0 s.',
      );
      expect(mathSourceText(screen.getByTestId('drone-lab'))).toContain('crucero');
    });

    test('in «Tramo» the drone cannot be dragged off its leg', async () => {
      await renderLab();

      dragTo('drone-marker', knobCentre('stop-C'));

      expect(
        Number(readout('Instante en la ruta').replace(',', '.').replace(' s', '')),
      ).toBeLessThanOrEqual(67.3);
    });

    test('the drone marker speaks route time inside the leg: Home and End go to its two ends', async () => {
      await renderLab();
      await choose('Ruta');
      fireEvent.change(timeline(), { target: { value: '300' } });
      await choose('Tramo');
      const drone = screen.getByTestId('drone-marker');

      expect([drone.getAttribute('aria-valuemin'), drone.getAttribute('aria-valuemax')]).toEqual([
        '87.2',
        '158.4',
      ]);
      drone.focus();
      await userEvent.keyboard('{End}');
      expect(readout('Instante en la ruta')).toBe('158,40 s');
      await userEvent.keyboard('{Home}');
      expect(readout('Instante en la ruta')).toBe('87,20 s');
    });

    test.each(['1', '2', '3'])(
      'in leg %s the profile charts read the same instant of the route as the readouts',
      async (leg) => {
        await renderLab();

        fireEvent.change(screen.getByRole('combobox', { name: 'Tramo mostrado' }), {
          target: { value: leg },
        });

        const reading = document.querySelector('[data-profile-reading]') as HTMLElement;
        const x = readout('Posición x').replace(' m', '');
        const y = readout('Posición y').replace(' m', '');
        expect(reading).toHaveTextContent(`x ${x} m`);
        expect(reading).toHaveTextContent(`y ${y} m`);
        const markerT = document
          .querySelector('[data-profile-marker]')
          ?.getAttribute('data-marker-t');
        expect(Number(markerT)).toBeCloseTo(
          Number(readout('Instante en la ruta').replace(',', '.').replace(' s', '')),
          1,
        );
      },
    );

    /** The four ways the lab says t, each as «t = …» with plain spaces. */
    const fourReadings = () => {
      const reading = document.querySelector('[data-profile-reading] dd') as HTMLElement;
      return {
        timeline: valueText(timeline()).replace(/ · .*$/, ''),
        readout: `t = ${readout('Instante en la ruta')}`,
        chart: `t = ${(reading.textContent ?? '').replace(/\s/g, ' ')}`,
        drone: valueText(screen.getByTestId('drone-marker')),
      };
    };

    test.each(['0', '1', '2', '3'])(
      'in leg %s one t is on screen, the route’s: timeline, readout, charts and drone agree',
      async (leg) => {
        await renderLab();
        fireEvent.change(screen.getByRole('combobox', { name: 'Tramo mostrado' }), {
          target: { value: leg },
        });
        fireEvent.change(timeline(), { target: { value: '437' } });

        const said = fourReadings();
        expect(said.readout).toMatch(/^t = \d+,\d{2} s$/);
        expect(said).toEqual({
          timeline: said.readout,
          readout: said.readout,
          chart: said.readout,
          drone: said.readout,
        });
      },
    );

    test('«Tramo» draws its leg wider on the map, from B to C; «Ruta» does not', async () => {
      await renderLab();
      fireEvent.change(screen.getByRole('combobox', { name: 'Tramo mostrado' }), {
        target: { value: '2' },
      });

      const leg = document.querySelector('[data-shown-leg]');
      const at = (name: string) => knobCentre(`stop-${name}`);
      expect(leg?.getAttribute('d')).toBe(`M${at('B').x} ${at('B').y} L${at('C').x} ${at('C').y}`);

      await choose('Ruta');
      expect(document.querySelector('[data-shown-leg]')).toBeNull();
    });

    test('in «Ruta» the four readings agree too, at the global decimals', async () => {
      await renderLab();
      await choose('Ruta');
      fireEvent.change(timeline(), { target: { value: '421' } });

      const said = fourReadings();
      expect(said.readout).toMatch(/^t = \d+,\d{2} s$/);
      expect(new Set(Object.values(said)).size).toBe(1);
    });

    test('«Restablecer» brings back the default view, the first leg cruising', async () => {
      await renderLab();
      await choose('Ruta');
      await userEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

      expect(screen.getByRole('radio', { name: 'Tramo' })).toBeChecked();
      expect(screen.getByRole('combobox', { name: 'Tramo mostrado' })).toHaveValue('0');
      expect(valueText(timeline())).toBe('t = 30,00 s');
    });

    test('an edited route moves the marks with it: the model, not a list, says when it arrives', async () => {
      await renderLab();
      await choose('Ruta');
      const arrivalAtA = async () => {
        await nextEvent();
        return readout('Instante en la ruta');
      };
      const declared = await arrivalAtA();
      await userEvent.click(screen.getByRole('button', { name: 'Evento anterior' }));

      dragBy('stop-A', 60, -40);

      expect(await arrivalAtA()).not.toBe(declared);
    });
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
