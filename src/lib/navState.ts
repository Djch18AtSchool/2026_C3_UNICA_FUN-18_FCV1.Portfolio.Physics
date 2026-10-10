import { PHASES, type Phase } from '../consigna';

/**
 * Sidebar state remembered in localStorage (spec §5). The inline scripts in BaseLayout and
 * SideNav cannot import modules: they mirror readSidebarClosed and readOpenPhases and receive
 * these keys and values through define:vars, so this file stays the single source.
 */
export const SIDEBAR_KEY = 'portafolio.nav.sidebar';
export const phaseKey = (p: Phase) => `portafolio.nav.avance-${p}`;

/** Stored values for both the sidebar and each phase. */
export const NAV_OPEN = 'open';
export const NAV_CLOSED = 'closed';

/** The header button names the action it performs; shared with its pre-hydration script. */
export const SIDEBAR_TOGGLE_LABELS = {
  open: 'Ocultar barra lateral',
  closed: 'Mostrar barra lateral',
} as const;

type Reader = Pick<Storage, 'getItem'> | undefined;
type Writer = Pick<Storage, 'setItem'> | undefined;

/** Storage may be missing or throw (privacy modes, blocked site data). */
function safeRead(storage: Reader, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(storage: Writer, key: string, value: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Each phase's remembered state; without a valid stored value only the current phase is open. */
export function readOpenPhases(storage: Reader, currentPhase: Phase): Record<Phase, boolean> {
  const entries = PHASES.map((phase) => {
    const stored = safeRead(storage, phaseKey(phase));
    if (stored === NAV_OPEN) return [phase, true];
    if (stored === NAV_CLOSED) return [phase, false];
    return [phase, phase === currentPhase];
  });
  return Object.fromEntries(entries) as Record<Phase, boolean>;
}

/** Whether the reader hid the sidebar on wide screens. Never throws. */
export function readSidebarClosed(storage: Reader): boolean {
  return safeRead(storage, SIDEBAR_KEY) === NAV_CLOSED;
}

/** Persist a phase's open state; returns whether it was saved. Never throws. */
export function writePhaseOpen(storage: Writer, phase: Phase, isOpen: boolean): boolean {
  return safeWrite(storage, phaseKey(phase), isOpen ? NAV_OPEN : NAV_CLOSED);
}

/** Persist the sidebar choice; returns whether it was saved. Never throws. */
export function writeSidebarClosed(storage: Writer, isClosed: boolean): boolean {
  return safeWrite(storage, SIDEBAR_KEY, isClosed ? NAV_CLOSED : NAV_OPEN);
}

/** Even touching `window.localStorage` can throw when site data is blocked. */
export function safeLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
