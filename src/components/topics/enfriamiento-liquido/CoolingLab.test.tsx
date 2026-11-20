// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { RackConfig } from '../../../lib/data/liquidCoolingCircuit';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { readout } from '../../../test-readout';
import CoolingLab from './CoolingLab';
import { CURSOR_HINT } from './coolingLabText';

/** Servers for which the mocked split does not converge (Review Focus 3, at the component). */
const { STUCK_SERVERS } = vi.hoisted(() => ({ STUCK_SERVERS: 30 }));

vi.mock('../../../lib/data/liquidCoolingCircuit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/data/liquidCoolingCircuit')>();
  return {
    ...actual,
    rackSplit: (config: RackConfig) =>
      config.servers === STUCK_SERVERS
        ? {
            flows: Array.from({ length: config.servers }, () => Number.NaN),
            converged: false,
            iterations: 500,
          }
        : actual.rackSplit(config),
  };
});

const USAGE = 'Uso del MDX: elige los valores y mira el reparto.';
const LEFT_OUT = 'Deja fuera la temperatura variable a lo largo del lazo.';

const WORST = 'Caudal del servidor 24, el más lejano';
const MINIMUM = 'Mínimo de cada servidor, 1,5 L/min por kW';
const DROP = 'Caída hasta el más lejano $\\Delta p$';
const POWER = 'Potencia de bombeo del CDU $P = \\Delta p\\,Q$';

const region = (name: string) => screen.getByRole('region', { name });
const field = (name: RegExp) => screen.getByRole('textbox', { name });
const commit = (name: RegExp, value: string) => {
  const input = field(name);
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
};
const choose = (group: string, option: string | RegExp) =>
  fireEvent.click(
    within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', { name: option }),
  );
