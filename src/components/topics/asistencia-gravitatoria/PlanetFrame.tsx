import {
  useMemo,
  useRef,
  useState,
  type JSX,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { Planet } from '../../../lib/data/planets';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import MathText from '../../lab/MathText';
import { TimeScaleBadgeSvg } from '../../lab/TimeScaleBadge';
import type { SimClock } from '../../lab/useSimClock';
import {
  LINE_WIDTH,
  SURFACE_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
} from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { FrameStore } from '../../lab/frameStore';
import { Arrow, Knob, Label, type Point } from '../../lab/OverlayMarks';
import { ScaleBarSvg, ScaleBarWords } from '../../lab/ScaleBar';
import { useDrag, type DragHandlers, type DragPoint } from '../../lab/useDrag';
import { useFrameDerived } from '../../lab/useFrameTime';
import { useKnobReveal } from '../../lab/useKnobReveal';
import { useRefit } from '../../lab/useRefit';
import { useZoomPan, type ZoomPan } from '../../lab/useZoomPan';
import ZoomControls, { ZOOM_STRIP_PX } from '../../lab/ZoomControls';
import type { FlybyHyperbola, FlybyState } from './flybyOrbit';
import { ARROW_PX, RP_RANGE, rpFromDistance, rpKeyTarget } from './flybyScene';
import { LABEL_BASELINE_DROP } from './flybyLabels';
import { SIDE_NAMES } from './flybyPresets';
import {
  CORNER,
  cornerTexts,
  KNOB_CLEARANCE,
  knobLabel,
  labelObstacles,
  NOTE_SIZE,
  NOTE_TEXT,
  placeVInfLabels,
  scaleBarSpot,
  VP_ARROW,
  VP_KEY,
  type CornerTexts,
  type KnobLabel,
  type Panel,
  type VInfLabels,
} from './planetFrameLayout';
import {
  along,
  frameWorld,
  ORIGIN,
  screenFrame,
  TEXT_BAND,
  type ScreenFrame,
} from './planetGeometry';
import { describeRings, type RingOnScreen } from './planetRings';
import { barMaxBesideNote, frameScaleBar, planetScaleUnits } from './planetZoom';
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
  /** Its rate is the time scale the frame declares, in the top band between the two corner texts. */
  clock: SimClock;
  /** r_p (planet radii) asked for by the handle, unclamped. */
  onRpRequest(rp: number): void;
  /** A counter: each change frames the drawing again, as «Ajustar» does (a new encounter, a reset). */
  refit: number;
}

/** Side before the container is measured (SSR, jsdom). */
const FALLBACK_WIDTH = 340;
const MAX_SIDE = 380;
const PROBE_RADIUS = 5;
/** v_rel on the probe: v∞ is drawn ARROW_PX long, and the arrow never grows past this many v∞. */
const VREL_CAP = 2;
const DECIMALS_E = 3;
const DEG = 180 / Math.PI;
/** Decimals of the probe's coordinates: a stable attribute string per frame. */
const PX_DECIMALS = 2;
/**
 * The room a reveal gives the knob, in screen px: its focus ring (11) and the band of the corner
 * texts (TEXT_BAND), so a revealed knob is never under the key, the badge or the bar. The knob's
 * keys and the keyboard's focus reveal it (useKnobReveal); a press to drag it never pans (R30).
 */
const KNOB_REVEAL_RADIUS = KNOB_CLEARANCE + TEXT_BAND;
/**
 * The corner texts are painted over the drawing (a zoomed Saturn's rings reach the corners, and a
 * panned view can bring them under any corner): the V_p key and «planeta agrandado» on a backdrop
 * of the surface (the key's arrow has the planet's color, the rings' own; the note's backdrop
 * stops at its text's descent, so the scale bar's ticks on the line below keep their room), the
 * r_p value with the surface halo of the badge and the scale bar.
 */
const HUD_HALO = { color: SURFACE_COLOR, width: 4 } as const;
const HUD_PAD = 4;
const HUD_RADIUS = 4;
/**
 * What the surface casing under the track, the stretch flown and the periapsis line adds to their
 * width (1,5 px a side): over Saturn's rings their own color has almost no contrast (1,06–1,9:1),
 * against the casing it keeps the 4,5:1 of --fg-muted and --accent on the surface.
 */
const CASING_EXTRA = 3;
const TRACK_WIDTH = 1.5;
const TRAVELLED_WIDTH = LINE_WIDTH + 0.5;
const PERIAPSIS_LINE_WIDTH = 1;
/**
 * Under the frame of a ringed planet: what the rings are and how they are drawn, in words anyone
 * reads (the frame's spoken description and «Qué deja fuera el modelo» say more). Text for Dylan.
 */
