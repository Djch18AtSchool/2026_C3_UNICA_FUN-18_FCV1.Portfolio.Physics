// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../lib/settingsStore';
import { installDialogPolyfill } from '../../test-dialog';
import { fakeClock } from '../../test-fake-clock';
import { EXACT_TEXT } from '../../test-exact-text';
import LabShell, { READOUT_ANNOUNCE_DELAY_MS, type LabShellProps } from './LabShell';

function shellProps(overrides: Partial<LabShellProps> = {}): LabShellProps {
  return {
    title: 'Laboratorio del salto',
    readouts: [
      { id: 'hMax', label: 'Altura máxima', value: 1.234, unit: 'm' },
      { id: 'tAir', label: 'Tiempo en el aire', value: 0.5, unit: 's' },
    ],
    levels: {
      params: <p>parámetros del salto</p>,
      display: [{ key: 'trail', label: 'Rastro', kind: 'toggle', value: true, onChange: () => {} }],
    },
    onReset: () => {},
    testId: 'jump-lab',
    children: <svg data-testid="canvas" />,
    ...overrides,
  };
}

function renderShell(overrides: Partial<LabShellProps> = {}) {
  return render(<LabShell {...shellProps(overrides)} />);
}

/** The shell with a single "Altura máxima" readout at `value` metres. */
function heightShell(value: number) {
  return (
    <LabShell
      {...shellProps({ readouts: [{ id: 'hMax', label: 'Altura máxima', value, unit: 'm' }] })}
    />
  );
}

const announcer = () => screen.getByTestId('readout-announcer');

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
    // A spy left by a failed assertion must not leak into the next test.
    vi.restoreAllMocks();
  });

  test('shows the title, names the group after it and leaves the type badge to its Figure', () => {
    renderShell();

    expect(screen.getByText('Laboratorio del salto')).toBeInTheDocument();
    expect(screen.queryByText('Simulación interactiva')).toBeNull();
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

  test('a readout with its own precision ignores the global decimals', () => {
    renderShell({
      readouts: [{ id: 'force', label: 'Fuerza', value: 11942.9, unit: 'N', precision: 0 }],
    });

    expect(screen.getByText('11 943 N')).toBeInTheDocument();
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

  test('focus returns to the gear even when clicking it did not focus it', () => {
    renderShell();

    // Safari and macOS Firefox leave focus on body when a button is clicked.
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(gear());
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });

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
        clock={fakeClock({ playing: false })}
        readouts={[]}
        levels={{ params: null, display: [] }}
        onReset={() => {}}
        testId="jump-lab"
      >
        <svg data-testid="canvas" />
      </LabShell>,
    );
    expect(screen.getByTestId('jump-lab')).toHaveAttribute('data-playing', 'false');
  });

  test('the transport reads the run in its auto unit unless the lab fixes timeUnit', () => {
    const clock = fakeClock({ duration: 1369, t: 116 });
    const { unmount } = renderShell({ clock });
    const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });

    expect(timeline()).toHaveAttribute('aria-valuetext', 't = 1,93\u202Fmin');
    unmount();

    renderShell({ clock, timeUnit: 's' });
    expect(timeline()).toHaveAttribute('aria-valuetext', 't = 116\u202Fs');
  });

  test('passes its markers to the transport, which then has the event buttons', () => {
    renderShell({
      clock: fakeClock({ duration: 1369, t: 0 }),
      markers: [{ t: 312, label: 'Detención' }],
    });

    expect(screen.getByRole('button', { name: 'Evento siguiente' })).toBeInTheDocument();
  });

  test('a transport with events reserves its two rows under a focused canvas control', () => {
    const { container, rerender } = renderShell({ clock: fakeClock({ duration: 1369 }) });
    const stage = () => container.querySelector<HTMLElement>('[data-lab-stage]');
    expect(stage()?.style.getPropertyValue('--lab-transport-room')).toBe('');

    rerender(
      <LabShell
        {...shellProps({
          clock: fakeClock({ duration: 1369 }),
          markers: [{ t: 312, label: 'Detención' }],
        })}
      />,
    );

    expect(stage()?.style.getPropertyValue('--lab-transport-room')).toBe(
      'calc(2 * 2.75rem + 0.75rem + 2 * 0.75rem + 1px)',
    );
  });

  test('markers that none fall in the run leave the plain transport and its room', () => {
    const { container } = renderShell({
      clock: fakeClock({ duration: 10 }),
      markers: [{ t: 312, label: 'Detención' }],
    });

    expect(screen.queryByRole('button', { name: 'Evento siguiente' })).toBeNull();
    const stage = container.querySelector<HTMLElement>('[data-lab-stage]');
    expect(stage?.style.getPropertyValue('--lab-transport-room')).toBe('');
  });

  test('readouts are keyed by id, so two may share a label', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderShell({
      readouts: [
        { id: 'linear', label: 'Fuerza lateral F_y', value: 1, unit: 'N' },
        { id: 'real', label: 'Fuerza lateral F_y', value: 2, unit: 'N' },
      ],
    });

    expect(screen.getAllByText('Fuerza lateral F_y')).toHaveLength(2);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  describe('readout announcements', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    test('a polite, atomic live region that says nothing on mount', () => {
      renderShell();

      expect(announcer()).toHaveAttribute('aria-live', 'polite');
      expect(announcer()).toHaveAttribute('aria-atomic', 'true');
      expect(announcer().textContent).toBe('');
    });

    test('announces the readouts once they settle, not on every step of a drag', () => {
      vi.useFakeTimers();
      const { rerender } = render(heightShell(1));

      rerender(heightShell(2));
      act(() => vi.advanceTimersByTime(300));
      rerender(heightShell(3));
      act(() => vi.advanceTimersByTime(300));
      expect(announcer().textContent).toBe('');

      act(() => vi.advanceTimersByTime(READOUT_ANNOUNCE_DELAY_MS));
      expect(announcer().textContent).toBe('Altura máxima: 3,00\u202fm');
    });

    test('says a $…$ label in words, never as TeX', () => {
      vi.useFakeTimers();
      const shell = (value: number) => (
        <LabShell
          {...shellProps({
            readouts: [{ id: 'dv', label: 'Cambio $|\\Delta\\vec v|$', value, unit: 'km/s' }],
          })}
        />
      );
      const { rerender } = render(shell(1));

      rerender(shell(2));
      act(() => vi.advanceTimersByTime(READOUT_ANNOUNCE_DELAY_MS));
      expect(announcer().textContent).toBe('Cambio módulo de delta vector v: 2,00\u202fkm/s');
    });
  });
});
