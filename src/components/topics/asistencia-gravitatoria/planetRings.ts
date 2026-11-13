/**
 * A planet's main rings in the planet frame, to radial scale: each edge is its distance from the
 * centre in planet radii (planets.ts, from the NSSDCA fact sheet) times the planet's radius on
 * screen, so the rings grow with the zoom, the scale bar stays true for them, and an enlarged
 * planet («planeta agrandado») carries them in proportion. They are drawn as circles in the plane
 * of the flyby: the real ring plane is tilted from it, and what the drawing compares is the
 * distance from the centre, the one r_p is. Pure, in the frame's pixels.
 */
import type { Planet, RingBand } from '../../../lib/data/planets';
import { formatNumber } from '../../../lib/format';

/**
 * Share of the planet's color the C ring keeps, mixed with black (CSS color-mix in sRGB): the C
 * ring is darker than B and A (albedo 0,12–0,30 against 0,4–0,6 in the fact sheet). The share
 * keeps C at 3:1 against the page in both themes and apart from B (planetRings.test.ts).
 */
export const C_RING_SHADE = 0.7;
const PERCENT = 100;
/** Decimals of the rings' radii in the frame's description (1,24 to 2,27 R_S). */
const RADII_DECIMALS = 2;

export type RingId = RingBand['id'];

export interface RingOnScreen {
  id: RingId;
  innerPx: number;
  outerPx: number;
  /** The edges' color: the planet's token (C darker), ≥ 3:1 on the page. */
  color: string;
  /** The band's fill: paler than the globe (ringFill). */
  fill: string;
}

/**
 * Share of the planet's color in each ring's fill, on the surface: the rings are paler than the
 * globe (icy, and the C ring faint), so a zoomed Saturn reads as a globe in its rings, not as a
 * target of one color. Their edges keep the token (ringColor), so each band still has a 3:1 outline
 * on the page; the globe's contour (--fg) stands 3:1 apart from every fill in both themes
 * (planetRings.test.ts).
 */
export const RING_FILL_SHARE: Readonly<Record<RingId, number>> = { C: 0.3, B: 0.5, A: 0.5 };

/** The ring's fill: the planet's token on the surface, at its share. */
export function ringFill(id: RingId, token: string): string {
  return `color-mix(in srgb, var(${token}) ${RING_FILL_SHARE[id] * PERCENT}%, var(--bg-elevated))`;
}

/** The ring's edge color from the planet's token: B and A as the planet, C darker. */
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
    fill: ringFill(id, planet.token),
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

const PASSAGE_TEXT: Record<RingPassage, string> = {
  outside: 'La máxima aproximación queda por fuera del anillo A.',
  across: 'La máxima aproximación cae a la distancia de los anillos.',
  inside: 'La máxima aproximación queda por dentro del anillo C.',
};

/**
 * The frame's spoken words on the rings (MathText notation, `unit` as «R_S»): their span, how they
 * are drawn (to scale, or in proportion to an enlarged planet), the plane they are drawn in, and
 * where r_p falls. Empty for a planet without rings.
 */
export function describeRings(
  planet: Planet,
  rpRadii: number,
  unit: string,
  isEnlarged = false,
): string {
  const passage = ringPassage(planet, rpRadii);
  const bands = planet.rings?.bands ?? [];
  if (passage === undefined) return '';
  const radii = (km: number) => formatNumber(km / planet.radiusKm, { precision: RADII_DECIMALS });
  const inner = radii(Math.min(...bands.map(({ innerKm }) => innerKm)));
  const outer = radii(Math.max(...bands.map(({ outerKm }) => outerKm)));
  const drawn = isEnlarged
    ? 'van en proporción al planeta, que se dibuja agrandado, en el plano del sobrevuelo'
    : 'van a escala de distancia al centro, dibujados en el plano del sobrevuelo';
  return `Los anillos principales, de ${inner} a ${outer} ${unit}, ${drawn}; su plano real está inclinado. ${PASSAGE_TEXT[passage]}`;
}
