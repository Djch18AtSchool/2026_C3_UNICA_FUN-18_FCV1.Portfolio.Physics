import { describe, expect, test } from 'vitest';
import { PLANETS } from '../../../lib/data/planets';
import { IDENTITY_VIEW, type ZoomView } from '../../lab/zoomMath';
import { flybyHyperbola } from './flybyOrbit';
import { ARROW_PX } from './flybyScene';
import { frameWorld, screenFrame } from './planetGeometry';

const WIDTH = 380;
const SIDE = 380;
const DEG = Math.PI / 180;
const planet = PLANETS.jupiter;
const hyperbola = flybyHyperbola({
  vInf: 10.7,
  rp: 10.09 * planet.radiusKm,
  GM: planet.gm,
  thetaIn: 100 * DEG,
  side: 'behind',
});
const world = frameWorld(hyperbola, planet, WIDTH, SIDE);
const drawn = { x: 120, y: 190 };
const zoomed = (scale: number, about = { x: 0, y: 0 }): ZoomView => ({
  scale,
  x: about.x * (1 - scale),
  y: about.y * (1 - scale),
});
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe('frameWorld', () => {
  test('centres the drawing, arrows and planet, between the text bands of the panel', () => {
    const { fitted, view, trackRel, inDir, outDir } = world;
    const first = trackRel[0];
    const last = trackRel[trackRel.length - 1];
    const points = [
      ...trackRel,
      { x: first.x - inDir.x * ARROW_PX, y: first.y - inDir.y * ARROW_PX },
      { x: last.x + outDir.x * ARROW_PX, y: last.y + outDir.y * ARROW_PX },
      { x: -view.planetPx, y: -view.planetPx },
      { x: view.planetPx, y: view.planetPx },
    ];
    const xs = points.map((p) => p.x + fitted.x);
    const ys = points.map((p) => p.y + fitted.y);

    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(WIDTH / 2, 9);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(SIDE / 2, 9);
  });

  test('samples the track in px from the planet, y down, with the unit vectors of its ends', () => {
    expect(world.trackRel).toHaveLength(world.track.length);
    expect(world.trackRel[0].x).toBeCloseTo(world.view.scale * world.track[0].x, 9);
    expect(world.trackRel[0].y).toBeCloseTo(-world.view.scale * world.track[0].y, 9);
    expect(Math.hypot(world.inDir.x, world.inDir.y)).toBeCloseTo(1, 12);
    expect(Math.hypot(world.outDir.x, world.outDir.y)).toBeCloseTo(1, 12);
  });
});

describe('screenFrame', () => {
  test('at the identity view is the drawing itself: planet centre, track and periapsis', () => {
    const screen = screenFrame(world, drawn, IDENTITY_VIEW, hyperbola, planet);

    expect(screen.centre).toEqual(drawn);
    expect(screen.trackPx[0].x).toBeCloseTo(drawn.x + world.trackRel[0].x, 9);
    expect(screen.trackPx[0].y).toBeCloseTo(drawn.y + world.trackRel[0].y, 9);
    expect(distance(screen.periapsis, screen.centre)).toBeCloseTo(world.view.periapsisPx, 9);
    expect(screen.planet.radiusPx).toBeCloseTo(Math.max(planet.radiusKm * world.view.scale, 4), 9);
  });

  test('zoomed, every position grows with the view and the planet with it', () => {
    const base = screenFrame(world, drawn, IDENTITY_VIEW, hyperbola, planet);
    const view = zoomed(2, drawn);
    const screen = screenFrame(world, drawn, view, hyperbola, planet);

    expect(screen.centre.x).toBeCloseTo(drawn.x, 9);
    expect(distance(screen.periapsis, screen.centre)).toBeCloseTo(
      2 * distance(base.periapsis, base.centre),
      9,
    );
    expect(distance(screen.first, screen.centre)).toBeCloseTo(
      2 * distance(base.first, base.centre),
      9,
    );
    expect(screen.planet.radiusPx).toBeCloseTo(2 * base.planet.radiusPx, 9);
  });

  test("about any other point the planet's centre moves with the view, and so does everything on it", () => {
    const about = { x: 300, y: 60 };
    const view = zoomed(2, about);
    const base = screenFrame(world, drawn, IDENTITY_VIEW, hyperbola, planet);
    const screen = screenFrame(world, drawn, view, hyperbola, planet);

    // screen = drawing · scale + (x, y): the centre is not where it was.
    expect(screen.centre.x).toBeCloseTo(drawn.x * 2 + view.x, 9);
    expect(screen.centre.y).toBeCloseTo(drawn.y * 2 + view.y, 9);
    expect(screen.centre.x).not.toBeCloseTo(drawn.x, 3);
    expect(screen.periapsis.x - screen.centre.x).toBeCloseTo(
      2 * (base.periapsis.x - base.centre.x),
      9,
    );
  });

  test('the v∞ arrows keep their length at any zoom: they are a velocity, not a distance', () => {
    for (const scale of [1, 2, 8]) {
      const screen = screenFrame(world, drawn, zoomed(scale, drawn), hyperbola, planet);

      expect(distance(screen.inTail, screen.first)).toBeCloseTo(ARROW_PX, 9);
      expect(distance(screen.last, screen.outTip)).toBeCloseTo(ARROW_PX, 9);
    }
  });

  test('toPx puts a point in km where the track is drawn: the first sample is the first track point', () => {
    const view = zoomed(3, { x: 50, y: 60 });
    const screen = screenFrame(world, drawn, view, hyperbola, planet);
    const { x, y } = world.track[10];

    const point = screen.toPx(x, y);

    expect(point.x).toBeCloseTo(screen.trackPx[10].x, 9);
    expect(point.y).toBeCloseTo(screen.trackPx[10].y, 9);
  });

  test('does not change its inputs', () => {
    const view = Object.freeze(zoomed(2));
    const held = Object.freeze({ ...drawn });

    expect(() => screenFrame(world, held, view, hyperbola, planet)).not.toThrow();
  });
});
