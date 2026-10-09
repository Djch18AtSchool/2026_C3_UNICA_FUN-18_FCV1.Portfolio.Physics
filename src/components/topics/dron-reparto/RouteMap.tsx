import { useMemo, type ReactNode } from 'react';
import { formatNumber } from '../../../lib/format';
import type { RouteSample, RouteStop } from '../../../lib/data/droneRoute';
import { useElementWidth } from '../../hooks/useElementWidth';
import { buildMapScale, routeDomain, type MapScale } from './mapScale';

export interface RouteMapProps {
  stops: readonly RouteStop[];
  /** Full-resolution samples, for the trail flown up to the current instant. */
  samples: readonly RouteSample[];
  current: RouteSample;
}

/** Map length of the vectors: 1 m/s of velocity is drawn 15 m long, 1 m/s² of acceleration 60 m. */
export const VELOCITY_SCALE_M = 15;
export const ACCEL_SCALE_M = 60;
/** Room around the stops: the longest vector, 10 m/s · 15 m = 2,5 m/s² · 60 m = 150 m. */
const DOMAIN_PAD_M = 150;
const DEFAULT_WIDTH = 420;
const MAX_PLOT_HEIGHT = 520;
const TRAIL_EVERY = 10;
const MARKER_RADIUS = 6;
const STOP_RADIUS = 4.5;
const TICK_LENGTH = 5;
const ARROW_HEAD_LENGTH = 9;
const ARROW_HEAD_HALF_WIDTH = 4.5;
const MIN_ARROW_PX = 2;
const ARROW_LABEL_GAP = 9;
const ARROW_LABEL_SIDE = 9;

interface Point {
  x: number;
  y: number;
}

/** Where each stop label sits relative to its dot (px), so no label crosses the route. */
const LABEL_OFFSETS: Record<string, Point & { anchor: 'start' | 'end' | 'middle' }> = {
  Depósito: { x: 10, y: 16, anchor: 'start' },
  A: { x: 10, y: 14, anchor: 'start' },
  B: { x: 10, y: 4, anchor: 'start' },
  C: { x: 0, y: -10, anchor: 'middle' },
};

function toScreen(scale: MapScale, x: number, y: number): Point {
  return { x: scale.x(x), y: scale.y(y) };
}

function polyline(points: readonly Point[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

interface ArrowProps {
  from: Point;
  to: Point;
  label: string;
  colorClass: { stroke: string; fill: string };
}

/** A straight arrow with a filled head; nothing when the vector is shorter than MIN_ARROW_PX. */
function Arrow({ from, to, label, colorClass }: ArrowProps) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < MIN_ARROW_PX) return null;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(ARROW_HEAD_LENGTH, length);
  const base = { x: to.x - ux * head, y: to.y - uy * head };
  const halfWidth = (ARROW_HEAD_HALF_WIDTH * head) / ARROW_HEAD_LENGTH;
  const left = { x: base.x - uy * halfWidth, y: base.y + ux * halfWidth };
  const right = { x: base.x + uy * halfWidth, y: base.y - ux * halfWidth };
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={base.x}
        y2={base.y}
        strokeWidth="2.5"
        strokeLinecap="round"
        className={colorClass.stroke}
      />
      <polygon points={polyline([to, left, right])} className={colorClass.fill} />
      <text
        // Past the tip and a little to its left, so the letter never sits on the route line.
        x={to.x + ux * ARROW_LABEL_GAP + uy * ARROW_LABEL_SIDE}
        y={to.y + uy * ARROW_LABEL_GAP - ux * ARROW_LABEL_SIDE}
        dy="0.35em"
        textAnchor="middle"
        className={`${colorClass.fill} font-sans text-sm font-semibold italic`}
      >
        {label}
      </text>
    </g>
  );
}

const VELOCITY_COLOR = { stroke: 'stroke-chart-3', fill: 'fill-chart-3' };
const ACCEL_COLOR = { stroke: 'stroke-chart-4', fill: 'fill-chart-4' };

