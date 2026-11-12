/**
 * The Sun and the four giant planets the Voyagers flew past, in the kernel's units (km, kg,
 * km³/s²). Sources: JPL Astrodynamic Parameters (https://ssd.jpl.nasa.gov/astro_par.html, DE440)
 * for GM☉ and the astronomical unit; the physical-data header that JPL Horizons prints for each
 * planet (OBJ_DATA='YES') for its GM, equatorial radius and mass. All accessed 2026-10-30;
 * docs/superpowers/research/2026-10-30-asistencia-gravitatoria.md, section 4.
 *
 * Each GM is the planet's own (body) GM, not the planet-plus-moons system GM of DE440: the flyby
 * hyperbola is computed in the planet-centred frame (research §9).
 */

/** Heliocentric gravitational constant GM☉, km³/s² (astro_par: 1.32712440041279419 × 10²⁰ m³/s²). */
export const GM_SUN = 132712440041.279419;

/** Astronomical unit, km (astro_par: 149 597 870 700 m). */
export const AU_KM = 149597870.7;

export type PlanetId = 'jupiter' | 'saturn' | 'uranus' | 'neptune';

/** Order from the Sun, the order of the Voyager 2 encounters. */
export const PLANET_IDS: readonly PlanetId[] = ['jupiter', 'saturn', 'uranus', 'neptune'];

export interface Planet {
  id: PlanetId;
  /** Spanish name, as the page writes it. */
  name: string;
  /** NAIF/Horizons body code (the COMMAND of a Horizons request). */
  naifId: number;
  /** GM of the body, km³/s². */
  gm: number;
  /** Equatorial radius at the 1 bar level, km. */
  radiusKm: number;
  massKg: number;
  /** Semantic color token (spec §4.3). */
  token: `--${PlanetId}`;
  source: string;
  /** The main rings the planet frame draws to radial scale (Saturn only). */
  rings?: PlanetRings;
}

/** One main ring between two distances from the planet's centre, km. */
export interface RingBand {
  id: 'C' | 'B' | 'A';
  innerKm: number;
  outerKm: number;
}

/** A planet's main rings, innermost first, with the source of their edges. */
export interface PlanetRings {
  bands: readonly RingBand[];
  source: string;
  url: string;
}

/**
 * Saturn's C, B and A rings from the NSSDCA Saturnian Rings Fact Sheet (D. R. Williams, last
 * updated 2022-04-19; radii over Saturn's 60 268 km equator): C 74 658–91 975 km, B 91 975–
 * 117 507 km, A 122 340–136 780 km; the Cassini division is the gap between B and A (1,950 to
 * 2,030 R_S). The faint D, F, G and E rings are left out. Research §10.
 */
const SATURN_RINGS: PlanetRings = {
  bands: [
    { id: 'C', innerKm: 74658, outerKm: 91975 },
    { id: 'B', innerKm: 91975, outerKm: 117507 },
    { id: 'A', innerKm: 122340, outerKm: 136780 },
  ],
  source:
    'NASA NSSDCA, Saturnian Rings Fact Sheet (D. R. Williams, actualizada el 2022-04-19), consultado el 2026-11-12',
  url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html',
};

const ACCESSED = 'consultado el 2026-10-30';

function horizonsSource(name: string, revised: string): string {
  return `JPL Horizons, datos físicos de ${name} (revisión del ${revised}), ${ACCESSED}`;
}

export const PLANETS: Readonly<Record<PlanetId, Planet>> = {
  jupiter: {
    id: 'jupiter',
    name: 'Júpiter',
    naifId: 599,
    gm: 126686531.9,
    radiusKm: 71492,
    massKg: 18.9819e26,
    token: '--jupiter',
    source: horizonsSource('Júpiter', '2025-01-30'),
  },
  saturn: {
    id: 'saturn',
    name: 'Saturno',
    naifId: 699,
    gm: 37931206.234,
    radiusKm: 60268,
    massKg: 5.6834e26,
    token: '--saturn',
    source: horizonsSource('Saturno', '2022-01-26'),
    rings: SATURN_RINGS,
  },
  uranus: {
    id: 'uranus',
    name: 'Urano',
    naifId: 799,
    gm: 5793950.6103,
    radiusKm: 25559,
    massKg: 86.813e24,
    token: '--uranus',
    source: horizonsSource('Urano', '2025-09-25'),
  },
  neptune: {
    id: 'neptune',
    name: 'Neptuno',
    naifId: 899,
    gm: 6835099.97,
    radiusKm: 24766,
    massKg: 102.409e24,
    token: '--neptune',
    source: horizonsSource('Neptuno', '2026-07-08'),
  },
};
