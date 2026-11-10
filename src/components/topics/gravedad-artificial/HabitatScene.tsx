import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { CHART_COLORS, LINE_WIDTH, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { FrameStore } from '../../lab/frameStore';
import { Arrow, Label, type Point } from '../../lab/OverlayMarks';
import { useFrameTime } from '../../lab/useFrameTime';
import { angleAt, radiusToSlider, ringRadius, vectorLength } from './habitatScene';
import HabitatPerson from './HabitatPerson';
import RadiusBar, { CAPTION_LINE, COMPACT_BAR } from './RadiusBar';

/** a_c and apparent gravity wear the static diagram's colors: accent, and chart 2 dashed. */
export const AC_COLOR = 'var(--accent)';
export const GAP_COLOR = CHART_COLORS[1];
export const OMEGA_COLOR = CHART_COLORS[3];
const RING_FILL = 'color-mix(in srgb, var(--fg) 7%, var(--bg-elevated))';
const RING_STROKE = 'var(--fg)';
const SPOKE_COLOR = 'var(--fg-muted)';

export interface HabitatSceneProps {
  r: number;
  rpm: number;
  /** Angular speed (rad/s) and the clock's live time: the ring turns by ω·t, counterclockwise. */
  omega: number;
  frame: FrameStore;
  gRatio: number;
  showVectors: boolean;
  decimals: number;
  onRadiusChange(r: number): void;
}

/** viewBox width before the container is measured (SSR, jsdom): the article column. */
const FALLBACK_WIDTH = 720;
/** The ring lives in a square of at most this side; the bar runs under it. */
const MAX_RING_AREA = 440;
/** Room outside the largest ring for the outward vector, the ω arrow and their labels. */
const OUTER_ROOM = 64;
const RING_BAND = 9;
const HUB_RADIUS = 9;
const SPOKE_WIDTH = 3;
/** Spokes in the ring's own frame (deg, SVG angles); none at the person, who stands at 90°. */
const SPOKE_ANGLES = [-90, 30, 150];
const PERSON_HEIGHT = 34;
/** On a small drawn ring the person shrinks to this share of its radius, clear of the hub. */
const PERSON_RING_SHARE = 0.35;
/** One g is drawn as this share of the largest ring radius. */
const VECTOR_UNIT_SHARE = 0.3;
/** Each vector sits this far to one side of the person, so the two never overlap. */
const VECTOR_OFFSET = 9;
const VECTOR_LABEL_GAP = 13;
const R_LABEL_SIDE = 10;
const R_LABEL_AT = 0.5;
const AC_LABEL_SIDE = 16;
const CLIP_MARK = { at: 0.72, gap: 4, half: 5 } as const;
const OMEGA_ARC = { from: -18, to: -66, gap: 16, head: 12 } as const;
const BAR_SIDE_PAD = 30;
/** From the ring square to the bar track: room for the knob's value label. */
const BAR_TOP_GAP = 34;
/** Under the track: tick labels and captions. */
const BAR_BOTTOM = 50;
const NOTE_SIZE = 12;
const DEG = Math.PI / 180;
/** Decimals of the turn's angle attribute: a stable string per frame, a hundredth of a degree. */
const ANGLE_DECIMALS = 2;

function onCircle(c: Point, radius: number, degrees: number): Point {
  return { x: c.x + radius * Math.cos(degrees * DEG), y: c.y + radius * Math.sin(degrees * DEG) };
}

/** Two short strokes across a vertical shaft: the vector is longer than drawn. */
function ClipMark({ x, y, color }: { x: number; y: number; color: string }): JSX.Element {
  return (
    <g stroke={color} strokeWidth={LINE_WIDTH} className="pointer-events-none">
      <line x1={x - CLIP_MARK.half} y1={y - 2} x2={x + CLIP_MARK.half} y2={y + 2} />
      <line
        x1={x - CLIP_MARK.half}
        y1={y - 2 + CLIP_MARK.gap}
        x2={x + CLIP_MARK.half}
        y2={y + 2 + CLIP_MARK.gap}
      />
    </g>
  );
}

/** The ω arrow outside the ring, counterclockwise, with its label. */
function OmegaArrow({ c, radius }: { c: Point; radius: number }): JSX.Element {
  const start = onCircle(c, radius, OMEGA_ARC.from);
  const end = onCircle(c, radius, OMEGA_ARC.to);
  // Counterclockwise on screen is decreasing SVG angle: the tangent there is (sin θ, −cos θ).
  const tip = {
    x: end.x + OMEGA_ARC.head * Math.sin(OMEGA_ARC.to * DEG),
    y: end.y - OMEGA_ARC.head * Math.cos(OMEGA_ARC.to * DEG),
  };
  const label = onCircle(c, radius + OMEGA_ARC.gap, (OMEGA_ARC.from + OMEGA_ARC.to) / 2);
  return (
    <g className="pointer-events-none">
      <path
        d={`M${start.x} ${start.y} A${radius} ${radius} 0 0 0 ${end.x} ${end.y}`}
        fill="none"
        stroke={OMEGA_COLOR}
        strokeWidth={LINE_WIDTH + 1}
        strokeLinecap="round"
      />
      <Arrow from={end} to={tip} color={OMEGA_COLOR} />
      <Label at={label} dx={0} dy={4} anchor="middle">
        ω
      </Label>
    </g>
  );
}

interface RingGeometry {
  c: Point;
  ring: number;
  unit: number;
}

/** An upright label inside the turned group: counter-turned about its own anchor. */
function UprightLabel({
  at,
  degrees,
  children,
}: {
  at: Point;
  degrees: number;
  children: string;
}): JSX.Element {
  return (
    <g transform={`rotate(${degrees.toFixed(ANGLE_DECIMALS)} ${at.x} ${at.y})`}>
      <Label at={at} dx={0} dy={4} anchor="middle">
        {children}
      </Label>
    </g>
  );
}

/**
 * The moving layer: spokes, person, radius line, vectors and their labels, drawn with the person
 * at the bottom inside one group turned by the live angle (one attribute per frame), the labels
 * counter-turned so they stay upright.
 */
function SpinningParts({
  geometry,
  omega,
  frame,
  gRatio,
  showVectors,
}: {
  geometry: RingGeometry;
  omega: number;
  frame: FrameStore;
  gRatio: number;
  showVectors: boolean;
}): JSX.Element {
  const angle = angleAt(omega, useFrameTime(frame));
  const degrees = angle / DEG;
  const { c, ring, unit } = geometry;
  const floorY = c.y + ring;
  const { length, isClipped } = vectorLength(gRatio, unit);
  const ac = { from: { x: c.x + VECTOR_OFFSET, y: floorY - 2 }, toY: floorY - 2 - length };
  const person = Math.min(PERSON_HEIGHT, ring * PERSON_RING_SHARE);
  const gapStart = floorY - person / 2;
  const gap = { from: { x: c.x - VECTOR_OFFSET, y: gapStart }, toY: gapStart + length };
  // Short vectors keep their labels clear of the person: above the head and below the floor.
  const acLabelY = Math.min(ac.toY, floorY - person);
  const gapLabelY = Math.max(gap.toY, floorY + RING_BAND) + VECTOR_LABEL_GAP;
  // a_c's label sits beside its tip, on the side away from the r line.
  const acTip = { x: ac.from.x + AC_LABEL_SIDE, y: acLabelY };
  const gapTip = { x: gap.from.x, y: gapLabelY };
  // The r label sits near the hub, clear of the vector labels by the floor.
  const rLabel = { x: c.x - R_LABEL_SIDE, y: c.y + ring * R_LABEL_AT };

  return (
    <g data-spinning="" transform={`rotate(${(-degrees).toFixed(ANGLE_DECIMALS)} ${c.x} ${c.y})`}>
      {SPOKE_ANGLES.map((degrees) => {
        const end = onCircle(c, ring, degrees);
        return (
          <line
            key={degrees}
            x1={c.x}
            y1={c.y}
            x2={end.x}
            y2={end.y}
            stroke={SPOKE_COLOR}
            strokeWidth={SPOKE_WIDTH}
            strokeLinecap="round"
          />
        );
      })}
      <line x1={c.x} y1={c.y} x2={c.x} y2={floorY} stroke={TICK_COLOR} strokeDasharray="3 3" />
      <HabitatPerson x={c.x} feetY={floorY} height={person} />
      {showVectors ? (
        <>
          <g data-vector="ac">
            <Arrow from={ac.from} to={{ x: ac.from.x, y: ac.toY }} color={AC_COLOR} />
            {isClipped ? (
              <ClipMark x={ac.from.x} y={ac.from.y - CLIP_MARK.at * length} color={AC_COLOR} />
            ) : null}
          </g>
          <g data-vector="gap">
            <Arrow from={gap.from} to={{ x: gap.from.x, y: gap.toY }} color={GAP_COLOR} dashed />
            {isClipped ? (
              <ClipMark x={gap.from.x} y={gap.from.y + CLIP_MARK.at * length} color={GAP_COLOR} />
            ) : null}
          </g>
        </>
      ) : null}
      <UprightLabel at={rLabel} degrees={degrees}>
        r
      </UprightLabel>
      {showVectors ? (
        <>
          <UprightLabel at={acTip} degrees={degrees}>
            a_c
          </UprightLabel>
          <UprightLabel at={gapTip} degrees={degrees}>
            g_ap
          </UprightLabel>
        </>
      ) : null}
    </g>
  );
}

function describeScene({ r, rpm, gRatio, decimals }: HabitatSceneProps): string {
  const n = (value: number, unit: string, precision = decimals) =>
    formatNumber(value, { precision, unit });
  return `Anillo del hábitat, no a escala, de radio ${n(r, 'm', 1)} girando a ${n(rpm, 'RPM')}, con una persona de pie sobre el piso. La aceleración centrípeta apunta hacia el eje y la gravedad aparente hacia afuera, ambas de ${n(gRatio, 'g')}.`;
}

/**
 * The drawing's height for a measured width: the ring's square (at most MAX_RING_AREA), the bar
 * under it and, on a phone, a second caption line.
 */
export function sceneHeight(width: number): number {
  const barX1 = width - BAR_SIDE_PAD;
  const captionRoom = barX1 - BAR_SIDE_PAD < COMPACT_BAR ? CAPTION_LINE : 0;
  return Math.min(width, MAX_RING_AREA) + BAR_TOP_GAP + BAR_BOTTOM + captionRoom;
}

/** Below this width the bar is compact (COMPACT_BAR long) and carries the extra caption line. */
const COMPACT_BELOW = COMPACT_BAR + 2 * BAR_SIDE_PAD;
/** A step in CSS: a length times this, clamped, is 0 or a whole line within a hundredth of a px. */
const STEP_SLOPE = 1000;
/**
 * sceneHeight written in CSS, from the width of the scene's own container (cqw), so the server
 * reserves the height the browser will measure: the drawing is sized by its width and would
 * otherwise grow when it hydrates (a layout shift on a phone). Keep the two in step.
 */
export const RESERVED_HEIGHT = `calc(min(100cqw, ${MAX_RING_AREA}px) + ${BAR_TOP_GAP + BAR_BOTTOM}px + clamp(0px, (${COMPACT_BELOW}px - 100cqw) * ${STEP_SLOPE}, ${CAPTION_LINE}px))`;

/**
 * The habitat lab's canvas: the ring, not to scale, turning at the clock's angle with a person
 * on the floor, the live a_c and apparent-gravity vectors (to scale up to 1,5 g) and the radius
 * bar on a log scale. The viewBox follows the measured width, so text keeps its pixel size.
 */
export default function HabitatScene(props: HabitatSceneProps): JSX.Element {
  const { r, omega, frame, gRatio, showVectors, onRadiusChange } = props;
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const side = Math.min(width, MAX_RING_AREA);
  const largest = side / 2 - OUTER_ROOM;
  const geometry: RingGeometry = {
    c: { x: width / 2, y: side / 2 },
    ring: ringRadius(radiusToSlider(r), largest),
    unit: largest * VECTOR_UNIT_SHARE,
  };
  const { c, ring } = geometry;
  const barY = side + BAR_TOP_GAP;
  const barX1 = width - BAR_SIDE_PAD;
  const height = sceneHeight(width);

  return (
    <div className="@container w-full">
      <div ref={wrapperRef} className="w-full" style={{ height: RESERVED_HEIGHT }}>
        <svg
          data-testid="habitat-scene"
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          className="block h-full w-full overflow-visible"
        >
          <g role="img" aria-label={describeScene(props)}>
            <text x={8} y={16} fontFamily={TICK_FONT_FAMILY} fontSize={NOTE_SIZE} fill={TICK_COLOR}>
              no a escala
            </text>
            <path
              d={`M${c.x - ring - RING_BAND} ${c.y} a${ring + RING_BAND} ${ring + RING_BAND} 0 1 0 ${2 * (ring + RING_BAND)} 0 a${ring + RING_BAND} ${ring + RING_BAND} 0 1 0 ${-2 * (ring + RING_BAND)} 0 Z M${c.x - ring} ${c.y} a${ring} ${ring} 0 1 0 ${2 * ring} 0 a${ring} ${ring} 0 1 0 ${-2 * ring} 0 Z`}
              fillRule="evenodd"
              style={{ fill: RING_FILL }}
              stroke={RING_STROKE}
              strokeWidth={1.5}
            />
            <OmegaArrow c={c} radius={ring + RING_BAND + OMEGA_ARC.gap} />
            <SpinningParts
              geometry={geometry}
              omega={omega}
              frame={frame}
              gRatio={gRatio}
              showVectors={showVectors}
            />
            <circle
              cx={c.x}
              cy={c.y}
              r={HUB_RADIUS}
              style={{ fill: 'var(--bg-elevated)' }}
              stroke={RING_STROKE}
              strokeWidth={1.5}
            />
            <circle cx={c.x} cy={c.y} r={2.5} fill={RING_STROKE} />
          </g>
          <RadiusBar r={r} x0={BAR_SIDE_PAD} x1={barX1} y={barY} onRadiusChange={onRadiusChange} />
        </svg>
      </div>
    </div>
  );
}
