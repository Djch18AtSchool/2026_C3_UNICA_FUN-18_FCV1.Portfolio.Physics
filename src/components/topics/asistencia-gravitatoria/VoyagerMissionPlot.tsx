/**
 * The mission view of the Voyager chart: |v| of both probes against the date (1977–1990) with the
 * escape speed, the hyperbolic zone, the «solo el Sol» counterfactual and the four V2 encounters,
 * and below it, on the same time axis, the distance to the Sun. Static: the cursor is drawn by
 * the chart on a layer above, over `cursorArea`.
 */
import { memo, useId, type JSX } from 'react';
import { DASH_PATTERN, TEXT_COLOR, TICK_COLOR } from '../../charts/chartTheme';
import { linearScale, monoTextWidth, type Scale } from '../../lab/plotScales';
import type { PlotArea } from '../../lab/SvgPlotCursor';
import { formatDate, yearTicks, type AxisTick } from './dateAxis';
import { placeLabels } from './labelLayout';
import { ENCOUNTER_MARKERS, MISSION, missionSummary } from './voyagerChartData';
import {
  AXIS_BOTTOM,
  ClipArea,
  DOT_DASH,
  EncounterLabels,
  FONT_SIZE,
  Grid,
  LINE_HEIGHT,
  Regions,
  SeriesPath,
  SUN_COLOR,
  THIN_LINE_WIDTH,
  XAxis,
  YAxis,
  frameFor,
  type EncounterLabel,
  type LineSpec,
} from './VoyagerPlotParts';

const SPEED_DOMAIN = { min: 0, max: 42 };
const SPEED_TICKS = [0, 10, 20, 30, 40];
/** V2 ends 1989 at 31,1 UA. */
const DISTANCE_DOMAIN = { min: 0, max: 33 };
const DISTANCE_TICKS = [0, 10, 20, 30];
const TOP_PAD = 4;
/** Two lines of label and the dot under them. */
const ROW_HEIGHT = 2 * LINE_HEIGHT + 12;
/** From the lowest label row to the plot: room for the cursor knob on the plot's top edge. */
const LABELS_TO_PLOT = 10;
const PANEL_GAP = 16;
const SPEED_HEIGHT = { compact: 200, wide: 260 };
const DISTANCE_HEIGHT = { compact: 96, wide: 124 };
const LABEL_GAP = 4;
const LABEL_EDGE = 2;

export const MISSION_LINES: Readonly<Record<string, LineSpec>> = {
  v2: { id: 'v2', label: 'Voyager 2', color: TEXT_COLOR },
  v1: { id: 'v1', label: 'Voyager 1 (hasta 1981)', color: TICK_COLOR, width: THIN_LINE_WIDTH },
  escape: {
    id: 'escape',
    label: 'Rapidez de escape del Sol en la posición de la V2, √(2GM☉/r)',
    color: SUN_COLOR,
    dash: DASH_PATTERN,
  },
  zone: {
    id: 'hiperbolica',
    label: 'Zona hiperbólica, por encima del escape (ε\u00a0>\u00a00)',
    color: SUN_COLOR,
    isArea: true,
  },
  sunOnly: {
    id: 'solo-sol',
    label: `Solo el Sol, sin Júpiter (desde el ${formatDate(MISSION.speed.sunOnly[0].x)})`,
    color: TICK_COLOR,
    dash: DOT_DASH,
    width: THIN_LINE_WIDTH,
  },
};

/** The same line in the distance panel, under its own id. */
const inDistance = (spec: LineSpec): LineSpec => ({ ...spec, id: `${spec.id}-r` });

export interface MissionGeometry {
  width: number;
  height: number;
  x: Scale;
  speedArea: PlotArea;
  distanceArea: PlotArea;
  /** Both panels: the cursor runs through them. */
  cursorArea: PlotArea;
  ticks: AxisTick[];
  labels: EncounterLabel[];
  rows: number;
}

