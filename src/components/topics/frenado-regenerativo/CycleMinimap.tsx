import { useMemo, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import type { CycleSample } from '../../../lib/physics/energy';
import { TEXT_COLOR, TICK_COLOR } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { FrameStore } from '../../lab/frameStore';
import { useFrameDerived } from '../../lab/useFrameTime';
import type { Stretch } from './regenStretch';

/**
 * The strip (px): a 16 px row of HTML labels over a 32 px drawing, 48 px in all. In the drawing,
 * from its top: the top speed's line, the rest baseline, and its foot where the stop marks end;
 * the band is at least `bandMin` wide.
 */
export const MINIMAP = {
  height: 48,
  labelRow: 16,
  drawing: 32,
  curveTop: 4,
  baseline: 24,
  bandMin: 4,
} as const;

/** Every time is drawn this far in from the strip's edges, so a 2 px mark at an end stays whole. */
const EDGE = 1;
/** viewBox width before the container is measured (SSR, jsdom): the article column. */
const FALLBACK_WIDTH = 720;
const CURVE_WIDTH = 1;
const MARK_WIDTH = 2;
const BAND_OPACITY = 0.16;
const ACCENT = 'var(--accent)';
/** Decimals of the drawn coordinates: a short, stable path. */
const PX_DECIMALS = 2;
/**
 * Strokes keep their width whatever the scaling: with preserveAspectRatio="none" the server's
 * 720-wide drawing stretches to the box until the width is measured, lines unchanged.
 */
const STROKE = { vectorEffect: 'non-scaling-stroke' } as const;

const px = (value: number) => Number(value.toFixed(PX_DECIMALS));
/**
 * The playhead moves by tenths of a pixel. At real time it crosses the 1 369 s of the UDDS in the
 * strip's width: about 0,24 px/s at 360 px (a 330 px strip) and 0,31 px/s at 1 280 px (421 px,
 * the stage in two columns). Finer steps would rewrite two attributes almost every frame for a
 * move nobody sees.
 */
const PLAYHEAD_DECIMALS = 1;

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
const stopsText = (count: number) => `${count} ${count === 1 ? 'detención' : 'detenciones'}`;
const stretchText = ({ start, end }: Stretch) =>
  `${formatNumber(start, { precision: 0 })}–${seconds(end)}`;

function describeMap({ samples, stops, stretch, cycleName }: CycleMinimapProps): string {
  const cycle = `Velocidad en el ciclo ${cycleName}: ${seconds(samples[samples.length - 1].t)} y ${stopsText(stops.length)}`;
  if (!stretch) return `${cycle}.`;
  return `${cycle}; el tramo va de ${formatNumber(stretch.start, { precision: 0 })} a ${seconds(stretch.end)}.`;
}

/** The moving layer: a line at the live time of the view, in the cycle. */
function Playhead({ live, x }: { live: MinimapLive; x: (t: number) => number }): JSX.Element {
  const cx = useFrameDerived(live.frame, (t) =>
    Number(x(live.toCycle(t)).toFixed(PLAYHEAD_DECIMALS)),
  );
  return (
    <line
      data-playhead=""
      x1={cx}
      x2={cx}
      y1={MINIMAP.curveTop}
      y2={MINIMAP.drawing}
      stroke={ACCENT}
      strokeWidth={MARK_WIDTH}
      style={STROKE}
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
      y={0}
      width={px(width)}
      height={MINIMAP.drawing}
      fill={ACCENT}
      fillOpacity={BAND_OPACITY}
      stroke={ACCENT}
      strokeWidth={1}
      style={STROKE}
    />
  );
}

/** The drawing: band, baseline, v(t), the stop marks and the playhead, at `width` px. */
function MinimapDrawing({
  samples,
  stops,
  stretch,
  live,
  width,
}: CycleMinimapProps & { width: number }) {
  const x = minimapX(samples[samples.length - 1].t, width);
  const path = useMemo(() => speedPath(samples, width), [samples, width]);
  return (
    <>
      {stretch ? <StretchBand stretch={stretch} x={x} /> : null}
      <line
        x1={x(0)}
        x2={width - EDGE}
        y1={MINIMAP.baseline}
        y2={MINIMAP.baseline}
        stroke={TICK_COLOR}
        strokeWidth={1}
        style={STROKE}
      />
      <path d={path} fill="none" stroke={TEXT_COLOR} strokeWidth={CURVE_WIDTH} style={STROKE} />
      {stops.map((t) => (
        <line
          key={t}
          data-stop=""
          x1={x(t)}
          x2={x(t)}
          y1={MINIMAP.baseline}
          y2={MINIMAP.drawing}
          stroke={TICK_COLOR}
          strokeWidth={MARK_WIDTH}
          style={STROKE}
        />
      ))}
      <Playhead live={live} x={x} />
    </>
  );
}

/**
 * A small map of the whole cycle above the scene: v(t), a mark under the curve at each stop, the
 * stretch the view «Tramo» plays as a band, and a playhead at the live time. Not interactive: the
 * transport's event buttons move between the stops. Its labels are HTML (they read at their size
 * before hydration); the drawing fills its box until it measures its width, at a fixed height, so
 * the server's box is the final one.
 */
export default function CycleMinimap(props: CycleMinimapProps): JSX.Element {
  const { stretch, cycleName } = props;
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  return (
    <div ref={ref} data-testid="regen-minimap" className="flex w-full flex-col">
      <p
        aria-hidden="true"
        // In px, like the drawing: the strip is 48 px at any root size.
        style={{ height: MINIMAP.labelRow }}
        className="m-0 flex items-center justify-between gap-2 font-mono text-xs leading-none text-fg-muted"
      >
        <span>{`Velocidad del ${cycleName}`}</span>
        {stretch ? <span>{`Tramo ${stretchText(stretch)}`}</span> : null}
      </p>
      <svg
        viewBox={`0 0 ${width} ${MINIMAP.drawing}`}
        width="100%"
        height={MINIMAP.drawing}
        preserveAspectRatio="none"
        role="img"
        aria-label={describeMap(props)}
        className="block"
      >
        <MinimapDrawing {...props} width={width} />
      </svg>
    </div>
  );
}
