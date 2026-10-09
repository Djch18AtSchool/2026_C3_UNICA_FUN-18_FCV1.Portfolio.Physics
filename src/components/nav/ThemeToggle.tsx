import { useEffect, useState } from 'react';
import { type Theme, writeStoredTheme } from '../../lib/theme';

const LABELS: Record<Theme, string> = {
  light: 'Cambiar a tema oscuro',
  dark: 'Cambiar a tema claro',
};

/** The inline head script has already set data-theme; the DOM is the source of truth. */
function readDocumentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** Even touching `window.localStorage` can throw when site data is blocked. */
function safeLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export default function ThemeToggle() {
  // Server render assumes light; the effect syncs with the real theme on mount.
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(readDocumentTheme());
  }, []);

  function toggleTheme() {
    const next: Theme = readDocumentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    writeStoredTheme(safeLocalStorage(), next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      aria-label={LABELS[theme]}
      onClick={toggleTheme}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-base border border-border bg-bg-elevated text-fg-muted transition-colors hover:border-fg-muted hover:text-fg"
    >
      {/* Icons follow data-theme through CSS, so they are right before hydration too. */}
      <svg
        className="size-[18px] dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
      <svg
        className="hidden size-[18px] dark:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
      </svg>
    </button>
  );
}
