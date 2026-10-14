import { useSyncExternalStore } from 'react';
import { FOOTER_ICON_BUTTON } from './footerButton';
import { HEADER_ICON_BUTTON } from './headerButton';
import { THEME_TOGGLE_LABELS, type Theme, writeStoredTheme } from '../../lib/theme';

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

/** Fired on `window` after a toggle changes the theme, so its twin updates in the same tick. */
const THEME_CHANGED_EVENT = 'themechanged';

/** Any change to data-theme, from a toggle or from outside, reaches every toggle. */
function subscribeToTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener(THEME_CHANGED_EVENT, onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener(THEME_CHANGED_EVENT, onChange);
  };
}

function readServerTheme(): Theme {
  return typeof document === 'undefined' ? 'light' : readDocumentTheme();
}

type ToggleVariant = 'header' | 'footer';

/** The header's bordered square, and the footer's borderless icon with a larger glyph. */
const VARIANTS: Record<ToggleVariant, { button: string; icon: string }> = {
  header: { button: HEADER_ICON_BUTTON, icon: 'size-[18px]' },
  footer: { button: FOOTER_ICON_BUTTON, icon: 'size-5' },
};

interface ThemeToggleProps {
  variant?: ToggleVariant;
}

export default function ThemeToggle({ variant = 'header' }: ThemeToggleProps) {
  // The server cannot know the theme and renders light; BaseLayout's inline script corrects that
  // label before hydration, and the client starts from the same DOM value, so the two agree.
  const theme = useSyncExternalStore(subscribeToTheme, readDocumentTheme, readServerTheme);
  const { button, icon } = VARIANTS[variant];

  function toggleTheme() {
    const next: Theme = readDocumentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    writeStoredTheme(safeLocalStorage(), next);
    window.dispatchEvent(new Event(THEME_CHANGED_EVENT));
  }

  return (
    <button
      type="button"
      aria-label={THEME_TOGGLE_LABELS[theme]}
      data-theme-toggle
      onClick={toggleTheme}
      className={`inline-flex ${button}`}
    >
      {/* Icons follow data-theme through CSS, so they are right before hydration too. */}
      <svg
        className={`${icon} dark:hidden`}
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
        className={`hidden ${icon} dark:block`}
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
