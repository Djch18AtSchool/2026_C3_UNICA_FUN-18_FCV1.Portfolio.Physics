/**
 * Writes src/data/voyager-speed.json from the JPL Horizons API: the heliocentric speed and
 * distance of Voyager 2 (1977-08-21 → 1990-01-01) and Voyager 1 (1977-09-06 → 1982-01-01) every
 * 5 d, hourly within ±5 d of each of the six planetary encounters, and the encounter parameters
 * (closest approach, v∞ in and out, osculating hyperbola, Sun-frame patched conics) computed the
 * way docs/superpowers/research/2026-10-30-asistencia-gravitatoria.md (§4, §5, §8) did.
 *
 * Run with `pnpm run data:voyager`; the JSON is committed and validated by src/lib/data/voyager.ts,
 * so nothing is fetched at build time. Every request URL and the `source:` lines of its header go
 * into the JSON. Before 1989-08-29 (V2) and 1981-01-01 (V1) Horizons serves a patched-conic
 * mission-design trajectory, not a fit to tracking data; the trajectory note is kept verbatim.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AU_KM, GM_SUN, PLANETS, type PlanetId } from '../src/lib/data/planets';
import { specificEnergy, turnAngle } from '../src/lib/physics/gravitation';

const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/voyager-speed.json');
const ENDPOINT = 'https://ssd.jpl.nasa.gov/api/horizons.api';
/** Parameters shared by every request (research §4). */
const COMMON = {
  format: 'text',
  OBJ_DATA: "'YES'",
  MAKE_EPHEM: "'YES'",
  EPHEM_TYPE: "'VECTORS'",
  VEC_TABLE: "'2'",
  REF_PLANE: "'ECLIPTIC'",
  REF_SYSTEM: "'ICRF'",
  OUT_UNITS: "'KM-S'",
  CSV_FORMAT: "'YES'",
  VEC_LABELS: "'NO'",
} as const;
const SUN_CENTER = '500@10';
const JD_OFFSET = 2443000;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RAD_TO_DEG = 180 / Math.PI;
/** Planet-frame window around the nominal encounter date (research §4: −10 d … +11 d, 1 h). */
const PLANET_FRAME_BEFORE_D = 10;
const PLANET_FRAME_AFTER_D = 11;
/** Hourly heliocentric detail kept in the series around closest approach (spec §4.5). */
const DETAIL_HALF_WIDTH_D = 5;
/** Minute-step window around the hourly closest approach, in UT (research §4: CA ±2–3 h). */
const MINUTE_BEFORE_H = 2;
const MINUTE_AFTER_H = 3;
/** Largest accepted |v_helio − (v_planet-centred + V_planet)| (research §4 found < 2 × 10⁻⁵). */
const FRAME_RESIDUAL_KMS = 1e-3;

type Probe = 'V1' | 'V2';
type Vec3 = readonly [number, number, number];

interface Row {
  jd: number;
  calendar: string;
  r: Vec3;
  v: Vec3;
}

interface Response {
  id: string;
  url: string;
  text: string;
  rows: Row[];
}

interface EncounterPlan {
  probe: Probe;
  planet: PlanetId;
  /** Nominal encounter date that centres the planet-frame window. */
  date: string;
}

const PROBES: Record<Probe, { command: string; start: string; stop: string }> = {
  V2: { command: '-32', start: '1977-08-21', stop: '1990-01-01' },
  V1: { command: '-31', start: '1977-09-06', stop: '1982-01-01' },
};

/** The six encounters, centred like the research windows (Horizons TIMELINE dates for V2). */
const ENCOUNTERS: EncounterPlan[] = [
  { probe: 'V2', planet: 'jupiter', date: '1979-07-09' },
  { probe: 'V2', planet: 'saturn', date: '1981-08-25' },
  { probe: 'V2', planet: 'uranus', date: '1986-01-24' },
  { probe: 'V2', planet: 'neptune', date: '1989-08-25' },
  { probe: 'V1', planet: 'jupiter', date: '1979-03-05' },
  { probe: 'V1', planet: 'saturn', date: '1980-11-12' },
];

