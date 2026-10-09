import { describe, expect, test, vi } from 'vitest';
import { readStoredTheme, resolveTheme, THEME_STORAGE_KEY, writeStoredTheme } from './theme';

describe('resolveTheme', () => {
  test('falls back to the system preference when nothing is stored', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
  });
  test('a stored choice wins over the system preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  test('ignores unknown stored values', () => {
    expect(resolveTheme('sepia', true)).toBe('dark');
  });
});

describe('readStoredTheme', () => {
  test('reads the theme key', () => {
    const getItem = vi.fn(() => 'dark');
    expect(readStoredTheme({ getItem })).toBe('dark');
    expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
  });
  test('returns null when storage throws', () => {
    expect(
      readStoredTheme({
        getItem() {
          throw new Error('blocked');
        },
      }),
    ).toBeNull();
  });
  test('returns null when storage is unavailable', () => {
    expect(readStoredTheme(undefined)).toBeNull();
  });
});

describe('writeStoredTheme', () => {
  test('writes the theme key and reports success', () => {
    const setItem = vi.fn();
    expect(writeStoredTheme({ setItem }, 'dark')).toBe(true);
    expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
  });
  test('returns false when storage throws', () => {
    expect(
      writeStoredTheme(
        {
          setItem() {
            throw new Error('blocked');
          },
        },
        'dark',
      ),
    ).toBe(false);
  });
  test('returns false when storage is unavailable', () => {
    expect(writeStoredTheme(undefined, 'dark')).toBe(false);
  });
});
