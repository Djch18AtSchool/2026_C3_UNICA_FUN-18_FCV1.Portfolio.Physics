// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getSettings, resetSettingsForTests } from '../../lib/settingsStore';
import { installDialogPolyfill, removeDialogMethods } from '../../test-dialog';
import SettingsDrawer, { type SettingOption } from './SettingsDrawer';

function Harness({ local = [], onClose }: { local?: SettingOption[]; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <SettingsDrawer
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        title="Ajustes del salto"
        local={local}
      />
    </>
  );
}

function dialogOf(container: HTMLElement): HTMLDialogElement {
  const dialog = container.querySelector('dialog');
  if (!dialog) throw new Error('no <dialog> rendered');
  return dialog;
}

async function openHarness(local: SettingOption[] = [], onClose?: () => void) {
  const user = userEvent.setup();
  const view = render(<Harness local={local} onClose={onClose} />);
  await user.click(screen.getByRole('button', { name: 'Abrir' }));
  return { user, ...view };
}

describe('SettingsDrawer', () => {
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

  test('opens with showModal when open becomes true and closes when it becomes false', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    const close = vi.spyOn(HTMLDialogElement.prototype, 'close');
    const props = { onClose: () => {}, title: 'Ajustes', local: [] };
    const { container, rerender } = render(<SettingsDrawer open={false} {...props} />);
    expect(dialogOf(container).open).toBe(false);
    expect(showModal).not.toHaveBeenCalled();

    rerender(<SettingsDrawer open {...props} />);
    expect(dialogOf(container).open).toBe(true);
    expect(showModal).toHaveBeenCalledTimes(1);

    rerender(<SettingsDrawer open={false} {...props} />);
    expect(dialogOf(container).open).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('is labelled by its title', async () => {
    await openHarness();

    expect(screen.getByRole('dialog', { name: 'Ajustes del salto' })).toBeInTheDocument();
  });

  test('shows the "Este simulador" and "Global" tabs, the local one selected first', async () => {
    const { user } = await openHarness();
    const tabs = within(screen.getByRole('tablist')).getAllByRole('tab');

    expect(tabs.map((tab) => tab.textContent)).toEqual(['Este simulador', 'Global']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Este simulador' })).toBeInTheDocument();

    await user.click(tabs[1]);

    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel', { name: 'Global' })).toBeInTheDocument();
    expect(screen.queryByRole('tabpanel', { name: 'Este simulador' })).toBeNull();
  });

  test('arrow keys move between the tabs and select them', async () => {
    const { user } = await openHarness();
    const local = screen.getByRole('tab', { name: 'Este simulador' });
    local.focus();

    await user.keyboard('{ArrowRight}');

    const global = screen.getByRole('tab', { name: 'Global' });
    expect(global).toHaveFocus();
    expect(global).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(local).toHaveFocus();
    expect(local).toHaveAttribute('aria-selected', 'true');
  });

  test('choosing "3" decimals in Global writes decimals 3 to the store', async () => {
    const { user } = await openHarness();
    await user.click(screen.getByRole('tab', { name: 'Global' }));

    const decimals = screen.getByRole('radiogroup', { name: 'Decimales' });
    await user.click(within(decimals).getByRole('radio', { name: '3' }));

    expect(getSettings().decimals).toBe(3);
    expect(within(decimals).getByRole('radio', { name: '3' })).toBeChecked();
    expect(within(decimals).getByRole('radio', { name: '2' })).not.toBeChecked();
  });

  test('the "Cuadrícula" switch and the "Movimiento" select edit the store', async () => {
    const { user } = await openHarness();
    await user.click(screen.getByRole('tab', { name: 'Global' }));

    const grid = screen.getByRole('switch', { name: 'Cuadrícula' });
    expect(grid).toBeChecked();
    await user.click(grid);
    expect(getSettings().grid).toBe(false);
    expect(grid).not.toBeChecked();

    const motion = screen.getByRole('combobox', { name: 'Movimiento' });
    expect(
      within(motion)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Automático', 'Reducido']);
    await user.selectOptions(motion, 'reduced');
    expect(getSettings().motion).toBe('reduced');
  });

  test('renders each local option by its kind and reports changes', async () => {
    const onToggle = vi.fn();
    const onSelect = vi.fn();
    const onRange = vi.fn();
    const local: SettingOption[] = [
      { key: 'trail', label: 'Rastro', kind: 'toggle', value: false, onChange: onToggle },
      {
        key: 'integrator',
        label: 'Integrador',
        kind: 'select',
        value: 'analytic',
        options: [
          { value: 'analytic', label: 'Analítico' },
          { value: 'euler', label: 'Euler' },
        ],
        onChange: onSelect,
      },
      {
        key: 'fall',
        label: 'Multiplicador de caída',
        kind: 'range',
        value: 1,
        min: 1,
        max: 4,
        step: 0.5,
        unit: '×',
        onChange: onRange,
      },
    ];
    const { user } = await openHarness(local);

    await user.click(screen.getByRole('switch', { name: 'Rastro' }));
    expect(onToggle).toHaveBeenCalledWith(true);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Integrador' }), 'euler');
    expect(onSelect).toHaveBeenCalledWith('euler');

    const range = screen.getByRole('slider', { name: 'Multiplicador de caída (×)' });
    fireEvent.change(range, { target: { value: '2.5' } });
    expect(onRange).toHaveBeenCalledWith(2.5);
  });

  test('a range option without a unit still gets a labelled range', async () => {
    const onRange = vi.fn();
    await openHarness([
      {
        key: 'speed',
        label: 'Velocidad',
        kind: 'range',
        value: 1,
        min: 0.25,
        max: 2,
        step: 0.25,
        onChange: onRange,
      },
    ]);

    fireEvent.change(screen.getByRole('slider', { name: 'Velocidad' }), {
      target: { value: '0.5' },
    });

    expect(onRange).toHaveBeenCalledWith(0.5);
  });

  test('says so when the simulator has no local options', async () => {
    await openHarness([]);

    expect(
      within(screen.getByRole('tabpanel', { name: 'Este simulador' })).getByText(
        'Este simulador no tiene ajustes propios.',
      ),
    ).toBeInTheDocument();
  });

  test('moves focus into the drawer when it opens', async () => {
    const { container } = await openHarness();

    expect(dialogOf(container)).toContainElement(document.activeElement as HTMLElement);
  });

  test('Escape calls onClose and focus returns to the element that opened it', async () => {
    const onClose = vi.fn();
    const { user, container } = await openHarness([], onClose);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialogOf(container).open).toBe(false);
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus();
  });

  test('the "Cerrar ajustes" button calls onClose and returns focus', async () => {
    const onClose = vi.fn();
    const { user } = await openHarness([], onClose);

    await user.click(screen.getByRole('button', { name: 'Cerrar ajustes' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus();
  });

  test('a close the browser forces on its own still calls onClose', async () => {
    const onClose = vi.fn();
    const { container } = await openHarness([], onClose);

    fireEvent(dialogOf(container), new Event('close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('a click inside the dialog box keeps it open; one outside the box closes it', async () => {
    const onClose = vi.fn();
    const { container } = await openHarness([], onClose);
    const dialog = dialogOf(container);
    // A full-height side panel taller than its content: the blank area is still the dialog.
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 880, y: 0, width: 400, height: 900 }),
    );

    fireEvent.click(dialog, { clientX: 1000, clientY: 800 });
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog.open).toBe(true);

    fireEvent.click(dialog, { clientX: 300, clientY: 400 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('returnFocusTo wins over whatever had focus when the drawer opened', () => {
    function RefHarness() {
      const [open, setOpen] = useState(false);
      const openerRef = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={openerRef} type="button" onClick={() => setOpen(true)}>
            Abrir
          </button>
          <SettingsDrawer
            open={open}
            onClose={() => setOpen(false)}
            title="Ajustes"
            local={[]}
            returnFocusTo={openerRef}
          />
        </>
      );
    }
    render(<RefHarness />);
    const opener = screen.getByRole('button', { name: 'Abrir' });

    // Safari and macOS Firefox do not focus a button on click: body has focus at open time.
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(opener);
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });

    expect(opener).toHaveFocus();
  });

  test('locks page scrolling while open and restores it on close', async () => {
    document.documentElement.style.overflow = 'auto';
    const { user } = await openHarness();

    expect(document.documentElement.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Cerrar ajustes' }));

    expect(document.documentElement.style.overflow).toBe('auto');
    document.documentElement.removeAttribute('style');
  });

  test('unmounting while open releases the scroll lock and returns focus to the opener', () => {
    function UnmountHarness({ isDrawerMounted }: { isDrawerMounted: boolean }) {
      const openerRef = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={openerRef} type="button">
            Abrir
          </button>
          {isDrawerMounted ? (
            <SettingsDrawer
              open
              onClose={() => {}}
              title="Ajustes"
              local={[]}
              returnFocusTo={openerRef}
            />
          ) : null}
        </>
      );
    }
    const { rerender } = render(<UnmountHarness isDrawerMounted />);
    expect(document.documentElement.style.overflow).toBe('hidden');

    rerender(<UnmountHarness isDrawerMounted={false} />);

    expect(document.documentElement.style.overflow).toBe('');
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus();
  });

  test('falls back to the open attribute where showModal is missing', () => {
    const restore = removeDialogMethods();
    try {
      const props = { onClose: () => {}, title: 'Ajustes', local: [] };
      const { container, rerender } = render(<SettingsDrawer open {...props} />);
      expect(dialogOf(container)).toHaveAttribute('open');

      rerender(<SettingsDrawer open={false} {...props} />);
      expect(dialogOf(container)).not.toHaveAttribute('open');
    } finally {
      restore();
    }
  });
});
