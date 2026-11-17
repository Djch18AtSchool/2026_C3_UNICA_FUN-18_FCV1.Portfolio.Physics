/** The props of LabShell: the frame, the three levels, the canvas notes and the notes. */
import type { ReactNode } from 'react';
import type { LabNotesContent } from './LabNotes';
import type { SettingOption } from './SettingsDrawer';
import type { TransportMarker } from './transportMarkers';
import type { TransportTimeFormat } from './transportReading';
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
  /**
   * The lab's own text of the transport's time: it receives the time already shifted by
   * `timeOrigin` (s) and writes the readout, the timeline's aria-valuetext, the event
   * announcements and the «Siguiente: …» line (TransportBar). Reading only: the timeline, the
   * markers and seek stay on the clock. An empty text falls back to «t = …» in `timeUnit`. For a
   * clock that does not count seconds of the phenomenon (Tema 8's disturbance reads hours of
   * orbit) or for a lab that fixes its decimals (Tema 1 reads the route's time at the global
   * decimals, as its readout, charts and drone). Neighbouring positions of the timeline may then
   * read alike.
   */
  formatTime?: TransportTimeFormat;
  /**
   * The speeds of the transport's speed select («1×▾»), in order; 0,25× to 2× when omitted. A lab
   * whose run is long at 1× offers more (Temas 3 and 8 reach 8×).
   */
  speeds?: readonly number[];
  readouts: LabReadout[];
  /**
   * Whether the readouts are announced once they settle (default true). A view that says its own
   * summary when it settles (Tema 6's «Conducir», on a pause) turns it off, so a pause is said
   * once; the region stays in the DOM, empty.
   */
  announceReadouts?: boolean;
  onReset(): void;
  testId: string;
  /** The canvas: everything the lab draws (and what is dragged or pressed on it), nothing else. */
  children: ReactNode;
  levels: LabLevels;
  /**
   * The support plots of the scene (a second plot, F–x, the energies, L_w(t)), after the readouts:
   * the scene comes first, with the parameters in sight under it («escena primero»). They may
   * hold controls (a legend that highlights a series, a cursor that seeks): unlike the canvas
   * notes, they are part of the lab, at the canvas's width.
   */
  charts?: ReactNode;
  /**
   * What reads the canvas without being a control (a legend, the stated time lapse, a model
   * versus data table): after the readouts and the support plots. Still no controls here: they
   * belong to the levels, to the support plots or, if they act on the drawing, to the canvas.
   */
  canvasNotes?: ReactNode;
  /** «Cómo se usa» and «Qué deja fuera el modelo», closed disclosures at the end of the card. */
  notes?: LabNotesContent;
}

/** The three levels of a laboratory (auditoría §12.1). */
export interface LabLevels {
  /**
   * Level 1, the topic's physical parameters: always in sight under the transport, two to a row.
   * ParamFields (or fields on ParamFrame) and ChoiceFields take a cell each; a paragraph (a note,
   * a warning) takes a whole row.
   */
  params: ReactNode;
  /**
   * Level 2, the scenario: its choices (a mode, a view, a cycle) one under the other, and the
   * presets (LabPresets) with «Restablecer» at the end of their row; omitted when the lab has none.
   */
  scenario?: ReactNode;
  /** Level 3, personalization: only in the settings drawer (no chip repeats it by the gear). */
  display: SettingOption[];
}

/**
 * `display` for a lab whose drawer holds only the global settings: every choice of its own is a
 * parameter or the scenario's (Tema 4's compound, Tema 5's damping). One empty list for all.
 */
export const NO_LOCAL_SETTINGS: [] = [];