const chips = () =>
  within(screen.getByRole('list', { name: 'Estado del circuito' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);
const bars = () => screen.getByTestId('rack-diagram').querySelectorAll('[data-server]');

function renderLab() {
  return render(<CoolingLab usage={USAGE} leftOut={LEFT_OUT} />);
}

describe('CoolingLab', () => {
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

  test('opens at the reference: the farthest server gets 7,18 L/min, 1,80 bar, 4,14 kW', () => {
    renderLab();

    expect(readout(WORST)).toBe('7,18 L/min');
    expect(readout(MINIMUM)).toBe('6,38 L/min');
    expect(readout(DROP)).toBe('179,9 kPa');
    expect(readout(POWER)).toBe('4,14 kW');
    expect(chips()).toEqual([
      'El servidor más lejano llega a su mínimo',
      'Cada UQD04 pasa de su caudal nominal',
    ]);
  });

  test('the tiered shell: four parameters, the two presets in the scenario, no clock', () => {
    const { container } = renderLab();

    expect(container.querySelector('[data-lab-shell="tiered"]')).not.toBeNull();
    expect(screen.getByTestId('cooling-lab')).toBeInTheDocument();
    const params = region('Parámetros');
    expect(within(params).getByRole('textbox', { name: /^Caudal de la bomba por rack/ })).toBe(
      field(/^Caudal de la bomba por rack/),
    );
    expect(within(params).getByRole('textbox', { name: /^Servidores en el rack/ })).toBeTruthy();
    expect(
      within(params).getByRole('radiogroup', { name: 'Manguera de cada servidor' }),
    ).toBeTruthy();
    expect(within(params).getByRole('radiogroup', { name: 'Retorno' })).toBeTruthy();
    const presets = within(region('Escenario')).getByRole('group', {
      name: 'Valores de referencia',
    });
    expect(
      within(presets)
        .getAllByRole('button')
        .map((chip) => chip.textContent),
    ).toEqual(['Referencia: 24 servidores (RD109)', 'MGX: 44 puertos']);
    expect(container.querySelector('[data-lab-transport]')).toBeNull();
  });

  test('below 153 L/min the farthest server misses its minimum, and the notes say what it takes', () => {
    renderLab();

    commit(/^Caudal de la bomba por rack/, '150');

    expect(readout(WORST)).toBe('6,25 L/min');
    expect(chips()[0]).toBe('El servidor más lejano no llega a su mínimo');
    expect(screen.getByTestId('cooling-shortfall')).toHaveTextContent(
      /tiene que subir un 2,1 %, a 153,1 L\/min por rack/,
    );
  });

  test('reverse return: the server that gets least is the 12th, and the drawing leaves at the top', () => {
    renderLab();

    choose('Retorno', 'Invertido');

    expect(readout('Caudal del servidor 12, el peor servido')).toBe('7,19 L/min');
    expect(screen.getByTestId('rack-diagram').querySelector('[data-outlet]')).toHaveAttribute(
      'data-outlet',
      'arriba',
    );
  });

  test('a 1/4″ hose raises the drop and the pumping power', () => {
    renderLab();

    choose('Manguera de cada servidor', /^1\/4″/);

    expect(readout(DROP)).toBe('227,2 kPa');
    expect(readout(POWER)).toBe('5,23 kW');
  });

  test('a split that does not converge says so, keeps the last valid drawing and readouts, and recovers (Review Focus 3)', () => {
    renderLab();

    commit(/^Servidores en el rack/, String(STUCK_SERVERS));

    expect(chips()[0]).toBe('El reparto no converge con estos valores');
    expect(
      screen
        .getAllByRole('status')
        .some((node) => node.textContent?.startsWith('El reparto no converge con estos valores')),
    ).toBe(true);
    expect(bars()).toHaveLength(24);
    expect(readout(WORST)).toBe('7,18 L/min');
    expect(field(/^Servidores en el rack/)).toHaveValue(String(STUCK_SERVERS));
    expect(screen.getByTestId('cooling-lab').textContent).not.toMatch(/NaN/);

    commit(/^Servidores en el rack/, '12');

    expect(chips()[0]).not.toBe('El reparto no converge con estos valores');
    expect(bars()).toHaveLength(12);
  });

  test('the MGX preset draws 44 bars and its note; an edit keeps the note, «Restablecer» goes back', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(screen.getByRole('button', { name: /^MGX: 44 puertos/ }));

    expect(bars()).toHaveLength(44);
    expect(screen.getByTestId('preset-note')).toHaveTextContent(/^Los 170 L\/min del CFD de GF/);
    expect(chips()[1]).toBe('Cada UQD04 va dentro de su caudal nominal');

    commit(/^Caudal de la bomba por rack/, '180');
    expect(screen.getByTestId('preset-note')).toHaveTextContent(
      /^Valores modificados a partir de «MGX: 44 puertos»/,
    );

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));
    expect(bars()).toHaveLength(24);
    expect(readout(WORST)).toBe('7,18 L/min');
  });

  test('the pump chart’s cursor moves the pump flow, as its slider', () => {
    renderLab();
    const cursor = within(screen.getByTestId('cooling-pump-plot')).getByRole('slider');

    fireEvent.keyDown(cursor, { key: 'ArrowRight' });

    expect(field(/^Caudal de la bomba por rack/)).not.toHaveValue('172,5');
    expect(screen.getByTestId('cooling-pump-note')).toHaveTextContent(/^Para mover 2\d,\d L\/s/);
  });

  test('three support plots: the split, the pump and the profile of the lab’s own rack', () => {
    renderLab();
    const charts = screen.getByTestId('cooling-lab').querySelector('[data-lab-charts]')!;

    expect(within(charts as HTMLElement).getByTestId('cooling-split-plot')).toBeInTheDocument();
    expect(within(charts as HTMLElement).getByTestId('cooling-pump-plot')).toBeInTheDocument();
    expect(within(charts as HTMLElement).getByTestId('cooling-lab-profile')).toHaveTextContent(
      /del CDU al servidor 24 y de vuelta/,
    );

    commit(/^Servidores en el rack/, '12');
    expect(screen.getByTestId('cooling-lab-profile')).toHaveTextContent(
      /del CDU al servidor 12 y de vuelta/,
    );
  });

  test('the canvas notes: the drawing’s key, what is to scale and where every value comes from', () => {
    renderLab();
    const notes = screen
      .getByTestId('cooling-lab')
      .querySelector('[data-lab-canvas-notes]') as HTMLElement;
    const origins = within(notes).getByRole('list', { name: 'Origen de cada valor' });

    expect(within(notes).getByRole('list', { name: 'Leyenda del rack' })).toBeInTheDocument();
    expect(notes).toHaveTextContent(/las alturas no están a escala/i);
    expect(within(origins).getAllByRole('listitem')).toHaveLength(8);
    expect(origins).toHaveTextContent(/Cálculo propio/);
    expect(origins).toHaveTextContent(/Producto/);
    expect(origins).toHaveTextContent(/Supuesto/);
    expect(notes).toHaveTextContent(/tablas 13\.1 a 13\.3/);
  });

  test('how to use it: the cursor, then the MDX; what it leaves out comes from the MDX', () => {
    const { container } = renderLab();
    const usage = container.querySelector('details[data-lab-note="usage"]')!;
    const leftOut = container.querySelector('details[data-lab-note="left-out"]')!;

    expect(usage.textContent).toContain(CURSOR_HINT);
    expect(usage.textContent).toContain(USAGE);
    expect(leftOut.textContent).toContain(LEFT_OUT);
  });

  test('every glyph is Plex or KaTeX, at the reference and in reverse return', () => {
    const { container } = renderLab();
    expect(plexViolations(container)).toEqual([]);

    choose('Retorno', 'Invertido');
    commit(/^Caudal de la bomba por rack/, '150');
    expect(plexViolations(container)).toEqual([]);
  });
});
