import { z } from 'astro/zod';
import {
  escapeSpeed,
  keplerPropagate,
  orbitFromState,
  planarFlyby,
  specificEnergy,
  visVivaSpeed,
  type Cartesian3,
  type OrbitElements,
  type PassSide,
} from '../physics';
import { requirePositive } from '../physics/validate';
import { AU_KM, GM_SUN, PLANETS, PLANET_IDS, type PlanetId } from './planets';
import rawDataset from '../../data/voyager-speed.json';

/**
 * Voyager 1 and 2 heliocentric speed and distance from NASA/JPL Horizons, written by
 * scripts/generate-voyager-speed.ts (`pnpm run data:voyager`) and validated here on import.
 * Before 1989-08-29 (V2) and 1981-01-01 (V1) Horizons serves a patched-conic mission-design
 * trajectory, then a 2022 refit to tracking data: the page calls it a design trajectory, never a
 * measured one (`sourceNotes`; research §6 and §9).
 */

const MAX_ANGLE_DEG = 180;
const DEG = Math.PI / 180;
const SECONDS_PER_DAY = 86400;
/** Largest |planar v_out − conicAfter| (km/s) for the planar turn to count as reproducing the data. */
const PLANAR_TOLERANCE_KMS = 0.05;
const PASS_SIDES: readonly PassSide[] = ['behind', 'front'];

/**
 * Mass of each Voyager, kg: NASA's Voyager 2 page («1,592 pounds (721.9 kilograms)») and NSSDCA
 * (721.9 kg for both); research §3, CONFIRMADO.
 */
export const VOYAGER_MASS_KG = 721.9;
/** Days on each side of closest approach where ε is taken (research §5, «Δ|v| vis-viva»). */
const JUMP_WINDOW_DAYS = 120;

/** [JD_TDB − jdOffset, |v| (km/s), r (AU)] as stored in the JSON. */
const pointSchema = z.tuple([z.number(), z.number().positive(), z.number().positive()]);

const seriesSchema = z
  .array(pointSchema)
  .min(2)
  .refine((points) => points.every((p, i) => i === 0 || p[0] > points[i - 1][0]), {
    message: 'Los instantes de la serie deben crecer estrictamente',
  });

const angleSchema = z.number().min(0).max(MAX_ANGLE_DEG);

const encounterSchema = z.object({
  probe: z.enum(['V1', 'V2']),
  planet: z.enum(PLANET_IDS as [PlanetId, ...PlanetId[]]),
  /** Closest approach to the minute, UT ('1979-07-09T22:29Z'), from Horizons in 1 min steps. */
  caUtc: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/),
  /** Julian date of closest approach in UT (≈ 50 s behind the series' TDB, negligible here). */
  caJd: z.number(),
  /** Closest distance to the planet's centre, km. */
  rpKm: z.number().positive(),
  /** v∞ = √(2ε_p) of the osculating hyperbola at closest approach, km/s (the patched-conic v∞). */
  vInf: z.number().positive(),
  /** v∞ = √(2ε_p) at the start of the planet-frame window (≈ 10 d before), km/s. */
  vInfIn: z.number().positive(),
  /** v∞ = √(2ε_p) at the end of the planet-frame window (≈ 10 d after), km/s. */
  vInfOut: z.number().positive(),
  /** |V⃗_p|, the planet's heliocentric speed at closest approach, km/s. */
  VpKms: z.number().positive(),
  /** Angle between V⃗_p and the incoming asymptote v⃗∞,in, degrees. */
  thetaInDeg: angleSchema,
  /**
   * Angle between V⃗_p and the outgoing asymptote v⃗∞,out, degrees. With θ_in it rebuilds both
   * conics by the law of cosines even when the turn leaves the plane of V⃗_p and v⃗∞,in.
   */
  thetaOutDeg: angleSchema,
  /** Turn angle δ = 2 asin(1/(1 + r_p v∞²/GM_p)), degrees. */
  deltaDeg: angleSchema,
  /** Patched-conic heliocentric speed before and after, |V⃗_p + v⃗∞|, km/s. */
  conicBefore: z.number().positive(),
  conicAfter: z.number().positive(),
});

const datasetSchema = z.object({
  retrieved: z.iso.date(),
  query: z.object({
    endpoint: z.url(),
    common: z.record(z.string(), z.string()),
    requests: z
      .array(z.object({ id: z.string(), url: z.url(), sources: z.array(z.string()).min(1) }))
      .min(1),
  }),
  sourceNotes: z.object({ V1: z.string().min(1), V2: z.string().min(1) }),
  gmSun: z.number().positive(),
  jdOffset: z.number(),
  columns: z.tuple([z.literal('jdTdbMinusOffset'), z.literal('speedKmS'), z.literal('distanceAu')]),
  series: z.object({ v1: seriesSchema, v2: seriesSchema }),
  encounters: z.array(encounterSchema).min(1),
  /** V2 heliocentric state on 1979-01-01 00:00 TDB (km, km/s, ecliptic J2000). */
  sunOnlyState: z.object({
    jd: z.number(),
    r: z.tuple([z.number(), z.number(), z.number()]),
    v: z.tuple([z.number(), z.number(), z.number()]),
  }),
});

/** One sample: full Julian date (TDB), heliocentric speed (km/s) and distance to the Sun (AU). */
export interface SeriesPoint {
  jd: number;
  speed: number;
  r: number;
}

export type Encounter = z.infer<typeof encounterSchema> & {
  /**
   * The side for which the planar model (θ_in, δ, side) lands within 0,05 km/s of conicAfter, or
   * null when no side does because the real turn leaves the plane («giro fuera del plano»).
   */
  planarSide: PassSide | null;
  planarTurnReproduces: boolean;
};

