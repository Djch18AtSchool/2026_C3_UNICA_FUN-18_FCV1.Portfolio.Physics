import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { contrastRatio } from '../../../lib/color';
import { PLANETS, PLANET_IDS, type Planet } from '../../../lib/data/planets';
import { IDENTITY_VIEW, type ZoomView } from '../../lab/zoomMath';
import { flybyHyperbola } from './flybyOrbit';
import { FLYBY_PRESETS } from './flybyPresets';
import { ARROW_PX } from './flybyScene';
import { frameWorld, screenFrame, TEXT_BAND } from './planetGeometry';
import {
  bodyRadius,
  C_RING_SHADE,
  ringColor,
  ringPassage,
  ringsOnScreen,
  type RingOnScreen,
} from './planetRings';

const saturn = PLANETS.saturn;
const RADIUS_PX = 10;
const DEG = Math.PI / 180;
const SIDE = 380;
const ZOOMS = [1, 2, 4, 8];
const zoomed = (scale: number): ZoomView => ({ scale, x: 0, y: 0 });
const inRadii = (px: number, radiusPx: number) => Number((px / radiusPx).toFixed(3));
const ringA = (rings: readonly RingOnScreen[]) => rings[rings.length - 1];

describe('ringsOnScreen', () => {
  test('draws no ring for Jupiter, Uranus or Neptune', () => {
    for (const id of PLANET_IDS.filter((planet) => planet !== 'saturn')) {
      expect(ringsOnScreen(PLANETS[id], RADIUS_PX)).toEqual([]);
    }
  });

  test('puts Saturn’s C, B and A at their radii in R_S: 1,239 to 2,270, with the Cassini gap', () => {
    const rings = ringsOnScreen(saturn, RADIUS_PX);

    expect(rings.map(({ id }) => id)).toEqual(['C', 'B', 'A']);
    expect(
      rings.flatMap(({ innerPx, outerPx }) =>
        [innerPx, outerPx].map((px) => inRadii(px, RADIUS_PX)),
      ),
    ).toEqual([1.239, 1.526, 1.526, 1.95, 2.03, 2.27]);
    // The Cassini division: nothing is drawn between B's outer edge and A's inner one.
    expect(inRadii(rings[2].innerPx - rings[1].outerPx, RADIUS_PX)).toBe(0.08);
  });

  test('grows with the planet on screen: twice the radius, twice every edge', () => {
    const once = ringsOnScreen(saturn, RADIUS_PX);
    const twice = ringsOnScreen(saturn, 2 * RADIUS_PX);

    twice.forEach((ring, k) => {
      expect(ring.innerPx).toBeCloseTo(2 * once[k].innerPx, 9);
      expect(ring.outerPx).toBeCloseTo(2 * once[k].outerPx, 9);
    });
  });
});

describe('bodyRadius', () => {
  test('is the A ring’s outer edge for Saturn and the planet’s radius for the others', () => {
    expect(inRadii(bodyRadius(saturn, RADIUS_PX), RADIUS_PX)).toBe(2.27);
    expect(bodyRadius(PLANETS.jupiter, RADIUS_PX)).toBe(RADIUS_PX);
  });
});

describe('ringPassage', () => {
  test('says where r_p (planet radii) falls against the rings, and nothing for a planet without them', () => {
    expect(ringPassage(saturn, 2.67)).toBe('outside');
    expect(ringPassage(saturn, 2.0)).toBe('across');
    expect(ringPassage(saturn, 1.1)).toBe('inside');
    expect(ringPassage(PLANETS.jupiter, 2.0)).toBeUndefined();
  });
});

describe('the Voyagers at Saturn pass just outside the A ring (the lab’s data)', () => {
  const saturnPresets = FLYBY_PRESETS.filter(({ values }) => values.encounter.planet === 'saturn');

  test('V2 at 2,67 R_S and V1 at 3,05 R_S, outside 2,27 R_S', () => {
    expect(saturnPresets.map(({ id, values }) => [id, Number(values.rp.toFixed(2))])).toEqual([
      ['v2-saturn', 2.67],
      ['v1-saturn', 3.05],
    ]);
    for (const { values } of saturnPresets) expect(ringPassage(saturn, values.rp)).toBe('outside');
  });

  test.each(ZOOMS)(
    'the drawn periapsis lies beyond the drawn A ring at ×%d, true to scale',
    (scale) => {
      for (const { values } of saturnPresets) {
        const { encounter, rp, side } = values;
        const hyperbola = flybyHyperbola({
          vInf: encounter.vInf,
          rp: rp * saturn.radiusKm,
          GM: saturn.gm,
          thetaIn: encounter.thetaInDeg * DEG,
          side,
        });
        const world = frameWorld(hyperbola, saturn, SIDE, SIDE);
        const screen = screenFrame(world, world.fitted, zoomed(scale), hyperbola, saturn);
        const periapsisPx = Math.hypot(
          screen.periapsis.x - screen.centre.x,
          screen.periapsis.y - screen.centre.y,
        );
        const outer = ringA(screen.rings).outerPx;

        expect(screen.planet.isEnlarged).toBe(false);
        expect(periapsisPx).toBeGreaterThan(outer);
        // The gap is the data's, in R_S: r_p − 2,27.
        expect((periapsisPx - outer) / screen.planet.radiusPx).toBeCloseTo(rp - 2.2695, 3);
      }
    },
  );
});

