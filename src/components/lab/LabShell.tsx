/**
 * The frame every laboratory renders inside. A lab declares its three levels and LabShell places
 * them (auditoría §12.1; TieredLabShell.tsx draws it):
 *
 *   <LabShell
 *     title="Laboratorio del sobrevuelo (modelo plano)"
 *     testId="flyby-lab"
 *     clock={clock}
 *     readouts={readouts}
 *     onReset={onReset}
 *     levels={{
 *       params: <RpField … />,                                    // 1: physical parameters
 *       scenario: <LabPresets id="flyby-preset" presets={…} … />, // 2: scenario and presets
 *       display: flybyLocalSettings(…),                           // 3: drawer, chips by the gear
 *     }}
 *     notes={{ usage: [DRAG_HINT, usage], leftOut: [leftOut] }}
 *   >
 *     <FlybyScene … />
 *   </LabShell>
 *
 * The title, the chip row and the gear, the transport, the readouts and the two disclosures are
 * the shell's. A lab that still passes `params`, `localSettings` and `footnote` (no `levels`) gets
 * the stacked v2 layout below until it migrates. The shell owns only whether the drawer is open;
 * the simulation state belongs to the laboratory.
 */
import type { JSX } from 'react';
import ControlPanel from '../controls/ControlPanel';
import Readout from '../controls/Readout';
import InlineMath from './InlineMath';
import { GearButton, ReadoutAnnouncer, useLabDrawer } from './labShellParts';
import type { LabShellProps, StackedLabShellProps } from './labShellTypes';
import SettingsDrawer from './SettingsDrawer';
import TieredLabShell from './TieredLabShell';
import TransportBar from './TransportBar';

export { READOUT_ANNOUNCE_DELAY_MS } from './labShellParts';
export type {
  LabLevels,
  LabReadout,
  LabShellProps,
  StackedLabShellProps,
  TieredLabShellProps,
} from './labShellTypes';

/**
 * The stacked v2 layout: header (title and gear), canvas, transport, readouts in one card; under
 * it the parameters card with «Restablecer» and the footnote; the settings drawer.
 */
function StackedLabShell({
  title,
  clock,
  timeUnit,
  readouts,
  params,
  localSettings,
  onReset,
  footnote,
  testId,
  children,
}: StackedLabShellProps): JSX.Element {
  const drawer = useLabDrawer();
  return (
    <div
      role="group"
      aria-labelledby={drawer.titleId}
      data-testid={testId}
      data-playing={clock?.state.playing ?? false}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-4 rounded-base border border-border bg-bg-elevated p-4">
        <div className="flex items-center justify-between gap-3">
          <span id={drawer.titleId} className="min-w-0 text-sm font-semibold">
            {title}
          </span>
          <GearButton drawer={drawer} />
        </div>
        {/* On phones the canvas bleeds into the card's padding so the plot keeps its width. */}
        <div data-lab-canvas="" className="-mx-3 sm:mx-0">
          {children}
        </div>
        {clock ? <TransportBar clock={clock} timeUnit={timeUnit} /> : null}
        {readouts.length > 0 ? (
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {readouts.map((readout) => (
              <Readout key={readout.id} {...readout} />
            ))}
          </div>
        ) : null}
        <ReadoutAnnouncer readouts={readouts} />
      </div>
      <ControlPanel title="Parámetros" onReset={onReset}>
        {params}
        {footnote ? (
          <p data-testid="lab-footnote" className="m-0 text-xs text-fg-muted">
            <InlineMath text={footnote} />
          </p>
        ) : null}
      </ControlPanel>
      <SettingsDrawer
        id={drawer.drawerId}
        open={drawer.isOpen}
        onClose={drawer.close}
        returnFocusTo={drawer.openerRef}
        title={`Ajustes: ${title}`}
        local={localSettings}
      />
    </div>
  );
}

export default function LabShell(props: LabShellProps): JSX.Element {
  return props.levels ? <TieredLabShell {...props} /> : <StackedLabShell {...props} />;
}
