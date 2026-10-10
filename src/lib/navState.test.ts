import { describe, expect, test, vi } from 'vitest';
import {
  phaseKey,
  readOpenPhases,
  readSidebarClosed,
  SIDEBAR_KEY,
  writePhaseOpen,
  writeSidebarClosed,
} from './navState';

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
    expect(SIDEBAR_KEY).toBe('portafolio.nav.sidebar');
    expect(phaseKey(2)).toBe('portafolio.nav.avance-2');
  });
});

describe('readOpenPhases', () => {
  test('without storage only the current phase is open', () => {
    expect(readOpenPhases(undefined, 2)).toEqual({ 1: false, 2: true, 3: false });
  });

  test('without stored values only the current phase is open', () => {
    expect(readOpenPhases(storageWith({}), 1)).toEqual({ 1: true, 2: false, 3: false });
  });

  test('stored values win over the default', () => {
    const storage = storageWith({
      'portafolio.nav.avance-1': 'closed',
      'portafolio.nav.avance-3': 'open',
    });
    expect(readOpenPhases(storage, 1)).toEqual({ 1: false, 2: false, 3: true });
  });

  test('ignores unknown stored values', () => {
    expect(readOpenPhases(storageWith({ 'portafolio.nav.avance-2': 'yes' }), 2)).toEqual({
      1: false,
      2: true,
      3: false,
    });
  });

  test('falls back to the default when storage throws', () => {
    expect(readOpenPhases(throwing, 3)).toEqual({ 1: false, 2: false, 3: true });
  });
});

describe('readSidebarClosed', () => {
  test('is true only for a stored "closed"', () => {
    expect(readSidebarClosed(storageWith({ 'portafolio.nav.sidebar': 'closed' }))).toBe(true);
    expect(readSidebarClosed(storageWith({ 'portafolio.nav.sidebar': 'open' }))).toBe(false);
    expect(readSidebarClosed(storageWith({}))).toBe(false);
  });

  test('is false without storage', () => {
    expect(readSidebarClosed(undefined)).toBe(false);
  });

  test('is false when storage throws', () => {
    expect(readSidebarClosed(throwing)).toBe(false);
  });
});

describe('writers', () => {
  test('store "open"/"closed" under the phase and sidebar keys', () => {
    const setItem = vi.fn();
    expect(writePhaseOpen({ setItem }, 1, false)).toBe(true);
    expect(writePhaseOpen({ setItem }, 3, true)).toBe(true);
    expect(writeSidebarClosed({ setItem }, true)).toBe(true);
    expect(writeSidebarClosed({ setItem }, false)).toBe(true);
    expect(setItem.mock.calls).toEqual([
      ['portafolio.nav.avance-1', 'closed'],
      ['portafolio.nav.avance-3', 'open'],
      ['portafolio.nav.sidebar', 'closed'],
      ['portafolio.nav.sidebar', 'open'],
    ]);
  });

  test('never throw and report failure', () => {
    expect(writePhaseOpen(throwing, 1, true)).toBe(false);
    expect(writeSidebarClosed(throwing, true)).toBe(false);
    expect(writePhaseOpen(undefined, 1, true)).toBe(false);
    expect(writeSidebarClosed(undefined, true)).toBe(false);
  });
});
