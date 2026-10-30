import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import type { PlanarFlybyResult } from '../../../lib/physics';
import { TICK_COLOR } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import { segmentsOf, spotsAround, textBox, type Segment } from '../../lab/labelClearance';
import { Arrow, LABEL_SIZE, Label, type Point } from '../../lab/OverlayMarks';
import type { FlybyHyperbola } from './flybyOrbit';
import { signed } from './flybyFormat';
import { LABEL_BASELINE_DROP, LABEL_GAP, placeLabels } from './flybyLabels';
import { arcPath, triangleLayout } from './flybyScene';
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
/** Points along the δ arc that labels keep clear of. */
const ARC_SAMPLES = 12;
/** Extra distances (px) tried for δ once the spots next to its arc are taken. */
const DELTA_GAPS = [0, 8, 16, 24];
const VP_LABEL_DROP = 16;
const ORIGIN_RADIUS = 3;
const DEG = 180 / Math.PI;

/** Unit vector from `from` to `to` (screen coordinates). */
function unit(from: Point, to: Point): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

/** Screen point at `radius` from `c` in the direction `angle` (counter-clockwise, y up). */
const polar = (c: Point, radius: number, angle: number): Point => ({
  x: c.x + radius * Math.cos(angle),
  y: c.y - radius * Math.sin(angle),
});

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
  const arc = Array.from({ length: ARC_SAMPLES + 1 }, (_, k) =>
    polar(
      planetTip,
      arcRadius,
      hyperbola.thetaIn + ((hyperbola.thetaOut - hyperbola.thetaIn) * k) / ARC_SAMPLES,
    ),
  );
  const arcMiddle = polar(planetTip, arcRadius, middle);
  const vpLabel = { x: (origin.x + planetTip.x) / 2, y: origin.y + VP_LABEL_DROP };
  const arrows: Segment[] = [
    [origin, inTip],
    [origin, outTip],
    [planetTip, inTip],
    [planetTip, outTip],
    [origin, planetTip],
  ];
  // Tip labels look outward from the circle's centre; δ, out from the arc's middle.
  const [beforeLabel, afterLabel, deltaLabel] = placeLabels(
    [
      {
        text: 'v antes',
        spots: (size) => spotsAround(inTip, unit(planetTip, inTip), size, LABEL_GAP),
      },
      {
        text: 'v después',
        spots: (size) => spotsAround(outTip, unit(planetTip, outTip), size, LABEL_GAP),
      },
      {
        text: 'δ',
        // Out from the arc's middle, then further out: a small δ leaves a narrow wedge.
        spots: (size) =>
          DELTA_GAPS.flatMap((gap) =>
            spotsAround(arcMiddle, unit(planetTip, arcMiddle), size, LABEL_GAP + gap),
          ),
      },
    ],
    [...arrows, ...segmentsOf(arc)],
    [textBox(vpLabel, 'V_p', LABEL_SIZE, 'middle')],
    { width, height },
  );
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
          <Label at={deltaLabel.at} dx={0} dy={LABEL_BASELINE_DROP} anchor="middle">
            {deltaLabel.text}
          </Label>
          <Arrow from={origin} to={inTip} color={V_BEFORE_COLOR} />
          <Arrow from={origin} to={outTip} color={V_AFTER_COLOR} />
          <Arrow from={planetTip} to={inTip} color={VINF_COLOR} dashed />
          <Arrow from={planetTip} to={outTip} color={VINF_COLOR} dashed />
          <Arrow from={origin} to={planetTip} color={planetColor} />
          <circle cx={origin.x} cy={origin.y} r={ORIGIN_RADIUS} fill={VINF_COLOR} />
          <Label at={vpLabel} dx={0} dy={0} anchor="middle">
            V_p
          </Label>
          {[beforeLabel, afterLabel].map((label) => (
            <Label key={label.text} at={label.at} dx={0} dy={LABEL_BASELINE_DROP} anchor="middle">
              {label.text}
            </Label>
          ))}
        </g>
      </svg>
    </div>
  );
}