// ---------------------------------------------------------------------------------------------
// Vectors

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): number => Math.hypot(...a);
const unit = (a: Vec3): Vec3 => scale(a, 1 / norm(a));
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const angleDeg = (a: Vec3, b: Vec3): number =>
  Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b))))) * RAD_TO_DEG;

// ---------------------------------------------------------------------------------------------
// Horizons requests

const round = (value: number, decimals: number): number => {
  const k = 10 ** decimals;
  return Math.round(value * k) / k;
};

/**
 * 'YYYY-MM-DD HH:MM' for a millisecond instant, rounded to the minute so that a Julian date like
 * …416666667 reads 22:00, not 21:59. Horizons reads it in the request's time scale.
 */
function horizonsTime(ms: number): string {
  const minute = Math.round(ms / MINUTE_MS) * MINUTE_MS;
  return new Date(minute).toISOString().slice(0, 16).replace('T', ' ');
}

function dateMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/** Julian date → ms since the Unix epoch, keeping the time scale of the input (TDB or UT). */
function jdToMs(jd: number): number {
  return (jd - 2440587.5) * DAY_MS;
}

function buildUrl(params: Record<string, string>): string {
  const query = Object.entries({ ...COMMON, ...params })
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return encodeURI(`${ENDPOINT}?${query}`);
}

function parseRows(text: string, id: string): Row[] {
  const start = text.indexOf('$$SOE');
  const end = text.indexOf('$$EOE');
  if (start < 0 || end < 0) {
    throw new Error(`${id}: Horizons returned no ephemeris:\n${text.slice(0, 2000)}`);
  }
  return text
    .slice(start + '$$SOE'.length, end)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.split(',').map((cell) => cell.trim());
      const numbers = cells.slice(2, 8).map(Number);
      if (numbers.some((n) => !Number.isFinite(n))) throw new Error(`${id}: bad row ${line}`);
      const [x, y, z, vx, vy, vz] = numbers;
      return { jd: Number(cells[0]), calendar: cells[1], r: [x, y, z], v: [vx, vy, vz] };
    });
}

