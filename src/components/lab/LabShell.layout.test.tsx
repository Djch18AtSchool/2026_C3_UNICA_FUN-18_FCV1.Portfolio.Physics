// @vitest-environment jsdom
import { readoutRow } from '../../test-readout';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../lib/settingsStore';
import { installDialogPolyfill } from '../../test-dialog';
import { fakeClock } from '../../test-fake-clock';
import LabPresets from './LabPresets';
import LabShell, { type LabShellProps } from './LabShell';
import type { SettingOption } from './SettingsDrawer';

const display = (trail = true): SettingOption[] => [
  { key: 'trail', label: 'Estela de la sonda', kind: 'toggle', value: trail, onChange: () => {} },
  { key: 'grid', label: 'Rejilla fina', kind: 'toggle', value: true, onChange: () => {} },
];

function tieredProps(overrides: Partial<LabShellProps> = {}): LabShellProps {
  return {
    title: 'Laboratorio del sobrevuelo',
    readouts: [
      { id: 'e', label: 'Excentricidad $e$', value: 1.33, unit: '', precision: 3 },
      { id: 'delta', label: 'Ángulo de giro $\\delta$', value: 97.5, unit: '°', precision: 1 },
    ],
    levels: {
      params: <input aria-label="Máxima aproximación" />,
      scenario: <p>escenario del encuentro</p>,
      display: display(),
    },
    notes: { usage: ['Arrastra el punto.'], leftOut: ['Es plano.'] },
    onReset: () => {},
    testId: 'flyby-lab',
    children: <svg data-testid="canvas" />,
    ...overrides,
  };
}

const renderTiered = (overrides: Partial<LabShellProps> = {}) =>
  render(<LabShell {...tieredProps(overrides)} />);

const gear = () => screen.getByRole('button', { name: 'Ajustes del simulador' });
const dialogOf = (container: HTMLElement) => container.querySelector('dialog') as HTMLDialogElement;
const region = (name: string) => screen.getByRole('region', { name });
const reset = () => screen.getByRole('button', { name: 'Restablecer' });

function expectInOrder(nodes: readonly Node[]): void {
  nodes.slice(1).forEach((node, index) => {
    const isFollowing =
      nodes[index].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(isFollowing, `item ${index + 1} follows item ${index}`).toBeTruthy();
  });
}

const PRESETS = [
  { id: 'jupiter', name: 'Júpiter', values: { rp: 10 }, note: 'Nota de Júpiter.' },
  { id: 'saturno', name: 'Saturno', values: { rp: 20 }, note: 'Nota de Saturno.' },
];

