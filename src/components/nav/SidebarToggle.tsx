import { useState } from 'react';
import {
  NAV_CLOSED,
  NAV_OPEN,
  safeLocalStorage,
  SIDEBAR_ID,
  SIDEBAR_TOGGLE_LABEL,
  writeSidebarClosed,
} from '../../lib/navState';

/** BaseLayout's inline head script has already set data-sidebar; the DOM is the source of truth. */
function readDocumentClosed(): boolean {
  return document.documentElement.dataset.sidebar === NAV_CLOSED;
}

/** Header button that hides or shows the sidebar on wide screens (spec §5). */
export default function SidebarToggle() {
  // The server renders the open state; SiteHeader's inline script corrects aria-expanded before
  // hydration and the client starts from the same DOM value, so the two agree.
  const [isClosed, setIsClosed] = useState(() =>
    typeof document === 'undefined' ? false : readDocumentClosed(),
  );

  function toggleSidebar() {
    const next = !readDocumentClosed();
    document.documentElement.dataset.sidebar = next ? NAV_CLOSED : NAV_OPEN;
    writeSidebarClosed(safeLocalStorage(), next);
    setIsClosed(next);
  }

  return (
    <button
      type="button"
      aria-label={SIDEBAR_TOGGLE_LABEL}
      aria-controls={SIDEBAR_ID}
      aria-expanded={!isClosed}
      data-sidebar-toggle
      onClick={toggleSidebar}
      className="hidden size-10 shrink-0 items-center justify-center rounded-base border border-border bg-bg-elevated text-fg-muted transition-colors hover:border-fg-muted hover:text-fg lg:inline-flex"
    >
      <svg
        className="size-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
        <path d="M9.5 4.5v15" />
      </svg>
    </button>
  );
}
