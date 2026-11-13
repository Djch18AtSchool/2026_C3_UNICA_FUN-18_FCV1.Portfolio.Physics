// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, SETTINGS_KEY, setSettings } from './settingsStore';

/**
 * The page's root carries the motion setting (`data-motion`), so CSS transitions of the labs (a
 * handle that grows while dragged, a legend's highlight) stop with «Movimiento: reducido» too, not
 * only with the system's `prefers-reduced-motion`.
 */
describe('data-motion on the page root', () => {
  afterEach(() => {
    localStorage.clear();
    resetSettingsForTests();
    delete document.documentElement.dataset.motion;
  });

  test('a stored «reduced» reaches the root as soon as the settings are first read', async () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ motion: 'reduced' }));
    vi.resetModules();
    const fresh = await import('./settingsStore');

    fresh.getSettings();

    expect(document.documentElement.dataset.motion).toBe('reduced');
  });

  test('changing the setting changes the root, and back', () => {
    setSettings({ motion: 'reduced' });
    expect(document.documentElement.dataset.motion).toBe('reduced');

    setSettings({ motion: 'auto' });
    expect(document.documentElement.dataset.motion).toBe('auto');
  });
});
