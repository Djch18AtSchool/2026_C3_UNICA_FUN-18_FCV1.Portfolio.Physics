/**
 * Data of Tema 9's step figures, from the Horizons dataset and the kernel. Paso 1: V2's speed
 * against distance follows vis-viva with the Sun alone, bound before Jupiter and hyperbolic
 * after. Paso 2: the V2 hyperbola in Jupiter's frame. Paso 3: the velocity triangles back in the
 * Sun's frame (Jupiter and Neptune) and Jupiter's recoil. Pure.
 */
import { AU_KM, GM_SUN, PLANETS, type PlanetId } from '../../../lib/data/planets';
import {
  SUN_ONLY_ORBIT,
  VOYAGER,
  VOYAGER_MASS_KG,
  type Encounter,
} from '../../../lib/data/voyager';
import { formatNumber } from '../../../lib/format';
import {
  deltaVMagnitude,
  escapeSpeed,
  hyperbolicEccentricity,
  recoilSpeed,
  specificEnergy,
  turnAngle,
  visVivaSpeed,
} from '../../../lib/physics';
import { MISSION, valueAt, type ChartPoint } from './voyagerChartData';

const DEG = Math.PI / 180;
const M_PER_KM = 1000;
/** Paso 1 leaves out the first 40 days, still in the Earth's pull. */
const LAUNCH_SKIP_DAYS = 40;
/** …and the last 60 days before each encounter and the first 120 after it (the planet's pull). */
const APPROACH_DAYS = 60;
const DEPARTURE_DAYS = 120;
/** One dot every this many samples of the 5-day series (every 20 days). */
const DOT_EVERY = 4;
const CURVE_SAMPLES = 80;
/** Paso 1's curves end at the edge of its distance axis, past Saturn's orbit (≈ 9,6 UA). */
const R_MAX_AU = 11;
const ESCAPE_R_MIN_AU = 1;
/** Paso 2 draws the hyperbola out to this distance from the planet, in planet radii. */
const PATH_EXTENT_RADII = 60;
const PATH_SAMPLES = 121;
/** Length of the v∞ arrows in Paso 2, in planet radii. */
const ARROW_RADII = 18;
const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const MINUS = '−';

function v2Encounter(planet: PlanetId): Encounter {
  const encounter = VOYAGER.encounters.find((e) => e.probe === 'V2' && e.planet === planet);
  if (!encounter) throw new Error(`Faltan los datos del encuentro de la V2 con ${planet}`);
  return encounter;
}

const linspace = (from: number, to: number, count: number) =>
  Array.from({ length: count }, (_, i) => from + ((to - from) * i) / (count - 1));

export interface VisVivaFigure {
  /** V2 samples (r in UA, |v| in km/s) before Jupiter and between Jupiter and Saturn. */
  before: ChartPoint[];
  after: ChartPoint[];
  /** ε of the Sun-only orbit of 1979-01-01 (< 0) and the mean ε between Jupiter and Saturn. */
  boundEnergy: number;
  afterEnergy: number;
  /** v(r) by vis-viva with each energy, and the escape speed √(2GM☉/r) (ε = 0). */
  boundCurve: ChartPoint[];
  afterCurve: ChartPoint[];
  escapeCurve: ChartPoint[];
  /** Where the bound orbit turns back: 6,29 UA at 6,21 km/s. */
  aphelion: ChartPoint;
  /** V2's distance to the Sun at Jupiter's closest approach, UA. */
  jupiterR: number;
}

/** V2 samples between two dates, as (r, |v|) points. */
function samplesBetween(from: number, to: number) {
  return VOYAGER.series.v2.filter((p) => p.jd >= from && p.jd <= to);
}

const speedAt = (rAu: number, energy: number) => visVivaSpeed(rAu * AU_KM, GM_SUN, energy);

