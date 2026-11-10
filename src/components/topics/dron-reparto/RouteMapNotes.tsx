/**
 * What reads the route map without being a control, in the lab's canvas notes (LabShell): the
 * legend with the vector scales, the motion phase and the notes for an edited or rejected route.
 */
import type { JSX, ReactNode } from 'react';
import type { RouteSample } from '../../../lib/data/droneRoute';
import { formatNumber } from '../../../lib/format';
import { LINE_WIDTH } from '../../charts/chartTheme';
import InlineMath from '../../lab/InlineMath';
import { ACCEL_COLOR, ROUTE_COLOR, VELOCITY_COLOR } from './RouteOverlay';
import { motionPhase, type MotionPhase } from './routeSeries';

export interface RouteMapNotesProps {
  /** The sample at the settled time: its motion phase. */
  now: RouteSample;
  showVectors: boolean;
  /** Map metres per m/s of velocity and per m/s² of acceleration, as the legend states them. */
  velocityScale: number;
  accelScale: number;
  isModified: boolean;
  error: string | null;
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

/** The legend, the phase and the two notes of the route; the error is an alert, empty when none. */
export default function RouteMapNotes({
  now,
  showVectors,
  velocityScale,
  accelScale,
  isModified,
  error,
}: RouteMapNotesProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
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
              <span>
                <InlineMath text={`Velocidad $\\vec v$: ${scaleText('m/s', velocityScale)}`} />
              </span>
            </LegendItem>
            <LegendItem color={ACCEL_COLOR} isArrow>
              <span>
                <InlineMath text={`Aceleración $\\vec a$: ${scaleText('m/s²', accelScale)}`} />
              </span>
            </LegendItem>
          </>
        ) : null}
      </ul>
      <p className="m-0 text-sm">
        <span className="text-fg-muted">Fase: </span>
        {PHASE_LABELS[motionPhase(now)]}
      </p>
      {isModified ? (
        <p data-testid="route-modified" className="m-0 text-sm">
          Ruta modificada: «Restablecer» vuelve a la ruta declarada.
        </p>
      ) : null}
      <p data-testid="route-error" role="alert" className="m-0 text-sm font-medium empty:hidden">
        {error ?? ''}
      </p>
    </div>
  );
}
