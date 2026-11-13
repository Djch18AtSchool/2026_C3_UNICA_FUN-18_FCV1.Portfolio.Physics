/**
 * The hourly view of one V2 encounter (closest approach ± 5 d): the speed climbs to a peak inside
 * the planet's well and settles after it; the dotted levels are the speed the Sun alone would
 * give at the encounter distance with the energy of 120 days before and after, and their
 * difference is the net jump the mission view labels. Static, like the mission view.
 */
import { memo, useId, type JSX } from 'react';
import { DASH_PATTERN, SURFACE_COLOR, TEXT_COLOR, TICK_COLOR } from '../../charts/chartTheme';
import { emphasisProps, useSeriesEmphasis } from '../../charts/seriesHighlight';
import { Arrow } from '../../lab/OverlayMarks';
import { fitCentre, linearScale, monoTextWidth, niceTicks, type Scale } from '../../lab/plotScales';
import type { PlotArea } from '../../lab/SvgPlotCursor';
import { formatTime, offsetDayTicks, type AxisTick } from './dateAxis';
import { detailSummary, speedText, type EncounterDetail } from './voyagerChartData';
import {
  AXIS_BOTTOM,
  ClipArea,
  DOT_DASH,
  FONT_SIZE,
  Grid,
  Note,
  Regions,
  SeriesPath,
  SUN_COLOR,
  THIN_LINE_WIDTH,
  XAxis,
  YAxis,
  frameFor,
  type LineSpec,
  type Scales,
} from './VoyagerPlotParts';

/** Room above the plot for the cursor knob and its date. */
const TOP_PAD = 24;
const PLOT_HEIGHT = { compact: 230, wide: 300 };
/**
 * The speed axis reaches 0 and rounds the peak plus this headroom up to 5 km/s: room for the
 * peak's label above it, clear of the cursor's date on the top edge.
 */
const HEADROOM_KMS = 6;
const AXIS_STEP_KMS = 5;
const Y_TICK_SPACING = 50;
const PEAK_RADIUS = 4;
const NOTE_GAP = 8;
/** Drops a note's baseline so the text is centred on the y it labels. */
const NOTE_DROP = 4;
/** The jump arrow runs this far inside the right edge, its label a little further in. */
const JUMP_ARROW_INSET = 8;
const JUMP_LABEL_INSET = 14;

export const DETAIL_LINES: Readonly<Record<string, LineSpec>> = {
  v2: { id: 'v2', label: 'Voyager 2, cada hora', color: TEXT_COLOR },
  escape: {
    id: 'escape',
    label: 'Rapidez de escape del Sol, $\\sqrt{2GM_\\odot/r}$',
    color: SUN_COLOR,
    dash: DASH_PATTERN,
  },
  zone: {
    id: 'hiperbolica',
    label: 'Zona hiperbólica, por encima del escape (ε\u00a0>\u00a00)',
    color: SUN_COLOR,
    isArea: true,
  },
  levels: {
    id: 'niveles',
    label: 'Solo el Sol a la distancia del encuentro, con la energía de 120 días antes y después',
    color: TICK_COLOR,
    dash: DOT_DASH,
    width: THIN_LINE_WIDTH,
  },
};

/** The window's key numbers, printed under the plot (the plot itself only labels the peak and the jump). */
export function detailNumbers({ marker, peak, before, after }: EncounterDetail): string {
  return `Solo el Sol a la distancia del encuentro: antes ${speedText(before)}, después ${speedText(after)}; salto neto ${marker.label}. Pico dentro del pozo de ${marker.name}: ${speedText(peak.y)}.`;
}

export interface DetailGeometry {
  width: number;
  height: number;
  x: Scale;
  y: Scale;
  area: PlotArea;
  ticks: AxisTick[];
  yTicks: number[];
}

export function detailGeometry(detail: EncounterDetail, width: number): DetailGeometry {
  const frame = frameFor(width);
  const area = {
    left: frame.left,
    right: frame.right,
    top: TOP_PAD,
    bottom: TOP_PAD + PLOT_HEIGHT[frame.isCompact ? 'compact' : 'wide'],
  };
  const yMax = Math.ceil((detail.peak.y + HEADROOM_KMS) / AXIS_STEP_KMS) * AXIS_STEP_KMS;
  const yDomain = { min: 0, max: yMax };
  const pxPerDay = (area.right - area.left) / (detail.domain.max - detail.domain.min);
  return {
    width,
    height: area.bottom + AXIS_BOTTOM,
    x: linearScale(detail.domain, [area.left, area.right]),
    y: linearScale(yDomain, [area.bottom, area.top]),
    area,
    ticks: offsetDayTicks(detail.marker.caJd, detail.domain, pxPerDay, FONT_SIZE),
    yTicks: niceTicks(yDomain, Math.round((area.bottom - area.top) / Y_TICK_SPACING)),
  };
}

