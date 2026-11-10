/**
 * The height of the route map's whole figure, for the loading skeleton's placeholder: Tema 1's lab
 * mounts after its dataset loads, so its skeleton must already be as tall as the map will be. Once
 * mounted, SvgPlot reserves the svg's own height (svgPlotReserve.ts); here the skeleton, which has
 * no SvgPlot, says the same height from the width of its container. The map's window is fixed
 * (MAP_DOMAIN) and drawn with equal units on both axes, so the svg's height is a straight line of
 * its width. The numbers are SvgPlot's (its MARGIN and COMPACT_MARGIN, the left one fitted to a
 * «1 250» tick) and ChartFrame's (a 1 px border and 1 rem of padding on each side, and a caption
 * line with its 0,75 rem margin); mapReserve.test.tsx checks them against the real SvgPlot. The
 * frame is in rem, like everything else that scales with the root font size.
 */
import type { CSSProperties } from 'react';
import { COMPACT_WIDTH, WIDE_FROM_PX } from '../../lab/svgPlotReserve';
import { MAP_DOMAIN } from './droneScene';

interface Margins {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const WIDE: Margins = { left: 84, right: 28, top: 22, bottom: 58 };
const COMPACT: Margins = { left: 52, right: 14, top: 30, bottom: 50 };
/** The figure's frame (ChartFrame): border and padding on both sides of the svg, as CSS lengths. */
const FRAME_BORDER_PX = 2;
const FRAME_PADDING = '2rem';

/** Plot height over plot width: the map window's y span over its x span. */
const HEIGHT_PER_WIDTH =
  (MAP_DOMAIN.y.max - MAP_DOMAIN.y.min) / (MAP_DOMAIN.x.max - MAP_DOMAIN.x.min);

/** The svg's height (px) for its width (px), as SvgPlot lays the map out. */
export function mapPlotHeight(svgWidth: number): number {
  const margins = svgWidth >= COMPACT_WIDTH ? WIDE : COMPACT;
  const plotWidth = svgWidth - margins.left - margins.right;
  return margins.top + margins.bottom + HEIGHT_PER_WIDTH * plotWidth;
}

/** The same, as CSS from the container's width (cqw): the container is the svg plus its frame. */
function heightInCss({ left, right, top, bottom }: Margins): string {
  const plotWidth = `100cqw - ${FRAME_PADDING} - ${FRAME_BORDER_PX + left + right}px`;
  return `calc(${top + bottom}px + ${HEIGHT_PER_WIDTH} * (${plotWidth}))`;
}

/** What the figure adds around the svg: its frame, the caption line and the caption's margin. */
export const MAP_FIGURE_CHROME = 'calc(4rem + 2px)';

/** Custom properties of the placeholder: the whole figure's height per layout. */
export const MAP_FIGURE_VARS = {
  '--map-figure-h-compact': `calc(${heightInCss(COMPACT)} + ${MAP_FIGURE_CHROME})`,
  '--map-figure-h-wide': `calc(${heightInCss(WIDE)} + ${MAP_FIGURE_CHROME})`,
} as const;

/**
 * The skeleton's placeholder of the whole figure, wide from where SvgPlot turns wide (WIDE_FROM_PX)
 * plus the figure's frame (2 px of border and 2 rem of padding; Tailwind needs the literal, the
 * test checks it against WIDE_FROM_PX and the frame). Its parent is the container (an element's own
 * container units refer to the ones around it).
 */
export const MAP_FIGURE_CLASS =
  'h-(--map-figure-h-compact) @min-[calc(481.5px+2rem)]:h-(--map-figure-h-wide)';

/** The container's width from which the svg is wide, as the class above writes it. */
export const MAP_WIDE_FROM_CONTAINER = `calc(${WIDE_FROM_PX + FRAME_BORDER_PX}px+${FRAME_PADDING})`;

/** MAP_FIGURE_VARS as a style prop: React types custom properties as plain strings. */
export const MAP_FIGURE_STYLE = MAP_FIGURE_VARS as CSSProperties;
