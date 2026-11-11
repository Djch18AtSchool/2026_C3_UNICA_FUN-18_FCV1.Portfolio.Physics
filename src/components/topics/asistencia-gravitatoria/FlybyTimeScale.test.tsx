// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import FlybyLab from './FlybyLab';

const REDUCED_STEP_MS = 250;
const GO_TO_PERIAPSIS = 'Ir a la máxima aproximación';
const plain = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

const lab = () => screen.getByTestId('flyby-lab');
const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const goButton = () => screen.getByRole('button', { name: GO_TO_PERIAPSIS });
const planetFrame = () => screen.getByTestId('flyby-planet-frame');
const badges = () => [...lab().querySelectorAll('[data-time-scale-badge]')];
const badgeText = () => plain(planetFrame().querySelector('[data-time-scale-badge]')?.textContent);
const clockLine = () => plain(mathSourceText(screen.getByTestId('flyby-clock')));
const marks = () => [...lab().querySelectorAll('[data-transport-mark]')] as HTMLElement[];
const SAID = /^Máxima aproximación: la sonda pasa a /;
const presetSelect = () => screen.getByRole('combobox', { name: 'Valores de referencia' });

async function setSpeed(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
  await user.selectOptions(
    within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Velocidad' }),
    value,
  );
  await user.keyboard('{Escape}');
}

