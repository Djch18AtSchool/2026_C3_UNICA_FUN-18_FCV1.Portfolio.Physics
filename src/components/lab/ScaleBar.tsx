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
import { isRightCorner, placementClasses, type CanvasPlacement } from './canvasCorner';
import InlineMath from './InlineMath';
import MathText from './MathText';
import {
  requireScaleUnits,
  SCALE_BAR_MAX_PX,
  SCALE_BAR_MIN_PX,
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
  /** The longest the bar may be, px (default 160): a narrow canvas asks for less. */
  maxPx?: number;
}

/** The HTML bar's box around the bar: 8 px of padding and a 1 px border on each side. */
export const SCALE_BAR_BOX_CHROME_PX = 18;
/** A row that holds a bar and the zoom buttons: 8 px of padding a side and at least 4 px between. */
const ROW_PADDING_PX = 16;
const ROW_GAP_PX = 4;

/**
 * The longest bar that, with its box, fits a row `rowWidth` px wide beside `besidePx` of zoom
 * buttons (I3 of the Phase D visual pass: one row where the width allows, not two): within the
 * shared 64–160 px; a row too narrow for the shortest bar stacks (the strip's own breakpoint).
 */
export function inlineScaleBarMaxPx(rowWidth: number, besidePx: number): number {
  const room = rowWidth - besidePx - SCALE_BAR_BOX_CHROME_PX - ROW_PADDING_PX - ROW_GAP_PX;
  if (!Number.isFinite(room)) return SCALE_BAR_MAX_PX;
  return Math.min(SCALE_BAR_MAX_PX, Math.max(SCALE_BAR_MIN_PX, room));
}

const BOX =
  'pointer-events-none flex flex-col gap-1 rounded-sm border border-border bg-bg/90 px-2 py-1';
/** The bar: a 2 px line with 8 px ticks at both ends. */
const LINE = 'block h-2 border-x-2 border-b-2 border-fg';
/**
 * SVG bar: 8-unit ticks, a 2-unit stroke, the text 4 units above the ticks in 12 (sans). Exported
 * for a scene that keeps its labels off the bar (Tema 9's planet frame).
 */
export const SCALE_BAR_TICK = 8;
const STROKE = 2;
export const SCALE_BAR_LABEL_GAP = 4;
export const SCALE_BAR_LABEL_SIZE = 12;
const HALO = { color: SURFACE_COLOR, width: 4 } as const;

/** The bar's length for these props, after checking the ladder (a bad one is a programming error). */
function barFor({ pxPerUnit, units, maxPx }: ScaleBarProps): ScaleBarLength | undefined {
  requireScaleUnits(units);
  return scaleBarLength(pxPerUnit, units, maxPx);
}

/** The scale bar's words for screen readers, in HTML: «Barra de escala: 1 000 km». */
export function ScaleBarWords({
  note,
  ...props
}: ScaleBarProps & { note?: string }): JSX.Element | null {
  const bar = barFor(props);
  if (!bar) return null;
  return (
    <span data-scale-bar-words="" className="sr-only">
      {note ? `${scaleBarSpoken(bar.text)} ${note}` : scaleBarSpoken(bar.text)}
    </span>
  );
}

/**
 * The HTML bar, in a corner of the canvas' positioned box (bottom-left by default), or `inline` in
 * a layout of its own (ZoomOverlay).
 */
export default function ScaleBar({
  corner = 'bottom-left',
  note,
  ...props
}: ScaleBarProps & {
  corner?: CanvasPlacement;
  /** Whose length it is, after the length in a muted tone («20 cm de la nave»). */
  note?: string;
}): JSX.Element | null {
  const bar = barFor(props);
  if (!bar) return null;
  const align = isRightCorner(corner) ? 'items-end' : 'items-start';
  return (
    <>
      <div
        data-scale-bar=""
        aria-hidden="true"
        className={`${BOX} ${align} ${placementClasses(corner)}`}
      >
        <span className="text-xs whitespace-nowrap text-fg tabular-nums">
          <InlineMath text={bar.text} />
          {note ? (
            <span data-scale-bar-note="" className="text-fg-muted">
              {` ${note}`}
            </span>
          ) : null}
        </span>
        <span data-scale-bar-line="" className={LINE} style={{ width: bar.px }} />
      </div>
      <ScaleBarWords {...props} note={note} />
    </>
  );
}

export type ScaleBarSvgProps = ScaleBarProps & {
  /** Where the bar's baseline starts (`start`) or ends (`end`), in the scene's user units. */
  x: number;
  y: number;
  anchor?: 'start' | 'end';
  /**
   * A plate of the surface under the bar and its words, for a bar over a drawing that moves under
   * it (Tema 1's map, zoomed: the route and a stop's letter crossed it).
   */
  backdrop?: boolean;
};

/** The plate's margin around the bar and its words, its corner radius and its opacity. */
const PLATE_PAD = 4;
const PLATE_RADIUS = 4;
const PLATE_OPACITY = 0.9;

/** The SVG bar, a <g> inside a scene: drawing only (the scene adds ScaleBarWords in HTML). */
export function ScaleBarSvg({
  x,
  y,
  anchor = 'start',
  backdrop = false,
  ...props
}: ScaleBarSvgProps) {
  const bar = barFor(props);
  if (!bar) return null;
  const left = anchor === 'start' ? x : x - bar.px;
  const right = left + bar.px;
  const top = y - SCALE_BAR_TICK - SCALE_BAR_LABEL_GAP - SCALE_BAR_LABEL_SIZE - PLATE_PAD;
  return (
    <g data-scale-bar="" aria-hidden="true" pointerEvents="none">
      {backdrop ? (
        <rect
          data-scale-bar-plate=""
          x={left - PLATE_PAD}
          y={top}
          width={bar.px + 2 * PLATE_PAD}
          height={y + PLATE_PAD - top}
          rx={PLATE_RADIUS}
          fill={SURFACE_COLOR}
          fillOpacity={PLATE_OPACITY}
        />
      ) : null}
      <path
        d={`M${left} ${y - SCALE_BAR_TICK}V${y}H${right}V${y - SCALE_BAR_TICK}`}
        fill="none"
        stroke={TEXT_COLOR}
        strokeWidth={STROKE}
      />
      <MathText
        source={inlineMathToNotation(bar.text)}
        x={anchor === 'start' ? left : right}
        y={y - SCALE_BAR_TICK - SCALE_BAR_LABEL_GAP}
        anchor={anchor}
        family="sans"
        fontSize={SCALE_BAR_LABEL_SIZE}
        fill={TICK_COLOR}
        halo={HALO}
      />
    </g>
  );
}
