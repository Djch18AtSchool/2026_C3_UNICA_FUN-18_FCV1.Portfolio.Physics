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
import { LINE_WIDTH } from '../../charts/chartTheme';
import InlineMath from '../../lab/InlineMath';
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

const KEY_WIDTH = 26;
const KEY_HEIGHT = 12;

interface LegendKeyProps {
  color: string;
  dashed?: boolean;
  /** A dot (the probe) or a line without head (the track) instead of an arrow. */
  shape?: 'arrow' | 'dot' | 'line';
}

function LegendKey({ color, dashed, shape = 'arrow' }: LegendKeyProps) {
  const mid = KEY_HEIGHT / 2;
  return (
    <svg width={KEY_WIDTH} height={KEY_HEIGHT} aria-hidden="true" className="shrink-0">
      {shape === 'dot' ? (
        <circle cx={KEY_WIDTH / 2} cy={mid} r={4.5} fill={color} />
      ) : (
        <>
          <line
            x1="1"
            y1={mid}
            x2={shape === 'line' ? KEY_WIDTH - 1 : KEY_WIDTH - 8}
            y2={mid}
            stroke={color}
            strokeWidth={LINE_WIDTH}
            strokeDasharray={dashed ? '6 3' : undefined}
          />
          {shape === 'arrow' ? (
            <polygon
              points={`${KEY_WIDTH - 1},${mid} ${KEY_WIDTH - 9},2 ${KEY_WIDTH - 9},10`}
              fill={color}
            />
          ) : null}
        </>
      )}
    </svg>
  );
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
      <ul
        aria-label="Leyenda del sobrevuelo"
        className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-sm"
      >
        <li className="m-0 flex items-center gap-2">
          <LegendKey color={`var(${planet.token})`} />
          <span>
            <InlineMath text={`$\\vec V_p$: ${planet.name} respecto al Sol`} />
          </span>
        </li>
        <li className="m-0 flex items-center gap-2">
          <LegendKey color={VINF_COLOR} dashed />
          <span>
            <InlineMath text="$\vec v_{\infty,\text{in}}$ y $\vec v_{\infty,\text{out}}$: la sonda respecto al planeta, lejos de él" />
          </span>
        </li>
        <li className="m-0 flex items-center gap-2">
          <LegendKey color={PROBE_COLOR} shape="dot" />
          <span>
            <InlineMath text="Sonda, su recorrido y $\vec v_\text{rel}$" />
          </span>
        </li>
        <li className="m-0 flex items-center gap-2">
          <LegendKey color={TRACK_COLOR} shape="line" />
          Hipérbola
        </li>
        <li className="m-0 flex items-center gap-2">
          <LegendKey color={V_BEFORE_COLOR} />
          {`v antes = ${kms(result.vIn)}`}
        </li>
        <li className="m-0 flex items-center gap-2">
          <LegendKey color={V_AFTER_COLOR} />
          {`v después = ${kms(result.vOut)}`}
        </li>
      </ul>
      <p data-testid="flyby-lapse" className="m-0 text-sm text-fg-muted">
        {`Cámara rápida: el paso dibujado dura ${transportTimeValue(passSeconds, passSeconds)} y a 1× se ve en ${playbackSeconds} s, unas ${lapseFactorText(passSeconds, playbackSeconds)} veces más rápido.`}
      </p>
      <FlybyComparison encounter={encounter} result={result} decimals={decimals} />
    </div>
  );
}