/** Closest approach, the peak, the two Sun-only levels and the net jump between them. */
function Annotations({ detail, geometry }: { detail: EncounterDetail; geometry: DetailGeometry }) {
  const { x, y, area } = geometry;
  const { marker, peak, before, after } = detail;
  const caX = x.toPx(marker.caJd);
  const peakX = x.toPx(peak.x);
  const peakText = `Pico: ${speedText(peak.y)}`;
  const peakLabelX = fitCentre(peakX, monoTextWidth(peakText, FONT_SIZE), area.left, area.right);
  const level = (value: number) => y.toPx(value);
  const jumpX = area.right - JUMP_ARROW_INSET;
  const levels = useSeriesEmphasis(DETAIL_LINES.levels.id);
  return (
    <g className="pointer-events-none">
      <line
        data-ca=""
        x1={caX}
        x2={caX}
        y1={area.top}
        y2={area.bottom}
        stroke={marker.token}
        strokeWidth={THIN_LINE_WIDTH}
        strokeDasharray={DASH_PATTERN}
      />
      <Note x={caX + NOTE_GAP} y={area.bottom - NOTE_GAP}>
        {`MA ${formatTime(marker.caJd)} UT`}
      </Note>
      {[before, after].map((value) => (
        <line
          key={value}
          data-series={DETAIL_LINES.levels.id}
          x1={area.left}
          x2={area.right}
          y1={level(value)}
          y2={level(value)}
          stroke={DETAIL_LINES.levels.color}
          strokeWidth={THIN_LINE_WIDTH}
          strokeDasharray={DOT_DASH}
          strokeLinecap="round"
          {...emphasisProps(levels, THIN_LINE_WIDTH)}
        />
      ))}
      <Arrow
        from={{ x: jumpX, y: level(before) }}
        to={{ x: jumpX, y: level(after) }}
        color={TEXT_COLOR}
      />
      <Note
        x={area.right - JUMP_LABEL_INSET}
        y={(level(before) + level(after)) / 2 + NOTE_DROP}
        anchor="end"
      >
        {marker.label}
      </Note>
      <circle
        cx={peakX}
        cy={y.toPx(peak.y)}
        r={PEAK_RADIUS}
        fill={TEXT_COLOR}
        stroke={SURFACE_COLOR}
        strokeWidth={2}
      />
      <Note x={peakLabelX} y={y.toPx(peak.y) - NOTE_GAP} anchor="middle">
        {peakText}
      </Note>
    </g>
  );
}

const VoyagerDetailPlot = memo(function VoyagerDetailPlot({
  detail,
  geometry,
}: {
  detail: EncounterDetail;
  geometry: DetailGeometry;
}): JSX.Element {
  const clipId = `voyager-detail-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { area, ticks, yTicks, x, y } = geometry;
  const scales: Scales = { x, y };
  return (
    <svg
      role="img"
      aria-label={detailSummary(detail)}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      width="100%"
      className="block h-auto"
    >
      <g data-panel="speed">
        <ClipArea id={clipId} area={area} />
        <Grid area={area} xTicks={ticks} yTicks={yTicks} scales={scales} />
        <g clipPath={`url(#${clipId})`}>
          <Regions id="hiperbolica" regions={detail.hyperbolic} color={SUN_COLOR} scales={scales} />
          <SeriesPath spec={DETAIL_LINES.escape} points={detail.escape} scales={scales} />
          <SeriesPath spec={DETAIL_LINES.v2} points={detail.speed} scales={scales} />
          <Annotations detail={detail} geometry={geometry} />
        </g>
        <YAxis area={area} ticks={yTicks} scale={y} title="|v| (km/s)" />
        <XAxis
          area={area}
          ticks={ticks}
          scale={x}
          title="t − t_{MA} (d)"
          viewWidth={geometry.width}
        />
      </g>
    </svg>
  );
});

export default VoyagerDetailPlot;
