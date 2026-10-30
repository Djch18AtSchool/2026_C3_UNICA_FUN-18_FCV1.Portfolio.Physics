import { useMemo, useState, type JSX, type KeyboardEvent } from 'react';
import type { Planet } from '../../../lib/data/planets';
import { formatNumber } from '../../../lib/format';
import {
  LINE_WIDTH,
  SURFACE_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
} from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import { Arrow, Knob, Label, type Point } from '../../lab/OverlayMarks';
import { useDrag, type DragPoint } from '../../lab/useDrag';
import { sampleTrack, type FlybyHyperbola, type FlybyState } from './flybyOrbit';
import {
  ARROW_PX,
  centreOn,
  planetView,
  RP_RANGE,
  rpFromDistance,
  rpKeyTarget,
  scaleBar,
  tipLabel,
} from './flybyScene';
import { SIDE_NAMES } from './flybyPresets';
import { rpText } from './RpField';

/** Colors by meaning, shared with the Sun frame and the legend. */
export const PROBE_COLOR = 'var(--accent)';
export const VINF_COLOR = TEXT_COLOR;
export const TRACK_COLOR = TICK_COLOR;

export interface PlanetFrameProps {
  hyperbola: FlybyHyperbola;
  planet: Planet;
  /** r_p in planet radii and its unit («R_J»). */
  rp: number;
  unit: string;
  /** Time from periapsis, s, and where the probe is then (Kepler's equation). */
  tau: number;
  probe: FlybyState;
  showVectors: boolean;
  /** r_p (planet radii) asked for by the handle, unclamped. */
  onRpRequest(rp: number): void;
}

/** Side before the container is measured (SSR, jsdom). */
const FALLBACK_WIDTH = 340;
const MAX_SIDE = 380;
const TRACK_SAMPLES = 161;
const PROBE_RADIUS = 5;
/** v_rel on the probe: v∞ is drawn ARROW_PX long, and the arrow never grows past this many v∞. */
const VREL_CAP = 2;
const LABEL_SIDE = 12;
/** The knob's label clears its focus ring (11 px) and the knob's halo. */
const KNOB_LABEL_GAP = 22;
const CORNER = 12;
const NOTE_SIZE = 12;
const VP_ARROW = 36;
/** The scale bar is at most this share of the side. */
const SCALE_BAR_SHARE = 0.3;
const DECIMALS_E = 3;
const DEG = 180 / Math.PI;

/** Unit vector on screen for an angle counted counter-clockwise with y up. */
const direction = (angle: number): Point => ({ x: Math.cos(angle), y: -Math.sin(angle) });
const along = (p: Point, d: Point, length: number): Point => ({
  x: p.x + d.x * length,
  y: p.y + d.y * length,
});
/** Beside the middle of a segment, LABEL_SIDE px to its left (screen coordinates). */
function besideMiddle(from: Point, to: Point): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return {
    x: (from.x + to.x) / 2 + ((to.y - from.y) / length) * LABEL_SIDE,
    y: (from.y + to.y) / 2 - ((to.x - from.x) / length) * LABEL_SIDE,
  };
}

const toPath = (points: Point[]) =>
  points.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

function describe({ hyperbola, planet, rp, unit }: PlanetFrameProps): string {
  const n = (value: number, precision: number, suffix = '') =>
    formatNumber(value, { precision, unit: suffix });
  return `Sobrevuelo en el marco de ${planet.name}: la sonda llega con v∞ = ${n(hyperbola.vInf, 2, 'km/s')} y pasa por ${SIDE_NAMES[hyperbola.sense < 0 ? 'behind' : 'front']} a r_p = ${n(rp, 2, unit)}. La hipérbola tiene e = ${n(hyperbola.e, DECIMALS_E)} y gira la velocidad δ = ${n(hyperbola.delta * DEG, 1, '°')}; lejos del planeta sale con la misma rapidez v∞.`;
}

/**
 * The flyby in the planet frame, to the scale the log bar sets: the planet (enlarged only when it
 * would vanish), the hyperbola out to where v∞ is drawn, the probe at τ from periapsis by
 * Kepler's equation, v∞ in and out (equal in length) and the periapsis handle, a slider on the
 * logarithmic r_p scale: drag it, or use the arrow keys, Page keys, Home and End.
 */
