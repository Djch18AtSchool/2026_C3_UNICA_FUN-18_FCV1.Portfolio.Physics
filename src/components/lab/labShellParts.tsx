/** What both LabShell layouts share: the gear, the drawer's state and the readout announcer. */
import { useId, useRef, useState, type JSX, type RefObject } from 'react';
import { formatNumber } from '../../lib/format';
import { inlineMathToSpeech } from '../../lib/inlineMath';
import { ICON_BUTTON } from './iconButton';
import type { LabReadout } from './labShellTypes';
import { useGlobalSettings } from './useGlobalSettings';
import { useSettledText } from './useSettledText';

/** Quiet time after the last readout change before it is announced (drags, playback). */
export const READOUT_ANNOUNCE_DELAY_MS = 750;

/** "Label: value unit; …", formatted as the readouts show it, with any $…$ said in words. */
function readoutSummary(readouts: readonly LabReadout[], decimals: number): string {
  return readouts
    .map(({ label, value, unit, precision }) => {
      const text = formatNumber(value, { precision: precision ?? decimals, unit });
      return `${inlineMathToSpeech(label)}: ${text}`;
    })
    .join('; ');
}

/** The readouts change every frame of a drag or playback: speak only the settled values. */
export function ReadoutAnnouncer({ readouts }: { readouts: readonly LabReadout[] }): JSX.Element {
  const { decimals } = useGlobalSettings();
  const announcement = useSettledText(
    readoutSummary(readouts, decimals),
    READOUT_ANNOUNCE_DELAY_MS,
  );
  return (
    <p data-testid="readout-announcer" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </p>
  );
}

export interface LabDrawer {
  titleId: string;
  drawerId: string;
  isOpen: boolean;
  /** Opens the drawer; focus goes back to `opener` when it closes. */
  open(opener: HTMLElement): void;
  close(): void;
  /** The element that opened the drawer last (gear or chip), for SettingsDrawer.returnFocusTo. */
  openerRef: RefObject<HTMLElement | null>;
}

/** The settings drawer's ids and open state; the shell owns nothing else. */
export function useLabDrawer(): LabDrawer {
  const baseId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  return {
    titleId: `${baseId}-title`,
    drawerId: `${baseId}-settings`,
    isOpen,
    open: (opener) => {
      openerRef.current = opener;
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
    openerRef,
  };
}

function GearIcon(): JSX.Element {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

/** «Ajustes del simulador»: opens the drawer. */
export function GearButton({ drawer }: { drawer: LabDrawer }): JSX.Element {
  return (
    <button
      type="button"
      aria-label="Ajustes del simulador"
      aria-haspopup="dialog"
      aria-expanded={drawer.isOpen}
      aria-controls={drawer.drawerId}
      onClick={(event) => drawer.open(event.currentTarget)}
      className={ICON_BUTTON}
    >
      <GearIcon />
    </button>
  );
}
