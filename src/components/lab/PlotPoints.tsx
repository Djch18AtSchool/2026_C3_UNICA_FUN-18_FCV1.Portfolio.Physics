/** Labelled points over SvgPlot overlays (labs and static figures), in viewBox pixels. */
import type { JSX } from 'react';
import { SURFACE_COLOR, TEXT_COLOR } from '../charts/chartTheme';
import { fitCentre, monoTextWidth, type Scale } from './plotScales';
import { Label } from './OverlayMarks';

const DOT_RADIUS = 5;
const LABEL_GAP = 10;
/** Baseline drop that puts a label's text just below its point. */
const BELOW_DROP = 20;
/** Font size of OverlayMarks' Label. */
const LABEL_SIZE = 13;

export interface PlotPoint {
  id: string;
  x: number;
  y: number;
  /** Text beside the point; none draws only the dot. */
  label?: string;
  /** Shorter text used when `label` does not fit on its preferred side (phones). */
  compactLabel?: string;
  /** The side of the point the label prefers (see labelPlacement for the fallbacks). */
  anchor?: 'start' | 'end';
  /** Label above (−1, the default) or below (+1) the point. */
  side?: -1 | 1;
  /** Dot fill; the text color by default. */
  color?: string;
}

type Anchor = 'start' | 'middle' | 'end';

/**
 * Where a label of `width` px goes beside a point at `x`: on its preferred side when it fits
 * inside `range`, else on the other side, else centred on the point and shifted inside.
 */
export function labelPlacement(
  x: number,
  width: number,
  preferred: 'start' | 'end',
  [left, right]: [number, number],
): { anchor: Anchor; dx: number } {
  const fitsStart = x + LABEL_GAP + width <= right;
  const fitsEnd = x - LABEL_GAP - width >= left;
  if (preferred === 'start' ? fitsStart : !fitsEnd && fitsStart) {
    return { anchor: 'start', dx: LABEL_GAP };
  }
  if (fitsEnd) return { anchor: 'end', dx: -LABEL_GAP };
  return { anchor: 'middle', dx: fitCentre(x, width, left, right) - x };
}

/** A dot with a surface ring (so it separates from the curve) and an optional label. */
export function PlotPoints({
  points,
  scales,
}: {
  points: readonly PlotPoint[];
  scales: { x: Scale; y: Scale };
}): JSX.Element {
  return (
    <g className="pointer-events-none">
      {points.map((point) => {
        const at = { x: scales.x.toPx(point.x), y: scales.y.toPx(point.y) };
        const preferred = point.anchor ?? 'start';
        const place = (text: string) =>
          labelPlacement(at.x, monoTextWidth(text, LABEL_SIZE), preferred, scales.x.range);
        const full = place(point.label ?? '');
        const short = full.anchor === preferred ? undefined : point.compactLabel;
        const text = short ?? point.label;
        const { anchor, dx } = short === undefined ? full : place(short);
        const dy = (point.side ?? -1) < 0 ? -LABEL_GAP : BELOW_DROP;
        return (
          <g key={point.id} data-point={point.id}>
            <circle
              cx={at.x}
              cy={at.y}
              r={DOT_RADIUS}
              fill={point.color ?? TEXT_COLOR}
              stroke={SURFACE_COLOR}
              strokeWidth={2}
            />
            {text ? (
              <Label at={at} dx={dx} dy={dy} anchor={anchor}>
                {text}
              </Label>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
