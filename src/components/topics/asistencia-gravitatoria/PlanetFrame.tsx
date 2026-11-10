import { useMemo, useState, type JSX, type KeyboardEvent } from 'react';
import type { Planet } from '../../../lib/data/planets';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import MathText from '../../lab/MathText';
import {
  LINE_WIDTH,
  SURFACE_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
} from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { FrameStore } from '../../lab/frameStore';
import { segmentsOf, spotsAround, spotsBeside, textBox, type Box } from '../../lab/labelClearance';
import { Arrow, Knob, LABEL_SIZE, Label, type Point } from '../../lab/OverlayMarks';
import { useDrag, type DragPoint } from '../../lab/useDrag';
import { useFrameDerived } from '../../lab/useFrameTime';
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
import { LABEL_BASELINE_DROP, LABEL_GAP, placeLabels } from './flybyLabels';
import { SIDE_NAMES } from './flybyPresets';
import { rpText } from './RpField';

/** Colors by meaning, shared with the Sun frame and the legend. */
export const PROBE_COLOR = 'var(--accent)';
export const VINF_COLOR = TEXT_COLOR;
export const TRACK_COLOR = TICK_COLOR;

/** Time from periapsis (s) and where the probe is then (Kepler's equation). */
export interface ProbeAt {
  tau: number;
  probe: FlybyState;
}

/** The live clock and the probe at any of its times: what the moving layer draws. */
export interface LiveProbe {
  frame: FrameStore;
  probeAt(t: number): ProbeAt;
}

