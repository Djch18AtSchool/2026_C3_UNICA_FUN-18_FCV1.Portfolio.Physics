// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import TyreLab from './TyreLab';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { svgText } from '../../../test-svg-text';
import { readout } from '../../../test-readout';

const LEFT_OUT = 'Deja fuera el ángulo de deriva, el desgaste, la presión y la caída.';

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
  const view = render(<TyreLab leftOut={LEFT_OUT} />);
  mockIdentityCtm();
  return view;
}

const temperatureCursor = () => screen.getByRole('slider', { name: 'Temperatura T' });
/** The cursor is named from the axis label F_z in words (mathTextToString). */
const loadCursor = () => screen.getByRole('slider', { name: 'Carga vertical F sub z' });
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

    expect(readout('Coeficiente de agarre $\\mu(T)$')).toBe('1,80');
    expect(readout('Fuerza lateral lineal $F_y$')).toBe('6 400 N');
    expect(readout('Fuerza lateral real $F_y$')).toBe('6 400 N');
    expect(readout('Coeficiente efectivo $\\mu$')).toBe('1,60');
  });

  test('the shell is the tiered one: T and F_z in Parámetros, the presets in Escenario', () => {
    const { container } = renderLab();
    const region = (name: string) => screen.getByRole('region', { name });

    expect(container.querySelector('[data-lab-shell="tiered"]')).not.toBeNull();
    expect(within(region('Parámetros')).getByRole('textbox', { name: /^Temperatura/ })).toBe(
      temperatureField(),
    );
    expect(within(region('Parámetros')).getByRole('textbox', { name: /^Carga/ })).toBe(loadField());
    expect(
      within(region('Escenario')).getByRole('group', { name: 'Valores de referencia' }),
    ).toBeInTheDocument();
    expect(within(region('Lecturas')).getByText(/^Fuerza lateral lineal/)).toBeInTheDocument();
    // The compound lives in the drawer; no clock, so no transport bar.
    expect(within(region('Parámetros')).queryByRole('combobox')).toBeNull();
    expect(container.querySelector('[data-lab-transport]')).toBeNull();
  });

  test('T and F_z stack in the 20 rem panel: no window-width columns', () => {
    renderLab();
    const grid = temperatureField().closest('[data-lab-level="params"]') as HTMLElement;

    expect(grid.innerHTML).not.toMatch(/\bsm:grid-cols/);
  });

  test('under the choice, one line with the active preset note and its source', async () => {
    const user = userEvent.setup();
    renderLab();
    // It opens at 120 °C and 4 000 N, which no preset has: no note yet.
    expect(screen.queryByTestId('preset-note')).toBeNull();

    await user.click(screen.getByRole('button', { name: /^C3 en ventana/ }));
    expect(screen.getByTestId('preset-note')).toHaveTextContent(
      /^En el óptimo del C3, la carga doble da 11 943 N.*Fuente: cálculo propio/,
    );

    await user.click(screen.getByRole('button', { name: /^Compuesto C4/ }));

    expect(screen.getByTestId('preset-note')).toHaveTextContent(/Fuente: supuesto del modelo/);
  });

  test('beside the gear, a chip with the compound that follows the drawer', async () => {
    const user = userEvent.setup();
    renderLab();
    const chips = () =>
      within(screen.getByRole('group', { name: 'Ajustes activos' }))
        .getAllByRole('button')
        .map((chip) => chip.getAttribute('aria-label'));
    expect(chips()).toEqual(['Compuesto C3 (105–135 °C)']);

    await user.click(screen.getByRole('button', { name: 'Compuesto C3 (105–135 °C)' }));
    await user.selectOptions(
      within(screen.getByRole('dialog')).getByRole('combobox', { name: /^Compuesto/ }),
      'C4',
    );

    expect(chips()).toEqual(['Compuesto C4 (90–120 °C)']);
  });

  test('how to use it says the drag and the keys, not the gear; what the model leaves out waits closed', () => {
    const { container } = renderLab();
    const usage = container.querySelector<HTMLDetailsElement>('details[data-lab-note="usage"]')!;
    const leftOut = container.querySelector<HTMLDetailsElement>(
      'details[data-lab-note="left-out"]',
    )!;

    expect(usage.open || leftOut.open).toBe(false);
    expect(usage).toHaveTextContent('Arrastra el cursor de cada gráfica');
    expect(usage).toHaveTextContent('con las flechas');
    expect(usage).not.toHaveTextContent('engranaje');
    expect(leftOut).toHaveTextContent(LEFT_OUT);
  });

  test('without the MDX text there is no empty «Qué deja fuera el modelo»', () => {
    const { container } = render(<TyreLab />);

    expect(container.querySelector('details[data-lab-note="left-out"]')).toBeNull();
    expect(container.querySelector('details[data-lab-note="usage"]')).not.toBeNull();
  });

  test('each plot reserves its height before it measures: its two aspects, by container width', () => {
    renderLab();

    for (const id of ['tyre-temperature-plot', 'tyre-load-plot']) {
      const plotSvg = within(screen.getByTestId(id)).getByRole('img') as unknown as SVGSVGElement;
      expect(plotSvg.style.getPropertyValue('--plot-aspect-compact')).toBe('1.1');
      expect(plotSvg.style.getPropertyValue('--plot-aspect-wide')).toBe('2');
    }
  });

  test('moving the load cursor to 8 000 N shows 11 943 N', async () => {
    const user = userEvent.setup();
    renderLab();

    loadCursor().focus();
    await user.keyboard('{PageUp}{PageUp}{PageUp}{PageUp}');

    expect(loadCursor()).toHaveAttribute('aria-valuenow', '8000');
    expect(readout('Fuerza lateral real $F_y$')).toBe('11 943 N');
    expect(readout('Fuerza lateral lineal $F_y$')).toBe('12 800 N');
    expect(readout('Coeficiente efectivo $\\mu$')).toBe('1,49');
    expect(loadField()).toHaveValue('8000');
  });

  test('the presets load their state, mark themselves pressed and update the readouts', async () => {
    const user = userEvent.setup();
    renderLab();
    const presets = screen.getByRole('group', { name: 'Valores de referencia' });

    await user.click(within(presets).getByRole('button', { name: /^Llanta fría/ }));
    expect(temperatureField()).toHaveValue('60');
    expect(loadField()).toHaveValue('8000');
    expect(readout('Coeficiente de agarre $\\mu(T)$')).toBe('1,11');
    expect(within(presets).getByRole('button', { name: /^Llanta fría/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(presets).getByRole('button', { name: /^Carga ligera/ }));
    expect(readout('Fuerza lateral lineal $F_y$')).toBe('3 200 N');
    expect(readout('Fuerza lateral real $F_y$')).toBe('3 430 N');

    await user.click(within(presets).getByRole('button', { name: /^Compuesto C4/ }));
    expect(screen.getByText('Ventana de trabajo C4 (2019)')).toBeInTheDocument();
    expect(readout('Coeficiente de agarre $\\mu(T)$')).toBe('1,80');
    expect(readout('Fuerza lateral real $F_y$')).toBe('11 943 N');

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
    expect(readout('Coeficiente de agarre $\\mu(T)$')).toBe('1,75');
  });

  test('dragging the temperature cursor changes μ(T) and the temperature field', () => {
    renderLab();
    const before = readout('Coeficiente de agarre $\\mu(T)$');
    const knob = temperatureCursor().querySelectorAll('circle')[1] as SVGCircleElement;
    const x = Number(knob.getAttribute('cx'));

    fireEvent.pointerDown(temperatureCursor(), { pointerId: 1, clientX: x, clientY: 30 });
    fireEvent.pointerMove(temperatureCursor(), { pointerId: 1, clientX: x - 200, clientY: 30 });
    fireEvent.pointerUp(temperatureCursor(), { pointerId: 1, clientX: x - 200, clientY: 30 });

    expect(readout('Coeficiente de agarre $\\mu(T)$')).not.toBe(before);
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
    expect(readout('Coeficiente de agarre $\\mu(T)$')).toBe('1,11');
    expect(readout('Fuerza lateral lineal $F_y$')).toBe('3 931 N');
    expect(readout('Fuerza lateral real $F_y$')).toBe('3 931 N');
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

    expect(readout('Fuerza lateral real $F_y$')).toBe('0 N');
    expect(readout('Coeficiente efectivo $\\mu$')).toBe('—');
  });

  test('two plots with °C and N axes, the load legend and no transport bar', () => {
    renderLab();

    const titles = [...document.querySelectorAll('figcaption')].map((caption) =>
      mathSourceText(caption),
    );
    expect(titles).toContain('Coeficiente de agarre $\\mu$ frente a la temperatura');
    expect(screen.getByText('Temperatura T (°C)')).toBeInTheDocument();
    expect(screen.getByText(svgText('Carga vertical Fz (N)'))).toBeInTheDocument();
    const legend = screen.getByRole('list', { name: 'Leyenda' });
    expect(mathSourceText(legend)).toContain('Modelo lineal $F = \\mu_0 f(T) F_z$');
    expect(mathSourceText(legend)).toContain(
      'Con sensibilidad a la carga, $F = \\mu(F_z) f(T) F_z$',
    );
    expect(screen.queryByRole('button', { name: 'Reproducir' })).toBeNull();
    expect(screen.queryByRole('slider', { name: 'Línea de tiempo' })).toBeNull();
  });

  test('every character outside KaTeX is one IBM Plex draws, with C3 and with C4', async () => {
    const user = userEvent.setup();
    const { container } = renderLab();
    expect(plexViolations(container)).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    await user.selectOptions(
      within(screen.getByRole('dialog')).getByRole('combobox', { name: /^Compuesto/ }),
      'C4',
    );
    await user.keyboard('{Escape}');
    for (const preset of [/^Llanta fría/, /^Carga ligera/]) {
      await user.click(screen.getByRole('button', { name: preset }));
      expect(plexViolations(container)).toEqual([]);
    }
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

    expect(readout('Coeficiente de agarre $\\mu(T)$')).toBe('1,8');
    expect(readout('Coeficiente efectivo $\\mu$')).toBe('1,6');
    expect(readout('Fuerza lateral real $F_y$')).toBe('6 400 N');
  });
});
