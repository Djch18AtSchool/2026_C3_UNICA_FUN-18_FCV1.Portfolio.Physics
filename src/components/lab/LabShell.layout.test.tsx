// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../lib/settingsStore';
import { installDialogPolyfill } from '../../test-dialog';
import { fakeClock } from '../../test-fake-clock';
import LabShell, { READOUT_ANNOUNCE_DELAY_MS, type LabShellProps } from './LabShell';
import type { SettingOption } from './SettingsDrawer';

const display = (trail = true): SettingOption[] => [
  {
    key: 'trail',
    label: 'Estela de la sonda',
    chip: 'estela',
    kind: 'toggle',
    value: trail,
    onChange: () => {},
  },
  { key: 'grid', label: 'Rejilla fina', kind: 'toggle', value: true, onChange: () => {} },
  {
    key: 'speed',
    label: 'Velocidad',
    chip: 'Velocidad',
    kind: 'select',
    value: '1',
    options: [{ value: '1', label: '1×' }],
    onChange: () => {},
  },
];

function tieredProps(overrides: Partial<LabShellProps> = {}): LabShellProps {
  return {
    title: 'Laboratorio del sobrevuelo',
    readouts: [
      { id: 'e', label: 'Excentricidad e', value: 1.33, unit: '', precision: 3 },
      { id: 'delta', label: 'Ángulo de giro δ', value: 97.5, unit: '°', precision: 1 },
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

function expectInOrder(nodes: readonly Node[]): void {
  nodes.slice(1).forEach((node, index) => {
    const isFollowing =
      nodes[index].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(isFollowing, `item ${index + 1} follows item ${index}`).toBeTruthy();
  });
}

describe('LabShell layout: levels, stage and panel', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    vi.useRealTimers();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('is one group named by its title, marked as the tiered layout', () => {
    renderTiered();

    const lab = screen.getByRole('group', { name: 'Laboratorio del sobrevuelo' });
    expect(lab).toBe(screen.getByTestId('flyby-lab'));
    expect(lab).toHaveAttribute('data-lab-shell', 'tiered');
  });

  test('beside the gear, a chip per active display setting that declares one', () => {
    renderTiered();

    const chips = within(screen.getByRole('group', { name: 'Ajustes activos' })).getAllByRole(
      'button',
    );
    expect(chips.map((chip) => chip.textContent)).toEqual(['estela', '1×']);
    expect(chips.map((chip) => chip.getAttribute('aria-label'))).toEqual([
      'estela',
      'Velocidad 1×',
    ]);
    expectInOrder([screen.getByText('Laboratorio del sobrevuelo'), ...chips, gear()]);
  });

  test('each chip holds one inline run, so the space after a formula is not dropped', () => {
    // A chip is a flex box: as separate items, «$k$ 3,5» would lose the space after the formula.
    const fall: SettingOption = {
      key: 'fall',
      label: 'Multiplicador de caída',
      chip: '$k$',
      kind: 'range',
      value: 3.5,
      min: 1,
      max: 4,
      step: 0.5,
      onChange: () => {},
    };
    renderTiered({ levels: { params: null, display: [fall, ...display()] } });

    const chips = within(screen.getByRole('group', { name: 'Ajustes activos' })).getAllByRole(
      'button',
    );
    for (const chip of chips) {
      expect(chip.childNodes).toHaveLength(1);
      expect(chip.firstElementChild?.tagName).toBe('SPAN');
    }
  });

  test('a toggle switched off leaves the row; the row follows the settings it is given', () => {
    const { rerender } = renderTiered();
    expect(screen.getByRole('button', { name: 'estela' })).toBeInTheDocument();

    rerender(<LabShell {...tieredProps({ levels: { params: null, display: display(false) } })} />);

    expect(screen.queryByRole('button', { name: 'estela' })).toBeNull();
  });

  test('without chips there is no chip group, only the gear', () => {
    renderTiered({ levels: { params: null, display: [] } });

    expect(screen.queryByRole('group', { name: 'Ajustes activos' })).toBeNull();
    expect(gear()).toBeInTheDocument();
  });

  test('a chip opens the drawer, and closing it returns focus to that chip', async () => {
    const user = userEvent.setup();
    const { container } = renderTiered();
    const chip = screen.getByRole('button', { name: 'Velocidad 1×' });
    expect(chip).toHaveAttribute('aria-haspopup', 'dialog');
    expect(chip).toHaveAttribute('aria-controls', dialogOf(container).id);

    await user.click(chip);
    expect(dialogOf(container).open).toBe(true);
    expect(chip).toHaveAttribute('aria-expanded', 'true');
    expect(gear()).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(dialogOf(container)).getByRole('switch', { name: 'Estela de la sonda' }),
    ).toBeChecked();

    await user.keyboard('{Escape}');
    expect(dialogOf(container).open).toBe(false);
    expect(chip).toHaveFocus();
  });

  test('the gear still opens the drawer and gets focus back', async () => {
    const user = userEvent.setup();
    const { container } = renderTiered();

    await user.click(gear());
    expect(dialogOf(container).open).toBe(true);
    await user.keyboard('{Escape}');

    expect(gear()).toHaveFocus();
  });

  test('levels are named regions: Parámetros (with Restablecer), Escenario, Lecturas', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    renderTiered({ onReset });

    expect(
      within(region('Parámetros')).getByRole('textbox', { name: 'Máxima aproximación' }),
    ).toBeInTheDocument();
    expect(within(region('Escenario')).getByText('escenario del encuentro')).toBeInTheDocument();
    expect(region('Parámetros')).toHaveAttribute('data-lab-level', 'params');
    expect(region('Escenario')).toHaveAttribute('data-lab-level', 'scenario');
    expect(region('Lecturas')).toHaveAttribute('data-lab-level', 'readouts');

    await user.click(within(region('Parámetros')).getByRole('button', { name: 'Restablecer' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('a lab without a scenario has no Escenario region; one without readouts, no Lecturas', () => {
    renderTiered({ readouts: [], levels: { params: <p>solo parámetros</p>, display: [] } });

    expect(screen.queryByRole('region', { name: 'Escenario' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Lecturas' })).toBeNull();
    expect(region('Parámetros')).toHaveTextContent('solo parámetros');
  });

  test('readouts are cells in two narrow columns', () => {
    renderTiered();

    const cells = region('Lecturas').querySelectorAll('[data-readout]');
    expect([...cells].map((cell) => cell.getAttribute('data-layout'))).toEqual(['cell', 'cell']);
    expect(cells[0].parentElement).toHaveClass('grid-cols-2');
  });

  test('the canvas and the transport share the stage; the levels share the panel', () => {
    const { container } = renderTiered({ clock: fakeClock() });

    const stage = container.querySelector('[data-lab-stage]') as HTMLElement;
    const panel = container.querySelector('[data-lab-panel]') as HTMLElement;
    expect(within(stage).getByTestId('canvas')).toBeInTheDocument();
    expect(within(stage).getByRole('group', { name: 'Reproducción' })).toBeInTheDocument();
    expect(within(panel).getAllByRole('region')).toHaveLength(3);
    expect(stage.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('reading and focus order: canvas, transport, params, scenario, readouts, notes', () => {
    renderTiered({ clock: fakeClock() });

    expectInOrder([
      gear(),
      screen.getByTestId('canvas'),
      screen.getByRole('group', { name: 'Reproducción' }),
      screen.getByRole('textbox', { name: 'Máxima aproximación' }),
      screen.getByText('escenario del encuentro'),
      screen.getByText('Excentricidad e'),
      screen.getByText('Cómo se usa'),
      screen.getByText('Qué deja fuera el modelo'),
    ]);
  });

  test('the disclosures sit under both columns, out of the scrolling panel, still last in order', () => {
    const { container } = renderTiered({ clock: fakeClock() });

    const panel = container.querySelector('[data-lab-panel]') as HTMLElement;
    const columns = container.querySelector('[data-lab-columns]') as HTMLElement;
    const notes = [...container.querySelectorAll('details')];
    expect(notes).toHaveLength(2);
    for (const details of notes) {
      expect(panel).not.toContainElement(details);
      expect(columns).not.toContainElement(details);
      expect(
        columns.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  test('canvas notes: after the transport in reading order, in their own cell under the columns', () => {
    const { container } = renderTiered({
      clock: fakeClock(),
      canvasNotes: <ul aria-label="Leyenda del dibujo" />,
    });

    const notes = container.querySelector('[data-lab-canvas-notes]') as HTMLElement;
    const stage = container.querySelector('[data-lab-stage]') as HTMLElement;
    const panel = container.querySelector('[data-lab-panel]') as HTMLElement;
    expect(within(notes).getByRole('list', { name: 'Leyenda del dibujo' })).toBeInTheDocument();
    expect(stage).not.toContainElement(notes);
    expectInOrder([screen.getByRole('group', { name: 'Reproducción' }), notes, panel]);
    expect(notes.parentElement).toBe(container.querySelector('[data-lab-columns]'));
  });

  test('without canvas notes there is no empty cell', () => {
    const { container } = renderTiered();

    expect(container.querySelector('[data-lab-canvas-notes]')).toBeNull();
  });

  test('the panel is a named, focusable region only while its content overflows it', () => {
    const observers: ResizeObserverCallback[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    const { container } = renderTiered();
    const panel = container.querySelector('[data-lab-panel]') as HTMLElement;
    expect(panel).not.toHaveAttribute('tabindex');
    expect(panel).not.toHaveAttribute('role');

    Object.defineProperty(panel, 'scrollHeight', { configurable: true, value: 929 });
    Object.defineProperty(panel, 'clientHeight', { configurable: true, value: 715 });
    act(() => observers.forEach((callback) => callback([], {} as ResizeObserver)));

    expect(screen.getByRole('region', { name: 'Controles del laboratorio' })).toBe(panel);
    expect(panel).toHaveAttribute('tabindex', '0');
    vi.unstubAllGlobals();
  });

  test('the notes are two closed disclosures; without notes there are none', () => {
    const { container, unmount } = renderTiered();
    expect([...container.querySelectorAll('details')].map((details) => details.open)).toEqual([
      false,
      false,
    ]);
    unmount();

    const bare = renderTiered({ notes: undefined });
    expect(bare.container.querySelector('details')).toBeNull();
  });

  test('data-playing mirrors the clock and the transport sits in the stage', () => {
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
