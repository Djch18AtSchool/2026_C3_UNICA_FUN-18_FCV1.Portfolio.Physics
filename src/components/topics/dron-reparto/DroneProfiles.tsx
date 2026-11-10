import { memo, useCallback, useMemo, type JSX } from 'react';
import type { RouteDefinition, RouteSample } from '../../../lib/data/droneRoute';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import { CHART_COLORS } from '../../charts/chartTheme';
import type { Domain } from '../../lab/plotScales';
import SvgPlot, { type OverlayScales, type PlotBand, type PlotSeries } from '../../lab/SvgPlot';
import {
  MarkerTimeContext,
  ProfileMarker,
  ProfileReading,
  type MarkerSource,
} from './DroneProfilesMarker';
import { chartStep, timeAxisEnd } from './droneScene';
import { ACCEL_COLOR, VELOCITY_COLOR } from './RouteOverlay';
import { decimate, distanceSeries, dwellWindows } from './routeSeries';

export interface DroneProfilesProps {
  /** The flight being shown: the declared route's samples or an edited route's. */
  samples: RouteSample[];
  /** The route flown: its stops label the delivery bands and its limits fix the y ranges. */
  definition: RouteDefinition;
  /** The laboratory's instant (s); every chart draws a vertical marker there. */
  t: number;
  /** Decimals of t in the marker and the readings: those of the timeline's step (0,1 s). */
  timeDecimals?: number;
}

/** The timeline of Tema 1 moves in 0,1 s, so t is printed with one decimal. */
const TIMELINE_DECIMALS = 1;
/** The stops stay inside 0–1 300 m; a 0–1 500 m range keeps the position ticks round. */
const POSITION_AXIS_END_M = 1500;
/** Velocity and acceleration charts span ±1,15 times their limit, so an edit never stretches them. */
const LIMIT_HEADROOM = 1.15;
/** Components of r, v and a: x in the first chart colour, y in the second, as in figure 1.2. */
const X_COMPONENT_COLOR = CHART_COLORS[0];
const Y_COMPONENT_COLOR = CHART_COLORS[1];
const DISTANCE_COLOR = CHART_COLORS[4];
const DISPLACEMENT_COLOR = CHART_COLORS[5];
/** Decimals of the limits and the duration in the charts' accessible names. */
const NAME_PRECISION = 1;

/** One of the four charts: its curves (decimated), the values behind them and how it is named. */
export interface ProfileChart extends MarkerSource {
  id: string;
  title: string;
  yLabel: string;
  yDomain?: Domain;
  ariaLabel: string;
}

/** The four charts of a flight plus what they share: the sample times, the t axis and the bands. */
export interface DroneProfileSet {
  times: number[];
  xDomain: Domain;
  bands: PlotBand[];
  charts: ProfileChart[];
}

/** A quantity to plot: its full-resolution values and how the curve is drawn. */
interface Quantity {
  id: string;
  label: string;
  /** A shorter name for the reading row, when the legend's would crowd it. */
  readingLabel?: string;
  color: string;
  values: number[];
}

/** What every chart of a flight is built from. */
interface Flight {
  samples: RouteSample[];
  definition: RouteDefinition;
  times: number[];
  /** One sample in `every` is drawn. */
  every: number;
  /** Shared tail of the accessible names: the route's duration and its delivery bands. */
  naming: string;
}

type ChartSpec = Omit<ProfileChart, keyof MarkerSource | 'unit'> & Pick<MarkerSource, 'unit'>;

const symmetricDomain = (limit: number): Domain => ({
  min: -LIMIT_HEADROOM * limit,
  max: LIMIT_HEADROOM * limit,
});
const metres = (value: number) => formatNumber(value, { precision: 0, unit: 'm' });
const named = (value: number, unit: string) =>
  formatNumber(value, { precision: NAME_PRECISION, unit });

/** Curves thinned to one sample in `every` (always keeping the last one). */
function curves(times: number[], quantities: Quantity[], every: number): PlotSeries[] {
  return quantities.map(({ id, label, color, values }) => ({
    id,
    label,
    color,
    points: decimate(
      times.map((t, i) => ({ x: t, y: values[i] })),
      every,
    ),
  }));
}

