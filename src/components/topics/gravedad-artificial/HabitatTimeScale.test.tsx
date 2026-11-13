// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { formatTimeScale } from '../../lab/timeScaleFormat';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import HabitatLab, { TIME_LAPSE } from './HabitatLab';

const lab = () => screen.getByTestId('habitat-lab');
const badge = () => lab().querySelector('[data-time-scale-badge]') as HTMLElement;
const badgeWords = () => (badge().textContent ?? '').replace(/\s+/g, ' ').trim();
const spokenWords = () => lab().querySelector('[data-time-scale-words]')?.textContent;

async function setSpeed(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
  await user.selectOptions(
    within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Velocidad' }),
    value,
  );
  await user.keyboard('{Escape}');
}

describe('the time scale on the habitat lab canvas', () => {
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

  test('the turn plays TIME_LAPSE times faster, and the badge says so from the constant', () => {
    render(<HabitatLab />);

    expect(badgeWords()).toBe(`${formatTimeScale(TIME_LAPSE)}cámara rápida`);
    expect(badgeWords()).toBe('×6cámara rápida');
  });

  test('the badge is hidden from screen readers, which hear the scale in words once', () => {
    render(<HabitatLab />);

    expect(badge()).toHaveAttribute('aria-hidden', 'true');
    expect(lab().querySelectorAll('[data-time-scale-badge]')).toHaveLength(1);
    expect(spokenWords()).toBe('Escala de tiempo: 6 veces la velocidad real, cámara rápida');
  });

  test('it follows the speed setting: 2× is ×12', async () => {
    const user = userEvent.setup();
    render(<HabitatLab />);

    await setSpeed(user, '2');

    expect(badgeWords()).toBe('×12cámara rápida');
  });

  test('with reduced motion it reads the pace that is seen: the 60 s turn in 15 s is ×4', () => {
    setSettings({ motion: 'reduced' });
    render(<HabitatLab />);

    expect(badgeWords()).toBe('×4cámara rápida');
  });

  test('it sits in the bottom-right corner of the ring’s square', () => {
    render(<HabitatLab />);

    expect(badge()).toHaveClass('bottom-2', 'right-2');
    expect(badge().closest('[data-habitat-badge-box]')).not.toBeNull();
  });

  test('the badge prints only characters IBM Plex draws', () => {
    render(<HabitatLab />);

    expect(plexViolations(badge())).toEqual([]);
  });
});
