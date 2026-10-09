import { useEffect, useMemo, useRef, useState } from 'react';
import { G_EARTH, type TrajectoryPoint } from '../../../lib/physics';
import { formatNumber } from '../../../lib/format';
import { tickPrecision, trimTrailingZeros } from '../../charts/chartScale';
import { useElementWidth } from '../../hooks/useElementWidth';
import { niceAxis } from './axisScale';
import type { JumpResult } from './jumpModel';

export interface JumpCanvasProps {
  live: JumpResult;
  ghost: JumpResult;
  /** Gravity of the live jump (m/s²), for the legend. */
  g: number;
}

const DEFAULT_WIDTH = 640;
const ASPECT = 0.5;
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 380;
const MARGIN = { top: 14, right: 16, bottom: 44, left: 52 } as const;
const NARROW_WIDTH = 480;
const MAX_ANIMATION_S = 4;
const MS_PER_S = 1000;
const MARKER_RADIUS = 6;
const TICK_LENGTH = 5;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

interface Scale {
  width: number;
  height: number;
  x: (value: number) => number;
  y: (value: number) => number;
  xTicks: number[];
  yTicks: number[];
}

function buildScale(width: number, live: JumpResult, ghost: JumpResult): Scale {
  const height = Math.round(Math.min(Math.max(width * ASPECT, MIN_HEIGHT), MAX_HEIGHT));
  const tickCount = width < NARROW_WIDTH ? 3 : 5;
  // Both curves share the axes, so the plot spans the union of their domains.
  const xAxis = niceAxis(Math.max(live.domain.x[1], ghost.domain.x[1]), tickCount);
  const yAxis = niceAxis(Math.max(live.domain.y[1], ghost.domain.y[1]), 4);
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  return {
    width,
    height,
    x: (value) => MARGIN.left + (value / xAxis.max) * plotWidth,
    y: (value) => MARGIN.top + plotHeight - (value / yAxis.max) * plotHeight,
    xTicks: xAxis.ticks,
    yTicks: yAxis.ticks,
  };
}