describe('screenFrame carries the rings', () => {
  const hyperbola = flybyHyperbola({
    vInf: 10,
    rp: 2.67 * saturn.radiusKm,
    GM: saturn.gm,
    thetaIn: 100 * DEG,
    side: 'behind',
  });
  const world = frameWorld(hyperbola, saturn, SIDE, SIDE);

  test('scaled by the zoom, so the scale bar stays true for them', () => {
    const at1 = screenFrame(world, world.fitted, IDENTITY_VIEW, hyperbola, saturn);
    const at4 = screenFrame(world, world.fitted, zoomed(4), hyperbola, saturn);

    expect(ringA(at4.rings).outerPx).toBeCloseTo(4 * ringA(at1.rings).outerPx, 9);
    expect(ringA(at1.rings).outerPx).toBeCloseTo(2.2695 * saturn.radiusKm * world.view.scale, 3);
  });

  test.each([1, 100])(
    'frameWorld centres the drawing with the whole ring system in it (r_p = %d R_S)',
    (rpRadii) => {
      const pass = flybyHyperbola({
        vInf: 10,
        rp: rpRadii * saturn.radiusKm,
        GM: saturn.gm,
        thetaIn: 100 * DEG,
        side: 'behind',
      });
      const passWorld = frameWorld(pass, saturn, SIDE, SIDE);
      const { trackRel, inDir, outDir, fitted } = passWorld;
      const body = bodyRadius(saturn, passWorld.view.planetPx);
      const [first, last] = [trackRel[0], trackRel[trackRel.length - 1]];
      const points = [
        ...trackRel,
        { x: first.x - inDir.x * ARROW_PX, y: first.y - inDir.y * ARROW_PX },
        { x: last.x + outDir.x * ARROW_PX, y: last.y + outDir.y * ARROW_PX },
        { x: -body, y: -body },
        { x: body, y: body },
      ];
      const xs = points.map((p) => p.x + fitted.x);
      const ys = points.map((p) => p.y + fitted.y - TEXT_BAND);

      expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(SIDE / 2, 9);
      expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo((SIDE - 2 * TEXT_BAND) / 2, 9);
    },
  );

  test('an enlarged Saturn carries its rings in proportion, never inside the disc', () => {
    const far = flybyHyperbola({
      vInf: 10,
      rp: 100 * saturn.radiusKm,
      GM: saturn.gm,
      thetaIn: 100 * DEG,
      side: 'behind',
    });
    const farWorld = frameWorld(far, saturn, SIDE, SIDE);
    const screen = screenFrame(farWorld, farWorld.fitted, IDENTITY_VIEW, far, saturn);

    expect(screen.planet.isEnlarged).toBe(true);
    expect(inRadii(screen.rings[0].innerPx, screen.planet.radiusPx)).toBe(1.239);
  });
});

/** The tokens of each theme, as tokens.test.ts reads them. */
function themeTokens(): Record<'light' | 'dark', Record<string, string>> {
  const css = readFileSync(
    fileURLToPath(new URL('../../../styles/tokens.css', import.meta.url)),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '');
  const [light, dark] = [...css.matchAll(/\{([^{}]*)\}/g)].map(([, body]) =>
    Object.fromEntries(
      [...body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]),
    ),
  );
  return { light, dark };
}

/** color-mix(in srgb, hex share, black): each gamma-encoded channel times the share. */
function shade(hex: string, share: number): string {
  const channels = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * share));
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

describe('ring colors (real-world: Saturn’s sand; the C ring darker, as its lower albedo)', () => {
  const planet: Planet = saturn;

  test('B and A take the planet’s token; C the token mixed with black', () => {
    expect(ringColor('B', planet.token)).toBe('var(--saturn)');
    expect(ringColor('A', planet.token)).toBe('var(--saturn)');
    expect(ringColor('C', planet.token)).toBe(
      `color-mix(in srgb, var(--saturn) ${C_RING_SHADE * 100}%, black)`,
    );
  });

  test.each(['light', 'dark'] as const)(
    'in the %s theme the C ring keeps 3:1 against both surfaces and stands apart from B',
    (theme) => {
      const tokens = themeTokens()[theme];
      const c = shade(tokens.saturn, C_RING_SHADE);
      for (const surface of [tokens.bg, tokens['bg-elevated']]) {
        expect(contrastRatio(c, surface)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(tokens.saturn, surface)).toBeGreaterThanOrEqual(3);
      }
      expect(contrastRatio(c, tokens.saturn)).toBeGreaterThanOrEqual(1.5);
    },
  );
});
