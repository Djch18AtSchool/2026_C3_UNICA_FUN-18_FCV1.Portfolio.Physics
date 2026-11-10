/**
 * The height SvgPlot gives the route map, written in CSS as well as in code. SvgPlot sizes its
 * drawing from the width it measures and starts from 720 px until it has: on a phone the map then
 * grew by 27 px a moment after it mounted (a layout shift under the reader's eyes). The map's
 * window is fixed (MAP_DOMAIN) and drawn with equal units on both axes, so its height is a straight
 * line of its width, and CSS can say it from the first paint: RouteMapLab sets the svg's height
 * from the width of the container around it. The numbers are SvgPlot's (its MARGIN and
 * COMPACT_MARGIN, the left one fitted to a «1 250» tick) and ChartFrame's (a 1 px border and 1 rem of
 * padding on each side, and a caption line with its 0,75 rem margin); mapReserve.test.tsx checks
 * the numbers against the real SvgPlot. The frame is in rem, like everything else that scales
 * with the root font size.
 */
import type { CSSProperties } from 'react';
import { MAP_DOMAIN } from './droneScene';

interface Margins {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** From this svg width up, SvgPlot draws its desktop margins; narrower, the compact ones. */
const COMPACT_BELOW_PX = 480;
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
  const margins = svgWidth >= COMPACT_BELOW_PX ? WIDE : COMPACT;
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

/** Custom properties of the reserve: one height per layout; the class below picks one. */
export const MAP_PLOT_VARS = {
  '--map-plot-h-compact': heightInCss(COMPACT),
  '--map-plot-h-wide': heightInCss(WIDE),
  /** The whole figure, for the loading skeleton's placeholder of the map. */
  '--map-figure-h-compact': `calc(${heightInCss(COMPACT)} + ${MAP_FIGURE_CHROME})`,
  '--map-figure-h-wide': `calc(${heightInCss(WIDE)} + ${MAP_FIGURE_CHROME})`,
} as const;

/** The container's width from which the svg is wide: its 480 px plus the figure's frame. */
export const MAP_WIDE_FROM_CONTAINER = `calc(${COMPACT_BELOW_PX + FRAME_BORDER_PX}px + ${FRAME_PADDING})`;

/** Tailwind needs the threshold literal: the test ties this class to MAP_WIDE_FROM_CONTAINER. */
export const MAP_PLOT_CLASS =
  '@container [&_svg[role=img]]:h-(--map-plot-h-compact) @min-[calc(482px+2rem)]:[&_svg[role=img]]:h-(--map-plot-h-wide)';

/**
 * The skeleton's placeholder of the whole figure: the same two layouts, the same threshold. Its
 * parent is the container (an element's own container units refer to the ones around it).
 */
export const MAP_FIGURE_CLASS =
  'h-(--map-figure-h-compact) @min-[calc(482px+2rem)]:h-(--map-figure-h-wide)';

/** MAP_PLOT_VARS as a style prop: React types custom properties as plain strings. */
export const MAP_PLOT_STYLE = MAP_PLOT_VARS as CSSProperties;
