import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { LINE_WIDTH, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { FrameStore } from '../../lab/frameStore';
import { Arrow, Label, type Point } from '../../lab/OverlayMarks';
import { useFrameTime } from '../../lab/useFrameTime';
import { useZoomPan } from '../../lab/useZoomPan';
import { AC_COLOR, GAP_COLOR, OMEGA_COLOR } from './habitatColors';
import {
  pxPerMetre,
  screenRing,
  SPOKE_WIDTH,
  spinLayout,
  type RingBase,
  type ScreenRing,
} from './habitatRing';
import { angleAt, radiusToSlider, ringRadius } from './habitatScene';
import HabitatPerson from './HabitatPerson';
import HabitatZoomStrip, { STRIP_STACK_BELOW } from './HabitatZoomStrip';
import RadiusBar, { CAPTION_LINE, COMPACT_BAR } from './RadiusBar';
import { useRefit } from './useRefit';

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
  /** A counter: each change frames the ring again, as «Ajustar» does (a preset, a reset). */
  refit: number;
  onRadiusChange(r: number): void;
}

/** viewBox width before the container is measured (SSR, jsdom): the article column. */
const FALLBACK_WIDTH = 720;
/** The ring lives in a square of at most this side; the bar runs under it. */
const MAX_RING_AREA = 440;
/**
 * Room outside the largest ring for the outward vector, the ω arrow and their labels, so that at
 * the lab's own framing nothing the ring turns through leaves its square (the canvas clips there).
 */
const OUTER_ROOM = 72;
/** Spokes in the ring's own frame (deg, SVG angles); none at the person, who stands at 90°. */
const SPOKE_ANGLES = [-90, 30, 150];
/** One g is drawn as this share of the largest ring radius. */
const VECTOR_UNIT_SHARE = 0.3;
const CLIP_MARK = { at: 0.72, gap: 4, half: 5 } as const;
const OMEGA_ARC = { from: -18, to: -66, gap: 16, head: 12 } as const;
const BAR_SIDE_PAD = 30;
/** From the ring square to the bar track: room for the knob's value label. */
const BAR_TOP_GAP = 34;
/** Under the track: tick labels and captions. */
const BAR_BOTTOM = 50;
/** One row of the zoom strip: the scale bar or the buttons (40 px) with air around them. */
const STRIP_ROW = 48;
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

/** The ring's three spokes, from the hub to the rim, at the zoom. */
function Spokes({ ring }: { ring: ScreenRing }): JSX.Element {
  const { c } = ring;
  return (
    <>
      {SPOKE_ANGLES.map((degrees) => {
        const end = onCircle(c, ring.ring, degrees);
        return (
          <line
            key={degrees}
            x1={c.x}
            y1={c.y}
            x2={end.x}
            y2={end.y}
            stroke={SPOKE_COLOR}
            strokeWidth={SPOKE_WIDTH * ring.scale}
            strokeLinecap="round"
          />
        );
      })}
    </>
  );
}

/** a_c and the apparent gravity, side by side, each marked when longer than it is drawn. */
function Vectors({ layout }: { layout: ReturnType<typeof spinLayout> }): JSX.Element {
  const { ac, gap, isClipped, length } = layout;
  return (
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
  );
}

/**
 * The moving layer: spokes, person, radius line, vectors and their labels, drawn with the person
 * at the bottom inside one group turned by the live angle (one attribute per frame), the labels
 * counter-turned so they stay upright. `ring` is already through the zoom's view.
 */
