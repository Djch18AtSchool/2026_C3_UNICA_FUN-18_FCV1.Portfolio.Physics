// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { mathSourceText } from '../../../test-inline-math';
import BounceLab from './BounceLab';
import { engineChips } from './BounceNotes';
import { BOUNCE_DEFAULTS } from './bouncePresets';

const USAGE = 'A 1× la reproducción va en tiempo real.';
const LEFT_OUT = 'El arrastre del aire.';

const params = () => screen.getByRole('region', { name: 'Parámetros' });
const scenario = () => screen.getByRole('region', { name: 'Escenario' });
const canvasNotes = () => document.querySelector('[data-lab-canvas-notes]') as HTMLElement;
const canvas = () => document.querySelector('[data-lab-canvas]') as HTMLElement;
const usageNote = () => document.querySelector('details[data-lab-note="usage"]') as HTMLElement;
const chips = () =>
  within(screen.getByRole('group', { name: 'Ajustes activos' }))
    .getAllByRole('button')
    .map((chip) => chip.getAttribute('aria-label'));
const collisionMode = () => screen.getByRole('button', { name: 'Choque de dos cuerpos' });
const CONTROL = 'a, button, input, select, textarea, summary, [tabindex]';

describe('BounceLab on the tiered shell', () => {
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

  test('the parameters are e and h0; the mode and the presets are the scenario', () => {
    render(<BounceLab usage={USAGE} leftOut={LEFT_OUT} />);

    expect(
      within(params()).getByRole('textbox', { name: /^Coeficiente de restitución e/ }),
    ).toBeVisible();
    expect(within(params()).getByRole('textbox', { name: /^Altura de suelta h/ })).toBeVisible();
    expect(within(params()).queryByRole('combobox')).toBeNull();
    expect(within(params()).queryByRole('button', { name: 'Choque de dos cuerpos' })).toBeNull();
    expect(
      within(scenario()).getByRole('button', { name: 'Rebote contra el piso' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(within(scenario()).getByRole('combobox', { name: 'Valores de referencia' })).toHaveValue(
      'tenis-itf',
    );
  });

  test('the preset line reads «note Fuente: source» and the select keeps its id for the guard', () => {
    render(<BounceLab />);
    const select = screen.getByRole('combobox', { name: 'Valores de referencia' });

    expect(select).toHaveAttribute('id', 'bounce-preset');
    expect(select.closest('[data-lab-presets]')).toHaveAttribute('data-lab-presets', 'select');
    expect(screen.getByTestId('preset-note')).toHaveTextContent(/^ITF Rules of Tennis 2026/);
    expect(mathSourceText(screen.getByTestId('preset-note'))).toMatch(
      /uso 0,745 con \$h_0\$ = 2,54 m\. Fuente: ITF Rules/,
    );
  });

  test('an edit leaves the preset: «Personalizado» is selected and the note says where it started', () => {
    render(<BounceLab />);

    fireEvent.change(screen.getByRole('slider', { name: /^Coeficiente de restitución e/ }), {
      target: { value: '0.5' },
    });

    const select = screen.getByRole('combobox', {
      name: 'Valores de referencia',
    }) as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(select.selectedOptions[0]).toHaveTextContent('Personalizado');
    expect(screen.getByTestId('preset-note')).toHaveTextContent(
      /^Partí de «Tenis ITF \(tipo 2\)» y cambié algún valor\./,
    );
  });

  test('the engine reads as «Motor» chips in the canvas notes, with no control among them', () => {
    render(<BounceLab />);
    const list = within(canvasNotes()).getByRole('list', { name: 'Motor' });

    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => mathSourceText(item).replace(/\s/g, ' ')),
    ).toEqual([
      '$\\Delta t$ = 1/60 s × 4 subpasos',
      'umbral 1,00 m/s',
      'regla máx',
      'suelo e = 0,00',
      '$\\beta$ = 0,00',
    ]);
    expect(canvasNotes().querySelector(CONTROL)).toBeNull();
    expect(within(canvasNotes()).getByTestId('bounce-summary')).toBeInTheDocument();
  });

  test('engineChips follows the settings: rate, substeps, threshold, rule, floor and β', () => {
    const texts = engineChips({
      ...BOUNCE_DEFAULTS,
      rate: 120,
      substeps: 2,
      combine: 'average',
      floorE: 0.5,
      baumgarte: 0.2,
    }).map(({ text }) => text);

    expect(texts[0]).toBe('$\\Delta t$\u00a0=\u00a01/120 s × 2 subpasos');
    expect(texts[2]).toBe('regla promedio');
    expect(texts[3]).toBe('suelo e = 0,50');
    expect(texts[4]).toBe('$\\beta$\u00a0=\u00a00,20');
  });

  test('the canvas is the scene alone; the chips by the gear show 1× and e(v) once it is on', async () => {
    const user = userEvent.setup();
    render(<BounceLab />);

    expect(within(canvas()).getByTestId('bounce-scene')).toBeInTheDocument();
    expect(within(canvas()).queryByTestId('bounce-summary')).toBeNull();
    expect(chips()).toEqual(['Velocidad 1×']);

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('switch', { name: /e\(v\)/ }));
    await user.keyboard('{Escape}');

    expect(chips()).toEqual(['e(v)', 'Velocidad 1×']);
  });

  test('«Cómo se usa» has the drag, the keys and the MDX text; in the collision, only the keys', async () => {
    const user = userEvent.setup();
    render(<BounceLab usage={USAGE} leftOut={LEFT_OUT} />);

    expect(usageNote()).toHaveTextContent(/Arrastra la manija/);
    expect(usageNote()).toHaveTextContent(/Atajos, fuera de los campos/);
    expect(usageNote()).toHaveTextContent(USAGE);

    await user.click(collisionMode());

    expect(usageNote()).not.toHaveTextContent(/Arrastra la manija/);
    expect(usageNote()).toHaveTextContent(/Atajos, fuera de los campos/);
    expect(usageNote()).toHaveTextContent(USAGE);
  });

  test('without MDX texts there is no empty «Qué deja fuera el modelo»', () => {
    render(<BounceLab />);

    expect(document.querySelector('details[data-lab-note="left-out"]')).toBeNull();
    expect(usageNote()).toHaveTextContent(/Arrastra la manija/);
  });

  test('the collision mode: five fields and the switch as parameters, its notes in the canvas notes', async () => {
    const user = userEvent.setup();
    render(<BounceLab />);

    await user.click(collisionMode());

    expect(within(params()).getAllByRole('textbox')).toHaveLength(5);
    expect(
      within(params()).getByRole('switch', { name: /m sub 2 tiende a infinito/ }),
    ).toBeVisible();
    expect(within(scenario()).queryByRole('combobox')).toBeNull();
    expect(
      within(scenario()).getByRole('button', { name: 'Choque de dos cuerpos' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(within(canvasNotes()).getByTestId('collision-notes')).toHaveTextContent(
      /momento lineal/,
    );
    expect(canvasNotes().querySelector(CONTROL)).toBeNull();
    expect(within(canvas()).getByTestId('collision-scene')).toBeInTheDocument();
  });

  test('the fixed body adds its note and drops m2 and v2', async () => {
    const user = userEvent.setup();
    render(<BounceLab />);
    await user.click(collisionMode());

    await user.click(within(params()).getByRole('switch', { name: /m sub 2 tiende a infinito/ }));

    expect(within(params()).getAllByRole('textbox')).toHaveLength(3);
    expect(within(canvasNotes()).getByTestId('collision-notes')).toHaveTextContent(/piso/);
  });
});
