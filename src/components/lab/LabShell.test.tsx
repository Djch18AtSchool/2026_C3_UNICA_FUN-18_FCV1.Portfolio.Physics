// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createClock, type ClockState } from '../../lib/physics/clock';
import { resetSettingsForTests } from '../../lib/settingsStore';
import { installDialogPolyfill } from '../../test-dialog';
import { EXACT_TEXT } from '../../test-exact-text';
import LabShell, { type LabShellProps } from './LabShell';
import type { SimClock } from './useSimClock';

function fakeClock(overrides: Partial<ClockState> = {}): SimClock {
  return {
    state: { ...createClock(4), ...overrides },
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    reset: vi.fn(),
    seek: vi.fn(),
    step: vi.fn(),
    setSpeed: vi.fn(),
    setLoop: vi.fn(),
  };
}

function renderShell(overrides: Partial<LabShellProps> = {}) {
  const props: LabShellProps = {
    title: 'Laboratorio del salto',
    type: 'simulacion',
    readouts: [
      { label: 'Altura máxima', value: 1.234, unit: 'm' },
      { label: 'Tiempo en el aire', value: 0.5, unit: 's' },
    ],
    params: <p>parámetros del salto</p>,
    localSettings: [
      { key: 'trail', label: 'Rastro', kind: 'toggle', value: true, onChange: () => {} },
    ],
    onReset: () => {},
    testId: 'jump-lab',
    children: <svg data-testid="canvas" />,
    ...overrides,
  };
  return render(<LabShell {...props} />);
}

const gear = () => screen.getByRole('button', { name: 'Ajustes del simulador' });

describe('LabShell', () => {
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

  test('shows the title and the resource type, and names the group after the title', () => {
    renderShell();

    expect(screen.getByText('Laboratorio del salto')).toBeInTheDocument();
    expect(screen.getByText('Simulación interactiva')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Laboratorio del salto' })).toBe(
      screen.getByTestId('jump-lab'),
    );
  });

  test('renders the canvas children and each readout with its unit', () => {
    renderShell();

    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByText('Altura máxima')).toBeInTheDocument();
    expect(screen.getByText('1,23 m', EXACT_TEXT)).toBeInTheDocument();
    expect(screen.getByText('0,50 s', EXACT_TEXT)).toBeInTheDocument();
  });

  test('the gear opens the settings drawer and reflects it in aria-expanded', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    expect(gear()).toHaveAttribute('aria-expanded', 'false');
    expect(gear()).toHaveAttribute('aria-controls', dialog.id);

    await user.click(gear());

    expect(dialog.open).toBe(true);
    expect(gear()).toHaveAttribute('aria-expanded', 'true');
    expect(within(dialog).getByRole('switch', { name: 'Rastro' })).toBeChecked();
  });

  test('Escape closes the drawer and focus returns to the gear', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    await user.click(gear());

    await user.keyboard('{Escape}');

    expect((container.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
    expect(gear()).toHaveAttribute('aria-expanded', 'false');
    expect(gear()).toHaveFocus();
  });

  test('"Restablecer" calls onReset and the params are rendered next to it', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    renderShell({ onReset });

    expect(screen.getByText('parámetros del salto')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('without a clock there is no transport bar and data-playing is false', () => {
    renderShell();

    expect(screen.queryByRole('group', { name: 'Reproducción' })).toBeNull();
    expect(screen.getByTestId('jump-lab')).toHaveAttribute('data-playing', 'false');
  });

  test('with a clock the transport bar appears and data-playing mirrors it', () => {
    const { rerender } = renderShell({ clock: fakeClock({ playing: true }) });

    expect(screen.getByRole('group', { name: 'Reproducción' })).toBeInTheDocument();
    expect(screen.getByTestId('jump-lab')).toHaveAttribute('data-playing', 'true');

    rerender(
      <LabShell
        title="Laboratorio del salto"
        type="simulacion"
        clock={fakeClock({ playing: false })}
        readouts={[]}
        params={null}
        localSettings={[]}
        onReset={() => {}}
        testId="jump-lab"
      >
        <svg data-testid="canvas" />
      </LabShell>,
    );
    expect(screen.getByTestId('jump-lab')).toHaveAttribute('data-playing', 'false');
  });

  test('lays out header, canvas, transport, readouts, params and footnote in that order', () => {
    renderShell({ clock: fakeClock(), footnote: 'Modelo sin rozamiento del aire.' });
    const sequence = [
      screen.getByText('Laboratorio del salto'),
      gear(),
      screen.getByTestId('canvas'),
      screen.getByRole('group', { name: 'Reproducción' }),
      screen.getByText('Altura máxima'),
      // The params block is the v1 ControlPanel: its header (with "Restablecer") comes first.
      screen.getByRole('button', { name: 'Restablecer' }),
      screen.getByText('parámetros del salto'),
      screen.getByText('Modelo sin rozamiento del aire.'),
    ];

    sequence.slice(1).forEach((node, index) => {
      const previous = sequence[index];
      expect(
        previous.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  test('renders no footnote unless one is given', () => {
    renderShell();

    expect(screen.queryByTestId('lab-footnote')).toBeNull();
  });
});