export function visVivaFigure(): VisVivaFigure {
  const jupiter = v2Encounter('jupiter').caJd;
  const saturn = v2Encounter('saturn').caJd;
  const toPoint = (p: { r: number; speed: number }) => ({ x: p.r, y: p.speed });
  const thin = <T>(items: T[]) => items.filter((_, i) => i % DOT_EVERY === 0);
  const beforeSamples = samplesBetween(
    VOYAGER.series.v2[0].jd + LAUNCH_SKIP_DAYS,
    jupiter - APPROACH_DAYS,
  );
  const afterSamples = samplesBetween(jupiter + DEPARTURE_DAYS, saturn - APPROACH_DAYS);
  const energies = afterSamples.map((p) => specificEnergy(p.speed, p.r * AU_KM, GM_SUN));
  const afterEnergy = energies.reduce((sum, e) => sum + e, 0) / energies.length;
  const boundEnergy = SUN_ONLY_ORBIT.energy;
  const perihelion = SUN_ONLY_ORBIT.perihelion / AU_KM;
  const aphelionR = SUN_ONLY_ORBIT.aphelion / AU_KM;
  const jupiterR = valueAt(MISSION.distance.v2, jupiter) ?? NaN;
  const curve = (from: number, to: number, energy: number) =>
    linspace(from, to, CURVE_SAMPLES).map((r) => ({ x: r, y: speedAt(r, energy) }));
  const boundCurve = curve(perihelion, aphelionR, boundEnergy);
  return {
    before: thin(beforeSamples).map(toPoint),
    after: thin(afterSamples).map(toPoint),
    boundEnergy,
    afterEnergy,
    boundCurve,
    afterCurve: curve(jupiterR, R_MAX_AU, afterEnergy),
    escapeCurve: linspace(ESCAPE_R_MIN_AU, R_MAX_AU, CURVE_SAMPLES).map((r) => ({
      x: r,
      y: escapeSpeed(r * AU_KM, GM_SUN),
    })),
    aphelion: boundCurve[boundCurve.length - 1],
    jupiterR,
  };
}

export interface Arrow {
  from: ChartPoint;
  to: ChartPoint;
}

export interface HyperbolaFigure {
  /** v∞ of the osculating hyperbola at closest approach, km/s. */
  vInf: number;
  rpKm: number;
  /** Lengths in Jupiter radii (R_J = 71 492 km). */
  rpRadii: number;
  e: number;
  deltaDeg: number;
  /** The path with Jupiter at the origin and periapsis on +x, in R_J. */
  path: ChartPoint[];
  /** Where the asymptotes cross, (r_p + |a|, 0), in R_J. */
  center: ChartPoint;
  /** Unit directions of v⃗∞ before and after. */
  inDir: ChartPoint;
  outDir: ChartPoint;
  /** Equal-length v∞ arrows at the two ends of the path, in R_J. */
  inArrow: Arrow;
  outArrow: Arrow;
}

/** Paso 2: V2 at Jupiter in the planet's frame, a hyperbola with e = 1 + r_p v∞²/GM. */
export function hyperbolaFigure(): HyperbolaFigure {
  const encounter = v2Encounter('jupiter');
  const { gm, radiusKm } = PLANETS.jupiter;
  const { vInf, rpKm } = encounter;
  const e = hyperbolicEccentricity(vInf, rpKm, gm);
  const delta = turnAngle(vInf, rpKm, gm);
  const rp = rpKm / radiusKm;
  const semiAxis = gm / (vInf * vInf) / radiusKm;
  const semiLatus = rp * (1 + e);
  const fMax = Math.acos((semiLatus / PATH_EXTENT_RADII - 1) / e);
  const path = linspace(-fMax, fMax, PATH_SAMPLES).map((f) => {
    const r = semiLatus / (1 + e * Math.cos(f));
    return { x: r * Math.cos(f), y: r * Math.sin(f) };
  });
  // The asymptotes of r = p/(1 + e cos f) point at f = ±acos(−1/e).
  const along = Math.sqrt(1 - 1 / (e * e));
  const inDir = { x: 1 / e, y: along };
  const outDir = { x: -1 / e, y: along };
  const start = path[0];
  const end = path[path.length - 1];
  return {
    vInf,
    rpKm,
    rpRadii: rp,
    e,
    deltaDeg: delta / DEG,
    path,
    center: { x: rp + semiAxis, y: 0 },
    inDir,
    outDir,
    inArrow: {
      from: start,
      to: { x: start.x + ARROW_RADII * inDir.x, y: start.y + ARROW_RADII * inDir.y },
    },
    outArrow: {
      from: { x: end.x - ARROW_RADII * outDir.x, y: end.y - ARROW_RADII * outDir.y },
      to: end,
    },
  };
}