function Axes({ scale }: { scale: MapScale }) {
  const { plot } = scale;
  return (
    <g aria-hidden="true">
      {scale.yTicks.map((tick) => (
        <g key={`y${tick}`}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={scale.y(tick)}
            y2={scale.y(tick)}
            className="stroke-grid"
          />
          <line
            x1={plot.left - TICK_LENGTH}
            x2={plot.left}
            y1={scale.y(tick)}
            y2={scale.y(tick)}
            className="stroke-border"
          />
          <text
            x={plot.left - TICK_LENGTH - 3}
            y={scale.y(tick)}
            dy="0.32em"
            textAnchor="end"
            className="fill-fg-muted"
          >
            {formatNumber(tick, { precision: 0 })}
          </text>
        </g>
      ))}
      {scale.xTicks.map((tick) => (
        <g key={`x${tick}`}>
          <line
            x1={scale.x(tick)}
            x2={scale.x(tick)}
            y1={plot.top}
            y2={plot.bottom}
            className="stroke-grid"
          />
          <line
            x1={scale.x(tick)}
            x2={scale.x(tick)}
            y1={plot.bottom}
            y2={plot.bottom + TICK_LENGTH}
            className="stroke-border"
          />
          <text
            x={scale.x(tick)}
            y={plot.bottom + TICK_LENGTH + 13}
            textAnchor="middle"
            className="fill-fg-muted"
          >
            {formatNumber(tick, { precision: 0 })}
          </text>
        </g>
      ))}
      <rect
        x={plot.left}
        y={plot.top}
        width={plot.right - plot.left}
        height={plot.bottom - plot.top}
        fill="none"
        className="stroke-fg-muted"
      />
      <text
        x={(plot.left + plot.right) / 2}
        y={scale.height - 6}
        textAnchor="middle"
        className="fill-fg font-sans text-sm"
      >
        x (m)
      </text>
      <text
        transform={`translate(14 ${(plot.top + plot.bottom) / 2}) rotate(-90)`}
        textAnchor="middle"
        className="fill-fg font-sans text-sm"
      >
        y (m)
      </text>
    </g>
  );
}

function LegendSwatch({ children }: { children: ReactNode }) {
  return (
    <svg width="26" height="12" aria-hidden="true" className="shrink-0">
      {children}
    </svg>
  );
}

function Legend() {
  return (
    <ul className="m-0 grid list-none gap-x-5 gap-y-1 p-0 text-sm @md:grid-cols-2">
      <li className="m-0 flex items-center gap-2">
        <LegendSwatch>
          <line
            x1="1"
            y1="6"
            x2="25"
            y2="6"
            strokeWidth="2"
            strokeDasharray="5 4"
            className="stroke-fg-muted"
          />
        </LegendSwatch>
        Ruta declarada
      </li>
      <li className="m-0 flex items-center gap-2">
        <LegendSwatch>
          <line x1="1" y1="6" x2="25" y2="6" strokeWidth="3" className="stroke-chart-1" />
        </LegendSwatch>
        Recorrido hasta t
      </li>
      <li className="m-0 flex items-center gap-2">
        <LegendSwatch>
          <line x1="1" y1="6" x2="18" y2="6" strokeWidth="2.5" className="stroke-chart-3" />
          <polygon points="25,6 17,2 17,10" className="fill-chart-3" />
        </LegendSwatch>
        {`Velocidad v: 1 m/s → ${VELOCITY_SCALE_M} m`}
      </li>
      <li className="m-0 flex items-center gap-2">
        <LegendSwatch>
          <line x1="1" y1="6" x2="18" y2="6" strokeWidth="2.5" className="stroke-chart-4" />
          <polygon points="25,6 17,2 17,10" className="fill-chart-4" />
        </LegendSwatch>
        {`Aceleración a: 1 m/s² → ${ACCEL_SCALE_M} m`}
      </li>
    </ul>
  );
}