async function request(id: string, params: Record<string, string>): Promise<Response> {
  const url = buildUrl(params);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${id}: HTTP ${response.status} ${response.statusText} from ${url}`);
  }
  const text = await response.text();
  const rows = parseRows(text, id);
  console.log(`${id}: ${rows.length} filas`);
  return { id, url, text, rows };
}

function vectors(
  id: string,
  command: string,
  center: string,
  start: string,
  stop: string,
  step: string,
  extra: Record<string, string> = {},
): Promise<Response> {
  return request(id, {
    COMMAND: `'${command}'`,
    CENTER: `'${center}'`,
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: `'${step}'`,
    ...extra,
  });
}

/** The `Target body name … {source: …}` and `Center body name … {source: …}` header lines. */
function sourceLines(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => /^(Target|Center) body name:.*\{source: [^}]+\}/.test(line))
    .map((line) => line.replace(/\s+/g, ' ').trim());
}

/** The SPACECRAFT TRAJECTORY section of the header, whitespace collapsed. */
function trajectoryNote(text: string, id: string): string {
  const match = /SPACECRAFT TRAJECTORY:([\s\S]*?)Note there has been/.exec(text);
  if (!match) throw new Error(`${id}: no SPACECRAFT TRAJECTORY section in the header`);
  return match[1].replace(/\s+/g, ' ').trim();
}

/** Fails unless the GM and radius Horizons prints for the planet are the ones in planets.ts. */
function checkPlanetData(text: string, planet: PlanetId): void {
  const gm = /GM \(km\^3\/s\^2\)\s*=\s*([\d.]+)/.exec(text);
  const radius = /Equat\. radius \(1 bar\)\s*=\s*(\d+)/.exec(text);
  const expected = PLANETS[planet];
  if (!gm || Number(gm[1]) !== expected.gm) {
    throw new Error(`${planet}: Horizons GM ${gm?.[1]} differs from planets.ts ${expected.gm}`);
  }
  if (!radius || Number(radius[1]) !== expected.radiusKm) {
    throw new Error(`${planet}: Horizons radius ${radius?.[1]} ≠ ${expected.radiusKm}`);
  }
}

// ---------------------------------------------------------------------------------------------
// Encounter analysis (research §5, encounter.py)

function closestIndex(rows: Row[], id: string): number {
  const index = rows.reduce((best, row, i) => (norm(row.r) < norm(rows[best].r) ? i : best), 0);
  if (index === 0 || index === rows.length - 1) {
    throw new Error(`${id}: closest approach at the edge of the window`);
  }
  return index;
}

/** v∞ = √(2ε) from the planet-frame energy of a row. */
function vInfOf(row: Row, gm: number): number {
  return Math.sqrt(2 * specificEnergy(norm(row.v), norm(row.r), gm));
}

/**
 * Asymptote directions of the osculating hyperbola through (r, v): with ê the eccentricity
 * vector, q̂ = ĥ × ê and cos θ∞ = −1/e, û_in = −cos θ∞ ê + sin θ∞ q̂ and û_out = cos θ∞ ê + sin θ∞ q̂.
 */
function asymptotes(r: Vec3, v: Vec3, gm: number): { uIn: Vec3; uOut: Vec3 } {
  const h = cross(r, v);
  const eVec = sub(scale(cross(v, h), 1 / gm), unit(r));
  const e = norm(eVec);
  const thetaInf = Math.acos(-1 / e);
  const eHat = scale(eVec, 1 / e);
  const q = cross(unit(h), eHat);
  const c = Math.cos(thetaInf);
  const s = Math.sin(thetaInf);
  return { uIn: add(scale(eHat, -c), scale(q, s)), uOut: add(scale(eHat, c), scale(q, s)) };
}

/** '1979-07-09T22:29Z' from Horizons' 'A.D. 1979-Jul-09 22:29:00.0000' (UT). */
function isoMinute(calendar: string): string {
  const match = /(\d{4})-(\w{3})-(\d{2}) (\d{2}:\d{2})/.exec(calendar);
  if (!match) throw new Error(`unreadable calendar date ${calendar}`);
  const [, year, month, day, time] = match;
  const monthNumber = MONTHS.indexOf(month) + 1;
  if (monthNumber === 0) throw new Error(`unknown month in ${calendar}`);
  return `${year}-${String(monthNumber).padStart(2, '0')}-${day}T${time}Z`;
}

interface EncounterResult {
  responses: Response[];
  helioRows: Row[];
  encounter: Record<string, string | number>;
}

async function analyseEncounter(plan: EncounterPlan): Promise<EncounterResult> {
  const { probe, planet, date } = plan;
  const { command } = PROBES[probe];
  const body = PLANETS[planet];
  const center = `500@${body.naifId}`;
  const tag = `${probe.toLowerCase()}-${planet}`;
  const from = horizonsTime(dateMs(date) - PLANET_FRAME_BEFORE_D * DAY_MS);
  const to = horizonsTime(dateMs(date) + PLANET_FRAME_AFTER_D * DAY_MS);

  const pc = await vectors(`${tag}-pc-1h`, command, center, from, to, '1 h');
  const planetHelio = await vectors(
    `${tag}-planet-1h`,
    String(body.naifId),
    SUN_CENTER,
    from,
    to,
    '1 h',
  );
  checkPlanetData(planetHelio.text, planet);

  const i = closestIndex(pc.rows, pc.id);
  const ca = pc.rows[i];
  const caMs = jdToMs(ca.jd);
  const helio = await vectors(
    `${tag}-helio-1h`,
    command,
    SUN_CENTER,
    horizonsTime(caMs - DETAIL_HALF_WIDTH_D * DAY_MS),
    horizonsTime(caMs + DETAIL_HALF_WIDTH_D * DAY_MS),
    '1 h',
  );
  const minute = await vectors(
    `${tag}-ca-1m`,
    command,
    center,
    horizonsTime(caMs - MINUTE_BEFORE_H * HOUR_MS),
    horizonsTime(caMs + MINUTE_AFTER_H * HOUR_MS),
    '1 m',
    { TIME_TYPE: "'UT'", OBJ_DATA: "'NO'" },
  );

  const planetAtCa = planetHelio.rows[i];
  const helioAtCa = helio.rows.find((row) => Math.abs(row.jd - ca.jd) < 1e-6);
  if (Math.abs(planetAtCa.jd - ca.jd) > 1e-6 || !helioAtCa) {
    throw new Error(`${tag}: planet-frame, planet and heliocentric grids are not aligned`);
  }
  const residual = norm(sub(helioAtCa.v, add(ca.v, planetAtCa.v)));
  if (residual > FRAME_RESIDUAL_KMS) {
    throw new Error(`${tag}: v_helio − (v_pc + V_p) = ${residual} km/s`);
  }

  const closest = minute.rows[closestIndex(minute.rows, minute.id)];
  const rpKm = norm(closest.r);
  const vInf = vInfOf(ca, body.gm);
  const Vp = planetAtCa.v;
  const { uIn, uOut } = asymptotes(ca.r, ca.v, body.gm);

  return {
    responses: [pc, planetHelio, helio, minute],
    helioRows: helio.rows,
    encounter: {
      probe,
      planet,
      caUtc: isoMinute(closest.calendar),
      caJd: round(closest.jd, 6),
      rpKm: Math.round(rpKm),
      vInf: round(vInf, 4),
      vInfIn: round(vInfOf(pc.rows[0], body.gm), 4),
      vInfOut: round(vInfOf(pc.rows[pc.rows.length - 1], body.gm), 4),
      VpKms: round(norm(Vp), 4),
      thetaInDeg: round(angleDeg(Vp, uIn), 2),
      deltaDeg: round(turnAngle(vInf, rpKm, body.gm) * RAD_TO_DEG, 2),
      conicBefore: round(norm(add(Vp, scale(uIn, vInf))), 4),
      conicAfter: round(norm(add(Vp, scale(uOut, vInf))), 4),
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Series

/** [JD_TDB − 2 443 000, |v| km/s (3 decimals), r AU (4 decimals)] per sample (spec §4.5). */
function compactSeries(base: Row[], details: Row[][]): number[][] {
  const byJd = new Map<number, Row>();
  [base, ...details].flat().forEach((row) => byJd.set(round(row.jd, 5), row));
  return [...byJd.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, row]) => [
      round(row.jd - JD_OFFSET, 4),
      round(norm(row.v), 3),
      round(norm(row.r) / AU_KM, 4),
    ]);
}

async function main(): Promise<void> {
  const v2 = PROBES.V2;
  const v1 = PROBES.V1;
  const v2Base = await vectors('v2-helio-5d', v2.command, SUN_CENTER, v2.start, v2.stop, '5 d');
  const v1Base = await vectors('v1-helio-5d', v1.command, SUN_CENTER, v1.start, v1.stop, '5 d');

  const results: EncounterResult[] = [];
  for (const plan of ENCOUNTERS) results.push(await analyseEncounter(plan));

  const detailsOf = (probe: Probe) =>
    results.filter((_, k) => ENCOUNTERS[k].probe === probe).map((result) => result.helioRows);
  const responses = [v2Base, v1Base, ...results.flatMap((result) => result.responses)];

  const dataset = {
    retrieved: new Date().toISOString().slice(0, 10),
    query: {
      endpoint: ENDPOINT,
      common: COMMON,
      requests: responses.map(({ id, url, text }) => ({ id, url, sources: sourceLines(text) })),
    },
    sourceNotes: {
      V2: trajectoryNote(v2Base.text, v2Base.id),
      V1: trajectoryNote(v1Base.text, v1Base.id),
    },
    gmSun: GM_SUN,
    jdOffset: JD_OFFSET,
    columns: ['jdTdbMinusOffset', 'speedKmS', 'distanceAu'],
    series: {
      v2: compactSeries(v2Base.rows, detailsOf('V2')),
      v1: compactSeries(v1Base.rows, detailsOf('V1')),
    },
    encounters: results.map((result) => result.encounter),
  };

  const json = `${JSON.stringify(dataset)}\n`;
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, json);
  console.log(
    `voyager-speed.json: ${dataset.series.v2.length} puntos V2, ${dataset.series.v1.length} V1, ` +
      `${Buffer.byteLength(json)} bytes`,
  );
  dataset.encounters.forEach((e) => console.log(JSON.stringify(e)));
}

main().catch((error: unknown) => {
  console.error('No se pudo generar voyager-speed.json:', error);
  process.exitCode = 1;
});
