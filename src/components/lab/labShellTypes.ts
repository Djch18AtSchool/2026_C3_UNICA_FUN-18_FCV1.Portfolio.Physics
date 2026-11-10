/** The props of LabShell: the tiered contract (B3) and, until each lab migrates, the stacked one. */
import type { ReactNode } from 'react';
import type { LabNotesContent } from './LabNotes';
import type { SettingOption } from './SettingsDrawer';
import type { TransportTimeUnitChoice } from './transportTime';
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

/** What both layouts share: the frame, the clock, the readouts and the reset. */
interface LabShellBaseProps {
  title: string;
  clock?: SimClock;
  /**
   * Unit of the transport's t readout. 'auto' (default) picks it from the run's duration; a lab
   * whose plots, readouts and text speak in seconds fixes 's'.
   */
  timeUnit?: TransportTimeUnitChoice;
  readouts: LabReadout[];
  onReset(): void;
  testId: string;
  /** The canvas: everything the lab draws. */
  children: ReactNode;
}

/** The three levels of a laboratory (auditoría §12.1). */
export interface LabLevels {
  /** Level 1, the topic's physical parameters: always visible beside the canvas. */
  params: ReactNode;
  /** Level 2, scenario and presets (LabPresets), compact; omitted when the lab has none. */
  scenario?: ReactNode;
  /**
   * Level 3, personalization: only in the settings drawer. Each option with a `chip` also shows
   * its state beside the gear (settingChips.ts).
   */
  display: SettingOption[];
}

/** The tiered layout: canvas and transport beside the levels (from lg, in a 42rem lab). */
export interface TieredLabShellProps extends LabShellBaseProps {
  levels: LabLevels;
  /**
   * What reads the canvas without being a control (a legend, the stated time lapse, a model
   * versus data table): right after the transport in one column, under both columns at the card's
   * full width in two. No controls here: in two columns focus would jump down and back up.
   */
  canvasNotes?: ReactNode;
  /** «Cómo se usa» and «Qué deja fuera el modelo», closed disclosures at the end of the card. */
  notes?: LabNotesContent;
  params?: never;
  localSettings?: never;
  footnote?: never;
}

/** The stacked v2 layout, kept for the laboratories that have not moved to `levels` yet. */
export interface StackedLabShellProps extends LabShellBaseProps {
  params: ReactNode;
  localSettings: SettingOption[];
  /** Printed at the end of the parameters card, with KaTeX inline between `$…$`. */
  footnote?: string;
  levels?: never;
  canvasNotes?: never;
  notes?: never;
}

export type LabShellProps = TieredLabShellProps | StackedLabShellProps;
