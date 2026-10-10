// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import TyreLab from './TyreLab';

const FOOTNOTE = 'Parámetros ilustrativos, no medidos.';

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
  const view = render(<TyreLab footnote={FOOTNOTE} />);
  mockIdentityCtm();
  return view;
}

/** The value text of a LabShell readout row, normalised to plain spaces. */
function readout(label: string): string {
  const row = screen.getByText(label, { selector: 'span' }).parentElement as HTMLElement;
  return (row.lastElementChild?.textContent ?? '').replace(/\s/g, ' ');
}

const temperatureCursor = () => screen.getByRole('slider', { name: 'Temperatura T' });
const loadCursor = () => screen.getByRole('slider', { name: 'Carga vertical F_z' });
const temperatureField = () => screen.getByRole('textbox', { name: /^Temperatura de la banda/ });
const loadField = () => screen.getByRole('textbox', { name: /^Carga sobre la llanta/ });

describe('TyreLab', () => {
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

  test('opens at 120 °C and 4 000 N, where both models give 6 400 N', () => {
    renderLab();

    expect(readout('Coeficiente de agarre μ(T)')).toBe('1,80');
    expect(readout('Fuerza lateral lineal F_y')).toBe('6 400 N');
    expect(readout('Fuerza lateral real F_y')).toBe('6 400 N');
    expect(readout('Coeficiente efectivo μ')).toBe('1,60');
    expect(screen.getByTestId('lab-footnote')).toHaveTextContent(FOOTNOTE);
  });

  test('moving the load cursor to 8 000 N shows 11 943 N', async () => {
    const user = userEvent.setup();
    renderLab();

    loadCursor().focus();
    await user.keyboard('{PageUp}{PageUp}{PageUp}{PageUp}');

    expect(loadCursor()).toHaveAttribute('aria-valuenow', '8000');
    expect(readout('Fuerza lateral real F_y')).toBe('11 943 N');
    expect(readout('Fuerza lateral lineal F_y')).toBe('12 800 N');
    expect(readout('Coeficiente efectivo μ')).toBe('1,49');
    expect(loadField()).toHaveValue('8000');
  });

  test('the presets load their state, mark themselves pressed and update the readouts', async () => {
    const user = userEvent.setup();
    renderLab();
    const presets = screen.getByRole('group', { name: 'Valores de referencia' });

    await user.click(within(presets).getByRole('button', { name: /^Llanta fría/ }));
    expect(temperatureField()).toHaveValue('60');
    expect(loadField()).toHaveValue('8000');
    expect(readout('Coeficiente de agarre μ(T)')).toBe('1,11');
    expect(within(presets).getByRole('button', { name: /^Llanta fría/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(presets).getByRole('button', { name: /^Carga ligera/ }));
    expect(readout('Fuerza lateral lineal F_y')).toBe('3 200 N');
    expect(readout('Fuerza lateral real F_y')).toBe('3 430 N');

    await user.click(within(presets).getByRole('button', { name: /^Compuesto C4/ }));
    expect(screen.getByText('Ventana de trabajo C4 (2019)')).toBeInTheDocument();
    expect(readout('Coeficiente de agarre μ(T)')).toBe('1,80');
    expect(readout('Fuerza lateral real F_y')).toBe('11 943 N');

    // Moving a cursor off the preset's values releases its button.
    temperatureCursor().focus();
    await user.keyboard('{ArrowRight}');
    expect(within(presets).getByRole('button', { name: /^Compuesto C4/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('choosing C4 changes the band label', async () => {
    const user = userEvent.setup();
    renderLab();
    expect(screen.getByText('Ventana de trabajo C3 (2019)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /^Compuesto/ }), 'C4');

    expect(screen.getByText('Ventana de trabajo C4 (2019)')).toBeInTheDocument();
    expect(screen.queryByText('Ventana de trabajo C3 (2019)')).toBeNull();
    // 120 °C is the C4 window's upper edge: 97 % of the peak.
    expect(readout('Coeficiente de agarre μ(T)')).toBe('1,75');
  });

  test('dragging the temperature cursor changes μ(T) and the temperature field', () => {
    renderLab();
    const before = readout('Coeficiente de agarre μ(T)');
    const knob = temperatureCursor().querySelectorAll('circle')[1] as SVGCircleElement;
    const x = Number(knob.getAttribute('cx'));

    fireEvent.pointerDown(temperatureCursor(), { pointerId: 1, clientX: x, clientY: 30 });
    fireEvent.pointerMove(temperatureCursor(), { pointerId: 1, clientX: x - 200, clientY: 30 });
    fireEvent.pointerUp(temperatureCursor(), { pointerId: 1, clientX: x - 200, clientY: 30 });

    expect(readout('Coeficiente de agarre μ(T)')).not.toBe(before);
    expect(Number(temperatureCursor().getAttribute('aria-valuenow'))).toBeLessThan(120);
    expect(Number.isInteger(Number(temperatureCursor().getAttribute('aria-valuenow')))).toBe(true);
    expect(temperatureField()).not.toHaveValue('120');
  });

  test('typing 60 °C moves the temperature cursor and scales the load curves', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.clear(temperatureField());
    await user.type(temperatureField(), '60{Enter}');

    expect(temperatureCursor()).toHaveAttribute('aria-valuenow', '60');
    expect(readout('Coeficiente de agarre μ(T)')).toBe('1,11');
    expect(readout('Fuerza lateral lineal F_y')).toBe('3 931 N');
    expect(readout('Fuerza lateral real F_y')).toBe('3 931 N');
  });

  test('the load field drives the load cursor', () => {
    renderLab();

    fireEvent.change(screen.getByRole('slider', { name: /^Carga sobre la llanta/ }), {
      target: { value: '2000' },
    });

    expect(loadCursor()).toHaveAttribute('aria-valuenow', '2000');
  });

  test('at zero load the effective μ is undefined and reads as a dash', async () => {
    const user = userEvent.setup();
    renderLab();

    loadCursor().focus();
    await user.keyboard('{Home}');

    expect(readout('Fuerza lateral real F_y')).toBe('0 N');
    expect(readout('Coeficiente efectivo μ')).toBe('—');
  });

  test('two plots with °C and N axes, the load legend and no transport bar', () => {
    renderLab();

    expect(screen.getByText('Temperatura T (°C)')).toBeInTheDocument();
    expect(screen.getByText('Carga vertical F_z (N)')).toBeInTheDocument();
    const legend = screen.getByRole('list', { name: 'Leyenda' });
    expect(legend).toHaveTextContent('Modelo lineal F = μ₀ f(T) F_z');
    expect(legend).toHaveTextContent('Con sensibilidad a la carga, F = μ(F_z) f(T) F_z');
    expect(screen.queryByRole('button', { name: 'Reproducir' })).toBeNull();
    expect(screen.queryByRole('slider', { name: 'Línea de tiempo' })).toBeNull();
  });

  test('Restablecer returns to 120 °C, 4 000 N and C3', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    await user.selectOptions(
      within(screen.getByRole('dialog')).getByRole('combobox', { name: /^Compuesto/ }),
      'C4',
    );
    await user.keyboard('{Escape}');
    loadCursor().focus();
    await user.keyboard('{End}');

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(loadCursor()).toHaveAttribute('aria-valuenow', '4000');
    expect(temperatureCursor()).toHaveAttribute('aria-valuenow', '120');
    expect(screen.getByText('Ventana de trabajo C3 (2019)')).toBeInTheDocument();
  });

  test('with one global decimal the μ readouts show one decimal and forces stay whole', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('tab', { name: 'Global' }));
    await user.click(within(dialog).getByText('1', { exact: true }));

    expect(readout('Coeficiente de agarre μ(T)')).toBe('1,8');
    expect(readout('Coeficiente efectivo μ')).toBe('1,6');
    expect(readout('Fuerza lateral real F_y')).toBe('6 400 N');
  });
});
