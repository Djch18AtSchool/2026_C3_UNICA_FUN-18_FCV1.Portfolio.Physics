import { useId, useState, type JSX, type ReactNode } from 'react';
import { RESOURCE_LABELS, type ResourceType } from '../../consigna';
import ControlPanel from '../controls/ControlPanel';
import Readout from '../controls/Readout';
import { RESOURCE_BADGE, RESOURCE_MARKS, RESOURCE_SWATCH } from '../ui/resourceMarks';
import { ICON_BUTTON } from './iconButton';
import SettingsDrawer, { type SettingOption } from './SettingsDrawer';
import TransportBar from './TransportBar';
import type { SimClock } from './useSimClock';

export interface LabReadout {
  label: string;
  value: number;
  unit: string;
}

export interface LabShellProps {
  title: string;
  type: ResourceType;
  clock?: SimClock;
  readouts: LabReadout[];
  params: ReactNode;
  localSettings: SettingOption[];
  onReset(): void;
  footnote?: string;
  testId: string;
  children: ReactNode;
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

function ResourceMark({ type }: { type: ResourceType }): JSX.Element {
  const mark = RESOURCE_MARKS[type];
  return (
    <span className={`${RESOURCE_BADGE} ${mark.tint}`}>
      <span className={`${RESOURCE_SWATCH} ${mark.swatch}`} aria-hidden="true" />
      {RESOURCE_LABELS[type]}
    </span>
  );
}

/**
 * The frame every v2 laboratory renders inside, in the v1 figure style: header (title, resource
 * mark, settings gear), canvas, transport bar when there is a clock, readouts, the parameters
 * panel with "Restablecer", an optional footnote and the settings drawer. It owns only whether
 * the drawer is open; the simulation state belongs to the laboratory.
 */
export default function LabShell({
  title,
  type,
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
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            <span id={titleId} className="text-sm font-semibold">
              {title}
            </span>
            <ResourceMark type={type} />
          </div>
          <button
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
        <div className="w-full">{children}</div>
        {clock ? <TransportBar clock={clock} /> : null}
        {readouts.length > 0 ? (
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {readouts.map((readout) => (
              <Readout
                key={readout.label}
                label={readout.label}
                value={readout.value}
                unit={readout.unit}
              />
            ))}
          </div>
        ) : null}
      </div>
      <ControlPanel title="Parámetros" onReset={onReset}>
        {params}
      </ControlPanel>
      {footnote ? (
        <p data-testid="lab-footnote" className="m-0 text-xs text-fg-muted">
          {footnote}
        </p>
      ) : null}
      <SettingsDrawer
        id={drawerId}
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={`Ajustes: ${title}`}
        local={localSettings}
      />
    </div>
  );
}
