import type { JSX } from 'react';
import type { Planet } from '../../../lib/data/planets';
import type { Encounter } from '../../../lib/data/voyager';
import { formatNumber } from '../../../lib/format';
import type { PlanarFlybyResult } from '../../../lib/physics';
import { LINE_WIDTH } from '../../charts/chartTheme';
import InlineMath from '../../lab/InlineMath';
import { transportTimeValue } from '../../lab/transportTime';
import FlybyComparison from './FlybyComparison';
import { lapseFactorText, signed, unitTex } from './flybyFormat';
import type { FlybyDisplay } from './flybyLabSettings';
import type { FlybyHyperbola, FlybyState } from './flybyOrbit';
import type { RpWarning } from './flybyScene';
import PlanetFrame, { PROBE_COLOR, TRACK_COLOR, VINF_COLOR, type LiveProbe } from './PlanetFrame';
import SunFrame, { V_AFTER_COLOR, V_BEFORE_COLOR } from './SunFrame';

export interface FlybySceneProps {
  hyperbola: FlybyHyperbola;
  planet: Planet;
  Vp: number;
  result: PlanarFlybyResult;
  /** r_p in planet radii and its unit («R_J»). */
  rp: number;
  unit: string;
  /** Time from periapsis (s) and the probe's state then, at the settled time (the clock text). */
  tau: number;
  probe: FlybyState;
  /** The live probe the planet frame draws. */
  live: LiveProbe;
  /** Real duration of the drawn pass (s) and its playback at 1× (s). */
  passSeconds: number;
  playbackSeconds: number;
  display: FlybyDisplay;
  decimals: number;
  warning: RpWarning;
  /** The active preset's encounter, for the model-versus-data table. */
  encounter?: Encounter;
  onRpRequest(rp: number): void;
}

const SECONDS_PER_HOUR = 3600;
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

function warningText(warning: RpWarning, unit: string): string {
  if (warning === 'below')
    return `La sonda no puede pasar por debajo de la superficie: $r_p$ no puede bajar de 1 ${unitTex(unit)}.`;
  if (warning === 'above')
    return `El laboratorio llega hasta 100 ${unitTex(unit)}: $r_p$ se queda ahí.`;
  return '';
}

/**
 * The flyby laboratory's canvas: the planet frame (hyperbola, probe, periapsis handle) beside the
 * Sun frame (velocity triangles), stacked on phones; under them the probe's clock, the legend,
 * the stated time lapse, the r_p warning and the model-versus-data table.
 */
export default function FlybyScene(props: FlybySceneProps): JSX.Element {
  const { hyperbola, planet, Vp, result, rp, unit, tau, probe, live, display, decimals } = props;
  const kms = (value: number) => formatNumber(value, { precision: decimals, unit: 'km/s' });
  const token = planet.token;
  const clock = [
    `$t - t_p$ = ${signed(tau / SECONDS_PER_HOUR, 1, 'h')}`,
    `$r$ = ${formatNumber(probe.r / planet.radiusKm, { precision: 2, unit: unitTex(unit) })}`,
    `$|\\vec v_\\text{rel}|$ = ${kms(probe.speed)}`,
  ].join(' · ');

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <p className="m-0 px-3 text-sm font-medium sm:px-0">{`Marco de ${planet.name}`}</p>
          <PlanetFrame
            hyperbola={hyperbola}
            planet={planet}
            rp={rp}
            unit={unit}
            live={live}
            showVectors={display.showVectors}
            onRpRequest={props.onRpRequest}
          />
          <p
            data-testid="flyby-clock"
            className="m-0 px-3 font-mono text-xs tabular-nums text-fg-muted sm:px-0"
          >
            <InlineMath text={clock} />
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="m-0 px-3 text-sm font-medium sm:px-0">Marco del Sol</p>
          <SunFrame
            Vp={Vp}
            hyperbola={hyperbola}
            result={result}
            planetToken={token}
            showCircle={display.showCircle}
            decimals={decimals}
          />
          <p className="m-0 px-3 font-mono text-xs tabular-nums text-fg-muted sm:px-0">
            <InlineMath
              text={`$\\Delta|\\vec v|$ = ${signed(result.vOut - result.vIn, decimals, 'km/s')}`}
            />
          </p>
        </div>
      </div>
      <ul
        aria-label="Leyenda del sobrevuelo"
        className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-sm"
      >
        <li className="m-0 flex items-center gap-2">
          <LegendKey color={`var(${token})`} />
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
        {`Cámara rápida: el paso dibujado dura ${transportTimeValue(props.passSeconds, props.passSeconds)} y a 1× se ve en ${props.playbackSeconds} s, unas ${lapseFactorText(props.passSeconds, props.playbackSeconds)} veces más rápido.`}
      </p>
      <p
        role="status"
        data-testid="flyby-rp-warning"
        className="m-0 text-sm font-medium empty:hidden"
      >
        <InlineMath text={warningText(props.warning, unit)} />
      </p>
      <FlybyComparison encounter={props.encounter} result={result} decimals={decimals} />
    </div>
  );
}
