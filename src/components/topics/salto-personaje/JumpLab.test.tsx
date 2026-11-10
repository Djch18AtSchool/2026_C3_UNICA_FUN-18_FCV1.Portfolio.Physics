// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import JumpLab from './JumpLab';
import { readout } from '../../../test-readout';

/** Identity CTM on every svg: client pixels are viewBox units, so DOM coordinates are pointer ones. */
function mockIdentityCtm(container: HTMLElement): void {
  for (const svg of container.querySelectorAll('svg')) {
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
    });
  }
}

const LEFT_OUT = 'Modelo: omite los topes de caída; Mario baja en unos 0,34 s, no en 0,29 s.';

function renderLab() {
  const view = render(<JumpLab leftOut={LEFT_OUT} />);
  mockIdentityCtm(view.container);
  return view;
}

/** Centre of a draggable handle, read from its visible knob. */
function knobCentre(testId: string): { x: number; y: number } {
  const knob = screen.getByTestId(testId).querySelector('[data-knob]') as SVGCircleElement;
  return { x: Number(knob.getAttribute('cx')), y: Number(knob.getAttribute('cy')) };
}

function drag(testId: string, dx: number, dy: number): void {
  const handle = screen.getByTestId(testId);
  const start = knobCentre(testId);
  fireEvent.pointerDown(handle, { pointerId: 1, clientX: start.x, clientY: start.y });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: start.x + dx, clientY: start.y + dy });
  fireEvent.pointerUp(handle, { pointerId: 1, clientX: start.x + dx, clientY: start.y + dy });
}

const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const v0Range = () => screen.getByRole('slider', { name: /Impulso de salto/ });
const gear = () => screen.getByRole('button', { name: 'Ajustes del simulador' });

