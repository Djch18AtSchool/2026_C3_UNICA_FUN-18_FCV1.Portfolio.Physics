/**
 * Everything the Voyager speed chart (Tema 9's prescribed visualization) plots, from the Horizons
 * dataset and the kernel: the speed and distance of both probes, the Sun's escape speed at V2's
 * position and the hyperbolic zone above it, the «solo el Sol» counterfactual, the four V2
 * encounters with their vis-viva jumps, the hourly window around each one, and the texts read at
 * the cursor. x is the full Julian date throughout. Pure; computed once at import.
 */
import { AU_KM, PLANETS, type PlanetId } from '../../../lib/data/planets';
import {
  VOYAGER,
  encounterJump,
  escapeSpeedSeries,
  sunOnlySeries,
  type Encounter,
  type SeriesPoint,
} from '../../../lib/data/voyager';
import { formatNumber } from '../../../lib/format';
import { specificEnergy, visVivaSpeed } from '../../../lib/physics';
import type { Domain } from '../../lab/plotScales';
import { formatDate, formatTime, jdFromIso } from './dateAxis';
import { signed } from './flybyFormat';

/** The chart's source line (spec §9); the page's Figure cites it verbatim. Never «medida». */
export const VOYAGER_CHART_SOURCE =
  'Gráfica del autor; datos: NASA/JPL Horizons, consultados el 30 de octubre de 2026; trayectoria de diseño reconstruida hasta el 29 de agosto de 1989 y ajuste de 2022 a datos de seguimiento después';

export type EncounterKey = 'J' | 'S' | 'U' | 'N';
export const ENCOUNTER_KEYS: readonly EncounterKey[] = ['J', 'S', 'U', 'N'];
const PLANET_OF: Readonly<Record<EncounterKey, PlanetId>> = {
  J: 'jupiter',
  S: 'saturn',
  U: 'uranus',
  N: 'neptune',
};

export interface ChartPoint {
  x: number;
  y: number;
}

/** The mission view ends on the first day of 1990, just after the last 5-day sample. */
const MISSION_END = jdFromIso('1990-01-01');
/** Grid of the counterfactual, like the dataset's base series. */
const SUN_ONLY_STEP_DAYS = 5;
/** Half width of the hourly window around closest approach (research §8: ±5 d). */
const DETAIL_HALF_DAYS = 5;
/** Days on each side of closest approach where ε is taken (research §5, as encounterJump). */
const JUMP_WINDOW_DAYS = 120;
/** Days before Jupiter at which the summary quotes V2's speed, out of the planet's pull. */
const BEFORE_JUPITER_DAYS = 30;
const SPEED_PRECISION = 2;
/** Decimals of a day in the hourly view's offsets (0,01 d ≈ 15 min). */
const OFFSET_PRECISION = 2;
const JUMP_PRECISION = 1;
const DISTANCE_PRECISION = 2;

/** '18,62 km/s': every speed the chart and the step figures print. */
export const speedText = (v: number) =>
  formatNumber(v, { precision: SPEED_PRECISION, unit: 'km/s' });
const distanceText = (r: number) => formatNumber(r, { precision: DISTANCE_PRECISION, unit: 'UA' });

const speedOf = (series: readonly SeriesPoint[]): ChartPoint[] =>
  series.map((p) => ({ x: p.jd, y: p.speed }));
const distanceOf = (series: readonly SeriesPoint[]): ChartPoint[] =>
  series.map((p) => ({ x: p.jd, y: p.r }));

/** Linear interpolation of the points at x; undefined outside them. */
export function valueAt(points: readonly ChartPoint[], x: number): number | undefined {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || x < first.x || x > last.x) return undefined;
  const k = points.findIndex((p) => p.x >= x);
  const b = points[k];
  if (b.x === x || k === 0) return b.y;
  const a = points[k - 1];
  return a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
}

