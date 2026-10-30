import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import type { PlanarFlybyResult } from '../../../lib/physics';
import { TICK_COLOR } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import { Arrow, Label, type Point } from '../../lab/OverlayMarks';
import type { FlybyHyperbola } from './flybyOrbit';
import { signed } from './flybyFormat';
import { arcPath, tipLabel, triangleLayout } from './flybyScene';
import { PROBE_COLOR, VINF_COLOR } from './PlanetFrame';

/** v before the flyby is muted; v after wears the probe's accent. */
export const V_BEFORE_COLOR = TICK_COLOR;
export const V_AFTER_COLOR = PROBE_COLOR;

export interface SunFrameProps {
  Vp: number;
  hyperbola: FlybyHyperbola;
  result: PlanarFlybyResult;
  /** Semantic token of the planet («--jupiter»). */
  planetToken: string;
  showCircle: boolean;
  decimals: number;
}

const FALLBACK_WIDTH = 340;
const MAX_SIDE = 380;
/** Height of the panel as a share of its side: the triangle is wider than tall. */
const HEIGHT_SHARE = 0.86;
const ARC_SHARE = 0.38;
const MAX_ARC_PX = 40;
const ARC_LABEL_GAP = 12;
const VP_LABEL_DROP = 16;
const ORIGIN_RADIUS = 3;
const DEG = 180 / Math.PI;

/** A label just past `tip`, along the direction from `from`, leaning outward but inside the panel. */
function TipLabel({
  from,
  tip,
  width,
  children,
}: {
  from: Point;
  tip: Point;
  width: number;
  children: string;
}): JSX.Element {
  const length = Math.hypot(tip.x - from.x, tip.y - from.y) || 1;
  const d = { x: (tip.x - from.x) / length, y: (tip.y - from.y) / length };
  const { at, anchor } = tipLabel(tip, d, children, width);
  return (
    <Label at={at} dx={0} dy={4} anchor={anchor}>
      {children}
    </Label>
  );
}

/**
 * The flyby seen from the Sun: v⃗ = V⃗_p + v⃗∞ before and after. V⃗_p runs along +x; both v⃗∞
 * start at its tip on the circle |v⃗∞| (the planet frame keeps the speed), turned by δ. The
 * heliocentric speed changes because the turn changes the sum.
 */
export default function SunFrame({
  Vp,
  hyperbola,
  result,
  planetToken,
  showCircle,
  decimals,
}: SunFrameProps): JSX.Element {
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const height = Math.min(width, MAX_SIDE) * HEIGHT_SHARE;
  const { origin, planetTip, inTip, outTip, k } = triangleLayout(
    width,
    height,
    Vp,
    result.vInVec,
    result.vOutVec,
  );
  const radius = k * hyperbola.vInf;
  const arcRadius = Math.min(radius * ARC_SHARE, MAX_ARC_PX);
  const middle = (hyperbola.thetaIn + hyperbola.thetaOut) / 2;
  const arcLabel = {
    x: planetTip.x + (arcRadius + ARC_LABEL_GAP) * Math.cos(middle),
    y: planetTip.y - (arcRadius + ARC_LABEL_GAP) * Math.sin(middle),
  };
  const planetColor = `var(${planetToken})`;
  const kms = (value: number) => formatNumber(value, { precision: decimals, unit: 'km/s' });
  const description = `Triángulo de velocidades en el marco del Sol: V_p ${kms(Vp)}; v∞ ${kms(hyperbola.vInf)} girada δ = ${formatNumber(hyperbola.delta * DEG, { precision: 1, unit: '°' })}; v antes ${kms(result.vIn)}; v después ${kms(result.vOut)}; Δ|v| = ${signed(result.vOut - result.vIn, decimals, 'km/s')}.`;

  return (
    <div ref={wrapperRef} className="w-full">
      <svg
        data-testid="flyby-sun-frame"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        className="block h-auto"
      >
        <g role="img" aria-label={description}>
          {showCircle ? (
            <circle
              data-circle=""
              cx={planetTip.x}
              cy={planetTip.y}
              r={radius}
              fill="none"
              stroke={TICK_COLOR}
              strokeDasharray="2 4"
            />
          ) : null}
          <path
            d={arcPath(planetTip, arcRadius, hyperbola.thetaIn, hyperbola.thetaOut)}
            fill="none"
            stroke={TICK_COLOR}
            strokeWidth={1.5}
          />
          <Label at={arcLabel} dx={0} dy={4} anchor="middle">
            δ
          </Label>
          <Arrow from={origin} to={inTip} color={V_BEFORE_COLOR} />
          <Arrow from={origin} to={outTip} color={V_AFTER_COLOR} />
          <Arrow from={planetTip} to={inTip} color={VINF_COLOR} dashed />
          <Arrow from={planetTip} to={outTip} color={VINF_COLOR} dashed />
          <Arrow from={origin} to={planetTip} color={planetColor} />
          <circle cx={origin.x} cy={origin.y} r={ORIGIN_RADIUS} fill={VINF_COLOR} />
          <Label
            at={{ x: (origin.x + planetTip.x) / 2, y: origin.y + VP_LABEL_DROP }}
            dx={0}
            dy={0}
            anchor="middle"
          >
            V_p
          </Label>
          <TipLabel from={planetTip} tip={inTip} width={width}>
            v antes
          </TipLabel>
          <TipLabel from={planetTip} tip={outTip} width={width}>
            v después
          </TipLabel>
        </g>
      </svg>
    </div>
  );
}