function SpinningParts({
  ring,
  omega,
  frame,
  gRatio,
  showVectors,
}: {
  ring: ScreenRing;
  omega: number;
  frame: FrameStore;
  gRatio: number;
  showVectors: boolean;
}): JSX.Element {
  const degrees = angleAt(omega, useFrameTime(frame)) / DEG;
  const { c } = ring;
  const layout = spinLayout(ring, gRatio);
  const { floorY, labels } = layout;

  return (
    <g data-spinning="" transform={`rotate(${(-degrees).toFixed(ANGLE_DECIMALS)} ${c.x} ${c.y})`}>
      <Spokes ring={ring} />
      <line x1={c.x} y1={c.y} x2={c.x} y2={floorY} stroke={TICK_COLOR} strokeDasharray="3 3" />
      <HabitatPerson x={c.x} feetY={floorY} height={layout.person} />
      {showVectors ? <Vectors layout={layout} /> : null}
      <UprightLabel at={labels.r} degrees={degrees}>
        r
      </UprightLabel>
      {showVectors ? (
        <>
          <UprightLabel at={labels.ac} degrees={degrees}>
            a_c
          </UprightLabel>
          <UprightLabel at={labels.gap} degrees={degrees}>
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
  return `Anillo del hábitat de radio ${n(r, 'm', 1)}, a escala solo en el radio, girando a ${n(rpm, 'RPM')}, con una persona de pie sobre el piso. La aceleración centrípeta apunta hacia el eje y la gravedad aparente hacia afuera, ambas de ${n(gRatio, 'g')}.`;
}

/** The radius bar's height: to the track, under it, and a second caption line on a phone. */
function barHeight(width: number): number {
  const barX1 = width - BAR_SIDE_PAD;
  const captionRoom = barX1 - BAR_SIDE_PAD < COMPACT_BAR ? CAPTION_LINE : 0;
  return BAR_TOP_GAP + BAR_BOTTOM + captionRoom;
}

/**
 * The drawing's height for a measured width: the ring's square (at most MAX_RING_AREA), the bar
 * under it, on a phone a second caption line, and the zoom strip (one row of STRIP_ROW; on a phone
 * the scale bar and the buttons each take one).
 */
export function sceneHeight(width: number): number {
  const stripRows = width < STRIP_STACK_BELOW ? 2 : 1;
  return Math.min(width, MAX_RING_AREA) + barHeight(width) + stripRows * STRIP_ROW;
}

/** Below this width the bar is compact (COMPACT_BAR long) and carries the extra caption line. */
export const COMPACT_BELOW = COMPACT_BAR + 2 * BAR_SIDE_PAD;
/** A step in CSS: a length times this, clamped, is 0 or a whole line within a hundredth of a px. */
const STEP_SLOPE = 1000;
/** `px` of extra height while the container is narrower than `below`, else none. */
const step = (px: number, below: number) =>
  `clamp(0px, (${below}px - 100cqw) * ${STEP_SLOPE}, ${px}px)`;
const RING_AREA = `min(100cqw, ${MAX_RING_AREA}px)`;
/** The radius bar's height in CSS, as barHeight. */
const BAR_RESERVED = `calc(${BAR_TOP_GAP + BAR_BOTTOM}px + ${step(CAPTION_LINE, COMPACT_BELOW)})`;
/**
 * sceneHeight written in CSS, from the width of the scene's own container (cqw), so the server
 * reserves the height the browser will measure: the drawing is sized by its width and would
 * otherwise grow when it hydrates (a layout shift on a phone). Keep the two in step.
 */
export const RESERVED_HEIGHT = `calc(${RING_AREA} + ${BAR_TOP_GAP + BAR_BOTTOM}px + ${step(CAPTION_LINE, COMPACT_BELOW)} + ${STRIP_ROW}px + ${step(STRIP_ROW, STRIP_STACK_BELOW)})`;

/** The ring's drawing at the lab's own framing, in the square the canvas measures. */
function ringBase(r: number, width: number, side: number): RingBase {
  const largest = side / 2 - OUTER_ROOM;
  return {
    c: { x: width / 2, y: side / 2 },
    ring: ringRadius(radiusToSlider(r), largest),
    unit: largest * VECTOR_UNIT_SHARE,
  };
}

/** The ring itself: the band and its outline, then the hub, around the turning parts. */
function RingBody({ ring }: { ring: ScreenRing }): JSX.Element {
  const { c } = ring;
  const outer = ring.ring + ring.band;
  return (
    <path
      data-testid="habitat-ring"
      d={`M${c.x - outer} ${c.y} a${outer} ${outer} 0 1 0 ${2 * outer} 0 a${outer} ${outer} 0 1 0 ${-2 * outer} 0 Z M${c.x - ring.ring} ${c.y} a${ring.ring} ${ring.ring} 0 1 0 ${2 * ring.ring} 0 a${ring.ring} ${ring.ring} 0 1 0 ${-2 * ring.ring} 0 Z`}
      fillRule="evenodd"
      style={{ fill: RING_FILL }}
      stroke={RING_STROKE}
      strokeWidth={1.5}
    />
  );
}

interface RingDrawingProps {
  props: HabitatSceneProps;
  /** The ring through the zoom's view, and the viewBox's width and height. */
  ring: ScreenRing;
  width: number;
  side: number;
}

/** The ring square's svg: the note, the ring, the ω arrow, the turning parts and the hub. */
function RingDrawing({ props, ring, width, side }: RingDrawingProps): JSX.Element {
  const { omega, frame, gRatio, showVectors } = props;
  const { c } = ring;
  return (
    <svg
      data-testid="habitat-scene"
      viewBox={`0 0 ${width} ${side}`}
      width="100%"
      className="block h-full w-full"
    >
      <g role="img" aria-label={describeScene(props)}>
        <text x={8} y={16} fontFamily={TICK_FONT_FAMILY} fontSize={NOTE_SIZE} fill={TICK_COLOR}>
          a escala solo el radio
        </text>
        <RingBody ring={ring} />
        <OmegaArrow c={c} radius={ring.ring + ring.band + OMEGA_ARC.gap * ring.scale} />
        <SpinningParts
          ring={ring}
          omega={omega}
          frame={frame}
          gRatio={gRatio}
          showVectors={showVectors}
        />
        <circle
          data-hub=""
          cx={c.x}
          cy={c.y}
          r={ring.hub}
          style={{ fill: 'var(--bg-elevated)' }}
          stroke={RING_STROKE}
          strokeWidth={1.5}
        />
        <circle cx={c.x} cy={c.y} r={2.5} fill={RING_STROKE} />
      </g>
    </svg>
  );
}

/**
 * The habitat lab's canvas: the ring turning at the clock's angle with a person on the floor, the
 * live a_c and apparent-gravity vectors (to scale up to 1,5 g) and the radius bar on a log scale.
 * The ring zooms (useZoomPan, ZoomControls): it is drawn through the view, so the person, the
 * band and the vectors grow while text, strokes and arrowheads keep their size; the scale bar
 * measures the floor radius r. The radius bar is not part of the zoomed canvas, and the zoom's
 * strip sits under it. The viewBoxes follow the measured width, so text keeps its pixel size.
 */
export default function HabitatScene(props: HabitatSceneProps): JSX.Element {
  const { r, refit, onRadiusChange } = props;
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const zoom = useZoomPan({ label: 'Anillo del hábitat' });
  useRefit(zoom, refit);
  const side = Math.min(width, MAX_RING_AREA);
  const base = ringBase(r, width, side);

  return (
    <div className="@container w-full">
      <div ref={wrapperRef} className="w-full" style={{ height: RESERVED_HEIGHT }}>
        <div {...zoom.viewportProps} style={{ ...zoom.viewportProps.style, height: RING_AREA }}>
          <RingDrawing props={props} ring={screenRing(base, zoom.view)} width={width} side={side} />
        </div>
        <svg
          viewBox={`0 0 ${width} ${barHeight(width)}`}
          width="100%"
          className="block w-full overflow-visible"
          style={{ height: BAR_RESERVED }}
        >
          <RadiusBar
            r={r}
            x0={BAR_SIDE_PAD}
            x1={width - BAR_SIDE_PAD}
            y={BAR_TOP_GAP}
            onRadiusChange={onRadiusChange}
          />
        </svg>
        <HabitatZoomStrip zoom={zoom} pxPerMetre={pxPerMetre(base.ring, r, zoom.view.scale)} />
      </div>
    </div>
  );
}