describe('JumpLab', () => {
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

  test('opens on Celeste with its four readouts and the Earth reference', () => {
    renderLab();

    expect(screen.getByRole('button', { name: /^Celeste/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(readout('Altura máxima')).toBe('0,76 m');
    expect(readout('Tiempo al ápice')).toBe('0,12 s');
    expect(readout('Tiempo en el aire')).toBe('0,23 s');
    expect(readout('Alcance')).toBe('2,62 m');
    expect(screen.getByText(/^Referencia terrestre, g = 9,81/)).toBeInTheDocument();
    expect(screen.getByText(/^Celeste, g = 112,50/)).toBeInTheDocument();
    expect(screen.queryByTestId('lab-footnote')).toBeNull();
  });

  test('dragging the launch-vector handle upwards raises v0 and the maximum height', () => {
    renderLab();

    drag('launch-handle', 0, -60);

    expect(Number((v0Range() as HTMLInputElement).value)).toBeGreaterThan(13.1);
    expect(Number(readout('Altura máxima').replace(',', '.').replace(' m', ''))).toBeGreaterThan(
      0.77,
    );
    expect(screen.getByRole('button', { name: /^Celeste/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('dragging the handle to the left lowers vx and with it the range, not the height', () => {
    renderLab();

    drag('launch-handle', -40, 0);

    expect(readout('Altura máxima')).toBe('0,76 m');
    expect(Number(readout('Alcance').replace(',', '.').replace(' m', ''))).toBeLessThan(2.62);
  });

  test('the handle moves with the arrow keys: up and down for v0, left and right for vx', async () => {
    const user = userEvent.setup();
    renderLab();
    screen.getByTestId('launch-handle').focus();

    await user.keyboard('{ArrowUp}{ArrowLeft}{ArrowLeft}');

    expect((v0Range() as HTMLInputElement).value).toBe('13.6');
    expect(screen.getByTestId('launch-handle')).toHaveAttribute(
      'aria-valuetext',
      expect.stringMatching(/v sub x = 10,75/),
    );
  });

  test('dragging the marker along the curve seeks t and pauses a playing clock', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(screen.getByTestId('jump-lab')).toHaveAttribute('data-playing', 'true');

    drag('jump-marker', 120, 0);

    expect(Number((timeline() as HTMLInputElement).value)).toBeGreaterThan(0);
    expect(screen.getByTestId('jump-lab')).toHaveAttribute('data-playing', 'false');
  });

  test('a finger on either handle does not pan the page', () => {
    renderLab();

    for (const testId of ['launch-handle', 'jump-marker']) {
      const notCancelled = fireEvent.touchStart(screen.getByTestId(testId), {
        touches: [{ clientX: 0, clientY: 0 }],
      });
      expect(notCancelled, testId).toBe(false);
    }
  });

  test('the marker steps through t with the arrow keys and jumps to the ends with Home and End', async () => {
    const user = userEvent.setup();
    renderLab();
    screen.getByTestId('jump-marker').focus();

    await user.keyboard('{End}');
    expect(timeline()).toHaveValue('1000');
    await user.keyboard('{ArrowLeft}');
    expect(Number((timeline() as HTMLInputElement).value)).toBeLessThan(1000);
    await user.keyboard('{Home}');
    expect(timeline()).toHaveValue('0');
  });

  test('the plot frames the live jump, letting the much larger Earth reference run off', () => {
    const { container } = renderLab();
    const plot = screen.getByTestId('jump-plot');
    const yTicks = [...plot.querySelectorAll('svg[role="img"] text[text-anchor="end"]')].map(
      (node) => Number((node.textContent ?? '').replace(',', '.')),
    );

    // Celeste peaks at 0,76 m; the Earth reference with the same impulse at 8,75 m.
    expect(Math.max(...yTicks)).toBeLessThan(3);
    expect(container.querySelector('[data-series="ghost"]')).not.toBeNull();
  });

  test('the clock lasts the air time of the live jump', () => {
    renderLab();

    fireEvent.change(timeline(), { target: { value: '1000' } });

    expect(screen.getByText(/^t = 0,233/)).toBeInTheDocument();
  });

  test('"Restablecer" goes back to Celeste', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('button', { name: /^Luna/ }));
    expect(readout('Altura máxima')).toBe('19,75 m');

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(readout('Altura máxima')).toBe('0,76 m');
    expect(screen.getByRole('button', { name: /^Celeste/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('the readouts follow the global decimals setting', () => {
    renderLab();

    act(() => setSettings({ decimals: 3 }));

    expect(readout('Altura máxima')).toBe('0,763 m');
    expect(readout('Tiempo al ápice')).toBe('0,116 s');
    expect(readout('Tiempo en el aire')).toBe('0,233 s');
    expect(readout('Alcance')).toBe('2,620 m');
  });

  test('the Euler integrator lowers the apex and says so in «Qué deja fuera el modelo»', async () => {
    const user = userEvent.setup();
    const { container } = renderLab();
    await user.click(gear());
    const dialog = container.querySelector('dialog') as HTMLDialogElement;

    await user.selectOptions(within(dialog).getByLabelText('Integrador'), 'euler');

    expect(readout('Altura máxima')).toBe('0,71 m');
    const leftOut = container.querySelector('details[data-lab-note="left-out"]') as HTMLElement;
    expect(leftOut).toHaveTextContent(/Euler semi-implícito/);
    expect(leftOut).toHaveTextContent(LEFT_OUT);
    // The integrator's line comes first, as it did when it led the footnote.
    expect(leftOut.textContent?.indexOf('Euler semi-implícito')).toBeLessThan(
      leftOut.textContent?.indexOf(LEFT_OUT) ?? 0,
    );
  });

  test('the gravity slider is a parameter of level 1: Earth gravity gives a 3,26 m apex at 8 m/s', () => {
    renderLab();

    fireEvent.change(v0Range(), { target: { value: '8' } });
    fireEvent.change(screen.getByRole('slider', { name: /^Gravedad g/ }), {
      target: { value: '9.81' },
    });

    expect(readout('Altura máxima')).toBe('3,26 m');
  });

  test('the integrator is in the notes only while the Euler one is chosen', () => {
    const { container } = renderLab();

    expect(container.querySelector('details[data-lab-note="left-out"]')).not.toHaveTextContent(
      'Euler semi-implícito',
    );
  });

  test('lays out the three levels: v0, g and the clamp notice; four references; the readouts', async () => {
    const user = userEvent.setup();
    renderLab();
    const region = (name: string) => screen.getByRole('region', { name });

    expect(within(region('Parámetros')).getByRole('slider', { name: /Impulso de salto/ })).toBe(
      v0Range(),
    );
    expect(within(region('Parámetros')).getByRole('slider', { name: /^Gravedad g/ })).toBeTruthy();
    const group = within(region('Escenario')).getByRole('group', { name: 'Valores de referencia' });
    expect(within(group).getAllByRole('button')).toHaveLength(4);
    expect(within(region('Lecturas')).getByText('Alcance')).toBeInTheDocument();

    // A design over the sliders' range: the notice sits with the parameters it clamps.
    expect(screen.queryByTestId('clamp-note')).toBeNull();
    const designer = screen.getByTestId('jump-designer');
    await user.clear(within(designer).getByLabelText('Tiempo al ápice (s)'));
    await user.type(within(designer).getByLabelText('Tiempo al ápice (s)'), '0,1');
    await user.click(within(designer).getByRole('button', { name: 'Aplicar' }));
    expect(within(region('Parámetros')).getByTestId('clamp-note')).toBeInTheDocument();
  });

  test('a preset has one line under the chips: its note and its source, linked when it has a page', async () => {
    const user = userEvent.setup();
    renderLab();
    const note = screen.getByTestId('preset-note');
    expect(note).toHaveTextContent('Fuente: Player.cs, Noel Berry (2018)');
    expect(within(note).getByRole('link')).toHaveAttribute(
      'href',
      'https://github.com/NoelFB/Celeste/blob/master/Source/Player/Player.cs',
    );

    await user.click(screen.getByRole('button', { name: /^Tierra/ }));

    expect(screen.getByTestId('preset-note')).toHaveTextContent('Fuente: g estándar, 9,81 m/s²');
    expect(within(screen.getByTestId('preset-note')).queryByRole('link')).toBeNull();
  });

  test('beside the gear, one chip per setting that is on, and the speed', async () => {
    const user = userEvent.setup();
    renderLab();
    const chips = () =>
      within(screen.getByRole('group', { name: 'Ajustes activos' }))
        .getAllByRole('button')
        .map((chip) => chip.getAttribute('aria-label')?.replace(/\s/g, ' '));
    expect(chips()).toEqual(['referencia', 'vector v', 'rastro', 'Velocidad 1×']);

    await user.click(screen.getByRole('button', { name: 'rastro' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('switch', { name: 'Rastro' }));

    expect(chips()).not.toContain('rastro');
  });

  test('the fall multiplier and the integrator get a chip once they differ from the plain jump', async () => {
    const user = userEvent.setup();
    const { container } = renderLab();
    const chips = () =>
      within(screen.getByRole('group', { name: 'Ajustes activos' }))
        .getAllByRole('button')
        .map((chip) => chip.getAttribute('aria-label')?.replace(/\s/g, ' '));

    await user.click(screen.getByRole('button', { name: /^Super Mario Bros\./ }));
    expect(chips()).toContain('caída 3,5 ×');

    await user.click(gear());
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    await user.selectOptions(within(dialog).getByLabelText('Integrador'), 'euler');
    expect(chips()).toContain('Integrador Euler semi-implícito');
  });

  test('«Cómo se usa» is not drawn without a text, and «Qué deja fuera el modelo» waits closed', () => {
    const { container } = renderLab();

    const notes = [...container.querySelectorAll('details')];
    expect(notes.map((details) => details.getAttribute('data-lab-note'))).toEqual(['left-out']);
    expect(notes[0].open).toBe(false);
  });

  test('a usage text from the MDX opens its own disclosure before the caveats', () => {
    const { container } = render(<JumpLab usage="Arrastra la punta." leftOut={LEFT_OUT} />);

    const notes = [...container.querySelectorAll('details')];
    expect(notes.map((details) => details.getAttribute('data-lab-note'))).toEqual([
      'usage',
      'left-out',
    ]);
  });

  test('the local settings hide the Earth reference and change the fall multiplier', async () => {
    const user = userEvent.setup();
    const { container } = renderLab();
    await user.click(gear());
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    expect(container.querySelector('[data-series="ghost"]')).not.toBeNull();

    await user.click(within(dialog).getByRole('switch', { name: 'Referencia terrestre' }));
    fireEvent.change(within(dialog).getByRole('slider', { name: /Multiplicador de caída/ }), {
      target: { value: '4' },
    });

    expect(container.querySelector('[data-series="ghost"]')).toBeNull();
    // t_air = v0/g + √(2h/(4g)) = 0.1164 + 0.0582 s.
    expect(readout('Tiempo en el aire')).toBe('0,17 s');
  });

  test('speed and repeat are local settings bound to the clock, repeat off by default', async () => {
    const user = userEvent.setup();
    const { container } = renderLab();
    await user.click(gear());
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    const repeat = within(dialog).getByRole('switch', { name: 'Repetir' });
    const speed = within(dialog).getByLabelText('Velocidad') as HTMLSelectElement;
    expect(repeat).not.toBeChecked();
    expect(speed.value).toBe('1');

    await user.click(repeat);
    await user.selectOptions(speed, '0.25');

    expect(repeat).toBeChecked();
    expect(speed.value).toBe('0.25');
  });

  test('the velocity vector and the trail can be switched off', async () => {
    const user = userEvent.setup();
    const { container } = renderLab();
    await user.click(gear());
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    expect(container.querySelector('[data-velocity]')).not.toBeNull();
    expect(container.querySelector('[data-trail]')).not.toBeNull();

    await user.click(within(dialog).getByRole('switch', { name: 'Vector velocidad' }));
    await user.click(within(dialog).getByRole('switch', { name: 'Rastro' }));

    expect(container.querySelector('[data-velocity]')).toBeNull();
    expect(container.querySelector('[data-trail]')).toBeNull();
  });

  test('"Diseñar el salto" sits below the lab and applies g and v0 from h and t_h', async () => {
    const user = userEvent.setup();
    renderLab();
    const designer = screen.getByTestId('jump-designer');
    expect(
      screen.getByTestId('jump-lab').compareDocumentPosition(designer) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // Defaults h = 2 m, t_h = 0,4 s: g = 25 m/s², v0 = 10 m/s, so h_max = 2 m.
    await user.click(within(designer).getByRole('button', { name: 'Aplicar' }));

    expect(readout('Altura máxima')).toBe('2,00 m');
    expect(readout('Tiempo al ápice')).toBe('0,40 s');
  });

  test('the designer refuses an empty height and clamps a design the sliders cannot show', async () => {
    const user = userEvent.setup();
    renderLab();
    const designer = screen.getByTestId('jump-designer');
    const height = within(designer).getByLabelText('Altura deseada (m)');
    const apply = within(designer).getByRole('button', { name: 'Aplicar' });

    await user.clear(height);
    expect(apply).toBeDisabled();
    expect(within(designer).getByText(/mayores que cero/)).toBeInTheDocument();

    // h = 10 m in 0,1 s asks for g = 2000 m/s² and v0 = 200 m/s.
    await user.type(height, '10');
    await user.clear(within(designer).getByLabelText('Tiempo al ápice (s)'));
    await user.type(within(designer).getByLabelText('Tiempo al ápice (s)'), '0,1');
    expect(within(designer).getByTestId('jump-designer-result')).toHaveTextContent(/2\s?000,00/);
    await user.click(apply);

    expect(mathSourceText(screen.getByTestId('clamp-note'))).toContain('impulso $v_0$, gravedad g');
    expect((v0Range() as HTMLInputElement).value).toBe('25');
  });
  test('the knobs may bleed past the plot edge, but the trail and the vectors stay inside it', () => {
    const { container } = renderLab();
    const clipOf = (node: Element | null) =>
      node?.closest('g[clip-path]')?.getAttribute('clip-path');
    const clipRect = (ref: string | null | undefined) => {
      const id = ref?.match(/^url\(#(.+)\)$/)?.[1] ?? '';
      const rect = container.querySelector(`clipPath[id="${id}"] rect`);
      return ['x', 'y', 'width', 'height'].map((name) => Number(rect?.getAttribute(name)));
    };
    const plotArea = clipRect(
      container.querySelector('svg[role="img"] g[clip-path]')?.getAttribute('clip-path'),
    );

    for (const selector of ['[data-velocity]', '[data-trail]']) {
      expect(clipRect(clipOf(container.querySelector(selector))), selector).toEqual(plotArea);
    }
    expect(clipRect(clipOf(screen.getByTestId('jump-marker')))).not.toEqual(plotArea);
  });

  test('every character of the lab, the designer and the settings outside KaTeX is one IBM Plex draws', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(gear());

    expect(plexViolations(document.body)).toEqual([]);
  });

  test('the launch handle says v_0 and v_x in words and the vectors carry drawn arrows', () => {
    const { container } = renderLab();

    expect(screen.getByTestId('launch-handle').getAttribute('aria-valuetext')).toMatch(
      /^v sub 0 = .*, v sub x = /,
    );
    expect(container.querySelector('[data-notation="vec v_0"]')).not.toBeNull();
    expect(container.querySelector('[data-velocity] [data-notation="vec v"]')).not.toBeNull();
  });
});
