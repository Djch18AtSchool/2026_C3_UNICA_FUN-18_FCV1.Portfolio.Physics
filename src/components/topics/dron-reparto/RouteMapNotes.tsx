/**
 * What reads the route map without being a control, in the lab's canvas notes (LabShell): the
 * legend with the vector scales, the motion phase and the notes for an edited or rejected route.
 */
import type { JSX } from 'react';
import type { RouteSample } from '../../../lib/data/droneRoute';
import { formatNumber } from '../../../lib/format';
import InlineMath from '../../lab/InlineMath';
import { LEGEND_LIST, LegendItem } from '../../lab/LegendKey';
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
  acelerando: 'acelerando ($\\vec a$ en el sentido de $\\vec v$)',
  crucero: 'crucero ($\\vec a = 0$)',
  frenando: 'frenando ($\\vec a$ opuesta a $\\vec v$)',
  detenido: 'detenido en un vértice',
};
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
      <ul aria-label="Leyenda del mapa" className={LEGEND_LIST}>
        <LegendItem color={ROUTE_COLOR} shape="line">
          Ruta
        </LegendItem>
        {showVectors ? (
          <>
            <LegendItem color={VELOCITY_COLOR}>
              <InlineMath text={`Velocidad $\\vec v$: ${scaleText('m/s', velocityScale)}`} />
            </LegendItem>
            <LegendItem color={ACCEL_COLOR}>
              <InlineMath text={`Aceleración $\\vec a$: ${scaleText('m/s²', accelScale)}`} />
            </LegendItem>
          </>
        ) : null}
      </ul>
      <p className="m-0 text-sm">
        <span className="text-fg-muted">Fase: </span>
        <InlineMath text={PHASE_LABELS[motionPhase(now)]} />
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
