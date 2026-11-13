/**
 * The zoom's place in the route map: the plot area itself. Inside SvgPlot's overlay, a foreignObject
 * the size of the plot area holds the zoom's viewport (an HTML div, as useZoomPan wants) with the
 * map's marks in a nested svg whose viewBox keeps the plot's own coordinates, so the stops' drag
 * and the plot's scales read the same pixels as before. The background drag, the wheel, the keys
 * and the reveal of a focused stop are the hook's; the scale bar and the buttons are laid over the
 * plot's right side, clear of the depot and the route's start in the default view (the bar in the
 * top-right corner, the buttons in the bottom-right one; in a plot too short for both, the bar
 * goes over the plot, in its top margin: routeScaleBarSpot). The foreign object is the plot area,
 * not the figure: the zoom's pointer and clamp maths are relative to it.
 */
import type { JSX, ReactNode } from 'react';
import type { Scale } from '../../lab/plotScales';
import { ScaleBarSvg, ScaleBarWords } from '../../lab/ScaleBar';
import ZoomControls from '../../lab/ZoomControls';
import type { RouteZoom } from './useRouteZoom';
import { plotPxPerMetre, routeScaleBarSpot, ROUTE_SCALE_UNITS } from './routeZoom';

export interface RouteZoomLayerProps {
  scales: { x: Scale; y: Scale };
  routeZoom: RouteZoom;
  children: ReactNode;
}

/**
 * The marks' svg, above the buttons and inert: a stop dropped under the buttons stays grabbable,
 * and what is not a mark (the background, the buttons not under one) goes to what is below.
 */
const MARKS = 'pointer-events-none relative z-10 block';

/** The viewport fills the plot area; its focus ring is drawn inside, where the clip keeps it. */
const VIEWPORT = 'relative size-full -outline-offset-2';
/** The plot area in the svg's user units: its left and top edges and its size. */
function plotArea({ x, y }: RouteZoomLayerProps['scales']) {
  const [left, right] = [Math.min(...x.range), Math.max(...x.range)];
  const [top, bottom] = [Math.min(...y.range), Math.max(...y.range)];
  return { left, top, width: right - left, height: bottom - top };
}

export default function RouteZoomLayer({
  scales,
  routeZoom,
  children,
}: RouteZoomLayerProps): JSX.Element {
  const { left, top, width, height } = plotArea(scales);
  const { zoom, viewportProps } = routeZoom;
  const spot = routeScaleBarSpot({ left, top, width, height });
  const bar = { pxPerUnit: plotPxPerMetre(scales.x), units: ROUTE_SCALE_UNITS, maxPx: spot.maxPx };
  const drawnBar = <ScaleBarSvg {...bar} x={spot.x} y={spot.y} anchor="end" />;
  return (
    <>
      <foreignObject x={left} y={top} width={width} height={height}>
        <div {...viewportProps} className={VIEWPORT}>
          <svg
            viewBox={`${left} ${top} ${width} ${height}`}
            width={width}
            height={height}
            className={MARKS}
            role="presentation"
          >
            {children}
            {spot.isAbovePlot ? null : drawnBar}
          </svg>
          <ScaleBarWords {...bar} />
          <ZoomControls zoom={zoom} corner="bottom-right" />
        </div>
      </foreignObject>
      {spot.isAbovePlot ? drawnBar : null}
    </>
  );
}
