import { useDeferredValue, useEffect, useState } from 'react';
import droneRoute from '../../../data/drone-route.json';
import type { RouteDefinition, RouteSample } from '../../../lib/data/droneRoute';
import { CHART_COLORS } from '../../charts/chartTheme';
import LineChart, { type AxisSpec, type SeriesSpec } from '../../charts/LineChart';
import ControlPanel from '../../controls/ControlPanel';
import Readout from '../../controls/Readout';
import Slider from '../../controls/Slider';
import RouteMap from './RouteMap';
import {
  decimate,
  distanceSeries,
  dwellWindows,
  motionPhase,
  sampleAt,
  type MotionPhase,
} from './routeSeries';

interface DroneDataset {
  definition: RouteDefinition;
  samples: RouteSample[];
}

/** The committed dataset (scripts/generate-drone-route.ts); its shape is checked at compile time. */
const DATASET: DroneDataset = droneRoute;
const { definition, samples: SAMPLES } = DATASET;
const LAST_SAMPLE = SAMPLES[SAMPLES.length - 1];
/** Recharts tooltips choke on 3 900 points × 4 charts: the curves use one sample every 0,5 s. */
const CHART_EVERY = 5;
/** Braking into A: the opening view shows v and a pointing opposite ways. */
const INITIAL_TIME_S = 65;
const TIME_PRECISION = 1;
const POSITION_PRECISION = 1;
const VECTOR_PRECISION = 2;
/** A round end past the last sample (387,5 s), so the time ticks fall every 100 s. */
const TIME_AXIS_END_S = 400;
/** The stops reach 1 100 m; a 0–1 500 m range keeps the position ticks every 500 m. */
const POSITION_AXIS_END_M = 1500;
const TIME_AXIS: AxisSpec = { label: 't', unit: 's', domain: [0, TIME_AXIS_END_S] };

const BANDS = dwellWindows(SAMPLES, definition.stops);
const KINEMATIC_ROWS = decimate(SAMPLES, CHART_EVERY).map((sample) => ({ ...sample }));
const DISTANCE_ROWS = decimate(distanceSeries(SAMPLES), CHART_EVERY).map((row) => ({ ...row }));

interface ChartSpec {
  id: string;
  title: string;
  data: Record<string, number>[];
  yAxis: AxisSpec;
  series: SeriesSpec[];
}

const CHARTS: ChartSpec[] = [
  {
    id: 'posicion',
    title: 'Posición: x(t) y y(t)',
    data: KINEMATIC_ROWS,
    yAxis: { label: 'Posición', unit: 'm', domain: [0, POSITION_AXIS_END_M] },
    series: [
      { key: 'x', name: 'x' },
      { key: 'y', name: 'y' },
    ],
  },
  {
    id: 'velocidad',
    title: 'Velocidad: vx(t), vy(t) y |v|(t)',
    data: KINEMATIC_ROWS,
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
    data: KINEMATIC_ROWS,
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
    data: DISTANCE_ROWS,
    yAxis: { label: 'Longitud', unit: 'm' },
    series: [
      { key: 'distance', name: 'Distancia recorrida', color: CHART_COLORS[4] },
      { key: 'displacement', name: '|Δr|', color: CHART_COLORS[5] },
    ],
  },
];

const PHASE_LABELS: Record<MotionPhase, string> = {
  acelerando: 'acelerando (a en el sentido de v)',
  crucero: 'crucero (a = 0)',
  frenando: 'frenando (a opuesta a v)',
  detenido: 'detenido en un vértice',
};

export default function DroneProfiles() {
  const [time, setTime] = useState(INITIAL_TIME_S);
  const [isReady, setIsReady] = useState(false);
  // The map and readouts follow the slider at once; the four charts may lag a frame behind.
  const chartTime = useDeferredValue(time);
  const current = sampleAt(SAMPLES, time, definition.dt);
  const markers = [{ x: sampleAt(SAMPLES, chartTime, definition.dt).t }];

  useEffect(() => setIsReady(true), []);

  return (
    <div
      data-testid="drone-profiles"
      data-ready={isReady}
      className="@container flex flex-col gap-4"
    >
      <div className="grid gap-4 @2xl:grid-cols-[2fr_1fr]">
        <div className="min-w-0 rounded-base border border-border bg-bg-elevated p-4">
          <RouteMap stops={definition.stops} samples={SAMPLES} current={current} />
        </div>
        <ControlPanel title="Instante" onReset={() => setTime(INITIAL_TIME_S)}>
          <Slider
            id="drone-time"
            label="Tiempo"
            unit="s"
            min={0}
            max={LAST_SAMPLE.t}
            step={definition.dt}
            value={time}
            precision={TIME_PRECISION}
            onChange={setTime}
          />
          <div data-testid="drone-readouts" className="flex flex-col gap-2">
            <Readout label="Posición x" value={current.x} unit="m" precision={POSITION_PRECISION} />
            <Readout label="Posición y" value={current.y} unit="m" precision={POSITION_PRECISION} />
            <Readout
              label="Rapidez |v|"
              value={current.speed}
              unit="m/s"
              precision={VECTOR_PRECISION}
            />
            <Readout
              label="Aceleración |a|"
              value={current.accel}
              unit="m/s²"
              precision={VECTOR_PRECISION}
            />
            <p className="m-0 text-sm">
              <span className="text-fg-muted">Fase: </span>
              {PHASE_LABELS[motionPhase(current)]}
            </p>
          </div>
        </ControlPanel>
      </div>
      {CHARTS.map((chart) => (
        <LineChart
          key={chart.id}
          title={chart.title}
          data={chart.data}
          xKey="t"
          xAxis={TIME_AXIS}
          yAxis={chart.yAxis}
          series={chart.series}
          bands={BANDS}
          markers={markers}
        />
      ))}
    </div>
  );
}