/** Scales, panels, year ticks and encounter labels for a measured width. */
export function missionGeometry(width: number): MissionGeometry {
  const frame = frameFor(width);
  const x = linearScale(MISSION.domain, [frame.left, frame.right]);
  const pxPerDay = (frame.right - frame.left) / (MISSION.domain.max - MISSION.domain.min);
  const requests = ENCOUNTER_MARKERS.map((marker) => ({
    id: marker.key,
    x: x.toPx(marker.caJd),
    width: Math.max(...[marker.name, marker.label].map((t) => monoTextWidth(t, FONT_SIZE))),
  }));
  const placed = placeLabels(requests, { min: LABEL_EDGE, max: width - LABEL_EDGE }, LABEL_GAP);
  const labels = placed.map((label, i) => ({
    ...label,
    lines: [ENCOUNTER_MARKERS[i].name, ENCOUNTER_MARKERS[i].label] as [string, string],
    color: ENCOUNTER_MARKERS[i].token,
  }));
  const rows = Math.max(...labels.map((label) => label.row)) + 1;
  const size = frame.isCompact ? 'compact' : 'wide';
  const speedTop = TOP_PAD + rows * ROW_HEIGHT + LABELS_TO_PLOT;
  const speedBottom = speedTop + SPEED_HEIGHT[size];
  const distanceTop = speedBottom + PANEL_GAP;
  const distanceBottom = distanceTop + DISTANCE_HEIGHT[size];
  const area = (top: number, bottom: number) => ({
    left: frame.left,
    right: frame.right,
    top,
    bottom,
  });
  return {
    width,
    height: distanceBottom + AXIS_BOTTOM,
    x,
    speedArea: area(speedTop, speedBottom),
    distanceArea: area(distanceTop, distanceBottom),
    cursorArea: area(speedTop, distanceBottom),
    ticks: yearTicks(MISSION.domain, pxPerDay, FONT_SIZE),
    labels,
    rows,
  };
}

function SpeedPanel({ geometry, clipId }: { geometry: MissionGeometry; clipId: string }) {
  const { x, speedArea: area, ticks } = geometry;
  const scales = { x, y: linearScale(SPEED_DOMAIN, [area.bottom, area.top]) };
  const { speed } = MISSION;
  return (
    <g data-panel="speed">
      <ClipArea id={clipId} area={area} />
      <Grid area={area} xTicks={ticks} yTicks={SPEED_TICKS} scales={scales} />
      <g clipPath={`url(#${clipId})`}>
        <Regions id="hiperbolica" regions={MISSION.hyperbolic} color={SUN_COLOR} scales={scales} />
        <SeriesPath spec={MISSION_LINES.sunOnly} points={speed.sunOnly} scales={scales} />
        <SeriesPath spec={MISSION_LINES.v1} points={speed.v1} scales={scales} />
        <SeriesPath spec={MISSION_LINES.escape} points={speed.escape} scales={scales} />
        <SeriesPath spec={MISSION_LINES.v2} points={speed.v2} scales={scales} />
      </g>
      <YAxis area={area} ticks={SPEED_TICKS} scale={scales.y} title="|v| (km/s)" />
      <XAxis area={area} ticks={ticks} scale={x} viewWidth={geometry.width} />
    </g>
  );
}

function DistancePanel({ geometry, clipId }: { geometry: MissionGeometry; clipId: string }) {
  const { x, distanceArea: area, ticks } = geometry;
  const scales = { x, y: linearScale(DISTANCE_DOMAIN, [area.bottom, area.top]) };
  const { distance } = MISSION;
  return (
    <g data-panel="distance">
      <ClipArea id={clipId} area={area} />
      <Grid area={area} xTicks={ticks} yTicks={DISTANCE_TICKS} scales={scales} />
      <g clipPath={`url(#${clipId})`}>
        <SeriesPath
          spec={inDistance(MISSION_LINES.sunOnly)}
          points={distance.sunOnly}
          scales={scales}
        />
        <SeriesPath spec={inDistance(MISSION_LINES.v1)} points={distance.v1} scales={scales} />
        <SeriesPath spec={inDistance(MISSION_LINES.v2)} points={distance.v2} scales={scales} />
      </g>
      <YAxis area={area} ticks={DISTANCE_TICKS} scale={scales.y} title="r (UA)" />
      <XAxis area={area} ticks={ticks} scale={x} title="Fecha (año)" viewWidth={geometry.width} />
    </g>
  );
}

/** The static drawing; redrawn only when the measured width changes. */
const VoyagerMissionPlot = memo(function VoyagerMissionPlot({
  geometry,
}: {
  geometry: MissionGeometry;
}): JSX.Element {
  const clipBase = `voyager-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg
      role="img"
      aria-label={missionSummary()}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      width="100%"
      className="block h-auto"
    >
      <SpeedPanel geometry={geometry} clipId={`${clipBase}-speed`} />
      <DistancePanel geometry={geometry} clipId={`${clipBase}-distance`} />
      <EncounterLabels
        labels={geometry.labels}
        top={TOP_PAD}
        rows={geometry.rows}
        rowHeight={ROW_HEIGHT}
        guideBottom={geometry.distanceArea.bottom}
      />
    </svg>
  );
});

export default VoyagerMissionPlot;
