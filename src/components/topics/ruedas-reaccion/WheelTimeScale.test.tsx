// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import WheelLab from './WheelLab';

const scene = () => screen.getByTestId('wheel-scene');
const badge = () => scene().querySelector('[data-time-scale-badge]') as SVGGElement;
const badgeWords = () => (badge().textContent ?? '').replace(/\s+/g, ' ').trim();
const sceneLabel = () =>
  (scene().querySelector('[role="img"]')?.getAttribute('aria-label') ?? '').replace(/\s/g, ' ');
/** Where the badge's first text starts or ends: its x and its anchor. */
const badgeAnchor = () => badge().querySelector('text')?.getAttribute('text-anchor');

async function disturbance(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: 'Perturbación y descarga' }));
}

async function setSpeed(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
  await user.selectOptions(
    within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Velocidad' }),
    value,
  );
  await user.keyboard('{Escape}');
}

describe('the time scale on the wheel lab canvas', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('the maneuver declares real time, at the dial’s bottom-left, clear of the target label', () => {
    render(<WheelLab />);

    expect(badgeWords()).toBe('×1velocidad real');
    expect(badgeAnchor()).toBe('start');
    expect(badge()).toHaveAttribute('aria-hidden', 'true');
  });

  test('the disturbance declares ×7 200 on a fill in the same corner, bottom-left: the eye finds it again', async () => {
    const user = userEvent.setup();
    render(<WheelLab />);
    const maneuverX = badge().querySelector('text')?.getAttribute('x');

    await disturbance(user);

    expect(badgeWords()).toBe('×7 200cámara rápida');
    expect(badgeAnchor()).toBe('start');
    expect(badge().querySelector('text')?.getAttribute('x')).toBe(maneuverX);
  });

  test('while a dump acts, its law moves to the bottom-right, out of the badge’s corner', async () => {
    const user = userEvent.setup();
    render(<WheelLab />);
    await disturbance(user);

    await user.click(screen.getByRole('button', { name: 'Ir a la descarga' }));

    const law = scene().querySelector('[data-dump-law]');
    expect(law).not.toBeNull();
    expect(law?.querySelector('text')?.getAttribute('text-anchor')).toBe('end');
  });

  test('while a dump plays stretched the factor drops: ×1 700 with the magnetorquer, ×2,5 with the thruster', async () => {
    const user = userEvent.setup();
    render(<WheelLab />);
    await disturbance(user);

    await user.click(screen.getByRole('button', { name: 'Ir a la descarga' }));
    expect(badgeWords()).toBe('×1 700cámara rápida');

    await user.click(screen.getByRole('radio', { name: 'Propulsor' }));
    await user.click(screen.getByRole('button', { name: 'Ir a la descarga' }));
    expect(badgeWords()).toBe('×2,5cámara rápida');
  });

  test('the factor follows the speed setting: at 4× the maneuver is ×4 and the fill ×29 000', async () => {
    const user = userEvent.setup();
    render(<WheelLab />);

    await setSpeed(user, '4');
    expect(badgeWords()).toBe('×4cámara rápida');

    await disturbance(user);
    expect(badgeWords()).toBe('×29 000cámara rápida');
  });

  test('with reduced motion the badge reads the pace that is seen: the maneuver of 60 s in 15 s is ×4', () => {
    setSettings({ motion: 'reduced' });
    render(<WheelLab />);

    expect(badgeWords()).toBe('×4cámara rápida');
  });

  test('the scene’s description says the scale in words, so it is read without a second status region', async () => {
    const user = userEvent.setup();
    render(<WheelLab />);
    expect(sceneLabel()).toContain('Escala de tiempo: velocidad real');

    await disturbance(user);

    expect(sceneLabel()).toContain(
      'Escala de tiempo: 7 200 veces la velocidad real, cámara rápida',
    );
    expect(within(screen.getByTestId('wheel-lab')).getAllByRole('status')).toHaveLength(1);
  });

  test('the badge prints only characters IBM Plex draws, in both modes', async () => {
    const user = userEvent.setup();
    render(<WheelLab />);
    expect(plexViolations(badge())).toEqual([]);

    await disturbance(user);

    expect(plexViolations(badge())).toEqual([]);
  });

  test('the canvas note that explains the lapse says the drawing states the factor', async () => {
    const user = userEvent.setup();
    render(<WheelLab />);
    await disturbance(user);

    const notes = document.querySelector('[data-lab-canvas-notes]') as HTMLElement;
    expect(notes).toHaveTextContent(
      /La perturbación va a cámara rápida y el dibujo dice el factor\. A 1×, 2 h de órbita por segundo/,
    );
  });
});