export default function PlanetFrame(props: PlanetFrameProps): JSX.Element {
  const { hyperbola, planet, rp, unit, tau, probe, showVectors, onRpRequest } = props;
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const side = Math.min(width, MAX_SIDE);
  const half = side / 2;
  const view = planetView(side, hyperbola.rp, planet.radiusKm);
  /** km in the planet frame → px from the planet's centre (y up). */
  const rel = (x: number, y: number): Point => ({ x: view.scale * x, y: -view.scale * y });

  const track = useMemo(
    () => sampleTrack(hyperbola, view.reachKm, TRACK_SAMPLES),
    [hyperbola, view.reachKm],
  );
  const trackRel = track.map((p) => rel(p.x, p.y));
  const inDir = direction(hyperbola.thetaIn);
  const outDir = direction(hyperbola.thetaOut);
  const inTailRel = along(trackRel[0], inDir, -ARROW_PX);
  const outTipRel = along(trackRel[trackRel.length - 1], outDir, ARROW_PX);
  const planetBox = [-view.planetPx, view.planetPx].map((d) => ({ x: d, y: d }));
  const fitted = centreOn([...trackRel, inTailRel, outTipRel, ...planetBox], width, side);
  /** While the handle is dragged the planet stays put, so the pointer maps to r_p stably. */
  const [heldCentre, setHeldCentre] = useState<Point | null>(null);
  const c = heldCentre ?? fitted;
  const shift = (p: Point): Point => ({ x: c.x + p.x, y: c.y + p.y });

  const probePx = shift(rel(probe.x, probe.y));
  const trackPx = trackRel.map(shift);
  const travelled = [...trackPx.filter((_, k) => track[k].tau <= tau), probePx];
  const first = trackPx[0];
  const last = trackPx[trackPx.length - 1];
  const inTail = shift(inTailRel);
  const outTip = shift(outTipRel);
  const periDir = direction(hyperbola.periapsisAngle);
  const periapsis = along(c, periDir, view.periapsisPx);
  // A short name by the knob always fits; its value sits in a corner, clear of the drawing.
  const knobLabel = tipLabel(periapsis, periDir, 'r_p', width, KNOB_LABEL_GAP);
  const vRelLength = ARROW_PX * Math.min(probe.speed / hyperbola.vInf, VREL_CAP);
  const vRelTip = along(
    probePx,
    { x: probe.vx / probe.speed, y: -probe.vy / probe.speed },
    vRelLength,
  );
  const bar = scaleBar(view.scale, planet.radiusKm, side * SCALE_BAR_SHARE);
  const planetColor = `var(${planet.token})`;

  const drag = useDrag(({ x, y, phase }: DragPoint) => {
    if (phase === 'start') setHeldCentre(c);
    if (phase === 'end') setHeldCentre(null);
    onRpRequest(rpFromDistance(Math.hypot(x - c.x, y - c.y), half));
  });
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const next = rpKeyTarget(event.key, event.shiftKey, rp);
    if (next === undefined) return;
    event.preventDefault();
    onRpRequest(next);
  };

  return (
    <div ref={wrapperRef} className="w-full">
      <svg
        data-testid="flyby-planet-frame"
        viewBox={`0 0 ${width} ${side}`}
        width="100%"
        className="block h-auto"
      >
        <g role="img" aria-label={describe(props)}>
          <g fontFamily={TICK_FONT_FAMILY} fontSize={NOTE_SIZE} className="pointer-events-none">
            <Arrow
              from={{ x: CORNER, y: CORNER + 6 }}
              to={{ x: CORNER + VP_ARROW, y: CORNER + 6 }}
              color={planetColor}
            />
            <text x={CORNER + VP_ARROW + 6} y={CORNER + 10} fill={TEXT_COLOR}>
              V_p
            </text>
            <text
              data-testid="flyby-rp-value"
              x={width - CORNER}
              y={CORNER + 10}
              fill={TEXT_COLOR}
              textAnchor="end"
            >
              {`r_p = ${formatNumber(rp, { precision: 2, unit })}`}
            </text>
            {view.isPlanetEnlarged ? (
              <text x={width - CORNER} y={side - CORNER} fill={TICK_COLOR} textAnchor="end">
                planeta agrandado
              </text>
            ) : null}
            <line
              x1={CORNER}
              y1={side - CORNER}
              x2={CORNER + bar.px}
              y2={side - CORNER}
              stroke={TEXT_COLOR}
              strokeWidth={LINE_WIDTH}
            />
            <text x={CORNER} y={side - CORNER - 6} fill={TICK_COLOR}>
              {`${formatNumber(bar.radii, { precision: bar.radii < 1 ? 1 : 0 })} ${unit}`}
            </text>
          </g>
          <circle
            data-testid="flyby-planet"
            cx={c.x}
            cy={c.y}
            r={view.planetPx}
            style={{ fill: planetColor }}
          />
          <line
            x1={c.x}
            y1={c.y}
            x2={periapsis.x}
            y2={periapsis.y}
            stroke={TICK_COLOR}
            strokeDasharray="3 3"
          />
          <path d={toPath(trackPx)} fill="none" stroke={TRACK_COLOR} strokeWidth={1.5} />
          <path
            d={toPath(travelled)}
            fill="none"
            stroke={PROBE_COLOR}
            strokeWidth={LINE_WIDTH + 0.5}
          />
          {showVectors ? (
            <>
              <g data-vector="vinf-in">
                <Arrow from={inTail} to={first} color={VINF_COLOR} dashed />
                <Label at={besideMiddle(inTail, first)} dx={0} dy={4} anchor="middle">
                  v∞,in
                </Label>
              </g>
              <g data-vector="vinf-out">
                <Arrow from={last} to={outTip} color={VINF_COLOR} dashed />
                <Label at={besideMiddle(last, outTip)} dx={0} dy={4} anchor="middle">
                  v∞,out
                </Label>
              </g>
              <g data-vector="vrel">
                <Arrow from={probePx} to={vRelTip} color={PROBE_COLOR} />
              </g>
            </>
          ) : null}
          <circle
            data-testid="flyby-probe"
            cx={probePx.x}
            cy={probePx.y}
            r={PROBE_RADIUS}
            fill={PROBE_COLOR}
            stroke={SURFACE_COLOR}
            strokeWidth={1.5}
          />
        </g>
        <g
          data-testid="periapsis-handle"
          role="slider"
          tabIndex={0}
          aria-label="Máxima aproximación en el dibujo"
          aria-valuemin={RP_RANGE.min}
          aria-valuemax={RP_RANGE.max}
          aria-valuenow={Number(rp.toFixed(2))}
          aria-valuetext={`r_p = ${rpText(rp, unit, planet.radiusKm)}`}
          className="group cursor-grab outline-none"
          onKeyDown={onKeyDown}
          {...drag}
        >
          <Knob at={periapsis} fill={TEXT_COLOR} />
        </g>
        <Label at={knobLabel.at} dx={0} dy={4} anchor={knobLabel.anchor}>
          r_p
        </Label>
      </svg>
    </div>
  );
}
