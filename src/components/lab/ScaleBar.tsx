/**
 * The map-like scale bar a zoomable canvas declares (auditoría §8 and §12.3): a round length of
 * the drawing's unit, «1 000 km», «10 m», «1 $R_J$», whose bar measures 64 to 160 px and is
 * chosen again as the zoom changes (scaleBarMath.ts). An indicator, not a control. Usage:
 *
 *   <div {...zoom.viewportProps} className="relative">       // the canvas' positioned box
 *     <Scene … />
 *     <ScaleBar pxPerUnit={pxPerKm * zoom.view.scale} units={KM} />   // bottom-left by default
 *   </div>
 *
 *   <svg …>                                                   // inside an SVG scene
 *     <ScaleBarSvg pxPerUnit={…} units={RADII} x={16} y={height - 16} />
 *   </svg>
 *   <ScaleBarWords pxPerUnit={…} units={RADII} />              // its words, in HTML
 *
 * `units` is a ladder from the smallest unit up ({ label: 'm', size: 1 }, { label: 'km', size:
 * 1000 }): the bar uses the largest unit its length reaches. Labels are words with formulas
 * between $…$. Screen readers read the length in a hidden text while browsing; no live region:
 * the length changes only with the zoom, which ZoomControls already announces.
 */
import type { JSX } from 'react';
import { SURFACE_COLOR, TEXT_COLOR, TICK_COLOR } from '../charts/chartTheme';
import { CANVAS_CORNER, isRightCorner, type CanvasCorner } from './canvasCorner';
import InlineMath from './InlineMath';
import MathText from './MathText';
import {
  requireScaleUnits,
  scaleBarLength,
  scaleBarSpoken,
  type ScaleBarLength,
  type ScaleUnit,
} from './scaleBarMath';
import { inlineMathToNotation } from './timeScaleFormat';

export interface ScaleBarProps {
  /** CSS px per base unit at the current view: the lab's own scale times `zoom.view.scale`. */
  pxPerUnit: number;
  /** From the smallest unit up; a single one is the usual case. */
  units: readonly ScaleUnit[];
}

const BOX =
  'pointer-events-none absolute flex flex-col gap-1 rounded-sm border border-border bg-bg/90 px-2 py-1';
/** The bar: a 2 px line with 8 px ticks at both ends. */
const LINE = 'block h-2 border-x-2 border-b-2 border-fg';
/** SVG bar: 8-unit ticks, a 2-unit stroke, the text 4 units above the ticks in 12. */
const TICK = 8;
const STROKE = 2;
const LABEL_GAP = 4;
const LABEL_SIZE = 12;
const HALO = { color: SURFACE_COLOR, width: 4 } as const;

/** The bar's length for these props, after checking the ladder (a bad one is a programming error). */
function barFor({ pxPerUnit, units }: ScaleBarProps): ScaleBarLength | undefined {
  requireScaleUnits(units);
  return scaleBarLength(pxPerUnit, units);
}

/** The scale bar's words for screen readers, in HTML: «Barra de escala: 1 000 km». */
export function ScaleBarWords(props: ScaleBarProps): JSX.Element | null {
  const bar = barFor(props);
  if (!bar) return null;
  return (
    <span data-scale-bar-words="" className="sr-only">
      {scaleBarSpoken(bar.text)}
    </span>
  );
}

/** The HTML bar, in a corner of the canvas' positioned box (bottom-left by default). */
export default function ScaleBar({
  corner = 'bottom-left',
  ...props
}: ScaleBarProps & { corner?: CanvasCorner }): JSX.Element | null {
  const bar = barFor(props);
  if (!bar) return null;
  const align = isRightCorner(corner) ? 'items-end' : 'items-start';
  return (
    <>
      <div
        data-scale-bar=""
        aria-hidden="true"
        className={`${BOX} ${align} ${CANVAS_CORNER[corner]}`}
      >
        <span className="text-xs whitespace-nowrap text-fg tabular-nums">
          <InlineMath text={bar.text} />
        </span>
        <span data-scale-bar-line="" className={LINE} style={{ width: bar.px }} />
      </div>
      <ScaleBarWords {...props} />
    </>
  );
}

export type ScaleBarSvgProps = ScaleBarProps & {
  /** Where the bar's baseline starts (`start`) or ends (`end`), in the scene's user units. */
  x: number;
  y: number;
  anchor?: 'start' | 'end';
};

/** The SVG bar, a <g> inside a scene: drawing only (the scene adds ScaleBarWords in HTML). */
export function ScaleBarSvg({ x, y, anchor = 'start', ...props }: ScaleBarSvgProps) {
  const bar = barFor(props);
  if (!bar) return null;
  const left = anchor === 'start' ? x : x - bar.px;
  const right = left + bar.px;
  return (
    <g data-scale-bar="" aria-hidden="true" pointerEvents="none">
      <path
        d={`M${left} ${y - TICK}V${y}H${right}V${y - TICK}`}
        fill="none"
        stroke={TEXT_COLOR}
        strokeWidth={STROKE}
      />
      <MathText
        source={inlineMathToNotation(bar.text)}
        x={anchor === 'start' ? left : right}
        y={y - TICK - LABEL_GAP}
        anchor={anchor}
        family="sans"
        fontSize={LABEL_SIZE}
        fill={TICK_COLOR}
        halo={HALO}
      />
    </g>
  );
}