describe('LabShell layout: one column, the scene first, the control deck under it', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    vi.restoreAllMocks();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('is one group named by its title, marked as the tiered layout', () => {
    renderTiered();

    const lab = screen.getByRole('group', { name: 'Laboratorio del sobrevuelo' });
    expect(lab).toBe(screen.getByTestId('flyby-lab'));
    expect(lab).toHaveAttribute('data-lab-shell', 'tiered');
  });

  test('the header is one row: the title and the gear, no chips beside it', () => {
    renderTiered();

    const header = gear().parentElement as HTMLElement;
    expect(header).toHaveClass('flex-nowrap');
    expect([...header.children].map((node) => node.textContent)).toEqual([
      'Laboratorio del sobrevuelo',
      '',
    ]);
    expect(screen.queryByRole('group', { name: 'Ajustes activos' })).toBeNull();
  });

  test('the gear opens the drawer and gets focus back', async () => {
    const user = userEvent.setup();
    const { container } = renderTiered();

    await user.click(gear());
    expect(dialogOf(container).open).toBe(true);
    expect(
      within(dialogOf(container)).getByRole('switch', { name: 'Estela de la sonda' }),
    ).toBeChecked();
    await user.keyboard('{Escape}');

    expect(gear()).toHaveFocus();
  });

  test('levels are regions named for screen readers only: no visible titles in the deck', () => {
    renderTiered();

    for (const [name, level] of [
      ['Parámetros', 'params'],
      ['Escenario', 'scenario'],
      ['Lecturas', 'readouts'],
    ] as const) {
      expect(region(name)).toHaveAttribute('data-lab-level', level);
      const heading = within(region(name)).getByRole('heading', { name });
      expect(heading).toHaveClass('sr-only');
    }
    expect(within(region('Escenario')).getByText('escenario del encuentro')).toBeInTheDocument();
  });

  test('parameters go two to a row in a wide lab; a paragraph among them takes the row', () => {
    renderTiered();

    expect(region('Parámetros').className).toMatch(/\bgrid\b/u);
    expect(region('Parámetros').className).toContain('@xl/lab:grid-cols-2');
    expect(region('Parámetros').className).toContain('[&>p]:col-span-full');
  });

  test('without LabPresets, «Restablecer» closes the scenario; it calls the lab’s reset', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    renderTiered({ onReset });

    expect(within(region('Escenario')).getAllByRole('button')).toEqual([reset()]);
    expectInOrder([screen.getByText('escenario del encuentro'), reset()]);
    await user.click(reset());
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('with LabPresets at the scenario’s top, they carry «Restablecer» in their row: one button', () => {
    const onReset = vi.fn();
    renderTiered({
      onReset,
      levels: {
        params: null,
        scenario: (
          <>
            <p>modo</p>
            <LabPresets id="p" presets={PRESETS} activeId="jupiter" onSelect={() => {}} />
          </>
        ),
        display: [],
      },
    });

    expect(screen.getAllByRole('button', { name: 'Restablecer' })).toHaveLength(1);
    expect(reset().closest('[data-preset-row]')).not.toBeNull();
    expectInOrder([screen.getByRole('button', { name: 'Saturno' }), reset()]);
    expectInOrder([reset(), screen.getByTestId('preset-note')]);
    reset().click();
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('a lab without a scenario has no Escenario region; «Restablecer» ends its parameters', () => {
    renderTiered({ readouts: [], levels: { params: <p>solo parámetros</p>, display: [] } });

    expect(screen.queryByRole('region', { name: 'Escenario' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Lecturas' })).toBeNull();
    expect(region('Parámetros')).toContainElement(reset());
  });

  test('readouts are cells, two to a row, four in a wide lab', () => {
    renderTiered();

    const cells = region('Lecturas').querySelectorAll('[data-readout]');
    expect([...cells].map((cell) => cell.getAttribute('data-layout'))).toEqual(['cell', 'cell']);
    expect(cells[0].parentElement).toBe(region('Lecturas'));
    expect(region('Lecturas')).toHaveClass('grid-cols-2', '@2xl/lab:grid-cols-4');
  });

  test('reading and focus order: scene, transport, parameters, scenario, readouts, plots, notes', () => {
    renderTiered({
      clock: fakeClock(),
      charts: <button type="button">Realzar la serie</button>,
      canvasNotes: <ul aria-label="Leyenda del dibujo" />,
    });

    expectInOrder([
      gear(),
      screen.getByTestId('canvas'),
      screen.getByRole('group', { name: 'Reproducción' }),
      screen.getByRole('textbox', { name: 'Máxima aproximación' }),
      screen.getByText('escenario del encuentro'),
      reset(),
      readoutRow('Excentricidad $e$'),
      screen.getByRole('button', { name: 'Realzar la serie' }),
      screen.getByRole('list', { name: 'Leyenda del dibujo' }),
      screen.getByText('Cómo se usa'),
      screen.getByText('Qué deja fuera el modelo'),
    ]);
  });

  test('the support plots have a place of their own, after the readouts, bleeding like the canvas', () => {
    const { container } = renderTiered({ charts: <svg data-testid="plot" /> });

    const charts = container.querySelector('[data-lab-charts]') as HTMLElement;
    const canvas = container.querySelector('[data-lab-canvas]') as HTMLElement;
    expect(within(charts).getByTestId('plot')).toBeInTheDocument();
    expect(canvas).not.toContainElement(charts);
    expect(charts.className).toContain('-mx-3');
    expect(canvas.className).toContain('-mx-3');
  });

  test('without plots or canvas notes there is no empty place for them', () => {
    const { container } = renderTiered();

    expect(container.querySelector('[data-lab-charts]')).toBeNull();
    expect(container.querySelector('[data-lab-canvas-notes]')).toBeNull();
  });

  test('one column everywhere: nothing sticks, no two-column variant, the canvas has no cap', () => {
    const { container } = renderTiered({ clock: fakeClock() });
    // The card without its drawer (whose own header sticks inside the dialog).
    const card = container.querySelector('[data-lab-shell]')?.cloneNode(true) as HTMLElement;
    card.querySelector('dialog')?.remove();

    expect(card.innerHTML).not.toMatch(/lab-split|sticky|max-w-\[36rem\]/u);
    expect(container.querySelector('[data-lab-stage-fits]')).toBeNull();
    const stage = container.querySelector('[data-lab-stage]') as HTMLElement;
    expect(within(stage).getByTestId('canvas')).toBeInTheDocument();
    expect(within(stage).getByRole('group', { name: 'Reproducción' })).toBeInTheDocument();
  });

  test('the panel flows with the page: no scroll of its own, no region or tab stop of its own', () => {
    const { container } = renderTiered();
    const panel = container.querySelector('[data-lab-panel]') as HTMLElement;

    expect(panel).not.toHaveAttribute('tabindex');
    expect(panel).not.toHaveAttribute('role');
    expect(panel.className).not.toMatch(/overflow|max-h|sticky/);
  });

  test('the notes are two closed disclosures; without notes their place collapses', () => {
    const { container, unmount } = renderTiered();
    expect([...container.querySelectorAll('details')].map((details) => details.open)).toEqual([
      false,
      false,
    ]);
    unmount();

    const bare = renderTiered({ notes: undefined });
    expect(bare.container.querySelector('details')).toBeNull();
    const place = bare.container.querySelector('[data-lab-panel]')?.nextElementSibling;
    expect(place).toBeEmptyDOMElement();
    expect(place).toHaveClass('empty:hidden');
  });

  test('data-playing mirrors the clock', () => {
    const { rerender } = renderTiered({ clock: fakeClock({ playing: true }) });
    expect(screen.getByTestId('flyby-lab')).toHaveAttribute('data-playing', 'true');

    rerender(<LabShell {...tieredProps({ clock: fakeClock({ playing: false }) })} />);
    expect(screen.getByTestId('flyby-lab')).toHaveAttribute('data-playing', 'false');
  });

  test('without a clock: no transport bar', () => {
    renderTiered();

    expect(screen.queryByRole('group', { name: 'Reproducción' })).toBeNull();
  });
});