/** Where speed − escape changes sign between samples a and b: the point on the escape curve. */
function crossing(sa: ChartPoint, sb: ChartPoint, ea: ChartPoint, eb: ChartPoint): ChartPoint {
  const da = sa.y - ea.y;
  const db = sb.y - eb.y;
  const t = da / (da - db);
  return { x: sa.x + t * (sb.x - sa.x), y: ea.y + t * (eb.y - ea.y) };
}

/**
 * The zones where the speed is above escape (ε > 0), each as a closed polygon: along the speed
 * from crossing to crossing and back along the escape curve. Both series share their x.
 */
export function hyperbolicRegions(
  speed: readonly ChartPoint[],
  escape: readonly ChartPoint[],
): ChartPoint[][] {
  type Open = { upper: ChartPoint[]; lower: ChartPoint[] };
  const close = ({ upper, lower }: Open) => [...upper, ...[...lower].reverse()];
  const result = speed.reduce<{ done: ChartPoint[][]; open: Open | null }>(
    ({ done, open }, point, i) => {
      const isAbove = point.y > escape[i].y;
      const wasAbove = open !== null;
      if (isAbove === wasAbove) {
        return isAbove && open
          ? { done, open: { upper: [...open.upper, point], lower: [...open.lower, escape[i]] } }
          : { done, open };
      }
      if (i === 0) return { done, open: { upper: [point], lower: [escape[i]] } };
      const edge = crossing(speed[i - 1], point, escape[i - 1], escape[i]);
      if (isAbove) return { done, open: { upper: [edge, point], lower: [escape[i]] } };
      return {
        done: open ? [...done, close({ upper: [...open.upper, edge], lower: open.lower })] : done,
        open: null,
      };
    },
    { done: [], open: null },
  );
  return result.open ? [...result.done, close(result.open)] : result.done;
}

export interface EncounterMarker {
  key: EncounterKey;
  planet: PlanetId;
  name: string;
  /** The planet's color, `var(--jupiter)` … */
  token: string;
  /** Closest approach: Julian date (UT) and the ISO minute from Horizons. */
  caJd: number;
  caUtc: string;
  /** Δ|v| vis-viva (research §5), km/s. */
  jump: number;
  /** '+10,2 km/s', '−2,1 km/s'. */
  label: string;
}

/** The Voyager 2 encounter with a planet, from the dataset. */
export function v2Encounter(planet: PlanetId): Encounter {
  const encounter = VOYAGER.encounters.find((e) => e.probe === 'V2' && e.planet === planet);
  if (!encounter) throw new Error(`Faltan los datos del encuentro de la V2 con ${planet}`);
  return encounter;
}

export const ENCOUNTER_MARKERS: readonly EncounterMarker[] = ENCOUNTER_KEYS.map((key) => {
  const planet = PLANET_OF[key];
  const { caJd, caUtc } = v2Encounter(planet);
  const jump = encounterJump(VOYAGER.series.v2, caJd, VOYAGER.gmSun);
  return {
    key,
    planet,
    name: PLANETS[planet].name,
    token: `var(${PLANETS[planet].token})`,
    caJd,
    caUtc,
    jump,
    label: signed(jump, JUMP_PRECISION, 'km/s'),
  };
});

export interface MissionView {
  domain: Domain;
  speed: { v2: ChartPoint[]; v1: ChartPoint[]; escape: ChartPoint[]; sunOnly: ChartPoint[] };
  distance: { v2: ChartPoint[]; v1: ChartPoint[]; sunOnly: ChartPoint[] };
  hyperbolic: ChartPoint[][];
}

