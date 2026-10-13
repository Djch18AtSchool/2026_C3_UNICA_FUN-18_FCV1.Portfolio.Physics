import { afterEach, describe, expect, test, vi } from 'vitest';
import { phaseKey, safeLocalStorage, readOpenPhases, writePhaseOpen } from './navState';

const throwing = {
  getItem(): string | null {
    throw new Error('blocked');
  },
  setItem(): void {
    throw new Error('blocked');
  },
};

function storageWith(values: Record<string, string>) {
  return { getItem: (key: string) => values[key] ?? null };
}

describe('keys', () => {
  test('use the portafolio.nav namespace', () => {
    expect(phaseKey(2)).toBe('portafolio.nav.avance-2');
  });
});

describe('readOpenPhases', () => {
  const ALL = [1, 2, 3] as const;

  test('without storage only the default phase is open', () => {
    expect(readOpenPhases(undefined, 2, ALL)).toEqual({ 1: false, 2: true, 3: false });
  });

  test('without stored values only the default phase is open', () => {
    expect(readOpenPhases(storageWith({}), 1, ALL)).toEqual({ 1: true, 2: false, 3: false });
  });

  test('stored values win over the default', () => {
    const storage = storageWith({
      'portafolio.nav.avance-1': 'closed',
      'portafolio.nav.avance-3': 'open',
    });
    expect(readOpenPhases(storage, 1, ALL)).toEqual({ 1: false, 2: false, 3: true });
  });

  test('ignores unknown stored values', () => {
    expect(readOpenPhases(storageWith({ 'portafolio.nav.avance-2': 'yes' }), 2, ALL)).toEqual({
      1: false,
      2: true,
      3: false,
    });
  });

  test('falls back to the default when storage throws', () => {
    expect(readOpenPhases(throwing, 3, ALL)).toEqual({ 1: false, 2: false, 3: true });
  });

  test('reports only the collapsible phases: a stored "open" cannot open a future phase', () => {
    const storage = storageWith({ 'portafolio.nav.avance-2': 'open' });
    expect(readOpenPhases(storage, 1, [1])).toEqual({ 1: true });
  });
});

describe('writers', () => {
  test('store "open"/"closed" under the phase keys', () => {
    const setItem = vi.fn();
    expect(writePhaseOpen({ setItem }, 1, false)).toBe(true);
    expect(writePhaseOpen({ setItem }, 3, true)).toBe(true);
    expect(setItem.mock.calls).toEqual([
      ['portafolio.nav.avance-1', 'closed'],
      ['portafolio.nav.avance-3', 'open'],
    ]);
  });

  test('never throw and report failure', () => {
    expect(writePhaseOpen(throwing, 1, true)).toBe(false);
    expect(writePhaseOpen(undefined, 1, true)).toBe(false);
  });
});

describe('safeLocalStorage', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('returns the window storage', () => {
    const localStorage = { getItem: vi.fn() };
    vi.stubGlobal('window', { localStorage });
    expect(safeLocalStorage()).toBe(localStorage);
  });

  test('is undefined when touching the storage throws', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked');
      },
    });
    expect(safeLocalStorage()).toBeUndefined();
  });
});
