import type { JSX } from 'react';
import type { Planet } from '../../../lib/data/planets';
import { formatNumber } from '../../../lib/format';
import type { PlanarFlybyResult } from '../../../lib/physics';
import { CANVAS_INSET } from '../../lab/canvasInset';
import InlineMath from '../../lab/InlineMath';
import { TimeScaleStatus } from '../../lab/TimeScaleBadge';
import type { SimClock } from '../../lab/useSimClock';
import { signed, unitTex } from './flybyFormat';
import type { FlybyDisplay } from './flybyLabSettings';
import type { FlybyHyperbola, FlybyState } from './flybyOrbit';
import PeriapsisJump, { type PeriapsisJumpProps } from './PeriapsisJump';
import PlanetFrame, { type LiveProbe } from './PlanetFrame';
import SunFrame from './SunFrame';

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
  display: FlybyDisplay;
  decimals: number;
  /** The clock: its rate is the time scale the planet frame declares (the Sun frame is static). */
  clock: SimClock;
  /** The closest approach: its time on the clock and what is said after the jump to it. */
  periapsis: Pick<PeriapsisJumpProps, 'periapsisT' | 'summary'>;
  onRpRequest(rp: number): void;
}

const SECONDS_PER_HOUR = 3600;

/**
 * The flyby laboratory's canvas: the planet frame (hyperbola, probe, periapsis handle) beside the
 * Sun frame (velocity triangles) once the canvas is 32rem wide, stacked when narrower (a phone, or
 * the stage of the two-column lab), each with its clock line. Only the planet frame moves, so it
 * alone declares the time scale, next to the probe, and carries the jump to the closest approach.
 * What reads them (legend, model versus data) is FlybyNotes, under the lab's columns.
 */
export default function FlybyScene(props: FlybySceneProps): JSX.Element {
  const { hyperbola, planet, Vp, result, rp, unit, tau, probe, live, display, decimals } = props;
  const { clock, periapsis } = props;
  const kms = (value: number) => formatNumber(value, { precision: decimals, unit: 'km/s' });
  const clockText = [
    `$t - t_p$ = ${signed(tau / SECONDS_PER_HOUR, 1, 'h')}`,
    `$r$ = ${formatNumber(probe.r / planet.radiusKm, { precision: 2, unit: unitTex(unit) })}`,
    `$|\\vec v_\\text{rel}|$ = ${kms(probe.speed)}`,
  ].join(' · ');

  return (
    <div className="@container">
      <div className="grid gap-4 @lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <p className={`m-0 text-sm font-medium ${CANVAS_INSET}`}>{`Marco de ${planet.name}`}</p>
          <PlanetFrame
            hyperbola={hyperbola}
            planet={planet}
            rp={rp}
            unit={unit}
            live={live}
            showVectors={display.showVectors}
            clock={clock}
            onRpRequest={props.onRpRequest}
          />
          <TimeScaleStatus clock={clock} />
          <p
            data-testid="flyby-clock"
            className={`m-0 font-mono text-xs tabular-nums text-fg-muted ${CANVAS_INSET}`}
          >
            <InlineMath text={clockText} />
          </p>
          <PeriapsisJump clock={clock} {...periapsis} />
        </div>
        <div className="flex flex-col gap-1">
          <p className={`m-0 text-sm font-medium ${CANVAS_INSET}`}>Marco del Sol</p>
          <SunFrame
            Vp={Vp}
            hyperbola={hyperbola}
            result={result}
            planetToken={planet.token}
            showCircle={display.showCircle}
            decimals={decimals}
          />
          <p className={`m-0 font-mono text-xs tabular-nums text-fg-muted ${CANVAS_INSET}`}>
            <InlineMath
              text={`$\\Delta|\\vec v|$ = ${signed(result.vOut - result.vIn, decimals, 'km/s')}`}
            />
          </p>
        </div>
      </div>
    </div>
  );
}