function buildMission(): MissionView {
  const { v1, v2 } = VOYAGER.series;
  const start = VOYAGER.sunOnlyState.jd;
  const steps = Math.floor((MISSION_END - start) / SUN_ONLY_STEP_DAYS);
  const sunOnly = sunOnlySeries(
    Array.from({ length: steps + 1 }, (_, i) => start + i * SUN_ONLY_STEP_DAYS),
  );
  const speed = speedOf(v2);
  const escape = escapeSpeedSeries(v2).map((p) => ({ x: p.jd, y: p.speed }));
  return {
    domain: { min: v2[0].jd, max: MISSION_END },
    speed: { v2: speed, v1: speedOf(v1), escape, sunOnly: speedOf(sunOnly) },
    distance: { v2: distanceOf(v2), v1: distanceOf(v1), sunOnly: distanceOf(sunOnly) },
    hyperbolic: hyperbolicRegions(speed, escape),
  };
}

export const MISSION: MissionView = buildMission();

export interface EncounterDetail {
  marker: EncounterMarker;
  /** Closest approach ± 5 d. */
  domain: Domain;
  /** Hourly V2 samples over the window, plus one on each side so the line reaches the edges. */
  speed: ChartPoint[];
  escape: ChartPoint[];
  hyperbolic: ChartPoint[][];
  /** Fastest sample inside the window: the probe deep in the planet's well. */
  peak: ChartPoint;
  /** Sun-only speed at the encounter distance with ε 120 d before and after; after − before = jump. */
  before: number;
  after: number;
}

/** V2's solar specific energy ε = v²/2 − GM☉/r at every sample, km²/s². */
const V2_ENERGY: ChartPoint[] = VOYAGER.series.v2.map((p) => ({
  x: p.jd,
  y: specificEnergy(p.speed, p.r * AU_KM, VOYAGER.gmSun),
}));

/**
 * Speed with the Sun alone at the encounter distance, for the energy V2 had `offset` days away.
 * ε is interpolated between samples, as encounterJump does, so after − before is its jump.
 */
function sunOnlyLevel(caJd: number, offset: number): number {
  const rEnc = (valueAt(MISSION.distance.v2, caJd) ?? NaN) * AU_KM;
  return visVivaSpeed(rEnc, VOYAGER.gmSun, valueAt(V2_ENERGY, caJd + offset) ?? NaN);
}

function buildDetail(marker: EncounterMarker): EncounterDetail {
  const domain = { min: marker.caJd - DETAIL_HALF_DAYS, max: marker.caJd + DETAIL_HALF_DAYS };
  const { v2: speed, escape } = MISSION.speed;
  const firstInside = speed.findIndex((p) => p.x >= domain.min);
  const lastInside = speed.findLastIndex((p) => p.x <= domain.max);
  const from = Math.max(0, firstInside - 1);
  const to = Math.min(speed.length, lastInside + 2);
  const windowSpeed = speed.slice(from, to);
  const windowEscape = escape.slice(from, to);
  const peak = speed
    .slice(firstInside, lastInside + 1)
    .reduce((best, p) => (p.y > best.y ? p : best));
  return {
    marker,
    domain,
    speed: windowSpeed,
    escape: windowEscape,
    hyperbolic: hyperbolicRegions(windowSpeed, windowEscape),
    peak,
    before: sunOnlyLevel(marker.caJd, -JUMP_WINDOW_DAYS),
    after: sunOnlyLevel(marker.caJd, JUMP_WINDOW_DAYS),
  };
}

const DETAILS: Readonly<Record<EncounterKey, EncounterDetail>> = Object.fromEntries(
  ENCOUNTER_MARKERS.map((marker) => [marker.key, buildDetail(marker)]),
) as Record<EncounterKey, EncounterDetail>;

export function encounterDetail(key: EncounterKey): EncounterDetail {
  return DETAILS[key];
}

/** 'escapa del Sol' when the speed is above escape (ε > 0), 'ligada al Sol' otherwise. */
const bindingText = (v: number, escape: number) =>
  v > escape ? 'escapa del Sol' : 'ligada al Sol';