function toPath(points: TrajectoryPoint[], scale: Scale): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${scale.x(p.x).toFixed(1)},${scale.y(p.y).toFixed(1)}`)
    .join('');
}

function tickLabel(value: number, ticks: number[]): string {
  return trimTrailingZeros(
    formatNumber(value, { precision: tickPrecision(ticks[ticks.length - 1]) }),
  );
}

/**
 * Whether the marker may move. Follows `prefers-reduced-motion` live, since the system setting can
 * change while the page is open. False until mount so the server render never animates.
 */
function useMotionAllowed(): boolean {
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      setIsAllowed(true);
      return;
    }
    const query = window.matchMedia(REDUCED_MOTION);
    const sync = () => setIsAllowed(!query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return isAllowed;
}

/** Replays the marker along the live curve, in real time up to MAX_ANIMATION_S of wall clock. */
function useMarker(points: TrajectoryPoint[], tAir: number, scale: Scale) {
  const markerRef = useRef<SVGCircleElement>(null);
  const isAnimated = useMotionAllowed();

  useEffect(() => {
    const marker = markerRef.current;
    if (!isAnimated || !marker) return;
    const durationMs = Math.min(tAir, MAX_ANIMATION_S) * MS_PER_S;
    const lastIndex = points.length - 1;
    let frame = 0;
    let start: number | undefined;
    const step = (now: number) => {
      start ??= now;
      const progress = Math.min((now - start) / durationMs, 1);
      const point = points[Math.round(progress * lastIndex)];
      marker.setAttribute('cx', scale.x(point.x).toFixed(1));
      marker.setAttribute('cy', scale.y(point.y).toFixed(1));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [isAnimated, points, tAir, scale]);

  return { markerRef, isAnimated };
}

function Legend({ g }: { g: number }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-sm">
      <li className="m-0 flex items-center gap-2">
        <svg width="24" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="24" y2="4" strokeWidth="2.5" className="stroke-chart-1" />
        </svg>
        {`Salto simulado, g = ${formatNumber(g, { precision: 2, unit: 'm/s²' })}`}
      </li>
      <li className="m-0 flex items-center gap-2">
        <svg width="24" height="8" aria-hidden="true">
          <line
            x1="0"
            y1="4"
            x2="24"
            y2="4"
            strokeWidth="2"
            strokeDasharray="6 4"
            className="stroke-fg-muted"
          />
        </svg>
        {`Referencia terrestre, g = ${formatNumber(G_EARTH, { precision: 2, unit: 'm/s²' })}`}
      </li>
    </ul>
  );
}

export default function JumpCanvas({ live, ghost, g }: JumpCanvasProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>(DEFAULT_WIDTH);
  const scale = useMemo(() => buildScale(width, live, ghost), [width, live, ghost]);
  const livePath = useMemo(() => toPath(live.points, scale), [live, scale]);
  const ghostPath = useMemo(() => toPath(ghost.points, scale), [ghost, scale]);
  const { markerRef, isAnimated } = useMarker(live.points, live.tAir, scale);

  const plotBottom = scale.y(0);
  const plotLeft = scale.x(0);
  const plotRight = scale.width - MARGIN.right;
  const landing = live.points[live.points.length - 1];
  const description = `Trayectoria y(x): altura máxima ${formatNumber(live.hMax, { unit: 'm' })}, alcance ${formatNumber(live.range, { unit: 'm' })}; referencia terrestre: altura máxima ${formatNumber(ghost.hMax, { unit: 'm' })}, alcance ${formatNumber(ghost.range, { unit: 'm' })}.`;

  return (
    <div className="flex flex-col gap-2">
      <Legend g={g} />
      <div ref={containerRef} className="w-full">
        <svg
          data-testid="jump-canvas"
          width={scale.width}
          height={scale.height}
          viewBox={`0 0 ${scale.width} ${scale.height}`}
          role="img"
          aria-label={description}
          className="block max-w-full font-mono text-xs"
        >
          <g aria-hidden="true">
            {scale.yTicks.map((tick) => (
              <g key={`y${tick}`}>
                <line
                  x1={plotLeft}
                  x2={plotRight}
                  y1={scale.y(tick)}
                  y2={scale.y(tick)}
                  className="stroke-grid"
                />
                <line
                  x1={plotLeft - TICK_LENGTH}
                  x2={plotLeft}
                  y1={scale.y(tick)}
                  y2={scale.y(tick)}
                  className="stroke-border"
                />
                <text
                  x={plotLeft - TICK_LENGTH - 3}
                  y={scale.y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-fg-muted"
                >
                  {tickLabel(tick, scale.yTicks)}
                </text>
              </g>
            ))}
            {scale.xTicks.map((tick) => (
              <g key={`x${tick}`}>
                <line
                  x1={scale.x(tick)}
                  x2={scale.x(tick)}
                  y1={MARGIN.top}
                  y2={plotBottom}
                  className="stroke-grid"
                />
                <line
                  x1={scale.x(tick)}
                  x2={scale.x(tick)}
                  y1={plotBottom}
                  y2={plotBottom + TICK_LENGTH}
                  className="stroke-border"
                />
                <text
                  x={scale.x(tick)}
                  y={plotBottom + TICK_LENGTH + 13}
                  textAnchor="middle"
                  className="fill-fg-muted"
                >
                  {tickLabel(tick, scale.xTicks)}
                </text>
              </g>
            ))}
            <line
              x1={plotLeft}
              x2={plotRight}
              y1={plotBottom}
              y2={plotBottom}
              className="stroke-fg-muted"
            />
            <line
              x1={plotLeft}
              x2={plotLeft}
              y1={MARGIN.top}
              y2={plotBottom}
              className="stroke-fg-muted"
            />
            <text
              x={(plotLeft + plotRight) / 2}
              y={scale.height - 6}
              textAnchor="middle"
              className="fill-fg font-sans text-sm"
            >
              x (m)
            </text>
            <text
              transform={`translate(14 ${(MARGIN.top + plotBottom) / 2}) rotate(-90)`}
              textAnchor="middle"
              className="fill-fg font-sans text-sm"
            >
              y (m)
            </text>
          </g>
          <path
            d={ghostPath}
            fill="none"
            strokeWidth="2"
            strokeDasharray="6 4"
            className="stroke-fg-muted"
          />
          <path
            d={livePath}
            fill="none"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="stroke-chart-1"
          />
          {isAnimated ? (
            <circle
              ref={markerRef}
              cx={scale.x(landing.x)}
              cy={scale.y(landing.y)}
              r={MARKER_RADIUS}
              strokeWidth="2"
              className="fill-accent stroke-bg-elevated"
            />
          ) : null}
        </svg>
      </div>
    </div>
  );
}
