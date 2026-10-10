import { useId, useRef, useState, type JSX, type ReactNode } from 'react';
import { formatNumber } from '../../lib/format';
import ControlPanel from '../controls/ControlPanel';
import Readout from '../controls/Readout';
import { ICON_BUTTON } from './iconButton';
import SettingsDrawer, { type SettingOption } from './SettingsDrawer';
import TransportBar from './TransportBar';
import { useGlobalSettings } from './useGlobalSettings';
import { useSettledText } from './useSettledText';
import type { SimClock } from './useSimClock';

export interface LabReadout {
  /** Stable React key: labels may repeat or change with the parameters. */
  id: string;
  label: string;
  value: number;
  unit: string;
  /** Fixed decimals for this readout; the global decimals setting when omitted. */
  precision?: number;
}

export interface LabShellProps {
  title: string;
  clock?: SimClock;
  readouts: LabReadout[];
  params: ReactNode;
  localSettings: SettingOption[];
  onReset(): void;
  footnote?: string;
  testId: string;
  children: ReactNode;
}

/** Quiet time after the last readout change before it is announced (drags, playback). */
export const READOUT_ANNOUNCE_DELAY_MS = 750;

/** "Label: value unit; …", formatted as the readouts show it. */
function readoutSummary(readouts: LabReadout[], decimals: number): string {
  return readouts
    .map(({ label, value, unit, precision }) => {
      const text = formatNumber(value, { precision: precision ?? decimals, unit });
      return `${label}: ${text}`;
    })
    .join('; ');
}

function GearIcon() {
  return (
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

/**
 * The frame every v2 laboratory renders inside, in the v1 figure style: header (title and
 * settings gear; the type badge belongs to the enclosing Figure), canvas, transport bar when there
 * is a clock, readouts, the parameters panel with "Restablecer" (and, at its end, an optional
 * footnote) and the settings drawer. It owns only whether the drawer is open; the simulation state
 * belongs to the laboratory.
 */
export default function LabShell({
  title,
  clock,
  readouts,
  params,
  localSettings,
  onReset,
  footnote,
  testId,
  children,
}: LabShellProps): JSX.Element {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const drawerId = `${baseId}-settings`;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const gearRef = useRef<HTMLButtonElement>(null);
  const { decimals } = useGlobalSettings();
  const announcement = useSettledText(
    readoutSummary(readouts, decimals),
    READOUT_ANNOUNCE_DELAY_MS,
  );

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      data-testid={testId}
      data-playing={clock?.state.playing ?? false}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-4 rounded-base border border-border bg-bg-elevated p-4">
        <div className="flex items-center justify-between gap-3">
          <span id={titleId} className="min-w-0 text-sm font-semibold">
            {title}
          </span>
          <button
            ref={gearRef}
            type="button"
            aria-label="Ajustes del simulador"
            aria-haspopup="dialog"
            aria-expanded={isSettingsOpen}
            aria-controls={drawerId}
            onClick={() => setIsSettingsOpen(true)}
            className={ICON_BUTTON}
          >
            <GearIcon />
          </button>
        </div>
        {/* On phones the canvas bleeds into the card's padding so the plot keeps its width. */}
        <div data-lab-canvas="" className="-mx-3 sm:mx-0">
          {children}
        </div>
        {clock ? <TransportBar clock={clock} /> : null}
        {readouts.length > 0 ? (
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {readouts.map((readout) => (
              <Readout
                key={readout.id}
                label={readout.label}
                value={readout.value}
                unit={readout.unit}
                precision={readout.precision}
              />
            ))}
          </div>
        ) : null}
        {/* The readouts change every frame of a drag or playback: speak only the settled values. */}
        <p
          data-testid="readout-announcer"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </p>
      </div>
      <ControlPanel title="Parámetros" onReset={onReset}>
        {params}
        {footnote ? (
          <p data-testid="lab-footnote" className="m-0 text-xs text-fg-muted">
            {footnote}
          </p>
        ) : null}
      </ControlPanel>
      <SettingsDrawer
        id={drawerId}
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        returnFocusTo={gearRef}
        title={`Ajustes: ${title}`}
        local={localSettings}
      />
    </div>
  );
}
