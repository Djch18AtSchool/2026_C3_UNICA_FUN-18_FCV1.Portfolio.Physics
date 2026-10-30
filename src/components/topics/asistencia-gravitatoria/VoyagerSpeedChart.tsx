/**
 * Tema 9's prescribed resource (visualización de datos): the Voyagers' speed relative to the Sun
 * against time, with the jump at each planetary encounter, built from NASA/JPL Horizons data and
 * citing it. A mission view (speed and distance panels on one time axis) and an hourly view of
 * each V2 encounter (peak against net jump); a date cursor, draggable and keyboard-operable,
 * reads every line at its instant, and the reading is announced once it settles.
 */
import { useMemo, useState, type JSX } from 'react';
import ChartFrame from '../../charts/ChartFrame';
import { useElementWidth } from '../../hooks/useElementWidth';
import SvgPlotCursor from '../../lab/SvgPlotCursor';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { useSettledText } from '../../lab/useSettledText';
import { formatDate, jdFromIso } from './dateAxis';
import {
  ENCOUNTER_MARKERS,
  detailReadout,
  encounterDetail,
  formatOffset,
  missionReadout,
  type EncounterKey,
} from './voyagerChartData';
import VoyagerDetailPlot, {
  DETAIL_LINES,
  detailGeometry,
  detailNumbers,
} from './VoyagerDetailPlot';
import VoyagerMissionPlot, { MISSION_LINES, missionGeometry } from './VoyagerMissionPlot';
import { FONT_SIZE, Legend } from './VoyagerPlotParts';

export { VOYAGER_CHART_SOURCE } from './voyagerChartData';

export interface VoyagerSpeedChartProps {
  /** Open on the hourly view of one encounter instead of the whole mission. */
  detail?: EncounterKey;
}

type View = 'mision' | EncounterKey;

/** viewBox width before the container is measured (SSR, jsdom): the article column. */
const FALLBACK_WIDTH = 720;
/** Where the mission cursor starts: after Jupiter, V2 already escaping, the counterfactual drawn. */
const MISSION_CURSOR_START = jdFromIso('1980-01-01');
/** The hourly view's cursor starts before closest approach, clear of its guide and the peak label. */
const DETAIL_CURSOR_OFFSET_DAYS = -2;
/** As LabShell: the reading is announced once the cursor has rested this long. */
const ANNOUNCE_DELAY_MS = 750;
const TITLE = 'Rapidez de las Voyager respecto al Sol, 1977–1990';
/** The source line goes in the page's Figure (VOYAGER_CHART_SOURCE); the footnote says how Δ|v| is measured. */
const FOOTNOTE =
  'Cada salto Δ|v| es la diferencia de rapidez que daría solo el Sol a la distancia del encuentro con la energía de la sonda 120 días antes y 120 días después (vis-viva).';

const BUTTON_BASE =
  'inline-flex min-h-11 items-center gap-2 rounded-base border px-3 py-1.5 text-sm font-medium transition-colors';
const BUTTON_ACTIVE = 'border-accent bg-accent/10';
const BUTTON_IDLE = 'border-border bg-bg-elevated hover:border-fg-muted';

const startOf = (view: View) =>
  view === 'mision'
    ? MISSION_CURSOR_START
    : encounterDetail(view).marker.caJd + DETAIL_CURSOR_OFFSET_DAYS;

function ViewToggle({ view, onSelect }: { view: View; onSelect: (view: View) => void }) {
  const options = [
    { id: 'mision' as const, name: 'Misión completa', token: undefined },
    ...ENCOUNTER_MARKERS.map((m) => ({ id: m.key, name: m.name, token: m.token })),
  ];
  return (
    <div role="group" aria-label="Detalle de cada encuentro" className="mb-3 flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.id === view;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(option.id)}
            className={`${BUTTON_BASE} ${isActive ? BUTTON_ACTIVE : BUTTON_IDLE}`}
          >
            {option.token ? (
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: option.token }}
              />
            ) : null}
            {option.name}
          </button>
        );
      })}
    </div>
  );
}

export default function VoyagerSpeedChart({ detail }: VoyagerSpeedChartProps): JSX.Element {
  const [view, setView] = useState<View>(detail ?? 'mision');
  const [cursor, setCursor] = useState(() => startOf(detail ?? 'mision'));
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const { decimals } = useGlobalSettings();

  const encounter = view === 'mision' ? null : encounterDetail(view);
  const mission = useMemo(() => missionGeometry(width), [width]);
  const zoomed = useMemo(
    () => (encounter ? detailGeometry(encounter, width) : null),
    [encounter, width],
  );
  const geometry = zoomed ?? mission;
  const cursorArea = zoomed ? zoomed.area : mission.cursorArea;
  const readout = encounter ? detailReadout(encounter, cursor) : missionReadout(cursor);
  const announcement = useSettledText(readout, ANNOUNCE_DELAY_MS);
  const select = (next: View) => {
    setView(next);
    setCursor(startOf(next));
  };
  const lines = encounter
    ? [DETAIL_LINES.v2, DETAIL_LINES.escape, DETAIL_LINES.zone, DETAIL_LINES.levels]
    : [
        MISSION_LINES.v2,
        MISSION_LINES.v1,
        MISSION_LINES.escape,
        MISSION_LINES.zone,
        MISSION_LINES.sunOnly,
      ];

  return (
    <ChartFrame title={TITLE} footnote={FOOTNOTE} testId="voyager-speed-chart">
      <ViewToggle view={view} onSelect={select} />
      <Legend specs={lines} />
      {/* On phones the plot bleeds into the frame's padding (as in LabShell): the 13 years need it. */}
      <div className="-mx-3 sm:mx-0">
        <div ref={wrapperRef} className="relative w-full min-w-0">
          {encounter && zoomed ? (
            <VoyagerDetailPlot detail={encounter} geometry={zoomed} />
          ) : (
            <VoyagerMissionPlot geometry={mission} />
          )}
          <svg
            role="presentation"
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            className="pointer-events-none absolute inset-0 block h-full w-full"
          >
            <SvgPlotCursor
              cursor={{
                x: cursor,
                onChange: setCursor,
                label: (jd) =>
                  encounter ? formatOffset(jd - encounter.marker.caJd) : formatDate(jd),
              }}
              x={geometry.x}
              area={cursorArea}
              xLabel="Fecha"
              xUnit="d"
              decimals={decimals}
              fontSize={FONT_SIZE}
            />
          </svg>
        </div>
      </div>
      {encounter ? (
        <p data-testid="voyager-detail-numbers" className="mt-3 text-sm text-fg tabular-nums">
          {detailNumbers(encounter)}
        </p>
      ) : null}
      <p data-testid="voyager-readout" className="mt-3 text-sm text-fg tabular-nums">
        {readout}
      </p>
      <p data-testid="voyager-announcer" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </ChartFrame>
  );
}