/** What the cursor reads in the mission view: date, V2 (with escape), V1 and the counterfactual. */
export function missionReadout(jd: number): string {
  const { speed, distance } = MISSION;
  const v2 = valueAt(speed.v2, jd);
  const escape = valueAt(speed.escape, jd);
  const v2Text =
    v2 === undefined || escape === undefined
      ? 'Voyager 2: sin datos en esta fecha.'
      : `Voyager 2: ${speedText(v2)}, escape ${speedText(escape)} (${bindingText(v2, escape)}), a ${distanceText(valueAt(distance.v2, jd) ?? NaN)}.`;
  const v1 = valueAt(speed.v1, jd);
  const v1Text =
    v1 === undefined
      ? []
      : [`Voyager 1: ${speedText(v1)}, a ${distanceText(valueAt(distance.v1, jd) ?? NaN)}.`];
  const sunOnly = valueAt(speed.sunOnly, jd);
  const sunOnlyText =
    sunOnly === undefined
      ? []
      : [
          `Solo el Sol: ${speedText(sunOnly)}, a ${distanceText(valueAt(distance.sunOnly, jd) ?? NaN)}.`,
        ];
  return [`${formatDate(jd)}.`, v2Text, ...v1Text, ...sunOnlyText].join(' ');
}

/** 'MA +0,35 d', 'MA −2,00 d': time from closest approach, to the quarter hour. */
export function formatOffset(days: number): string {
  return `MA ${signed(days, OFFSET_PRECISION, 'd')}`;
}

/** What the cursor reads in an encounter's hourly window. */
export function detailReadout(detail: EncounterDetail, jd: number): string {
  const v = valueAt(detail.speed, jd) ?? NaN;
  const escape = valueAt(detail.escape, jd) ?? NaN;
  const r = valueAt(MISSION.distance.v2, jd) ?? NaN;
  return `${formatOffset(jd - detail.marker.caJd)}: ${speedText(v)}, escape ${speedText(escape)} (${bindingText(v, escape)}), a ${distanceText(r)}.`;
}

/** The accessible description of the mission view, every number from the data. */
export function missionSummary(): string {
  const { speed, distance } = MISSION;
  const jupiter = ENCOUNTER_MARKERS[0];
  const jumps = ENCOUNTER_MARKERS.map((m) => `${m.name} ${m.label}`).join(', ');
  const slowest = speed.sunOnly.reduce((low, p) => (p.y < low.y ? p : low));
  const beforeJupiter = valueAt(speed.v2, jupiter.caJd - BEFORE_JUPITER_DAYS) ?? NaN;
  return [
    `Rapidez de la Voyager 2 respecto al Sol de 1977 a 1990, con su distancia al Sol en un segundo panel.`,
    `Antes de Júpiter frena de ${speedText(speed.v2[0].y)} a ${speedText(beforeJupiter)} y está ligada al Sol.`,
    `En cada encuentro cambia su rapidez: ${jumps}.`,
    `Desde Júpiter supera la rapidez de escape (zona hiperbólica) y se aleja hasta ${distanceText(distance.v2[distance.v2.length - 1].y)}.`,
    `Solo con el Sol, desde el ${formatDate(speed.sunOnly[0].x)}, habría bajado a ${speedText(slowest.y)} en el afelio, a ${distanceText(valueAt(distance.sunOnly, slowest.x) ?? NaN)}, y habría vuelto.`,
    `La Voyager 1, más tenue, llega hasta ${formatDate(speed.v1[speed.v1.length - 1].x)}.`,
  ].join(' ');
}

/** The accessible description of an encounter's hourly window. */
export function detailSummary(detail: EncounterDetail): string {
  const { marker, peak, before, after } = detail;
  return `Detalle horario de ${marker.name}, cinco días antes y después de la máxima aproximación (${formatDate(marker.caJd)}, ${formatTime(marker.caJd)} UT): la rapidez sube a un pico de ${speedText(peak.y)} dentro del pozo del planeta; el salto neto, con solo el Sol a la distancia del encuentro, es ${marker.label} (de ${speedText(before)} a ${speedText(after)}).`;
}
