import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import type { CycleSample } from '../../../lib/physics/energy';
import { TEXT_COLOR, TICK_COLOR, TICK_FONT_FAMILY, TICK_FONT_SIZE } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { FrameStore } from '../../lab/frameStore';
import { useFrameDerived } from '../../lab/useFrameTime';
import type { Stretch } from './regenStretch';

/**
 * The strip's rows (px, from its top): the labels' baseline, the top speed's line, the rest
 * baseline, and the strip's foot where the stop marks end; the band is at least `bandMin` wide.
 */
export const MINIMAP = {
  height: 48,
  labelBaseline: 12,
  curveTop: 16,
  baseline: 40,
  bandMin: 4,
} as const;

/** Every time is drawn this far in from the strip's edges, so a 2 px mark at an end stays whole. */
const EDGE = 1;
/** viewBox width before the container is measured (SSR, jsdom): the article column. */
const FALLBACK_WIDTH = 720;
const CURVE_WIDTH = 1.5;
const MARK_WIDTH = 2;
const BAND_OPACITY = 0.16;
const ACCENT = 'var(--accent)';
/** Decimals of the drawn coordinates: a short, stable path. */
const PX_DECIMALS = 2;

const px = (value: number) => Number(value.toFixed(PX_DECIMALS));

/** The x (px) of a time of a cycle of `duration` s on a strip `width` px wide, clamped to it. */
export function minimapX(duration: number, width: number): (t: number) => number {
  const span = width - 2 * EDGE;
  return (t) => px(EDGE + (Math.min(Math.max(t, 0), duration) / duration) * span);
}

/** v(t) of the whole cycle as a path: rest on the baseline, the top speed on the top line. */
export function speedPath(samples: readonly CycleSample[], width: number): string {
  const x = minimapX(samples[samples.length - 1].t, width);
  const top = Math.max(...samples.map((sample) => sample.v));
  const y = (v: number) => px(MINIMAP.baseline - (v / top) * (MINIMAP.baseline - MINIMAP.curveTop));
  return samples.map(({ t, v }, i) => `${i === 0 ? 'M' : 'L'}${x(t)} ${y(v)}`).join(' ');
}

/** The clock of the view on show and how its time reads in the cycle (the playhead). */
export interface MinimapLive {
  frame: FrameStore;
  toCycle(t: number): number;
}

export interface CycleMinimapProps {
  samples: readonly CycleSample[];
  /** The instants the car comes to rest (s): a mark under the curve at each. */
  stops: readonly number[];
  /** The stretch the view plays, banded; none for the whole cycle. */
  stretch?: Stretch;
  cycleName: string;
  live: MinimapLive;
}

const seconds = (t: number) => formatNumber(t, { precision: 0, unit: 's' });

function describeMap({ samples, stops, stretch, cycleName }: CycleMinimapProps): string {
  const cycle = `Velocidad en el ciclo ${cycleName}: ${seconds(samples[samples.length - 1].t)} y ${stops.length} detenciones`;
  if (!stretch) return `${cycle}.`;
  return `${cycle}; el tramo va de ${formatNumber(stretch.start, { precision: 0 })} a ${seconds(stretch.end)}.`;
}

/** The moving layer: a line at the live time of the view, in the cycle. */
function Playhead({ live, x }: { live: MinimapLive; x: (t: number) => number }): JSX.Element {
  const cx = useFrameDerived(live.frame, (t) => x(live.toCycle(t)));
  return (
    <line
      data-playhead=""
      x1={cx}
      x2={cx}
      y1={MINIMAP.curveTop}
      y2={MINIMAP.height}
      stroke={ACCENT}
      strokeWidth={MARK_WIDTH}
    />
  );
}

/** The stretch as a band over the curve, never narrower than MINIMAP.bandMin. */
function StretchBand({ stretch, x }: { stretch: Stretch; x: (t: number) => number }) {
  const [from, to] = [x(stretch.start), x(stretch.end)];
  const width = Math.max(to - from, MINIMAP.bandMin);
  return (
    <rect
      data-stretch=""
      x={px((from + to) / 2 - width / 2)}
      y={MINIMAP.curveTop}
      width={px(width)}
      height={MINIMAP.height - MINIMAP.curveTop}
      fill={ACCENT}
      fillOpacity={BAND_OPACITY}
      stroke={ACCENT}
      strokeWidth={1}
    />
  );
}

/**
 * A small map of the whole cycle above the scene: v(t), a mark under the curve at each stop, the
 * stretch the view «Tramo» plays as a band, and a playhead at the live time. Not interactive: the
 * transport's event buttons move between the stops. Drawn at its measured width and a fixed 48 px
 * height, so the server's box is the final one.
 */
export default function CycleMinimap(props: CycleMinimapProps): JSX.Element {
  const { samples, stops, stretch, cycleName, live } = props;
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const x = minimapX(samples[samples.length - 1].t, width);
  const label = {
    fontFamily: TICK_FONT_FAMILY,
    fontSize: TICK_FONT_SIZE,
    fill: TICK_COLOR,
  } as const;
  return (
    <div ref={ref} data-testid="regen-minimap" className="w-full">
      <svg
        viewBox={`0 0 ${width} ${MINIMAP.height}`}
        width="100%"
        height={MINIMAP.height}
        role="img"
        aria-label={describeMap(props)}
        className="block"
      >
        <text x={0} y={MINIMAP.labelBaseline} {...label}>
          {`Velocidad del ${cycleName}`}
        </text>
        {stretch ? (
          <text x={width} y={MINIMAP.labelBaseline} textAnchor="end" {...label}>
            {`Tramo ${formatNumber(stretch.start, { precision: 0 })}–${seconds(stretch.end)}`}
          </text>
        ) : null}
        {stretch ? <StretchBand stretch={stretch} x={x} /> : null}
        <line
          x1={x(0)}
          x2={width - EDGE}
          y1={MINIMAP.baseline}
          y2={MINIMAP.baseline}
          stroke={TICK_COLOR}
          strokeWidth={1}
        />
        <path
          d={speedPath(samples, width)}
          fill="none"
          stroke={TEXT_COLOR}
          strokeWidth={CURVE_WIDTH}
        />
        {stops.map((t) => (
          <line
            key={t}
            data-stop=""
            x1={x(t)}
            x2={x(t)}
            y1={MINIMAP.baseline}
            y2={MINIMAP.height}
            stroke={TICK_COLOR}
            strokeWidth={MARK_WIDTH}
          />
        ))}
        <Playhead live={live} x={x} />
      </svg>
    </div>
  );
}