function chartOf(flight: Flight, spec: ChartSpec, quantities: Quantity[]): ProfileChart {
  return {
    ...spec,
    series: curves(flight.times, quantities, flight.every),
    values: quantities.map((quantity) => quantity.values),
    readingLabels: quantities.map((quantity) => quantity.readingLabel ?? quantity.label),
  };
}

const column = (samples: RouteSample[], key: keyof RouteSample) =>
  samples.map((sample) => sample[key]);

function positionChart(flight: Flight): ProfileChart {
  const spec: ChartSpec = {
    id: 'posicion',
    title: 'Posición: x(t) y y(t)',
    yLabel: 'Posición',
    unit: 'm',
    yDomain: { min: 0, max: POSITION_AXIS_END_M },
    ariaLabel: mathTextToString(
      `Posición del dron frente al tiempo: componentes x e y en metros, de 0 a ${metres(POSITION_AXIS_END_M)}, ${flight.naming}.`,
    ),
  };
  return chartOf(flight, spec, [
    { id: 'x', label: 'x', color: X_COMPONENT_COLOR, values: column(flight.samples, 'x') },
    { id: 'y', label: 'y', color: Y_COMPONENT_COLOR, values: column(flight.samples, 'y') },
  ]);
}

function velocityChart(flight: Flight): ProfileChart {
  const { samples, definition } = flight;
  const spec: ChartSpec = {
    id: 'velocidad',
    title: 'Velocidad: $v_x(t)$, $v_y(t)$ y |v|(t)',
    yLabel: 'Velocidad',
    unit: 'm/s',
    yDomain: symmetricDomain(definition.vMax),
    ariaLabel: mathTextToString(
      `Velocidad del dron frente al tiempo: componentes v_x y v_y y rapidez |v| en metros por segundo; |v| no pasa de v_máx = ${named(definition.vMax, 'm/s')} y cae a 0 en cada parada, ${flight.naming}.`,
    ),
  };
  return chartOf(flight, spec, [
    { id: 'vx', label: '$v_x$', color: X_COMPONENT_COLOR, values: column(samples, 'vx') },
    { id: 'vy', label: '$v_y$', color: Y_COMPONENT_COLOR, values: column(samples, 'vy') },
    { id: 'speed', label: '|v|', color: VELOCITY_COLOR, values: column(samples, 'speed') },
  ]);
}

function accelerationChart(flight: Flight): ProfileChart {
  const { samples, definition } = flight;
  const spec: ChartSpec = {
    id: 'aceleracion',
    title: 'Aceleración: $a_x(t)$, $a_y(t)$ y |a|(t)',
    yLabel: 'Aceleración',
    unit: 'm/s²',
    yDomain: symmetricDomain(definition.aMax),
    ariaLabel: mathTextToString(
      `Aceleración del dron frente al tiempo: componentes a_x y a_y y módulo |a| en metros por segundo al cuadrado; |a| vale a_máx = ${named(definition.aMax, 'm/s²')} al arrancar y al frenar y 0 en crucero y en las paradas, ${flight.naming}.`,
    ),
  };
  return chartOf(flight, spec, [
    { id: 'ax', label: '$a_x$', color: X_COMPONENT_COLOR, values: column(samples, 'ax') },
    { id: 'ay', label: '$a_y$', color: Y_COMPONENT_COLOR, values: column(samples, 'ay') },
    { id: 'accel', label: '|a|', color: ACCEL_COLOR, values: column(samples, 'accel') },
  ]);
}

