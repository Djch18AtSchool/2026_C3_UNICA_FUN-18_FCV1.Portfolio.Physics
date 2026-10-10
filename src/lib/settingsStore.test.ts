import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  getSettings,
  motionReduced,
  readSettings,
  resetSettingsForTests,
  SETTINGS_KEY,
  setSettings,
  subscribe,
  writeSettings,
} from './settingsStore';

afterEach(() => {
  resetSettingsForTests();
});

describe('readSettings', () => {
  test('returns the defaults when storage is unavailable', () => {
    expect(readSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  test('falls back to the default per key for out-of-range values', () => {
    const storage = { getItem: () => '{"decimals":7,"grid":false}' };
    expect(readSettings(storage)).toEqual({ decimals: 2, grid: false, motion: 'auto' });
  });

  test('returns the defaults when storage throws', () => {
    const storage = {
      getItem() {
        throw new Error('blocked');
      },
    };
    expect(readSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  test('returns the defaults when the stored value is invalid JSON', () => {
    expect(readSettings({ getItem: () => 'not json' })).toEqual(DEFAULT_SETTINGS);
  });
});

describe('writeSettings', () => {
  test('returns false when storage is unavailable', () => {
    expect(writeSettings(undefined, DEFAULT_SETTINGS)).toBe(false);
  });

  test('writes the settings key and reports success', () => {
    const setItem = vi.fn();
    expect(writeSettings({ setItem }, DEFAULT_SETTINGS)).toBe(true);
    expect(setItem).toHaveBeenCalledWith(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  });

  test('returns false when storage throws', () => {
    expect(
      writeSettings(
        {
          setItem() {
            throw new Error('blocked');
          },
        },
        DEFAULT_SETTINGS,
      ),
    ).toBe(false);
  });
});

describe('getSettings / setSettings / subscribe', () => {
  test('setSettings notifies a subscriber and updates getSettings', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    setSettings({ decimals: 3 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getSettings().decimals).toBe(3);
    unsubscribe();
  });

  test('unsubscribe stops further notifications', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    unsubscribe();

    setSettings({ grid: false });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('blocked localStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('falls back to the defaults in memory when reading window.localStorage throws', () => {
    // Arrange: some privacy modes throw on the localStorage getter itself.
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('blocked', 'SecurityError');
      },
    });

    // Act
    resetSettingsForTests();
    setSettings({ decimals: 1 });

    // Assert
    expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, decimals: 1 });
  });
});

describe('motionReduced', () => {
  test('is true when motion is explicitly reduced', () => {
    expect(motionReduced({ ...DEFAULT_SETTINGS, motion: 'reduced' }, false)).toBe(true);
  });

  test('is true when motion is auto and the media query matches', () => {
    expect(motionReduced(DEFAULT_SETTINGS, true)).toBe(true);
  });

  test('is false when motion is auto and the media query does not match', () => {
    expect(motionReduced(DEFAULT_SETTINGS, false)).toBe(false);
  });
});
