/** The props of LabShell: the frame, the three levels, the canvas notes and the notes. */
import type { ReactNode } from 'react';
import type { LabNotesContent } from './LabNotes';
import type { SettingOption } from './SettingsDrawer';
import type { TransportMarker } from './transportMarkers';
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

export interface LabShellProps {
  title: string;
  clock?: SimClock;
  /**
   * Unit of the transport's t readout. 'auto' (default) picks it from the run's duration; a lab
   * whose plots, readouts and text speak in seconds fixes 's'.
   */
  timeUnit?: TransportTimeUnitChoice;
  /**
   * Events on the clock (s) for the transport: marks on its timeline, «Evento anterior /
   * siguiente» and the event named while the time stands on it (TransportBar, transportMarkers.ts).
   */
  markers?: readonly TransportMarker[];
  /**
   * Where the clock's t = 0 stands in the lab's own time (s), for the transport's reading only
   * (TransportBar): a view on a clock of its own («Tramo») reads t in the time of the whole run,
   * while the timeline, the markers and seek stay on the clock.
   */
  timeOrigin?: number;
  readouts: LabReadout[];
  onReset(): void;
  testId: string;
  /** The canvas: everything the lab draws (and what is dragged or pressed on it), nothing else. */
  children: ReactNode;
  levels: LabLevels;
  /**
   * What reads the canvas without being a control (a legend, the stated time lapse, a model
   * versus data table): after the panel in one column, under both columns at the card's full width
   * in two, so the order of reading is the visual one in both. Still no controls here: they belong
   * to the levels or, if they act on the drawing, to the canvas.
   */
  canvasNotes?: ReactNode;
  /** «Cómo se usa» and «Qué deja fuera el modelo», closed disclosures at the end of the card. */
  notes?: LabNotesContent;
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