function distanceChart(flight: Flight): ProfileChart {
  const rows = distanceSeries(flight.samples);
  const travelled = rows.map((row) => row.distance);
  const displacement = rows.map((row) => row.displacement);
  const spec: ChartSpec = {
    id: 'distancia',
    title: 'Distancia recorrida frente a |Δr| desde el depósito',
    yLabel: 'Longitud',
    unit: 'm',
    ariaLabel: mathTextToString(
      `Distancia recorrida y módulo del desplazamiento |Δr| desde el depósito frente al tiempo, en metros: la distancia crece hasta ${metres(travelled[travelled.length - 1])} y |Δr| vuelve a ${metres(displacement[displacement.length - 1])} al regresar, ${flight.naming}.`,
    ),
  };
  return chartOf(flight, spec, [
    {
      id: 'distance',
      label: 'Distancia recorrida',
      readingLabel: 'Distancia',
      color: DISTANCE_COLOR,
      values: travelled,
    },
    { id: 'displacement', label: '|Δr|', color: DISPLACEMENT_COLOR, values: displacement },
  ]);
}

/** The four charts of a flight: rows thinned for drawing, axes fixed by the route's limits. */
export function buildProfiles(
  samples: RouteSample[],
  definition: RouteDefinition,
): DroneProfileSet {
  const times = samples.map((sample) => sample.t);
  const duration = times[times.length - 1];
  const stops = definition.stops.slice(1, -1).map((stop) => stop.name);
  const flight: Flight = {
    samples,
    definition,
    times,
    every: chartStep(samples.length),
    naming: `a lo largo de los ${named(duration, 's')} de la ruta; las bandas sombreadas son las entregas en ${stops.join(', ')}`,
  };
  return {
    times,
    xDomain: { min: 0, max: timeAxisEnd(duration) },
    // Band labels along the bottom, clear of the marker's t label on the top line (as in Tema 4).
    bands: dwellWindows(samples, definition.stops).map((band) => ({ ...band, labelAt: 'bottom' })),
    charts: [
      positionChart(flight),
      velocityChart(flight),
      accelerationChart(flight),
      distanceChart(flight),
    ],
  };
}

/** The plotter, memoised: it redraws only when the route (its props) changes, never per frame. */
const StaticPlot = memo(SvgPlot);

interface ProfileChartViewProps {
  chart: ProfileChart;
  profiles: DroneProfileSet;
  t: number;
  timeDecimals: number;
}

/**
 * One chart with its marker line (overlay, stable callback so the plot stays memoised) and the
 * reading row under it.
 */
function ProfileChartView({
  chart,
  profiles,
  t,
  timeDecimals,
}: ProfileChartViewProps): JSX.Element {
  const { times, xDomain, bands } = profiles;
  const overlay = useCallback(
    ({ x, y }: OverlayScales) => (
      <ProfileMarker times={times} timeDecimals={timeDecimals} x={x} y={y} />
    ),
    [times, timeDecimals],
  );
  return (
    <div className="flex flex-col gap-2">
      <StaticPlot
        title={chart.title}
        xLabel="t"
        xUnit="s"
        yLabel={chart.yLabel}
        yUnit={chart.unit}
        series={chart.series}
        xDomain={xDomain}
        yDomain={chart.yDomain}
        bands={bands}
        overlay={overlay}
        ariaLabel={chart.ariaLabel}
        testId={`drone-profile-${chart.id}`}
      />
      <ProfileReading source={chart} times={times} t={t} timeDecimals={timeDecimals} />
    </div>
  );
}

/**
 * The data visualization of Tema 1: position, velocity, acceleration and distance against time
 * for the flight the laboratory shows, with the deliveries shaded, a marker line at its t in
 * every plot and the values at t read under each. The plots are built once per route; t reaches
 * the marker lines by context, so a frame costs four thin overlays and four text rows, nothing of
 * the series.
 */
export default function DroneProfiles({
  samples,
  definition,
  t,
  timeDecimals = TIMELINE_DECIMALS,
}: DroneProfilesProps): JSX.Element {
  const profiles = useMemo(() => buildProfiles(samples, definition), [samples, definition]);
  return (
    <MarkerTimeContext.Provider value={t}>
      <div data-testid="drone-profiles" className="flex flex-col gap-4">
        {profiles.charts.map((chart) => (
          <ProfileChartView
            key={chart.id}
            chart={chart}
            profiles={profiles}
            t={t}
            timeDecimals={timeDecimals}
          />
        ))}
      </div>
    </MarkerTimeContext.Provider>
  );
}
