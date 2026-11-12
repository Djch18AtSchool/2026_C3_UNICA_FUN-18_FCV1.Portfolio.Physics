import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import type { RouteSample, RouteStop } from '../../../lib/data/droneRoute';
import SvgPlot from '../../lab/SvgPlot';
import type { Point } from '../../lab/OverlayMarks';
import type { DragPoint } from '../../lab/useDrag';
import RouteOverlay, {
  ROUTE_COLOR,
  type LiveFlight,
  type StopIndex,
  type TimeRange,
} from './RouteOverlay';
import RouteZoomLayer from './RouteZoomLayer';
import type { RouteZoom } from './useRouteZoom';

export interface RouteMapLabProps {
  stops: readonly RouteStop[];
  /** The leg «Tramo» plays, between these two stops: drawn over the route. */
  leg?: readonly [RouteStop, RouteStop];
  samples: RouteSample[];
  /** The sample at the settled time (the aria text); the drawing follows `live`. */
  now: RouteSample;
  live: LiveFlight;
  /** The route times the clock covers: the drone, its keys and its drag stay inside. */
  timeRange: TimeRange;
  showVectors: boolean;
  showTrail: boolean;
  velocityScale: number;
  accelScale: number;
  decimals: number;
  /** The map's zoom: the part of the window on show, its scale bar and its viewport. */
  routeZoom: RouteZoom;
  onStopDrag(index: StopIndex, at: Point, phase: DragPoint['phase']): void;
  onSeek(t: number): void;
}

function describeMap(now: RouteSample, decimals: number): string {
  const n = (value: number, unit: string, precision = decimals) =>
    formatNumber(value, { precision, unit });
  return mathTextToString(
    `Mapa de la ruta en el plano x–y. En t = ${n(now.t, 's')} el dron está en (${n(now.x, '', 0)}; ${n(now.y, '', 0)}) m con |v| = ${n(now.speed, 'm/s')} y |a| = ${n(now.accel, 'm/s²')}.`,
  );
}

/**
 * The route map on SvgPlot with equal aspect: the route through the stops, the trail, the drone
 * at t with its v and a vectors and draggable stops A, B and C. It is the lab's canvas; its
 * legend and notes are in RouteMapNotes. SvgPlot reserves its height in CSS until it measures its
 * width, so it does not grow then. The zoom moves the map window (the plot's domains, so the axes
 * and the route stay in real metres) and keeps the window's aspect, so the plot's height stays.
 */
export default function RouteMapLab(props: RouteMapLabProps): JSX.Element {
  const { routeZoom, ...overlayProps } = props;
  const { stops, now, decimals } = overlayProps;
  return (
    <SvgPlot
      title="Mapa de la ruta"
      xLabel="x (este)"
      xUnit="m"
      yLabel="y (norte)"
      yUnit="m"
      series={[
        {
          id: 'route',
          label: 'Ruta',
          points: stops.map(({ x, y }) => ({ x, y })),
          color: ROUTE_COLOR,
        },
      ]}
      xDomain={routeZoom.domains.x}
      yDomain={routeZoom.domains.y}
      equalAspect
      ariaLabel={describeMap(now, decimals)}
      testId="route-map"
      overlay={(scales) => (
        <RouteZoomLayer scales={scales} routeZoom={routeZoom}>
          <RouteOverlay {...overlayProps} scales={scales} onReveal={routeZoom.reveal} />
        </RouteZoomLayer>
      )}
    />
  );
}