describe('the flyby lab: its time scale and its closest approach', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  describe('the closest approach on the timeline', () => {
    test('one peak mark, at the middle of the pass (t = t_p)', () => {
      render(<FlybyLab />);

      expect(marks()).toHaveLength(1);
      expect(marks()[0]).toHaveAttribute('data-kind', 'peak');
      expect(marks()[0].style.getPropertyValue('--mark-at')).toBe('0.5');
    });

    test('«Evento siguiente» from the start lands on it, and the timeline names it', async () => {
      const user = userEvent.setup();
      render(<FlybyLab />);

      await user.click(screen.getByRole('button', { name: 'Evento siguiente' }));

      expect(timeline()).toHaveValue('500');
      expect(timeline().getAttribute('aria-valuetext')).toMatch(/Máxima aproximación$/);
      expect(clockLine()).toMatch(/\$t - t_p\$ = 0,0 h/);
    });

    test('the mark stays at the middle when an encounter with another duration is chosen', async () => {
      const user = userEvent.setup();
      render(<FlybyLab />);

      await user.selectOptions(presetSelect(), 'V2 · Neptuno');

      expect(marks()).toHaveLength(1);
      expect(marks()[0].style.getPropertyValue('--mark-at')).toBe('0.5');
    });
  });

  describe('«Ir a la máxima aproximación»', () => {
    test('is a button of the canvas, under the planet frame’s clock, not of the notes', () => {
      render(<FlybyLab />);
      const canvas = document.querySelector('[data-lab-canvas]') as HTMLElement;
      const notes = document.querySelector('[data-lab-canvas-notes]') as HTMLElement;

      expect(within(canvas).getByRole('button', { name: GO_TO_PERIAPSIS })).toBeVisible();
      expect(within(notes).queryByRole('button')).toBeNull();
      const clock = screen.getByTestId('flyby-clock');
      expect(clock.nextElementSibling).toBe(goButton().closest('[data-periapsis-jump]'));
    });

    test('seeks to t_p from before it and from after it, and pauses', async () => {
      const user = userEvent.setup();
      render(<FlybyLab />);

      fireEvent.change(timeline(), { target: { value: '900' } });
      expect(clockLine()).not.toMatch(/\$t - t_p\$ = 0,0 h/);
      await user.click(goButton());
      expect(timeline()).toHaveValue('500');
      expect(clockLine()).toMatch(/\$t - t_p\$ = 0,0 h/);

      fireEvent.change(timeline(), { target: { value: '100' } });
      await user.click(goButton());
      expect(timeline()).toHaveValue('500');
    });

    test('says what is there: the distance in planet radii and the speed relative to the planet', async () => {
      const user = userEvent.setup();
      render(<FlybyLab />);

      await user.click(goButton());

      const status = within(lab()).getByText(/^Máxima aproximación: la sonda pasa a /);
      expect(status.closest('[role="status"]')).not.toBeNull();
      expect(plain(status.textContent)).toMatch(
        /^Máxima aproximación: la sonda pasa a 10,09 radios de Júpiter, con \d+,\d+ km\/s respecto al planeta\.$/,
      );
    });

    test('says it again on a second press, as a new node (the same text is spoken again)', async () => {
      const user = userEvent.setup();
      render(<FlybyLab />);
      await user.click(goButton());
      const first = within(lab()).getByText(/^Máxima aproximación: la sonda pasa a /);

      await user.click(goButton());

      const second = within(lab()).getByText(/^Máxima aproximación: la sonda pasa a /);
      expect(second).not.toBe(first);
    });

    test('goes quiet once the time leaves the closest approach', async () => {
      const user = userEvent.setup();
      render(<FlybyLab />);
      await user.click(goButton());

      fireEvent.change(timeline(), { target: { value: '700' } });

      expect(within(lab()).queryByText(/^Máxima aproximación: la sonda pasa a /)).toBeNull();
    });

    test('goes quiet when an edit changes what it said: a new r_p or encounter is not announced', async () => {
      const user = userEvent.setup();
      render(<FlybyLab />);
      await user.click(goButton());
      expect(within(lab()).queryByText(SAID)).not.toBeNull();

      await user.clear(screen.getByRole('textbox', { name: 'Máxima aproximación r sub p' }));
      await user.type(
        screen.getByRole('textbox', { name: 'Máxima aproximación r sub p' }),
        '3{Enter}',
      );
      expect(within(lab()).queryByText(SAID)).toBeNull();

      await user.click(goButton());
      expect(within(lab()).getByText(SAID)).toHaveTextContent(/pasa a 3,00 radios de Júpiter/);

      await user.selectOptions(presetSelect(), 'V2 · Urano');
      expect(within(lab()).queryByText(SAID)).toBeNull();
    });

    test('goes quiet when playback starts', async () => {
      vi.useFakeTimers();
      setSettings({ motion: 'reduced' });
      vi.stubGlobal('requestAnimationFrame', () => 1);
      vi.stubGlobal('cancelAnimationFrame', () => undefined);
      render(<FlybyLab />);
      fireEvent.click(goButton());
      expect(within(lab()).queryByText(/^Máxima aproximación: la sonda pasa a /)).not.toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
      act(() => vi.advanceTimersByTime(REDUCED_STEP_MS));

      expect(within(lab()).queryByText(/^Máxima aproximación: la sonda pasa a /)).toBeNull();
    });
  });

  describe('the time scale on the canvas', () => {
    test('the planet frame declares ×19 000, «cámara rápida», and the Sun frame (a static triangle) says nothing', () => {
      render(<FlybyLab />);

      expect(badgeText()).toBe('×19 000cámara rápida');
      expect(badges()).toHaveLength(1);
      expect(
        screen.getByTestId('flyby-sun-frame').querySelector('[data-time-scale-badge]'),
      ).toBeNull();
    });

    test('is the factor the note states at 1×: the same number, two ways of saying it', () => {
      render(<FlybyLab />);
      const noted = /unas ([\d\s]+) veces más rápido/.exec(
        plain(screen.getByTestId('flyby-lapse').textContent),
      );

      expect(`×${noted?.[1]}`).toBe(badgeText().replace('cámara rápida', ''));
    });

    test('the note states the nominal pass (1×, no reduced motion) and the badge the one in force', () => {
      setSettings({ motion: 'reduced' });
      render(<FlybyLab />);

      expect(badgeText()).toBe('×15 000cámara rápida');
      const note = plain(screen.getByTestId('flyby-lapse').textContent);
      expect(note).toMatch(
        /a 1× y sin movimiento reducido se ve en 12 s, unas 19\s000 veces más rápido/,
      );
      expect(note).toMatch(/el factor en curso está sobre el dibujo/);
    });

    test('the scale is also in words, once, for the reader: hidden text and a status that stays quiet on load', () => {
      render(<FlybyLab />);
      const words = lab().querySelector('[data-time-scale-words]');

      expect(plain(words?.textContent)).toBe(
        'Escala de tiempo: 19 000 veces la velocidad real, cámara rápida',
      );
      expect(words?.nextElementSibling).toHaveAttribute('role', 'status');
      expect(words?.nextElementSibling).toBeEmptyDOMElement();
    });

    test('follows the speed setting: at 2× the pass plays twice as fast', async () => {
      const user = userEvent.setup();
      render(<FlybyLab />);

      await setSpeed(user, '2');

      expect(badgeText()).toBe('×39 000cámara rápida');
    });

    test('changes with the encounter: Neptune’s short pass is a smaller factor', async () => {
      const user = userEvent.setup();
      render(<FlybyLab />);

      await user.selectOptions(presetSelect(), 'V2 · Neptuno');

      expect(badgeText()).not.toBe('×19 000cámara rápida');
      expect(badgeText()).toMatch(/^×[\d\s]+cámara rápida$/);
    });

    test('with reduced motion the badge reads the pace that is seen: the pass in 15 s, not 12 s', () => {
      setSettings({ motion: 'reduced' });
      render(<FlybyLab />);

      expect(badgeText()).toBe('×15 000cámara rápida');
    });

    test('prints only characters IBM Plex draws', () => {
      render(<FlybyLab />);

      expect(plexViolations(planetFrame())).toEqual([]);
    });
  });
});