export const RINGS_NOTE =
  'Anillos C, B y A, con la división de Cassini, a escala radial y abatidos sobre el plano del sobrevuelo: su plano real está inclinado.';
/** Each ring band's outline in the planet's token, and a ringed globe's contour (px). */
const RING_EDGE_WIDTH = 1;
const GLOBE_CONTOUR_WIDTH = 1.5;
const PERIAPSIS_DASH = '3 3';

interface CasedProps {
  /** Names the trace and its casing (`data-trace`, `data-casing`). */
  name: string;
  color: string;
  width: number;
  /** A path's `d`, or a line from → to. */
  d?: string;
  from?: Point;
  to?: Point;
  dash?: string;
}

/** A trace over a casing of the surface, same geometry and dashes, CASING_EXTRA wider. */
function Cased({ name, color, width, d, from, to, dash }: CasedProps): JSX.Element {
  const shape = (stroke: string, strokeWidth: number, mark: Record<string, string>) =>
    d === undefined ? (
      <line
        {...mark}
        x1={from?.x}
        y1={from?.y}
        x2={to?.x}
        y2={to?.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
      />
    ) : (
      <path
        {...mark}
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
      />
    );
  return (
    <>
      {shape(SURFACE_COLOR, width + CASING_EXTRA, { 'data-casing': name })}
      {shape(color, width, { 'data-trace': name })}
    </>
  );
}

const toPath = (points: Point[]) =>
  points.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

/** The frame in words; `isEnlarged`: the planet (and its rings) drawn larger than to scale. */
function describe({ hyperbola, planet, rp, unit }: PlanetFrameProps, isEnlarged: boolean): string {
  const n = (value: number, precision: number, suffix = '') =>
    formatNumber(value, { precision, unit: suffix });
  return mathTextToString(
    [
      `Sobrevuelo en el marco de ${planet.name}: la sonda llega con v_∞ = ${n(hyperbola.vInf, 2, 'km/s')} y pasa por ${SIDE_NAMES[hyperbola.sense < 0 ? 'behind' : 'front']} a r_p = ${n(rp, 2, unit)}. La hipérbola tiene e = ${n(hyperbola.e, DECIMALS_E)} y gira la velocidad δ = ${n(hyperbola.delta * DEG, 1, '°')}; lejos del planeta sale con la misma rapidez v_∞.`,
      describeRings(planet, rp, unit, isEnlarged),
    ]
      .filter(Boolean)
      .join(' '),
  );
}

interface ProbeLayerProps {
  live: LiveProbe;
  hyperbola: FlybyHyperbola;
  /** The sampled track's τ per sample, the same samples in canvas px, and km → canvas px. */
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
      <Cased name="travelled" d={toPath(travelled)} color={PROBE_COLOR} width={TRAVELLED_WIDTH} />
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

interface CornersProps {
  corners: CornerTexts;
  rpValue: string;
  clock: SimClock;
  planetColor: string;
  isNoteShown: boolean;
  /** The scale bar, drawn by ScaleBarSvg from the same scale it was measured with. */
  scaleBar: ReactNode;
}

/** The texts at the panel's corners: they stay where they are while the drawing zooms, over it. */
function Corners({ corners, rpValue, clock, planetColor, isNoteShown, scaleBar }: CornersProps) {
  const { vpText, vpBox, badge, rpAt, rpBox, noteAt, noteBox } = corners;
  return (
    <g fontFamily={TICK_FONT_FAMILY} fontSize={NOTE_SIZE} className="pointer-events-none">
      <rect
        data-hud-backdrop="vp-key"
        x={vpBox.left - HUD_PAD}
        y={vpBox.top - HUD_PAD}
        width={vpBox.right - vpBox.left + 2 * HUD_PAD}
        height={vpBox.bottom - vpBox.top + 2 * HUD_PAD}
        rx={HUD_RADIUS}
        fill={SURFACE_COLOR}
      />
      <Arrow
        from={{ x: CORNER, y: CORNER + 6 }}
        to={{ x: CORNER + VP_ARROW, y: CORNER + 6 }}
        color={planetColor}
      />
      <MathText source={VP_KEY} x={vpText.x} y={vpText.y} fontSize={NOTE_SIZE} fill={TEXT_COLOR} />
      <TimeScaleBadgeSvg clock={clock} x={badge.x} y={badge.y} />
      <rect
        data-hud-backdrop="rp-value"
        x={rpBox.left - HUD_PAD}
        y={rpBox.top - HUD_PAD}
        width={rpBox.right - rpBox.left + 2 * HUD_PAD}
        height={rpBox.bottom - rpBox.top + 2 * HUD_PAD}
        rx={HUD_RADIUS}
        fill={SURFACE_COLOR}
      />
      <g data-testid="flyby-rp-value">
        <MathText
          source={rpValue}
          x={rpAt.x}
          y={rpAt.y}
          fontSize={NOTE_SIZE}
          fill={TEXT_COLOR}
          anchor="end"
          halo={HUD_HALO}
        />
      </g>
      {isNoteShown ? (
        <>
          <rect
            data-hud-backdrop="note"
            x={noteBox.left - HUD_PAD}
            y={noteBox.top - HUD_PAD}
            width={noteBox.right - noteBox.left + 2 * HUD_PAD}
            height={noteBox.bottom - noteBox.top + HUD_PAD}
            rx={HUD_RADIUS}
            fill={SURFACE_COLOR}
          />
          <text x={noteAt.x} y={noteAt.y} fill={TICK_COLOR} textAnchor="end">
            {NOTE_TEXT}
          </text>
        </>
      ) : null}
      {scaleBar}
    </g>
  );
}

/**
 * The planet's main rings, each a circle at its middle radius as wide as the ring, in its pale
 * fill, then each band's two edges in the token (a 1 px outline): drawn first, so the planet, the
 * periapsis line, the track and the probe go over them.
 */
function Rings({ rings, centre }: { rings: readonly RingOnScreen[]; centre: Point }) {
  if (rings.length === 0) return null;
  const at = { cx: centre.x, cy: centre.y, fill: 'none' } as const;
  return (
    <>
      <g data-testid="flyby-rings">
        {rings.map(({ id, innerPx, outerPx, fill }) => (
          <circle
            key={id}
            data-ring={id}
            {...at}
            r={(innerPx + outerPx) / 2}
            strokeWidth={outerPx - innerPx}
            style={{ stroke: fill }}
          />
        ))}
      </g>
      <g data-ring-edges="" strokeWidth={RING_EDGE_WIDTH}>
        {rings.flatMap(({ id, innerPx, outerPx, color }) =>
          [innerPx, outerPx].map((r) => (
            <circle
              key={`${id}-${r}`}
              data-ring-edge={id}
              {...at}
              r={r}
              style={{ stroke: color }}
            />
          )),
        )}
      </g>
    </>
  );
}

interface DrawingProps {
  screen: ScreenFrame;
  planetColor: string;
  showVectors: boolean;
  labels: VInfLabels;
}

/** The rings, the planet, the periapsis line, the track and the v∞ arrows with their labels. */
function Drawing({ screen, planetColor, showVectors, labels }: DrawingProps) {
  const { centre, periapsis, trackPx, first, last, inTail, outTip } = screen;
  return (
    <>
      <Rings rings={screen.rings} centre={centre} />
      <circle
        data-testid="flyby-planet"
        cx={centre.x}
        cy={centre.y}
        r={screen.planet.radiusPx}
        style={{ fill: planetColor }}
        // A ringed globe is outlined, 3:1 apart from its rings' fills (planetRings.ts).
        stroke={screen.rings.length > 0 ? TEXT_COLOR : undefined}
        strokeWidth={screen.rings.length > 0 ? GLOBE_CONTOUR_WIDTH : undefined}
      />
      <Cased
        name="periapsis"
        from={centre}
        to={periapsis}
        color={TICK_COLOR}
        width={PERIAPSIS_LINE_WIDTH}
        dash={PERIAPSIS_DASH}
      />
      <Cased name="track" d={toPath(trackPx)} color={TRACK_COLOR} width={TRACK_WIDTH} />
      {showVectors ? (
        <>
          <g data-vector="vinf-in">
            <Arrow from={inTail} to={first} color={VINF_COLOR} dashed />
            {labels.in ? (
              <Label at={labels.in.at} dx={0} dy={LABEL_BASELINE_DROP} anchor="middle">
                {labels.in.text}
              </Label>
            ) : null}
          </g>
          <g data-vector="vinf-out">
            <Arrow from={last} to={outTip} color={VINF_COLOR} dashed />
            {labels.out ? (
              <Label at={labels.out.at} dx={0} dy={LABEL_BASELINE_DROP} anchor="middle">
                {labels.out.text}
              </Label>
            ) : null}
          </g>
        </>
      ) : null}
    </>
  );
}

interface KnobKeysInput {
  rp: number;
  onRpRequest(rp: number): void;
  zoom: ZoomPan;
  /** The knob in drawing units: where a reveal brings into view. */
  knobAt: Point;
}

/** The knob's keys (arrows, Page keys, Home and End on the log r_p scale), and its reveal. */
function useKnobKeys({ rp, onRpRequest, zoom, knobAt }: KnobKeysInput) {
  const knob = useKnobReveal({ zoom, at: knobAt, radiusPx: KNOB_REVEAL_RADIUS });
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const next = rpKeyTarget(event.key, event.shiftKey, rp);
    if (next === undefined) return;
    event.preventDefault();
    knob.revealAfterKey(next !== rp);
    onRpRequest(next);
  };
  return { onKeyDown, onFocus: knob.onFocus };
}

interface FrameBodyProps {
  props: PlanetFrameProps;
  panel: Panel;
  zoom: ZoomPan;
  /** Where the planet's centre is drawn (drawing units): the point the zoom buttons keep (R33). */
  anchorRef: { current: Point | undefined };
}

/** Everything the frame draws, from its props, the panel and the zoom's view. */
function useFrameModel({ props, panel, zoom, anchorRef }: FrameBodyProps) {
  const { hyperbola, planet, rp, unit, clock, onRpRequest } = props;
  const { width, height: side } = panel;
  const world = useMemo(
    () => frameWorld(hyperbola, planet, width, side),
    [hyperbola, planet, width, side],
  );
  /** While the handle is dragged the planet stays put, so the pointer maps to r_p stably. */
  const [heldCentre, setHeldCentre] = useState<Point | null>(null);
  const centre = heldCentre ?? world.fitted;
  anchorRef.current = centre;
  const screen = screenFrame(world, centre, zoom.view, hyperbola, planet);
  const pxPerKm = world.view.scale * zoom.view.scale;
  const rpValue = `r_p = ${formatNumber(rp, { precision: 2, unit })}`;
  const corners = cornerTexts(panel, rpValue, clock.rate);
  const isNoteShown = screen.planet.isEnlarged;
  // The bar stops short of «planeta agrandado» on the same bottom line (it touched it at 900 px).
  const barMaxPx = barMaxBesideNote(
    scaleBarSpot(undefined, panel).at.x,
    isNoteShown ? corners.noteBox.left - HUD_PAD : undefined,
  );
  const bar = frameScaleBar(pxPerKm, unit, planet.radiusKm, barMaxPx);
  const barSpot = scaleBarSpot(bar, panel);
  const knob = knobLabel(screen, panel);
  const obstacles = labelObstacles(corners, barSpot, screen, knob, isNoteShown);
  const labels = placeVInfLabels({ screen, world, panel, obstacles, barLine: barSpot.line });
  const half = (side - 2 * TEXT_BAND) / 2;
  const drag = useDrag(({ x, y, phase }: DragPoint) => {
    if (phase === 'start') setHeldCentre(centre);
    if (phase === 'end') setHeldCentre(null);
    const at = zoom.toWorld({ x, y });
    onRpRequest(rpFromDistance(Math.hypot(at.x - centre.x, at.y - centre.y), half));
  });
  const knobAt = along(centre, screen.periDir, world.view.periapsisPx);
  const { onKeyDown, onFocus } = useKnobKeys({ rp, onRpRequest, zoom, knobAt });
  return {
    world,
    screen,
    bar,
    barMaxPx,
    barSpot,
    pxPerKm,
    rpValue,
    corners,
    knob,
    isNoteShown,
    labels,
    drag,
    onKeyDown,
    onFocus,
  };
}

interface HandleProps {
  props: PlanetFrameProps;
  at: Point;
  label: KnobLabel | undefined;
  drag: DragHandlers;
  onKeyDown(event: KeyboardEvent<SVGGElement>): void;
  onFocus(event: FocusEvent<SVGGElement>): void;
}

/** The periapsis handle, a slider on the log r_p scale, and the knob's name beside it. */
function PeriapsisHandle({ props, at, label, drag, onKeyDown, onFocus }: HandleProps) {
  const { rp, unit, planet } = props;
  return (
    <>
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
        onFocus={onFocus}
        {...drag}
      >
        <Knob at={at} fill={TEXT_COLOR} />
      </g>
      {label ? (
        <Label at={label.at} dx={0} dy={LABEL_BASELINE_DROP} anchor={label.anchor}>
          r_p
        </Label>
      ) : null}
    </>
  );
}

type FrameModel = ReturnType<typeof useFrameModel>;

interface FrameSvgProps {
  props: PlanetFrameProps;
  panel: Panel;
  model: FrameModel;
}

/** The drawing's SVG: the rings, the planet and the track, the probe, then the corner texts and scale bar over them, and the knob. */
function FrameSvg({ props, panel, model }: FrameSvgProps): JSX.Element {
  const { hyperbola, planet, unit, live, showVectors, clock } = props;
  const { world, screen, bar, barSpot, pxPerKm, corners, rpValue, isNoteShown } = model;
  const planetColor = `var(${planet.token})`;
  const scaleBar = bar ? (
    <ScaleBarSvg
      pxPerUnit={pxPerKm}
      units={planetScaleUnits(unit, planet.radiusKm)}
      maxPx={model.barMaxPx}
      x={barSpot.at.x}
      y={barSpot.at.y}
    />
  ) : null;
  return (
    <svg
      data-testid="flyby-planet-frame"
      viewBox={`0 0 ${panel.width} ${panel.height}`}
      width="100%"
      className="block h-auto"
    >
      <g role="img" aria-label={describe(props, isNoteShown)}>
        <Drawing
          screen={screen}
          planetColor={planetColor}
          showVectors={showVectors}
          labels={model.labels}
        />
        <ProbeLayer
          live={live}
          hyperbola={hyperbola}
          track={world.track}
          trackPx={screen.trackPx}
          toPx={screen.toPx}
          showVectors={showVectors}
        />
        <Corners
          corners={corners}
          rpValue={rpValue}
          clock={clock}
          planetColor={planetColor}
          isNoteShown={isNoteShown}
          scaleBar={scaleBar}
        />
      </g>
      <PeriapsisHandle
        props={props}
        at={screen.periapsis}
        label={model.knob}
        drag={model.drag}
        onKeyDown={model.onKeyDown}
        onFocus={model.onFocus}
      />
    </svg>
  );
}

/** The flyby in the planet frame, to the scale the log bar sets, through the zoom's view. */
function Frame(body: FrameBodyProps): JSX.Element {
  const { props, panel } = body;
  const model = useFrameModel(body);
  const units = planetScaleUnits(props.unit, props.planet.radiusKm);
  return (
    <>
      <FrameSvg props={props} panel={panel} model={model} />
      <ScaleBarWords pxPerUnit={model.pxPerKm} units={units} maxPx={model.barMaxPx} />
    </>
  );
}

/**
 * The flyby in the planet frame, to the scale the log bar sets: the planet (enlarged only when it
 * would vanish), the hyperbola out to where v∞ is drawn, the probe at τ from periapsis by
 * Kepler's equation, v∞ in and out (equal in length) and the periapsis handle, a slider on the
 * logarithmic r_p scale: drag it, or use the arrow keys, Page keys, Home and End. The canvas
 * zooms (useZoomPan, ZoomControls): the drawing, its scale bar and the planet's size follow the
 * view; the texts of the corners, the arrows' size and the knob do not. The buttons sit in a
 * strip under the square, outside the zoom's canvas, so they never cover the drawing nor pan it.
 */
export default function PlanetFrame(props: PlanetFrameProps): JSX.Element {
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const side = Math.min(width, MAX_SIDE);
  // The buttons and keys zoom about the planet (R33), not the square's centre.
  const anchorRef = useRef<Point | undefined>(undefined);
  const zoom = useZoomPan({
    label: `Marco de ${props.planet.name}`,
    anchor: () => anchorRef.current,
  });
  useRefit(zoom, props.refit);
  return (
    // Never wider than MAX_SIDE: the server draws at FALLBACK_WIDTH with the same proportions, so
    // a frame in a wide column (the two-column lab's stage) keeps its height on hydration (no CLS).
    <div ref={wrapperRef} className="w-full" style={{ maxWidth: MAX_SIDE }}>
      <div {...zoom.viewportProps} className="relative">
        <Frame props={props} panel={{ width, height: side }} zoom={zoom} anchorRef={anchorRef} />
      </div>
      {/* Outside the canvas: the zoom measures the drawing's square (bounds, the buttons' pivot, the
          reveal's margins), and focusing or pressing a button must not pan the drawing. */}
      <div className="flex items-center justify-end px-2" style={{ height: ZOOM_STRIP_PX }}>
        <ZoomControls zoom={zoom} corner="inline" orientation="row" />
      </div>
      {props.planet.rings ? (
        <p data-testid="flyby-rings-note" className="m-0 px-2 text-xs text-fg-muted">
          {RINGS_NOTE}
        </p>
      ) : null}
    </div>
  );
}
