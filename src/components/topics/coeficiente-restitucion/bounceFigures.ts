/**
 * Data of Tema 7's static figures (Pasos 1–3), built from the collision kernel and the ball and
 * engine tables (docs/superpowers/research/2026-10-30-coeficiente-restitucion.md, §4 and §5).
 */
import { ballStandardById } from '../../../lib/data/ballStandards';
import { ENGINE_RESTITUTION } from '../../../lib/data/engineRestitution';
import { formatNumber } from '../../../lib/format';
import { trimTrailingZeros } from '../../charts/chartScale';
import {
  bounceSeries,
  bouncesAboveThreshold,
  collide1D,
  G_EARTH,
  idealBallAt,
} from '../../../lib/physics';

type XY = { x: number; y: number };

const CM_PER_M = 100;
const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
/** n as a subscript: 12 → "₁₂". */
const subscript = (n: number) =>
  [...String(n)].map((digit) => SUBSCRIPT_DIGITS[Number(digit)]).join('');

const comma = (value: number, decimals: number) => formatNumber(value, { precision: decimals });

/** "6", "1,25", "7,69": two decimals at most, without trailing zeros. */
export function formatTrimmed(value: number): string {
  return trimTrailingZeros(comma(value, 2));
}

// ---------------------------------------------------------------------------------------------
// Paso 1: a bounce against the floor
// ---------------------------------------------------------------------------------------------

const ITF = ballStandardById('tenis-itf');
const ITF_TEST = ITF.test.kind === 'drop' ? ITF.test : null;
if (!ITF_TEST) throw new Error('bounceFigures: la pelota ITF necesita un ensayo de caída');
const E_DECIMALS = 3;

/**
 * The ITF type 2 ball dropped from the test height (2,54 m) with the centre of its e range,
 * (0,729 + 0,761)/2 = 0,745 (research §7, preset "Tenis ITF").
 */
export const ITF_DROP = {
  h0: ITF_TEST.dropHeight,
  e: Number(((ITF.eMin + ITF.eMax) / 2).toFixed(E_DECIMALS)),
  reboundMin: ITF_TEST.reboundMin,
  reboundMax: ITF_TEST.reboundMax,
} as const;

/** Times (s) of the impacts that end each of the first `flights` flights. */
function impactTimes(h0: number, e: number, g: number, flights: number): number[] {
  const { flightTimes } = bounceSeries(h0, e, g, flights);
  return flightTimes.reduce<number[]>(
    (times, flight) => [...times, (times.at(-1) ?? 0) + flight],
    [],
  );
}

/**
 * y(t) of the ideal ball over its first `flights` flights, `samples` intervals per flight, with
 * each impact sampled exactly (so the kinks at y = 0 are drawn); y comes from idealBallAt.
 */
export function bounceTrajectory(
  h0: number,
  e: number,
  g: number,
  flights: number,
  samples: number,
): XY[] {
  const ends = impactTimes(h0, e, g, flights);
  const times = ends.flatMap((end, n) => {
    const start = n === 0 ? 0 : ends[n - 1];
    const first = n === 0 ? 0 : 1;
    return Array.from(
      { length: samples + 1 - first },
      (_, k) => start + ((end - start) * (k + first)) / samples,
    );
  });
  return times.map((t) => ({ x: t, y: Math.max(idealBallAt(t, h0, e, g).y, 0) }));
}

export interface ApexPoint {
  n: number;
  /** Time (s) of the apex: 0 for the drop, mid-flight afterwards. */
  t: number;
  /** hₙ = e²ⁿ h₀ (m). */
  h: number;
  /** "h₁ = 1,41 m", and without the unit (the axis gives it) for narrow plots: "h₁ = 1,41". */
  label: string;
  shortLabel: string;
}

