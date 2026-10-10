// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import JumpLab from './JumpLab';

/** Identity CTM on every svg: client pixels are viewBox units, so DOM coordinates are pointer ones. */
function mockIdentityCtm(container: HTMLElement): void {
  for (const svg of container.querySelectorAll('svg')) {
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
    });
  }
}

function renderLab() {
  const view = render(<JumpLab />);
  mockIdentityCtm(view.container);
  return view;
}

/** The value text of a LabShell readout row, normalised to plain spaces. */
function readout(label: string): string {
  const row = screen.getByText(label, { selector: 'span' }).parentElement as HTMLElement;
  return (row.lastElementChild?.textContent ?? '').replace(/\s/g, ' ');
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
    expect(screen.getByTestId('lab-footnote')).toHaveTextContent(/topes de caída.*0,34 s/);
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
      expect.stringMatching(/vₓ = 10,75/),
    );
  });

  test('dragging the marker along the curve seeks t and keeps the clock paused', () => {
    renderLab();
    expect(timeline()).toHaveValue('0');

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

  test('the Euler integrator lowers the apex and says so in a footnote', async () => {
    const user = userEvent.setup();
    const { container } = renderLab();
    await user.click(gear());
    const dialog = container.querySelector('dialog') as HTMLDialogElement;

    await user.selectOptions(within(dialog).getByLabelText('Integrador'), 'euler');

    expect(readout('Altura máxima')).toBe('0,71 m');
    expect(screen.getByTestId('lab-footnote')).toHaveTextContent(/Euler semi-implícito/);
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

    expect(screen.getByTestId('clamp-note')).toHaveTextContent(/impulso v₀, gravedad g/);
    expect((v0Range() as HTMLInputElement).value).toBe('25');
  });
});
