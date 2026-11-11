/** The flyby's closest approach as the clock sees it: its mark on the timeline and what is said at it. */
import { useMemo } from 'react';
import { formatNumber } from '../../../lib/format';
import type { TransportMarker } from '../../lab/transportMarkers';
import { stateAt, type FlybyHyperbola } from './flybyOrbit';
import type { PeriapsisJumpProps } from './PeriapsisJump';

/** The closest approach on the timeline: a peak (t = t_p is the middle of every drawn pass). */
export const PERIAPSIS_LABEL = 'Máxima aproximación';
const MIDDLE = 1 / 2;

export interface PeriapsisInput {
  /** The clock's own duration (s): t_p is half of it, so the mark never lags an edit's duration. */
  clockDuration: number;
  hyperbola: FlybyHyperbola;
  /** r_p in planet radii and the planet's name. */
  rp: number;
  planetName: string;
  /** «20,23 km/s» in the lab's decimals. */
  formatSpeed(kms: number): string;
}

export interface Periapsis {
  markers: readonly TransportMarker[];
  jump: Pick<PeriapsisJumpProps, 'periapsisT' | 'summary'>;
}

export function usePeriapsis({
  clockDuration,
  hyperbola,
  rp,
  planetName,
  formatSpeed,
}: PeriapsisInput): Periapsis {
  const periapsisT = clockDuration * MIDDLE;
  const markers = useMemo<readonly TransportMarker[]>(
    () => [{ t: periapsisT, label: PERIAPSIS_LABEL, kind: 'peak' }],
    [periapsisT],
  );
  const speed = formatSpeed(stateAt(hyperbola, 0).speed);
  const summary = `${PERIAPSIS_LABEL}: la sonda pasa a ${formatNumber(rp, { precision: 2 })} radios de ${planetName}, con ${speed} respecto al planeta.`;
  return { markers, jump: { periapsisT, summary } };
}
