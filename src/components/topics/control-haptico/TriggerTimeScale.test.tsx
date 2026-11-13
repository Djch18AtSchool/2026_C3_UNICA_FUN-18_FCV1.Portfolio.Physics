// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { formatTimeScale } from '../../lab/timeScaleFormat';
import TriggerLab from './TriggerLab';
import { SLOW_MOTION } from './triggerScene';

const lab = () => screen.getByTestId('trigger-lab');
const badges = () => lab().querySelectorAll<HTMLElement>('[data-time-scale-badge]');
const badgeWords = () => (badges()[0]?.textContent ?? '').replace(/\s+/g, ' ').trim();
const spokenWords = () => lab().querySelector('[data-time-scale-words]')?.textContent;

describe('the time scale on the trigger lab canvas', () => {
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

  test('the return plays SLOW_MOTION times slower, and the badge says so from the constant', () => {
    render(<TriggerLab />);

    expect(badgeWords()).toBe(`${formatTimeScale(1 / SLOW_MOTION)}cámara lenta`);
    expect(badgeWords()).toBe('×0,1cámara lenta');
  });

  test('one badge, hidden from screen readers, which hear the scale in words once', () => {
    render(<TriggerLab />);

    expect(badges()).toHaveLength(1);
    expect(badges()[0]).toHaveAttribute('aria-hidden', 'true');
    expect(spokenWords()).toBe('Escala de tiempo: 0,1 veces la velocidad real, cámara lenta');
  });

  test('it sits in the bottom-left corner of the drawing, clear of the lever and its labels', () => {
    render(<TriggerLab />);

    expect(badges()[0]).toHaveClass('bottom-2', 'left-2');
  });

  test('with reduced motion the return is instant, so there is no scale to declare', () => {
    setSettings({ motion: 'reduced' });
    render(<TriggerLab />);

    expect(badges()).toHaveLength(0);
    expect(lab().querySelector('[data-time-scale-words]')).toBeNull();
  });

  test('the badge prints only characters IBM Plex draws', () => {
    render(<TriggerLab />);

    expect(plexViolations(badges()[0])).toEqual([]);
  });
});
