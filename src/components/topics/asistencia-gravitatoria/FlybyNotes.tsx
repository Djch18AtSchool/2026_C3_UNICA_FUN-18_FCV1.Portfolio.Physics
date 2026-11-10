/**
 * What reads the flyby laboratory's canvas without being a control, in the lab's canvas notes
 * (LabShell): the legend, the stated time lapse and, for a preset, the planar model beside the
 * Horizons value. Under both columns at the card's width; right after the transport on a phone.
 */
import type { JSX } from 'react';
import type { Planet } from '../../../lib/data/planets';
import type { Encounter } from '../../../lib/data/voyager';
import { formatNumber } from '../../../lib/format';
import type { PlanarFlybyResult } from '../../../lib/physics';
import InlineMath from '../../lab/InlineMath';
import { LEGEND_LIST, LegendItem } from '../../lab/LegendKey';
import { transportTimeValue } from '../../lab/transportTime';
import FlybyComparison from './FlybyComparison';
import { lapseFactorText } from './flybyFormat';
import { PROBE_COLOR, TRACK_COLOR, VINF_COLOR } from './PlanetFrame';
import { V_AFTER_COLOR, V_BEFORE_COLOR } from './SunFrame';

export interface FlybyNotesProps {
  planet: Planet;
  result: PlanarFlybyResult;
  /** Real duration of the drawn pass (s) and its playback at 1× (s). */
  passSeconds: number;
  playbackSeconds: number;
  /** The active preset's encounter, for the model-versus-data table. */
  encounter?: Encounter;
  decimals: number;
}

export default function FlybyNotes({
  planet,
  result,
  passSeconds,
  playbackSeconds,
  encounter,
  decimals,
}: FlybyNotesProps): JSX.Element {
  const kms = (value: number) => formatNumber(value, { precision: decimals, unit: 'km/s' });
  return (
    <div className="flex flex-col gap-3">
      <ul aria-label="Leyenda del sobrevuelo" className={LEGEND_LIST}>
        <LegendItem color={`var(${planet.token})`}>
          <InlineMath text={`$\\vec V_p$: ${planet.name} respecto al Sol`} />
        </LegendItem>
        <LegendItem color={VINF_COLOR} dashed>
          <InlineMath text="$\vec v_{\infty,\text{in}}$ y $\vec v_{\infty,\text{out}}$: la sonda respecto al planeta, lejos de él" />
        </LegendItem>
        <LegendItem color={PROBE_COLOR} shape="dot">
          <InlineMath text="Sonda, su recorrido y $\vec v_\text{rel}$" />
        </LegendItem>
        <LegendItem color={TRACK_COLOR} shape="line">
          Hipérbola
        </LegendItem>
        <LegendItem color={V_BEFORE_COLOR}>{`v antes = ${kms(result.vIn)}`}</LegendItem>
        <LegendItem color={V_AFTER_COLOR}>{`v después = ${kms(result.vOut)}`}</LegendItem>
      </ul>
      <p data-testid="flyby-lapse" className="m-0 text-sm text-fg-muted">
        {`Cámara rápida: el paso dibujado dura ${transportTimeValue(passSeconds, passSeconds)} y a 1× se ve en ${playbackSeconds} s, unas ${lapseFactorText(passSeconds, playbackSeconds)} veces más rápido.`}
      </p>
      <FlybyComparison encounter={encounter} result={result} decimals={decimals} />
    </div>
  );
}
