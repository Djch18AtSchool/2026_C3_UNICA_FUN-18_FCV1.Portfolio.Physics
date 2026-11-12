import {
  useCallback,
  useEffect,
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
import { useZoomPan, type ZoomPan } from '../../lab/useZoomPan';
import ZoomControls from '../../lab/ZoomControls';
import type { FlybyHyperbola, FlybyState } from './flybyOrbit';
import { ARROW_PX, RP_RANGE, rpFromDistance, rpKeyTarget } from './flybyScene';
import { LABEL_BASELINE_DROP } from './flybyLabels';
import { SIDE_NAMES } from './flybyPresets';
import {
  CORNER,
  cornerTexts,
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
import { frameScaleBar, planetScaleUnits, ZOOM_STRIP_PX } from './planetZoom';
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
 * texts (TEXT_BAND), so a revealed knob is never under the key, the badge or the bar.
 */
const KNOB_REVEAL_RADIUS = 11 + TEXT_BAND;

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

interface CornersProps {
  corners: CornerTexts;
  rpValue: string;
  clock: SimClock;
  planetColor: string;
  isNoteShown: boolean;
  /** The scale bar, drawn by ScaleBarSvg from the same scale it was measured with. */
  scaleBar: ReactNode;
}

/** The texts at the panel's corners: they stay where they are while the drawing zooms. */
function Corners({ corners, rpValue, clock, planetColor, isNoteShown, scaleBar }: CornersProps) {
  const { vpText, badge, rpAt, noteAt } = corners;
  return (
    <g fontFamily={TICK_FONT_FAMILY} fontSize={NOTE_SIZE} className="pointer-events-none">
      <Arrow
        from={{ x: CORNER, y: CORNER + 6 }}
        to={{ x: CORNER + VP_ARROW, y: CORNER + 6 }}
        color={planetColor}
      />
      <MathText source={VP_KEY} x={vpText.x} y={vpText.y} fontSize={NOTE_SIZE} fill={TEXT_COLOR} />
      <TimeScaleBadgeSvg clock={clock} x={badge.x} y={badge.y} />
      <g data-testid="flyby-rp-value">
        <MathText
          source={rpValue}
          x={rpAt.x}
          y={rpAt.y}
          fontSize={NOTE_SIZE}
          fill={TEXT_COLOR}
          anchor="end"
        />
      </g>
      {isNoteShown ? (
        <text x={noteAt.x} y={noteAt.y} fill={TICK_COLOR} textAnchor="end">
          {NOTE_TEXT}
        </text>
      ) : null}
      {scaleBar}
    </g>
  );
}

interface DrawingProps {
  screen: ScreenFrame;
  planetColor: string;
  showVectors: boolean;
  labels: VInfLabels;
}

/** The planet, the periapsis line, the track and the v∞ arrows with their labels. */
function Drawing({ screen, planetColor, showVectors, labels }: DrawingProps) {
  const { centre, periapsis, trackPx, first, last, inTail, outTip } = screen;
  return (
    <>
      <circle
        data-testid="flyby-planet"
        cx={centre.x}
        cy={centre.y}
        r={screen.planet.radiusPx}
        style={{ fill: planetColor }}
      />
      <line
        x1={centre.x}
        y1={centre.y}
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

/** Each change of `refit` frames the drawing again (not the first value: that is the initial view). */
function useRefit(zoom: ZoomPan, refit: number): void {
  const last = useRef(refit);
  const { fit } = zoom;
  useEffect(() => {
    if (last.current === refit) return;
    last.current = refit;
    fit();
  }, [refit, fit]);
}

/** Whether the element's focus is shown (:focus-visible); a browser without the selector says yes. */
function isFocusShown(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

interface KnobRevealInput {
  rp: number;
  onRpRequest(rp: number): void;
  zoom: ZoomPan;
  /** The knob in drawing units: where a reveal brings into view. */
  knobAt: Point;
}

/**
 * The knob in the view, clear of the texts of the corners. A key that moves it, or the focus
 * that takes it, can leave it out of the view or under those texts at a zoom: the view then
 * pans it back with the texts' band around it. A drag does not: the knob is under the pointer.
 * The canvas reveals any focused handle itself (16 px of margin); the focus asks again, after it,
 * for this larger margin, which wins.
 */
function useKnobReveal({ rp, onRpRequest, zoom, knobAt }: KnobRevealInput) {
  const isRevealPending = useRef(false);
  const { reveal } = zoom;
  const radius = KNOB_REVEAL_RADIUS / zoom.view.scale;
  const revealKnob = useCallback(
    () =>
      reveal({ x: knobAt.x - radius, y: knobAt.y - radius, width: 2 * radius, height: 2 * radius }),
    [reveal, knobAt.x, knobAt.y, radius],
  );
  const latest = useRef(revealKnob);
  latest.current = revealKnob;
  useEffect(() => {
    if (!isRevealPending.current) return;
    isRevealPending.current = false;
    revealKnob();
  }, [revealKnob]);
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const next = rpKeyTarget(event.key, event.shiftKey, rp);
    if (next === undefined) return;
    event.preventDefault();
    isRevealPending.current = next !== rp;
    onRpRequest(next);
  };
  const onFocus = (event: FocusEvent<SVGGElement>) => {
    // Only a focus that shows (the keyboard's): a press on the knob to drag it must not pan the view.
    if (isFocusShown(event.currentTarget)) queueMicrotask(() => latest.current());
  };
  return { onKeyDown, onFocus };
}

interface FrameBodyProps {
  props: PlanetFrameProps;
  panel: Panel;
  zoom: ZoomPan;
}

/** Everything the frame draws, from its props, the panel and the zoom's view. */
function useFrameModel({ props, panel, zoom }: FrameBodyProps) {
  const { hyperbola, planet, rp, unit, clock, onRpRequest } = props;
  const { width, height: side } = panel;
  const world = useMemo(
    () => frameWorld(hyperbola, planet, width, side),
    [hyperbola, planet, width, side],
  );
  /** While the handle is dragged the planet stays put, so the pointer maps to r_p stably. */
  const [heldCentre, setHeldCentre] = useState<Point | null>(null);
  const centre = heldCentre ?? world.fitted;
  const screen = screenFrame(world, centre, zoom.view, hyperbola, planet);
  const pxPerKm = world.view.scale * zoom.view.scale;
  const bar = frameScaleBar(pxPerKm, unit, planet.radiusKm);
  const barSpot = scaleBarSpot(bar, panel);
  const rpValue = `r_p = ${formatNumber(rp, { precision: 2, unit })}`;
  const corners = cornerTexts(panel, rpValue, clock.rate);
  const knob = knobLabel(screen, panel);
  const isNoteShown = screen.planet.isEnlarged;
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
  const { onKeyDown, onFocus } = useKnobReveal({ rp, onRpRequest, zoom, knobAt });
  return {
    world,
    screen,
    bar,
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

/** The flyby in the planet frame, to the scale the log bar sets, through the zoom's view. */
function Frame({ props, panel, zoom }: FrameBodyProps): JSX.Element {
  const { hyperbola, planet, unit, live, showVectors, clock } = props;
  const model = useFrameModel({ props, panel, zoom });
  const { world, screen, bar, barSpot, pxPerKm, corners, rpValue, isNoteShown } = model;
  const planetColor = `var(${planet.token})`;
  const units = planetScaleUnits(unit, planet.radiusKm);
  return (
    <>
      <svg
        data-testid="flyby-planet-frame"
        viewBox={`0 0 ${panel.width} ${panel.height}`}
        width="100%"
        className="block h-auto"
      >
        <g role="img" aria-label={describe(props)}>
          <Corners
            corners={corners}
            rpValue={rpValue}
            clock={clock}
            planetColor={planetColor}
            isNoteShown={isNoteShown}
            scaleBar={
              bar ? (
                <ScaleBarSvg pxPerUnit={pxPerKm} units={units} x={barSpot.at.x} y={barSpot.at.y} />
              ) : null
            }
          />
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
      <ScaleBarWords pxPerUnit={pxPerKm} units={units} />
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
 * strip under the square, so they never cover the drawing at the lab's own framing.
 */
export default function PlanetFrame(props: PlanetFrameProps): JSX.Element {
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const side = Math.min(width, MAX_SIDE);
  const zoom = useZoomPan({ label: `Marco de ${props.planet.name}` });
  useRefit(zoom, props.refit);
  return (
    // Never wider than MAX_SIDE: the server draws at FALLBACK_WIDTH with the same proportions, so
    // a frame in a wide column (the two-column lab's stage) keeps its height on hydration (no CLS).
    <div ref={wrapperRef} className="w-full" style={{ maxWidth: MAX_SIDE }}>
      <div {...zoom.viewportProps} className="relative">
        <Frame props={props} panel={{ width, height: side }} zoom={zoom} />
        <div className="flex items-center justify-end px-2" style={{ height: ZOOM_STRIP_PX }}>
          <ZoomControls zoom={zoom} corner="inline" orientation="row" />
        </div>
      </div>
    </div>
  );
}
