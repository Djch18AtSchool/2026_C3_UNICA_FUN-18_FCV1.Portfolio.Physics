import { useEffect, useState } from 'react';
import { formatNumber } from '../../../lib/format';
import {
  LOAD_MODEL,
  WORKING_WINDOW,
  loadSeries,
  temperatureSeries,
} from '../../../lib/data/tyreModels';
import LineChart, { type LineChartProps } from '../../charts/LineChart';

export type GripChartKind = 'temperatura' | 'carga';

/** 40–160 °C covers a cold tyre, the whole C3 window and an overheated one. */
const TEMPERATURE_RANGE = { from: 40, to: 160, step: 2 } as const;
/** 0–10 000 N reaches 2,5 F_z0, far enough for the two models to separate clearly. */
const LOAD_RANGE = { from: 0, to: 10000, step: 250 } as const;
/** A round top above μ₀ · 10 000 N = 16 000 N. */
const LATERAL_FORCE_AXIS_END_N = 16000;
const MU_AXIS: [number, number] = [0, 2];
/** Every 20 °C; the automatic ticks fell on 40, 90, 140 and 160. */
const TEMPERATURE_TICK_STEP = 20;

function ticksEvery(from: number, to: number, step: number): number[] {
  return Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
}

const TEMPERATURE_ROWS = temperatureSeries(
  TEMPERATURE_RANGE.from,
  TEMPERATURE_RANGE.to,
  TEMPERATURE_RANGE.step,
).map((row) => ({ ...row }));
const LOAD_ROWS = loadSeries(LOAD_RANGE.from, LOAD_RANGE.to, LOAD_RANGE.step).map((row) => ({
  ...row,
}));

const CHARTS: Record<GripChartKind, LineChartProps> = {
  temperatura: {
    title: 'Coeficiente de agarre μ en función de la temperatura de la banda de rodadura',
    data: TEMPERATURE_ROWS,
    xKey: 't',
    xAxis: {
      label: 'Temperatura',
      unit: '°C',
      domain: [TEMPERATURE_RANGE.from, TEMPERATURE_RANGE.to],
      ticks: ticksEvery(TEMPERATURE_RANGE.from, TEMPERATURE_RANGE.to, TEMPERATURE_TICK_STEP),
      precision: 0,
    },
    yAxis: {
      label: 'Coeficiente de agarre μ',
      unit: 'adimensional',
      valueUnit: '',
      domain: MU_AXIS,
      precision: 2,
    },
    series: [{ key: 'mu', name: 'μ(T)' }],
    bands: [{ ...WORKING_WINDOW.values, label: 'Ventana de trabajo C3 (2019)' }],
    curve: 'monotone',
  },
  carga: {
    title: 'Fuerza lateral máxima en función de la carga vertical sobre la llanta',
    data: LOAD_ROWS,
    xKey: 'fz',
    xAxis: {
      label: 'Carga vertical F_z',
      unit: 'N',
      domain: [LOAD_RANGE.from, LOAD_RANGE.to],
      precision: 0,
    },
    yAxis: {
      label: 'Fuerza lateral máxima F_y',
      unit: 'N',
      domain: [0, LATERAL_FORCE_AXIS_END_N],
      precision: 0,
    },
    series: [
      { key: 'linear', name: 'Modelo lineal F = μ N', dashed: true },
      { key: 'real', name: 'Con sensibilidad a la carga' },
    ],
    markers: [
      {
        x: LOAD_MODEL.values.fz0,
        label: `F_z0 = ${formatNumber(LOAD_MODEL.values.fz0, { precision: 0, unit: 'N' })}`,
      },
    ],
    tooltipExtras: [{ key: 'muEff', name: 'μ efectivo', precision: 2 }],
    curve: 'monotone',
  },
};

export interface GripChartsProps {
  chart: GripChartKind;
}

/** One of the two grip charts of Tema 4; each sits in its own numbered figure. */
export default function GripCharts({ chart }: GripChartsProps) {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => setIsReady(true), []);

  return (
    <div data-testid={`grip-chart-${chart}`} data-ready={isReady} className="min-w-0">
      <LineChart {...CHARTS[chart]} />
    </div>
  );
}
