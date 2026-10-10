import { memo, useDeferredValue, useMemo, type JSX } from 'react';
import type { RouteSample, RouteStop } from '../../../lib/data/droneRoute';
import { CHART_COLORS } from '../../charts/chartTheme';
import LineChart, {
  type AxisSpec,
  type ReferenceBand,
  type SeriesSpec,
} from '../../charts/LineChart';
import { chartStep, timeAxisEnd } from './droneScene';
import { decimate, distanceSeries, dwellWindows } from './routeSeries';

export interface DroneProfilesProps {
  /** The flight being shown: the declared route's samples or an edited route's. */
  samples: RouteSample[];
  stops: readonly RouteStop[];
  /** The laboratory's instant (s); every chart draws a vertical marker there. */
  t: number;
}

/** The marker moves in steps of about one pixel of a 400 px wide axis, so playback redraws less. */
const MARKER_STEPS = 400;
/** The stops stay inside 0–1 300 m; a 0–1 500 m range keeps the position ticks every 500 m. */
const POSITION_AXIS_END_M = 1500;

interface ChartSpec {
  id: string;
  title: string;
  data: Record<string, number>[];
  yAxis: AxisSpec;
  series: SeriesSpec[];
}

function buildCharts(samples: RouteSample[]): ChartSpec[] {
  const every = chartStep(samples.length);
  const kinematicRows = decimate(samples, every).map((sample) => ({ ...sample }));
  const distanceRows = decimate(distanceSeries(samples), every).map((row) => ({ ...row }));
  return [
    {
      id: 'posicion',
      title: 'Posición: x(t) y y(t)',
      data: kinematicRows,
      yAxis: { label: 'Posición', unit: 'm', domain: [0, POSITION_AXIS_END_M] },
      series: [
        { key: 'x', name: 'x' },
        { key: 'y', name: 'y' },
      ],
    },
    {
      id: 'velocidad',
      title: 'Velocidad: vx(t), vy(t) y |v|(t)',
      data: kinematicRows,
      yAxis: { label: 'Velocidad', unit: 'm/s' },
      series: [
        { key: 'vx', name: 'vx' },
        { key: 'vy', name: 'vy' },
        { key: 'speed', name: '|v|', color: CHART_COLORS[2] },
      ],
    },
    {
      id: 'aceleracion',
      title: 'Aceleración: ax(t), ay(t) y |a|(t)',
      data: kinematicRows,
      yAxis: { label: 'Aceleración', unit: 'm/s²' },
      series: [
        { key: 'ax', name: 'ax' },
        { key: 'ay', name: 'ay' },
        { key: 'accel', name: '|a|', color: CHART_COLORS[3] },
      ],
    },
    {
      id: 'distancia',
      title: 'Distancia recorrida frente a |Δr| desde el depósito',
      data: distanceRows,
      yAxis: { label: 'Longitud', unit: 'm' },
      series: [
        { key: 'distance', name: 'Distancia recorrida', color: CHART_COLORS[4] },
        { key: 'displacement', name: '|Δr|', color: CHART_COLORS[5] },
      ],
    },
  ];
}

interface ProfileChartsProps {
  charts: ChartSpec[];
  timeAxis: AxisSpec;
  bands: ReferenceBand[];
  markerT: number;
}

/** The four Recharts charts; memoised so they redraw only when the route or the marker moves. */
const ProfileCharts = memo(function ProfileCharts({
  charts,
  timeAxis,
  bands,
  markerT,
}: ProfileChartsProps): JSX.Element {
  const markers = [{ x: markerT }];
  return (
    <>
      {charts.map((chart) => (
        <LineChart
          key={chart.id}
          title={chart.title}
          data={chart.data}
          xKey="t"
          xAxis={timeAxis}
          yAxis={chart.yAxis}
          series={chart.series}
          bands={bands}
          markers={markers}
        />
      ))}
    </>
  );
});

/**
 * The data visualization of Tema 1: position, velocity, acceleration and distance against time
 * for the flight the laboratory shows, with the deliveries shaded and a marker at its t. The
 * marker snaps to the charts' sample grid (or ~1 px steps) and may lag the map by a frame (deferred value).
 */
export default function DroneProfiles({ samples, stops, t }: DroneProfilesProps): JSX.Element {
  const charts = useMemo(() => buildCharts(samples), [samples]);
  const bands = useMemo(() => dwellWindows(samples, stops), [samples, stops]);
  const duration = samples[samples.length - 1].t;
  const timeAxis = useMemo<AxisSpec>(
    () => ({ label: 't', unit: 's', domain: [0, timeAxisEnd(duration)] }),
    [duration],
  );
  const chartGrid =
    samples[Math.min(chartStep(samples.length), samples.length - 1)].t - samples[0].t;
  const step = Math.max(chartGrid, duration / MARKER_STEPS);
  const snapped = step > 0 ? Math.min(Math.round(t / step) * step, duration) : t;
  const markerT = useDeferredValue(snapped);
  return (
    <div data-testid="drone-profiles" className="flex flex-col gap-4">
      <ProfileCharts charts={charts} timeAxis={timeAxis} bands={bands} markerT={markerT} />
    </div>
  );
}