export interface VelocityTriangle {
  planet: PlanetId;
  /** |V⃗_p| and v∞ (km/s) and the angles of v⃗∞ with V⃗_p before and after (degrees). */
  Vp: number;
  vInf: number;
  thetaInDeg: number;
  thetaOutDeg: number;
  deltaDeg: number;
  /** |v⃗| = |V⃗_p + v⃗∞| before and after, by the law of cosines, and their difference. */
  vIn: number;
  vOut: number;
  jump: number;
  /** Tips of v⃗ before and after with V⃗_p along +x, both drawn on the same side. */
  inTip: ChartPoint;
  outTip: ChartPoint;
  /** False when the real turn leaves the plane of V⃗_p and v⃗∞,in («giro fuera del plano»). */
  isPlanar: boolean;
}

/**
 * Paso 3: v⃗ = V⃗_p + v⃗∞ before and after a V2 flyby. The drawing keeps the angles of v⃗∞ with
 * V⃗_p, so |v⃗| follows the law of cosines even when the turn leaves the plane (Neptune).
 */
export function velocityTriangle(planet: PlanetId): VelocityTriangle {
  const encounter = v2Encounter(planet);
  const { VpKms: Vp, vInf, thetaInDeg, thetaOutDeg, deltaDeg } = encounter;
  const tip = (thetaDeg: number) => ({
    x: Vp + vInf * Math.cos(thetaDeg * DEG),
    y: vInf * Math.sin(thetaDeg * DEG),
  });
  const inTip = tip(thetaInDeg);
  const outTip = tip(thetaOutDeg);
  const vIn = Math.hypot(inTip.x, inTip.y);
  const vOut = Math.hypot(outTip.x, outTip.y);
  return {
    planet,
    Vp,
    vInf,
    thetaInDeg,
    thetaOutDeg,
    deltaDeg,
    vIn,
    vOut,
    jump: vOut - vIn,
    inTip,
    outTip,
    isPlanar: encounter.planarTurnReproduces,
  };
}

/**
 * How much Jupiter slowed while turning V2, m/s: momentum conservation m Δv⃗ = −M ΔV⃗ with the
 * probe's mass, Jupiter's mass and |Δv⃗| = 2 v∞ sin(δ/2) of the V2 flyby.
 */
export function jupiterRecoil(): number {
  const { vInf, deltaDeg } = v2Encounter('jupiter');
  const deltaV = deltaVMagnitude(vInf, deltaDeg * DEG);
  return Math.abs(recoilSpeed(VOYAGER_MASS_KG, PLANETS.jupiter.massKg, deltaV)) * M_PER_KM;
}

const superscript = (n: number) =>
  `${n < 0 ? '⁻' : ''}${[...String(Math.abs(n))].map((d) => SUPERSCRIPTS[Number(d)]).join('')}`;

/** '4,4·10⁻²¹': a mantissa with `digits` decimals (comma) times a power of ten. */
export function formatScientific(value: number, digits: number): string {
  if (value === 0) return '0';
  const magnitude = Math.abs(value);
  let exponent = Math.floor(Math.log10(magnitude));
  let mantissa = Number((magnitude / 10 ** exponent).toFixed(digits));
  if (mantissa >= 10) {
    exponent += 1;
    mantissa /= 10;
  }
  const sign = value < 0 ? MINUS : '';
  return `${sign}${formatNumber(mantissa, { precision: digits })}·10${superscript(exponent)}`;
}
