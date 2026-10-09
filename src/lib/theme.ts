export type Theme = 'light' | 'dark';

/** localStorage key shared with the inline head script in BaseLayout. */
export const THEME_STORAGE_KEY = 'theme';

/** The toggle names the theme it switches to; shared with the pre-hydration script in SiteHeader. */
export const THEME_TOGGLE_LABELS: Record<Theme, string> = {
  light: 'Cambiar a tema oscuro',
  dark: 'Cambiar a tema claro',
};

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

/** A valid stored choice wins; otherwise follow the system preference. */
export function resolveTheme(stored: string | null, systemPrefersDark: boolean): Theme {
  if (isTheme(stored)) return stored;
  return systemPrefersDark ? 'dark' : 'light';
}

/** Read the stored theme; storage may be missing or throw (privacy modes, blocked cookies). */
export function readStoredTheme(storage: Pick<Storage, 'getItem'> | undefined): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Persist the theme; returns whether it was saved. Never throws. */
export function writeStoredTheme(
  storage: Pick<Storage, 'setItem'> | undefined,
  theme: Theme,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}