/** The apexes h₀ … h_{count−1} with their times and labels ("h₁ = 1,41 m"). */
export function apexPoints(h0: number, e: number, g: number, count: number): ApexPoint[] {
  const { heights, flightTimes } = bounceSeries(h0, e, g, count);
  const ends = impactTimes(h0, e, g, count);
  return heights.map((h, n) => {
    const shortLabel = `h${subscript(n)} = ${comma(h, 2)}`;
    return {
      n,
      t: n === 0 ? 0 : ends[n - 1] + flightTimes[n] / 2,
      h,
      label: `${shortLabel} m`,
      shortLabel,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Paso 2: a collision between two bodies
// ---------------------------------------------------------------------------------------------

/**
 * The class example "Choque elástico de masas distintas" (Módulo 3, Tema 02): A of 2 kg at
 * +3 m/s against B of 1 kg at rest; the figure extends it to e = 0 and 0,75.
 */
export const COLLISION_CASE = { m1: 2, v1: 3, m2: 1, v2: 0 } as const;
export const COLLISION_E = [0, 0.75, 1] as const;

export interface CollisionState {
  v1: number;
  v2: number;
  /** Momentum of each body and their sum (kg·m/s). */
  p1: number;
  p2: number;
  momentum: number;
  /** K = ½m₁v₁² + ½m₂v₂² (J). */
  kinetic: number;
  /** K of the centre of mass, p²/(2M) (J): no collision changes it. */
  kineticCM: number;
  /** K − K_CM = ½μv_rel² (J): the part that e² scales. */
  kineticRel: number;
}

export interface CollisionAfter extends CollisionState {
  e: number;
  /** K − K′ from the kernel, ½μ(1 − e²)v_rel² (J). */
  kineticLoss: number;
}

function collisionState(v1: number, v2: number): CollisionState {
  const { m1, m2 } = COLLISION_CASE;
  const p1 = m1 * v1;
  const p2 = m2 * v2;
  const momentum = p1 + p2;
  const kinetic = (m1 * v1 * v1 + m2 * v2 * v2) / 2;
  const kineticCM = (momentum * momentum) / (2 * (m1 + m2));
  return { v1, v2, p1, p2, momentum, kinetic, kineticCM, kineticRel: kinetic - kineticCM };
}

/** The class collision before, and after with each e of COLLISION_E (velocities from collide1D). */
export function collisionRows(): { before: CollisionState; after: CollisionAfter[] } {
  const { m1, v1, m2, v2 } = COLLISION_CASE;
  return {
    before: collisionState(v1, v2),
    after: COLLISION_E.map((e) => {
      const result = collide1D(m1, v1, m2, v2, e);
      return { e, kineticLoss: result.kineticLoss, ...collisionState(result.v1, result.v2) };
    }),
  };
}

// ---------------------------------------------------------------------------------------------
// Paso 3: why it bounces badly
// ---------------------------------------------------------------------------------------------

/**
 * Research §4, "parada en seco": a ball of e = 0,9 dropped from 1 m (the §7 preset "umbral alto
 * de Unity"); the ideal series is drawn to n = 30 (1,8 mm).
 */
export const UMBRAL_DROP = { h0: 1, e: 0.9, count: 31 } as const;

/** hₙ (cm) against n for n = 0 … count − 1, from bounceSeries. */
export function heightSeries(h0: number, e: number, g: number, count: number): XY[] {
  return bounceSeries(h0, e, g, count).heights.map((h, n) => ({ x: n, y: h * CM_PER_M }));
}

export interface ThresholdResult {
  /** Rebounds before an impact at or below v_th sticks: bouncesAboveThreshold. */
  bounces: number;
  /** Apex (cm) of the last flight, h_N; h₀ when the ball never bounces. */
  lastHeight: number;
  /** v_th²/(2g) (cm): a flight below this height ends in an impact that does not bounce. */
  thresholdHeight: number;
  /** hₙ (cm) for n = 0 … N; after N the ball stays on the floor. */
  points: XY[];
}

/** The engine's series: the ideal hₙ while impacts exceed v_th (m/s), then a dead stop. */
export function thresholdCase(h0: number, e: number, g: number, vth: number): ThresholdResult {
  const v0 = bounceSeries(h0, e, g, 1).impactSpeeds[0];
  const bounces = bouncesAboveThreshold(v0, e, vth);
  if (!Number.isFinite(bounces)) {
    throw new RangeError(`thresholdCase: la serie no se corta (e = ${e}, v_th = ${vth})`);
  }
  const points = heightSeries(h0, e, g, bounces + 1);
  return {
    bounces,
    lastHeight: points[bounces].y,
    thresholdHeight: ((vth * vth) / (2 * g)) * CM_PER_M,
    points,
  };
}

export interface ThresholdFigureCase extends ThresholdResult {
  id: 'box2d' | 'unity';
  engine: string;
  vth: number;
  legend: string;
}

function engineThreshold(engine: string): number {
  const row = ENGINE_RESTITUTION.find((candidate) => candidate.engine === engine);
  if (!row || row.threshold === null) {
    throw new Error(`bounceFigures: falta el umbral de ${engine}`);
  }
  return row.threshold;
}

function figureCase(id: ThresholdFigureCase['id'], engine: string): ThresholdFigureCase {
  const vth = engineThreshold(engine);
  const { h0, e } = UMBRAL_DROP;
  const result = thresholdCase(h0, e, G_EARTH, vth);
  const legend = `Umbral de ${formatTrimmed(vth)} m/s (${engine}): ${result.bounces} rebotes, el último de ${comma(result.lastHeight, 1)} cm`;
  return { id, engine, vth, legend, ...result };
}

/** Box2D's 1 m/s and Unity's 2 m/s (spec §7, Paso 3), read from the engine table. */
export const THRESHOLD_CASES: readonly ThresholdFigureCase[] = [
  figureCase('box2d', 'Box2D v3'),
  figureCase('unity', 'Unity 3D'),
];