/** Route map on an x–y plane with equal scales: stops, trail, drone at t and its v and a vectors. */
export default function RouteMap({ stops, samples, current }: RouteMapProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>(DEFAULT_WIDTH);
  const domain = useMemo(() => routeDomain(stops, DOMAIN_PAD_M), [stops]);
  const scale = useMemo(() => buildMapScale(width, domain, MAX_PLOT_HEIGHT), [width, domain]);
  const route = useMemo(
    () => polyline(stops.map((stop) => toScreen(scale, stop.x, stop.y))),
    [stops, scale],
  );
  const trail = useMemo(() => {
    const flown = samples.filter((s, i) => s.t <= current.t && i % TRAIL_EVERY === 0);
    return polyline([...flown, current].map((s) => toScreen(scale, s.x, s.y)));
  }, [samples, current, scale]);

  const drone = toScreen(scale, current.x, current.y);
  const velocityTip = toScreen(
    scale,
    current.x + current.vx * VELOCITY_SCALE_M,
    current.y + current.vy * VELOCITY_SCALE_M,
  );
  const accelTip = toScreen(
    scale,
    current.x + current.ax * ACCEL_SCALE_M,
    current.y + current.ay * ACCEL_SCALE_M,
  );
  const uniqueStops = stops.filter(
    (stop, i) => stops.findIndex((other) => other.x === stop.x && other.y === stop.y) === i,
  );
  const description = `Mapa de la ruta en el plano x–y. En t = ${formatNumber(current.t, { precision: 1, unit: 's' })} el dron está en (${formatNumber(current.x, { precision: 0 })}; ${formatNumber(current.y, { precision: 0 })}) m con |v| = ${formatNumber(current.speed, { unit: 'm/s' })} y |a| = ${formatNumber(current.accel, { unit: 'm/s²' })}.`;

  return (
    <div className="@container flex flex-col gap-3">
      <div ref={containerRef} className="flex w-full justify-center">
        <svg
          data-testid="route-map"
          width={scale.width}
          height={scale.height}
          viewBox={`0 0 ${scale.width} ${scale.height}`}
          role="img"
          aria-label={description}
          className="block max-w-full font-mono text-xs"
        >
          <Axes scale={scale} />
          <polyline
            points={route}
            fill="none"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinejoin="round"
            className="stroke-fg-muted"
          />
          <polyline
            points={trail}
            fill="none"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="stroke-chart-1"
          />
          {uniqueStops.map((stop) => {
            const at = toScreen(scale, stop.x, stop.y);
            const offset = LABEL_OFFSETS[stop.name] ?? { x: 10, y: 4, anchor: 'start' };
            return (
              <g key={stop.name}>
                <rect
                  x={at.x - STOP_RADIUS}
                  y={at.y - STOP_RADIUS}
                  width={STOP_RADIUS * 2}
                  height={STOP_RADIUS * 2}
                  strokeWidth="1.5"
                  className="fill-bg-elevated stroke-fg"
                />
                <text
                  x={at.x + offset.x}
                  y={at.y + offset.y}
                  textAnchor={offset.anchor}
                  className="fill-fg font-sans text-sm font-semibold"
                >
                  {stop.name}
                </text>
              </g>
            );
          })}
          <Arrow from={drone} to={velocityTip} label="v" colorClass={VELOCITY_COLOR} />
          <Arrow from={drone} to={accelTip} label="a" colorClass={ACCEL_COLOR} />
          <circle
            data-testid="drone-marker"
            cx={drone.x.toFixed(1)}
            cy={drone.y.toFixed(1)}
            r={MARKER_RADIUS}
            strokeWidth="2"
            className="fill-accent stroke-bg-elevated"
          />
        </svg>
      </div>
      <Legend />
    </div>
  );
}