/** A heliocentric state vector: full JD (TDB), r⃗ (km) and v⃗ (km/s). */
export interface StateVector {
  jd: number;
  r: Cartesian3;
  v: Cartesian3;
}

type RawDataset = z.infer<typeof datasetSchema>;

export interface VoyagerDataset {
  query: RawDataset['query'];
  /** Date the script queried Horizons (ISO). */
  retrieved: string;
  /** The SPACECRAFT TRAJECTORY note of each probe's Horizons header, verbatim. */
  sourceNotes: RawDataset['sourceNotes'];
  /** GM☉ used by the script, km³/s². */
  gmSun: number;
  series: { v1: SeriesPoint[]; v2: SeriesPoint[] };
  encounters: Encounter[];
  /** Where the «solo el Sol» counterfactual starts: V2 on 1979-01-01, before Jupiter. */
  sunOnlyState: StateVector;
}

/** Which side, if any, lets the planar turn reproduce the 3D patched conic of an encounter. */
function planarSideOf(e: z.infer<typeof encounterSchema>): PassSide | null {
  const { gm } = PLANETS[e.planet];
  const reproduces = (side: PassSide) =>
    Math.abs(
      planarFlyby(e.VpKms, e.vInf, e.thetaInDeg * DEG, e.rpKm, gm, side).vOut - e.conicAfter,
    ) < PLANAR_TOLERANCE_KMS;
  return PASS_SIDES.find(reproduces) ?? null;
}

/** Validates the JSON and expands each [jd − offset, |v|, r] triple into a SeriesPoint. */
export function parseVoyagerDataset(raw: unknown): VoyagerDataset {
  const data = datasetSchema.parse(raw);
  const expand = (points: RawDataset['series']['v1']): SeriesPoint[] =>
    points.map(([jd, speed, r]) => ({ jd: data.jdOffset + jd, speed, r }));
  return {
    query: data.query,
    retrieved: data.retrieved,
    sourceNotes: data.sourceNotes,
    gmSun: data.gmSun,
    series: { v1: expand(data.series.v1), v2: expand(data.series.v2) },
    encounters: data.encounters.map((e) => {
      const planarSide = planarSideOf(e);
      return { ...e, planarSide, planarTurnReproduces: planarSide !== null };
    }),
    sunOnlyState: data.sunOnlyState,
  };
}

export const VOYAGER: VoyagerDataset = parseVoyagerDataset(rawDataset);

/** The Sun-only orbit V2 was on before Jupiter (research §5: a = 3,64 AU, e = 0,727). */
export const SUN_ONLY_ORBIT: OrbitElements = orbitFromState(
  VOYAGER.sunOnlyState.r,
  VOYAGER.sunOnlyState.v,
  GM_SUN,
);

/**
 * The «solo el Sol, sin Júpiter» counterfactual: V2's 1979-01-01 state propagated by Kepler with
 * the Sun alone, at each Julian date (TDB, not before the state). Same units as the data series.
 */
export function sunOnlySeries(jds: readonly number[]): SeriesPoint[] {
  const { jd: start, r, v } = VOYAGER.sunOnlyState;
  const times = jds.map((jd) => {
    if (!(jd >= start))
      throw new RangeError(`JD ${jd} is before the counterfactual state ${start}`);
    return (jd - start) * SECONDS_PER_DAY;
  });
  return keplerPropagate(r, v, GM_SUN, times).map((sample, k) => ({
    jd: jds[k],
    speed: sample.speed,
    r: sample.r / AU_KM,
  }));
}

/** Linear interpolation of `value` at `jd`; throws when jd falls outside the series. */
function interpolate(
  series: readonly SeriesPoint[],
  jd: number,
  value: (point: SeriesPoint) => number,
): number {
  const first = series[0];
  const last = series[series.length - 1];
  if (!first || !(jd >= first.jd && jd <= last.jd)) {
    throw new RangeError(`JD ${jd} is outside the series`);
  }
  const k = series.findIndex((point) => point.jd >= jd);
  if (series[k].jd === jd) return value(series[k]);
  const a = series[k - 1];
  const b = series[k];
  const t = (jd - a.jd) / (b.jd - a.jd);
  return value(a) + t * (value(b) - value(a));
}

/**
 * Net speed change of a flyby, measured the way research §5 defines «Δ|v| vis-viva»: the solar
 * specific energy ε = v²/2 − GM☉/r is taken `windowDays` before and after closest approach (out of
 * the planet's pull), and both orbits are compared at the encounter distance r_enc:
 * Δ|v| = √(2(ε_after + GM☉/r_enc)) − √(2(ε_before + GM☉/r_enc)). Unlike |v| ±30 d, it does not
 * mix in the slowing down from climbing out of the Sun's well. Units: km/s, GM in km³/s².
 */
export function encounterJump(
  series: readonly SeriesPoint[],
  caJd: number,
  gmSun: number,
  windowDays: number = JUMP_WINDOW_DAYS,
): number {
  requirePositive('windowDays', windowDays);
  const energy = (p: SeriesPoint) => specificEnergy(p.speed, p.r * AU_KM, gmSun);
  const rEnc = interpolate(series, caJd, (p) => p.r) * AU_KM;
  const before = interpolate(series, caJd - windowDays, energy);
  const after = interpolate(series, caJd + windowDays, energy);
  return visVivaSpeed(rEnc, gmSun, after) - visVivaSpeed(rEnc, gmSun, before);
}

/** Escape speed from the Sun at the probe's distance, √(2GM☉/r), for every sample (km/s). */
export function escapeSpeedSeries(series: readonly SeriesPoint[]): { jd: number; speed: number }[] {
  return series.map((p) => ({ jd: p.jd, speed: escapeSpeed(p.r * AU_KM, GM_SUN) }));
}
