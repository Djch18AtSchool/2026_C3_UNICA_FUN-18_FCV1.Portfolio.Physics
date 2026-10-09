/** The decimals every readout, chart and the plotter's grid share unless told otherwise. */
export interface GlobalSettings {
  decimals: 1 | 2 | 3;
  grid: boolean;
  motion: 'auto' | 'reduced';
}

/** localStorage key for the persisted settings. */
export const SETTINGS_KEY = 'portafolio.settings';

export const DEFAULT_SETTINGS: GlobalSettings = {
  decimals: 2,
  grid: true,
  motion: 'auto',
};

function isValidDecimals(value: unknown): value is GlobalSettings['decimals'] {
  return value === 1 || value === 2 || value === 3;
}

function isValidMotion(value: unknown): value is GlobalSettings['motion'] {
  return value === 'auto' || value === 'reduced';
}

/** Validates each key independently; an invalid or missing key falls back to its default. */
function sanitizeSettings(parsed: unknown): GlobalSettings {
  const candidate =
    parsed !== null && typeof parsed === 'object'
      ? (parsed as Partial<Record<keyof GlobalSettings, unknown>>)
      : {};
  return {
    decimals: isValidDecimals(candidate.decimals) ? candidate.decimals : DEFAULT_SETTINGS.decimals,
    grid: typeof candidate.grid === 'boolean' ? candidate.grid : DEFAULT_SETTINGS.grid,
    motion: isValidMotion(candidate.motion) ? candidate.motion : DEFAULT_SETTINGS.motion,
  };
}

/** Read the stored settings; storage may be missing, throw, or hold invalid JSON or values. */
export function readSettings(storage: Pick<Storage, 'getItem'> | undefined): GlobalSettings {
  if (!storage) return DEFAULT_SETTINGS;
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Persist the settings; returns whether it was saved. Never throws. */
export function writeSettings(
  storage: Pick<Storage, 'setItem'> | undefined,
  s: GlobalSettings,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

/** The browser's localStorage, or undefined outside the browser or when it is blocked. */
function currentStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

let state: GlobalSettings | undefined;
const listeners = new Set<() => void>();

/** Lazily initializes the in-memory state from storage on first access. */
function ensureInitialized(): GlobalSettings {
  if (state === undefined) {
    state = readSettings(currentStorage());
  }
  return state;
}

export function getSettings(): GlobalSettings {
  return ensureInitialized();
}

export function setSettings(patch: Partial<GlobalSettings>): void {
  state = { ...ensureInitialized(), ...patch };
  writeSettings(currentStorage(), state);
  listeners.forEach((listener) => listener());
}

/** Subscribes to settings changes; returns a function that unsubscribes. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether motion should be reduced: explicit choice, or 'auto' deferring to the media query. */
export function motionReduced(s: GlobalSettings, mediaMatches: boolean): boolean {
  return s.motion === 'reduced' || (s.motion === 'auto' && mediaMatches);
}

/** Test-only helper: resets the in-memory state and reloads it from storage. */
export function resetSettingsForTests(): void {
  state = readSettings(currentStorage());
}
