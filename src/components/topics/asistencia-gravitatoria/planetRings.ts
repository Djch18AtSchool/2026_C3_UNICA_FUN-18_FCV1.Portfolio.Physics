/**
 * A planet's main rings in the planet frame, to radial scale: each edge is its distance from the
 * centre in planet radii (planets.ts, from the NSSDCA fact sheet) times the planet's radius on
 * screen, so the rings grow with the zoom, the scale bar stays true for them, and an enlarged
 * planet («planeta agrandado») carries them in proportion. They are drawn as circles in the plane
 * of the flyby: the real ring plane is tilted from it, and what the drawing compares is the
 * distance from the centre, the one r_p is. Pure, in the frame's pixels.
 */
import type { Planet, RingBand } from '../../../lib/data/planets';

/**
 * Share of the planet's color the C ring keeps, mixed with black (CSS color-mix in sRGB): the C
 * ring is darker than B and A (albedo 0,12–0,30 against 0,4–0,6 in the fact sheet). The share
 * keeps C at 3:1 against the page in both themes and apart from B (planetRings.test.ts).
 */
export const C_RING_SHADE = 0.7;
const PERCENT = 100;

export type RingId = RingBand['id'];

export interface RingOnScreen {
  id: RingId;
  innerPx: number;
  outerPx: number;
  color: string;
}

/** The ring's color from the planet's token: B and A as the planet, C darker. */
export function ringColor(id: RingId, token: string): string {
  const planetColor = `var(${token})`;
  if (id !== 'C') return planetColor;
  return `color-mix(in srgb, ${planetColor} ${C_RING_SHADE * PERCENT}%, black)`;
}

/** The planet's rings for a planet drawn `radiusPx` wide on screen; none for a planet without. */
export function ringsOnScreen(planet: Planet, radiusPx: number): readonly RingOnScreen[] {
  const pxPerKm = radiusPx / planet.radiusKm;
  return (planet.rings?.bands ?? []).map(({ id, innerKm, outerKm }) => ({
    id,
    innerPx: innerKm * pxPerKm,
    outerPx: outerKm * pxPerKm,
    color: ringColor(id, planet.token),
  }));
}

/** How far the drawn body reaches from the centre: the outermost ring's edge, or the planet. */
export function bodyRadius(planet: Planet, radiusPx: number): number {
  const rings = ringsOnScreen(planet, radiusPx);
  return rings.length === 0 ? radiusPx : Math.max(...rings.map(({ outerPx }) => outerPx));
}

/** Where r_p falls against the rings: beyond their outer edge, across them, or inside the inner one. */
export type RingPassage = 'outside' | 'across' | 'inside';

/** For r_p in planet radii; undefined for a planet without rings. */
export function ringPassage(planet: Planet, rpRadii: number): RingPassage | undefined {
  const bands = planet.rings?.bands;
  if (!bands || bands.length === 0) return undefined;
  const rpKm = rpRadii * planet.radiusKm;
  if (rpKm > Math.max(...bands.map(({ outerKm }) => outerKm))) return 'outside';
  if (rpKm < Math.min(...bands.map(({ innerKm }) => innerKm))) return 'inside';
  return 'across';
}