export interface PlanetFrameProps {
  hyperbola: FlybyHyperbola;
  planet: Planet;
  /** r_p in planet radii and its unit («R_J»). */
  rp: number;
  unit: string;
  live: LiveProbe;
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
/** The knob's label clears its focus ring (11 px) and the knob's halo. */
const KNOB_LABEL_GAP = 22;
const CORNER = 12;
const NOTE_SIZE = 12;
const VP_ARROW = 36;
/** The key beside the V⃗_p arrow, in the MathText notation. */
const VP_KEY = 'vec V_p';
/** The corner texts' baseline below the corner, and the V_p key's gap to its text. */
const CORNER_BASELINE = 10;
const VP_TEXT_GAP = 6;
/** The scale bar's text sits this far above the bar. */
const BAR_TEXT_LIFT = 6;
/** The knob's focus ring (11 px) that a label keeps clear of. */
const KNOB_CLEARANCE = 11;
/**
 * Bands at the top (V_p key, r_p readout) and bottom (scale bar, note) of the panel, px: the
 * drawing is scaled and centred between them, so no arrow or track reaches a corner text.
 */
const TEXT_BAND = 30;
/** The scale bar is at most this share of the side. */
const SCALE_BAR_SHARE = 0.3;
const DECIMALS_E = 3;
const DEG = 180 / Math.PI;
const ORIGIN: Point = { x: 0, y: 0 };
/** Decimals of the probe's coordinates: a stable attribute string per frame. */
const PX_DECIMALS = 2;

/** Unit vector on screen for an angle counted counter-clockwise with y up. */
const direction = (angle: number): Point => ({ x: Math.cos(angle), y: -Math.sin(angle) });
const along = (p: Point, d: Point, length: number): Point => ({
  x: p.x + d.x * length,
  y: p.y + d.y * length,
});
const negate = (d: Point): Point => ({ x: -d.x, y: -d.y });
const squareAround = (p: Point, half: number): Box => ({
  left: p.x - half,
  right: p.x + half,
  top: p.y - half,
  bottom: p.y + half,
});

const toPath = (points: Point[]) =>
  points.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

function describe({ hyperbola, planet, rp, unit }: PlanetFrameProps): string {
  const n = (value: number, precision: number, suffix = '') =>
    formatNumber(value, { precision, unit: suffix });
  return mathTextToString(
    `Sobrevuelo en el marco de ${planet.name}: la sonda llega con v_∞ = ${n(hyperbola.vInf, 2, 'km/s')} y pasa por ${SIDE_NAMES[hyperbola.sense < 0 ? 'behind' : 'front']} a r_p = ${n(rp, 2, unit)}. La hipérbola tiene e = ${n(hyperbola.e, DECIMALS_E)} y gira la velocidad δ = ${n(hyperbola.delta * DEG, 1, '°')}; lejos del planeta sale con la misma rapidez v_∞.`,
  );
}

interface ProbeLayerProps {
  live: LiveProbe;
  hyperbola: FlybyHyperbola;
  /** The sampled track in canvas px with each sample's τ, and km → canvas px. */
  track: { tau: number }[];
  trackPx: Point[];
  toPx(x: number, y: number): Point;
  showVectors: boolean;
}

/**
 * The moving layer: the stretch of track already flown, the probe at the live τ and, with vectors
 * on, v_rel from the probe (drawn relative to it inside a translated group).
 */
function ProbeLayer({ live, hyperbola, track, trackPx, toPx, showVectors }: ProbeLayerProps) {
  const { tau, probe } = useFrameDerived(live.frame, live.probeAt);
  const probePx = toPx(probe.x, probe.y);
  const travelled = [...trackPx.filter((_, k) => track[k].tau <= tau), probePx];
  const vRelLength = ARROW_PX * Math.min(probe.speed / hyperbola.vInf, VREL_CAP);
  const vRelTip = along(
    ORIGIN,
    { x: probe.vx / probe.speed, y: -probe.vy / probe.speed },
    vRelLength,
  );
  return (
    <>
      <path d={toPath(travelled)} fill="none" stroke={PROBE_COLOR} strokeWidth={LINE_WIDTH + 0.5} />
      {showVectors ? (
        <g
          data-vector="vrel"
          transform={`translate(${probePx.x.toFixed(PX_DECIMALS)} ${probePx.y.toFixed(PX_DECIMALS)})`}
        >
          <Arrow from={ORIGIN} to={vRelTip} color={PROBE_COLOR} />
        </g>
      ) : null}
      <circle
        data-testid="flyby-probe"
        cx={probePx.x.toFixed(PX_DECIMALS)}
        cy={probePx.y.toFixed(PX_DECIMALS)}
        r={PROBE_RADIUS}
        fill={PROBE_COLOR}
        stroke={SURFACE_COLOR}
        strokeWidth={1.5}
      />
    </>
  );
}

/**
 * The flyby in the planet frame, to the scale the log bar sets: the planet (enlarged only when it
 * would vanish), the hyperbola out to where v∞ is drawn, the probe at τ from periapsis by
 * Kepler's equation, v∞ in and out (equal in length) and the periapsis handle, a slider on the
 * logarithmic r_p scale: drag it, or use the arrow keys, Page keys, Home and End.
 */
export default function PlanetFrame(props: PlanetFrameProps): JSX.Element {
  const { hyperbola, planet, rp, unit, live, showVectors, onRpRequest } = props;
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const side = Math.min(width, MAX_SIDE);
  const drawSide = side - 2 * TEXT_BAND;
  const half = drawSide / 2;
  const view = planetView(drawSide, hyperbola.rp, planet.radiusKm);
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
  const centred = centreOn([...trackRel, inTailRel, outTipRel, ...planetBox], width, drawSide);
  const fitted = { x: centred.x, y: centred.y + TEXT_BAND };
  /** While the handle is dragged the planet stays put, so the pointer maps to r_p stably. */
  const [heldCentre, setHeldCentre] = useState<Point | null>(null);
  const c = heldCentre ?? fitted;
  const shift = (p: Point): Point => ({ x: c.x + p.x, y: c.y + p.y });

  const toPx = (x: number, y: number): Point => shift(rel(x, y));
  const trackPx = trackRel.map(shift);
  const first = trackPx[0];
  const last = trackPx[trackPx.length - 1];
  const inTail = shift(inTailRel);
  const outTip = shift(outTipRel);
  const periDir = direction(hyperbola.periapsisAngle);
  const periapsis = along(c, periDir, view.periapsisPx);
  // A short name by the knob always fits; its value sits in a corner, clear of the drawing.
  const knobLabel = tipLabel(periapsis, periDir, 'r_p', width, KNOB_LABEL_GAP);
  const bar = scaleBar(view.scale, planet.radiusKm, side * SCALE_BAR_SHARE);
  const planetColor = `var(${planet.token})`;
  const rpValue = `r_p = ${formatNumber(rp, { precision: 2, unit })}`;
  const barText = `${formatNumber(bar.radii, { precision: bar.radii < 1 ? 1 : 0 })} ${unit}`;
  const cornerY = CORNER + CORNER_BASELINE;
  const vpText = { x: CORNER + VP_ARROW + VP_TEXT_GAP, y: cornerY };
  // The v∞ labels keep off every line drawn still and off every text; the moving probe and v_rel
  // are left out, so a label does not jump while the pass plays.
  const [outLabel, inLabel] = placeLabels(
    [
      {
        text: 'vec v_∞,out',
        spots: (size) => [
          ...spotsBeside(last, outTip, size, LABEL_GAP),
          ...spotsAround(outTip, outDir, size, LABEL_GAP),
        ],
      },
      {
        text: 'vec v_∞,in',
        spots: (size) => [
          ...spotsBeside(inTail, first, size, LABEL_GAP),
          ...spotsAround(inTail, negate(inDir), size, LABEL_GAP),
        ],
      },
    ],
    [
      ...segmentsOf(trackPx),
      [c, periapsis],
      [inTail, first],
      [last, outTip],
      [
        { x: CORNER, y: side - CORNER },
        { x: CORNER + bar.px, y: side - CORNER },
      ],
    ],
    [
      { ...textBox(vpText, VP_KEY, NOTE_SIZE, 'start'), left: CORNER },
      textBox({ x: width - CORNER, y: cornerY }, rpValue, NOTE_SIZE, 'end'),
      textBox({ x: CORNER, y: side - CORNER - BAR_TEXT_LIFT }, barText, NOTE_SIZE, 'start'),
      ...(view.isPlanetEnlarged
        ? [textBox({ x: width - CORNER, y: side - CORNER }, 'planeta agrandado', NOTE_SIZE, 'end')]
        : []),
      squareAround(c, view.planetPx),
      squareAround(periapsis, KNOB_CLEARANCE),
      textBox(
        { x: knobLabel.at.x, y: knobLabel.at.y + LABEL_BASELINE_DROP },
        'r_p',
        LABEL_SIZE,
        knobLabel.anchor,
      ),
    ],
    { width, height: side },
  );

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
            <MathText
              source={VP_KEY}
              x={vpText.x}
              y={vpText.y}
              fontSize={NOTE_SIZE}
              fill={TEXT_COLOR}
            />
            <g data-testid="flyby-rp-value">
              <MathText
                source={rpValue}
                x={width - CORNER}
                y={cornerY}
                fontSize={NOTE_SIZE}
                fill={TEXT_COLOR}
                anchor="end"
              />
            </g>
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
            <MathText
              source={barText}
              x={CORNER}
              y={side - CORNER - BAR_TEXT_LIFT}
              fontSize={NOTE_SIZE}
              fill={TICK_COLOR}
            />
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
          {showVectors ? (
            <>
              <g data-vector="vinf-in">
                <Arrow from={inTail} to={first} color={VINF_COLOR} dashed />
                <Label at={inLabel.at} dx={0} dy={LABEL_BASELINE_DROP} anchor="middle">
                  {inLabel.text}
                </Label>
              </g>
              <g data-vector="vinf-out">
                <Arrow from={last} to={outTip} color={VINF_COLOR} dashed />
                <Label at={outLabel.at} dx={0} dy={LABEL_BASELINE_DROP} anchor="middle">
                  {outLabel.text}
                </Label>
              </g>
            </>
          ) : null}
          <ProbeLayer
            live={live}
            hyperbola={hyperbola}
            track={track}
            trackPx={trackPx}
            toPx={toPx}
            showVectors={showVectors}
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
          aria-valuetext={mathTextToString(`r_p = ${rpText(rp, unit, planet.radiusKm)}`)}
          className="group cursor-grab outline-none"
          onKeyDown={onKeyDown}
          {...drag}
        >
          <Knob at={periapsis} fill={TEXT_COLOR} />
        </g>
        <Label at={knobLabel.at} dx={0} dy={LABEL_BASELINE_DROP} anchor={knobLabel.anchor}>
          r_p
        </Label>
      </svg>
    </div>
  );
}
