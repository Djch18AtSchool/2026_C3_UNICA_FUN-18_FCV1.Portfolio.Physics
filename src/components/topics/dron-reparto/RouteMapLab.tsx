import type { JSX, ReactNode } from 'react';
import { formatNumber } from '../../../lib/format';
import type { RouteSample, RouteStop } from '../../../lib/data/droneRoute';
import { LINE_WIDTH } from '../../charts/chartTheme';
import SvgPlot from '../../lab/SvgPlot';
import type { Point } from '../../lab/OverlayMarks';
import type { DragPoint } from '../../lab/useDrag';
import { MAP_DOMAIN } from './droneScene';
import RouteOverlay, {
  ACCEL_COLOR,
  ROUTE_COLOR,
  VELOCITY_COLOR,
  type StopIndex,
} from './RouteOverlay';
import { motionPhase, type MotionPhase } from './routeSeries';

export interface RouteMapLabProps {
  stops: readonly RouteStop[];
  samples: RouteSample[];
  now: RouteSample;
  duration: number;
  showVectors: boolean;
  showTrail: boolean;
  velocityScale: number;
  accelScale: number;
  decimals: number;
  isModified: boolean;
  error: string | null;
  onStopDrag(index: StopIndex, at: Point, phase: DragPoint['phase']): void;
  onSeek(t: number): void;
}

const PHASE_LABELS: Record<MotionPhase, string> = {
  acelerando: 'acelerando (a en el sentido de v)',
  crucero: 'crucero (a = 0)',
  frenando: 'frenando (a opuesta a v)',
  detenido: 'detenido en un vértice',
};
const KEY_WIDTH = 26;
const KEY_HEIGHT = 12;

function LegendKey({ color, isArrow }: { color: string; isArrow: boolean }): JSX.Element {
  const mid = KEY_HEIGHT / 2;
  return (
    <svg width={KEY_WIDTH} height={KEY_HEIGHT} aria-hidden="true" className="shrink-0">
      <line
        x1="1"
        y1={mid}
        x2={isArrow ? KEY_WIDTH - 8 : KEY_WIDTH - 1}
        y2={mid}
        stroke={color}
        strokeWidth={LINE_WIDTH}
      />
      {isArrow ? (
        <polygon
          points={`${KEY_WIDTH - 1},${mid} ${KEY_WIDTH - 9},2 ${KEY_WIDTH - 9},10`}
          fill={color}
        />
      ) : null}
    </svg>
  );
}

function LegendItem({
  children,
  ...key
}: {
  color: string;
  isArrow: boolean;
  children: ReactNode;
}) {
  return (
    <li className="m-0 flex items-center gap-2">
      <LegendKey {...key} />
      {children}
    </li>
  );
}

/** "1 m/s = 15 m": the map length of one unit, as the legend states the vector scale. */
const scaleText = (unit: string, metres: number) =>
  `1 ${unit} = ${formatNumber(metres, { precision: 0, unit: 'm' })}`;

function describeMap(now: RouteSample, decimals: number): string {
  const n = (value: number, unit: string, precision = decimals) =>
    formatNumber(value, { precision, unit });
  return `Mapa de la ruta en el plano x–y. En t = ${n(now.t, 's', 1)} el dron está en (${n(now.x, '', 0)}; ${n(now.y, '', 0)}) m con |v| = ${n(now.speed, 'm/s')} y |a| = ${n(now.accel, 'm/s²')}.`;
}

/**
 * The route map on SvgPlot with equal aspect: the route through the stops, the trail, the drone
 * at t with its v and a vectors, draggable stops A, B and C, a legend with the vector scales, the
 * motion phase and the notes for an edited or rejected route.
 */
export default function RouteMapLab(props: RouteMapLabProps): JSX.Element {
  const { stops, now, decimals, showVectors, velocityScale, accelScale } = props;
  return (
    <div className="flex flex-col gap-3">
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
        xDomain={MAP_DOMAIN.x}
        yDomain={MAP_DOMAIN.y}
        equalAspect
        ariaLabel={describeMap(now, decimals)}
        testId="route-map"
        overlay={(scales) => <RouteOverlay {...props} scales={scales} />}
      />
      <ul
        aria-label="Leyenda del mapa"
        className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-sm"
      >
        <LegendItem color={ROUTE_COLOR} isArrow={false}>
          Ruta
        </LegendItem>
        {showVectors ? (
          <>
            <LegendItem color={VELOCITY_COLOR} isArrow>
              {`Velocidad v: ${scaleText('m/s', velocityScale)}`}
            </LegendItem>
            <LegendItem color={ACCEL_COLOR} isArrow>
              {`Aceleración a: ${scaleText('m/s²', accelScale)}`}
            </LegendItem>
          </>
        ) : null}
      </ul>
      <p className="m-0 text-sm">
        <span className="text-fg-muted">Fase: </span>
        {PHASE_LABELS[motionPhase(now)]}
      </p>
      {props.isModified ? (
        <p data-testid="route-modified" className="m-0 text-sm">
          Ruta modificada: «Restablecer» vuelve a la ruta declarada.
        </p>
      ) : null}
      <p data-testid="route-error" role="alert" className="m-0 text-sm font-medium empty:hidden">
        {props.error ?? ''}
      </p>
    </div>
  );
}
