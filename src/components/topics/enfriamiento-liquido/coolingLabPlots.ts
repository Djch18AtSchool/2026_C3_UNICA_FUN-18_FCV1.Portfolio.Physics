/**
 * The two support plots of Tema 13's lab, as data for SvgPlot: each server's flow against OCP's
 * design target (the split, 13.4), and the pump's chart, with Deschutes' published curves, the
 * lowest that gives the duty point, the circuit's own curve and the two points (asked for, and
 * where that published curve would run; the first on the top edge when it is off the scale).
 * Pure. Colours keep the topic's meanings: my model in ink, published data in green (as GF's
 * losses in figure 13.3), a reference muted.
 */
import { DESCHUTES_PUMP, pumpPressure, type PumpCurve } from '../../../lib/data/liquidCooling';
import type { PlotPoint } from '../../lab/PlotPoints';
import { padDomain, type Domain } from '../../lab/plotScales';
import type { PlotSeries } from '../../lab/SvgPlot';
import { PUBLISHED_LOSS_COLOR } from './coolingCharts';
import { TEXT_COLOR, TICK_COLOR } from '../../charts/chartTheme';
import { systemCurve, type CoolingScene } from './coolingScene';
import { PWM_RANGE, RULE } from './coolingLabText';
import { worstName } from './coolingLabReadings';
import { kpa as kpaText, toKpa, toLitres, toLpm } from './coolingUnits';

/** Servers and the circuit are my model (ink); OCP's target is a reference line (muted). */
export const SERVER_COLOR = TEXT_COLOR;
export const TARGET_COLOR = TICK_COLOR;
export const SYSTEM_COLOR = TEXT_COLOR;
/** Deschutes' curves are published product data, green as the published losses of figure 13.3. */
export const PUBLISHED_COLOR = PUBLISHED_LOSS_COLOR;

const SPLIT_PAD = 0.1;
/** Half a port of room at each end of the port axis. */
const PORT_PAD = 0.5;
const CURVE_SAMPLES = 60;
const PRESSURE_HEADROOM = 1.08;
/** The pressure axis stops at this many times the top of the pump's curves. */
const MAX_OVER_PUMP = 2;

const lpm = toLpm;
const litres = toLitres;
const kpa = toKpa;

export interface SplitPlot {
  series: PlotSeries[];
  xDomain: Domain;
  yDomain: Domain;
  /** The server that gets least, named. */
  worst: PlotPoint;
}

/** q_i (L/min) against the port, and OCP's design target across every port. */
export function splitPlot(scene: CoolingScene): SplitPlot {
  const flows = scene.flows.map((flow, i) => ({ x: i + 1, y: lpm(flow) }));
  const minimum = lpm(scene.minimum);
  const xDomain = { min: 1 - PORT_PAD, max: scene.flows.length + PORT_PAD };
  return {
    series: [
      { id: 'caudal', label: 'Caudal de cada servidor', points: flows, color: SERVER_COLOR },
      {
        id: 'minimo',
        label: `Objetivo de diseño de OCP, ${RULE}`,
        points: [
          { x: xDomain.min, y: minimum },
          { x: xDomain.max, y: minimum },
        ],
        color: TARGET_COLOR,
        dashed: true,
      },
    ],
    xDomain,
    yDomain: padDomain([...flows.map((point) => point.y), minimum], SPLIT_PAD),
    worst: {
      id: 'peor',
      x: scene.worst.port,
      y: lpm(scene.worst.flow),
      label: `${scene.worst.port}, el ${worstName(scene.worst)}`,
      color: SERVER_COLOR,
    },
  };
}

const CURVE_MAX_FLOW = DESCHUTES_PUMP.curveMaxFlow.value;
const flowSamples = Array.from(
  { length: CURVE_SAMPLES + 1 },
  (_, i) => (CURVE_MAX_FLOW * i) / CURVE_SAMPLES,
);

/** One published curve (L/s, kPa), up to where it stops giving pressure. */
function curvePoints(curve: PumpCurve) {
  return flowSamples
    .map((Q) => ({ x: litres(Q), y: kpa(pumpPressure(curve, Q)) }))
    .filter((point) => point.y >= 0);
}

const GAP = { x: Number.NaN, y: Number.NaN };
const FAMILY = DESCHUTES_PUMP.curves.flatMap((curve, i) => [
  ...(i > 0 ? [GAP] : []),
  ...curvePoints(curve),
]);
const PUMP_TOP = Math.max(...FAMILY.filter((point) => Number.isFinite(point.y)).map((p) => p.y));

export interface PumpPlot {
  series: PlotSeries[];
  points: PlotPoint[];
  xDomain: Domain;
  yDomain: Domain;
  /** The duty point when it is above the pressure axis: drawn on the top edge, with its value. */
  edge?: { x: number; label: string };
}

/** The pump's chart (Q_CDU in L/s, Δp in kPa) at the scene's duty point. */
export function pumpPlot(scene: CoolingScene): PumpPlot {
  const system = systemCurve(scene.config);
  const { duty, curve, operating } = scene.pump;
  const family: PlotSeries = {
    id: 'deschutes',
    label: `Curvas publicadas de Deschutes, ${PWM_RANGE}`,
    points: FAMILY,
    color: PUBLISHED_COLOR,
    dashed: true,
  };
  const chosen: PlotSeries[] = curve
    ? [
        {
          id: 'curva',
          label: `Curva de ${curve.pwm} % PWM, la más baja que da el punto pedido`,
          points: curvePoints(curve),
          color: PUBLISHED_COLOR,
        },
      ]
    : [];
  const circuit: PlotSeries = {
    id: 'sistema',
    label: 'Curva del circuito: la caída a cada caudal',
    points: flowSamples.map((Q) => ({ x: litres(Q), y: kpa(system(Q)) })),
    color: SYSTEM_COLOR,
  };
  const top = Math.min(Math.max(PUMP_TOP, kpa(duty.dp)), MAX_OVER_PUMP * PUMP_TOP);
  const yMax = top * PRESSURE_HEADROOM;
  const isOffScale = kpa(duty.dp) > yMax;
  const points: PlotPoint[] = [
    ...(isOffScale
      ? []
      : [
          {
            id: 'pedido',
            x: litres(duty.Q),
            y: kpa(duty.dp),
            label: 'pedido',
            color: SYSTEM_COLOR,
          },
        ]),
    ...(curve && operating
      ? [
          {
            id: 'operacion',
            x: litres(operating.Q),
            y: kpa(operating.dp),
            label: `${curve.pwm} %`,
            color: PUBLISHED_COLOR,
          },
        ]
      : []),
  ];
  return {
    series: [family, ...chosen, circuit],
    points,
    xDomain: { min: 0, max: litres(CURVE_MAX_FLOW) },
    yDomain: { min: 0, max: yMax },
    ...(isOffScale
      ? { edge: { x: litres(duty.Q), label: `pedido: ${kpaText(duty.dp)}, fuera de escala` } }
      : {}),
  };
}
