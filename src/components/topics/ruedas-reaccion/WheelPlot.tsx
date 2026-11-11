import { useMemo, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import { TEXT_COLOR, TICK_COLOR } from '../../charts/chartTheme';
import type { FrameStore } from '../../lab/frameStore';
import SvgPlot, { type PlotSeries } from '../../lab/SvgPlot';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { LIMIT_COLOR } from './MomentumGauge';
import {
  DISTURBANCE_SPAN,
  disturbanceSeries,
  DUMP_THRESHOLD,
  maneuverSeries,
  SECONDS_PER_HOUR,
  type SeriesPoint,
  type WheelSettings,
} from './wheelLabModel';

const PERCENT = 100;
/** The y axis shows L_max with this much room, and grows in steps of 10 % past it. */
const Y_HEADROOM = 1.1;
const Y_GRAIN = 10;
/** The maneuver's cursor, in seconds; the disturbance's, in hours, takes the global decimals. */
const CURSOR_PRECISION = 1;
const GAP: SeriesPoint = { x: Number.NaN, y: Number.NaN };
/** The plot is never wider than the dial above it: its 400 px and the frame's padding. */
const PLOT_MAX_WIDTH = 440;

export interface WheelPlotProps {
  settings: WheelSettings;
  /** The settled orbit time (s). */
  t: number;
  /** The live clock (its time is playback time) and the orbit time it means. */
  frame: FrameStore;
  orbitTimeAt(playbackTime: number): number;
  onSeek(t: number): void;
}

/** A horizontal line at `y` (%) across [0, end]. */
const level = (y: number, end: number): SeriesPoint[] => [
  { x: 0, y },
  { x: end, y },
];

function maneuverPlot(settings: WheelSettings) {
  const points = maneuverSeries(settings);
  const peak = Math.max(...points.map((p) => Math.abs(p.y)));
  const yMax = Math.max(PERCENT, Math.ceil((peak * Y_HEADROOM) / Y_GRAIN) * Y_GRAIN) + Y_GRAIN;
  const series: PlotSeries[] = [
    { id: 'lw', label: '$L_w$ de la rueda', points, color: TEXT_COLOR },
    {
      id: 'lmax',
      label: String.raw`$\pm L_\text{máx}$`,
      points: [...level(PERCENT, settings.T), GAP, ...level(-PERCENT, settings.T)],
      color: LIMIT_COLOR,
      dashed: true,
    },
  ];
  return {
    series,
    xUnit: 's',
    xDomain: { min: 0, max: settings.T },
    yDomain: { min: -yMax, max: yMax },
    toX: (t: number) => t,
    toT: (x: number) => x,
  };
}

function disturbancePlot(settings: WheelSettings) {
  const end = DISTURBANCE_SPAN / SECONDS_PER_HOUR;
  const series: PlotSeries[] = [
    {
      id: 'lw',
      label: '$L_w$ de la rueda',
      points: disturbanceSeries(settings.actuator),
      color: TEXT_COLOR,
    },
    {
      id: 'lmax',
      label: String.raw`$L_\text{máx}$`,
      points: level(PERCENT, end),
      color: LIMIT_COLOR,
      dashed: true,
    },
    {
      id: 'umbral',
      label: 'Umbral de descarga, 80 %',
      points: level(DUMP_THRESHOLD * PERCENT, end),
      color: TICK_COLOR,
      dashed: true,
    },
  ];
  return {
    series,
    xUnit: 'h',
    xDomain: { min: 0, max: end },
    yDomain: { min: 0, max: PERCENT * Y_HEADROOM },
    toX: (t: number) => t / SECONDS_PER_HOUR,
    toT: (x: number) => x * SECONDS_PER_HOUR,
  };
}

/**
 * L_w as a share of L_max against time, with L_max in red and, in the disturbance, the dump
 * threshold; its cursor is the clock: dragging it, or its arrow keys, scrubs the laboratory.
 */
export default function WheelPlot({
  settings,
  t,
  frame,
  orbitTimeAt,
  onSeek,
}: WheelPlotProps): JSX.Element {
  const isManeuver = settings.mode === 'maniobra';
  const { decimals } = useGlobalSettings();
  const plot = useMemo(
    () => (isManeuver ? maneuverPlot(settings) : disturbancePlot(settings)),
    [isManeuver, settings],
  );
  // In hours (the disturbance) at the global decimals, as the transport and «Tiempo en órbita».
  const cursorText = (x: number) =>
    `t = ${formatNumber(x, { precision: isManeuver ? CURSOR_PRECISION : decimals, unit: plot.xUnit })}`;
  const ariaLabel = mathTextToString(
    isManeuver
      ? `L_w respecto de L_máx durante el giro: un triángulo que sube y vuelve a 0 en ${formatNumber(settings.T, { precision: 1, unit: 's' })}, con ±L_máx en rojo.`
      : 'L_w respecto de L_máx durante tres días: rampas del gradiente de gravedad hasta el umbral del 80 % y caídas de la descarga, con L_máx en rojo.',
  );
  return (
    <div className="mx-auto w-full" style={{ maxWidth: PLOT_MAX_WIDTH }}>
      <SvgPlot
        title="Momento de la rueda frente al tiempo"
        xLabel="t"
        xUnit={plot.xUnit}
        yLabel="L_w / L_máx"
        yUnit="%"
        series={plot.series}
        xDomain={plot.xDomain}
        yDomain={plot.yDomain}
        cursor={{
          x: plot.toX(t),
          follow: { frame, toX: (playbackTime) => plot.toX(orbitTimeAt(playbackTime)) },
          onChange: (x) => onSeek(plot.toT(x)),
          label: cursorText,
        }}
        ariaLabel={ariaLabel}
        testId="wheel-plot"
      />
    </div>
  );
}
