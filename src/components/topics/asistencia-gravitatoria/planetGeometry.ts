/**
 * The planet frame's geometry in two steps. `frameWorld` is the drawing as the lab frames it, in
 * drawing units (the px of the canvas at ×1): the km-to-px scale from r_p, the sampled track and
 * where the planet's centre goes to centre it all. `screenFrame` maps that through the zoom view:
 * positions and the planet's size follow the view, while the v∞ arrows keep their length (a
 * velocity, not a distance), so a mark never grows with the zoom. Pure, in the frame's pixels.
 */
import type { Planet } from '../../../lib/data/planets';
import type { Point } from '../../lab/OverlayMarks';
import { toScreen, type ZoomView } from '../../lab/zoomMath';
import { sampleTrack, type FlybyHyperbola, type TrackPoint } from './flybyOrbit';
import { ARROW_PX, centreOn, planetView, type PlanetView } from './flybyScene';
import { planetOnScreen, type PlanetOnScreen } from './planetZoom';

/**
 * Bands at the top (V_p key, r_p readout) and bottom (scale bar, note) of the panel, px: the
 * drawing is scaled and centred between them, so no arrow or track reaches a corner text.
 */
export const TEXT_BAND = 30;
const TRACK_SAMPLES = 161;
export const ORIGIN: Point = { x: 0, y: 0 };

/** Unit vector on screen for an angle counted counter-clockwise with y up. */
export const direction = (angle: number): Point => ({ x: Math.cos(angle), y: -Math.sin(angle) });
export const along = (p: Point, d: Point, length: number): Point => ({
  x: p.x + d.x * length,
  y: p.y + d.y * length,
});

export interface FrameWorld {
  view: PlanetView;
  track: TrackPoint[];
  /** The track in px from the planet's centre, y down. */
  trackRel: Point[];
  /** Unit vectors of v∞ in and out on screen. */
  inDir: Point;
  outDir: Point;
  /** Where the planet's centre goes so the drawing is centred between the text bands. */
  fitted: Point;
}

/** The drawing at ×1 for a `width` × `side` panel. */
export function frameWorld(
  hyperbola: FlybyHyperbola,
  planet: Planet,
  width: number,
  side: number,
): FrameWorld {
  const drawSide = side - 2 * TEXT_BAND;
  const view = planetView(drawSide, hyperbola.rp, planet.radiusKm);
  const track = sampleTrack(hyperbola, view.reachKm, TRACK_SAMPLES);
  const trackRel = track.map((p) => ({ x: view.scale * p.x, y: -view.scale * p.y }));
  const inDir = direction(hyperbola.thetaIn);
  const outDir = direction(hyperbola.thetaOut);
  const inTail = along(trackRel[0], inDir, -ARROW_PX);
  const outTip = along(trackRel[trackRel.length - 1], outDir, ARROW_PX);
  const planetBox = [-view.planetPx, view.planetPx].map((d) => ({ x: d, y: d }));
  const centred = centreOn([...trackRel, inTail, outTip, ...planetBox], width, drawSide);
  return {
    view,
    track,
    trackRel,
    inDir,
    outDir,
    fitted: { x: centred.x, y: centred.y + TEXT_BAND },
  };
}

export interface ScreenFrame {
  centre: Point;
  planet: PlanetOnScreen;
  /** The track on screen, sample by sample (`world.track`). */
  trackPx: Point[];
  first: Point;
  last: Point;
  /** Where the v∞ arrows start (in) and end (out): ARROW_PX from the track's ends. */
  inTail: Point;
  outTip: Point;
  periapsis: Point;
  periDir: Point;
  /** A point of the planet frame in km (x right, y up from the planet) on screen. */
  toPx(x: number, y: number): Point;
}

/**
 * The drawing on screen: `centre` is where the planet's centre sits in drawing units (the fitted
 * one, or the one held while the handle is dragged) and `zoom` the view that maps them.
 */
export function screenFrame(
  world: FrameWorld,
  centre: Point,
  zoom: ZoomView,
  hyperbola: FlybyHyperbola,
  planet: Planet,
): ScreenFrame {
  const { view, trackRel, inDir, outDir } = world;
  const at = (rel: Point): Point => toScreen(zoom, { x: centre.x + rel.x, y: centre.y + rel.y });
  const trackPx = trackRel.map(at);
  const first = trackPx[0];
  const last = trackPx[trackPx.length - 1];
  const periDir = direction(hyperbola.periapsisAngle);
  return {
    centre: at(ORIGIN),
    planet: planetOnScreen(planet.radiusKm * view.scale, zoom.scale),
    trackPx,
    first,
    last,
    inTail: along(first, inDir, -ARROW_PX),
    outTip: along(last, outDir, ARROW_PX),
    periapsis: at(along(ORIGIN, periDir, view.periapsisPx)),
    periDir,
    toPx: (x, y) => at({ x: view.scale * x, y: -view.scale * y }),
  };
}
