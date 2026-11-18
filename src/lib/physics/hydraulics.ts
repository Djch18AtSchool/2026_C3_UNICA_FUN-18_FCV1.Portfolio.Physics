import { G_EARTH } from './constants';
import { N_PER_LBF } from './energy';
import { requireFinite, requireNonNegative, requirePositive } from './validate';

/*
 * Hydraulics of a liquid-cooling circuit (Tema 13): continuity, Bernoulli, Darcy–Weisbach with
 * K and Cv losses, a series path and the split among servers in parallel. SI units throughout
 * (m, m/s, m³/s, Pa); imperial units only enter through Cv and the constants below. Scheme and
 * reference numbers: docs/superpowers/research/2026-11-17-enfriamiento-liquido.md, §6–§7; the
 * friction factor follows EPANET 2.3.5 (src/hydcoeffs.c), with the class's Reynolds limits.
 */

const M_PER_IN = 0.0254;
/** Exact: 1 psi = 1 lbf/in² = 6894,757… Pa. */
export const PA_PER_PSI = N_PER_LBF / M_PER_IN ** 2;
export const PA_PER_BAR = 1e5;
export const M3S_PER_LPM = 1e-3 / 60;
/** Exact: 1 US gallon = 231 in³ = 3,785 411 784 L. */
export const M3S_PER_GPM = 3.785411784e-3 / 60;
/** Reynolds limits of the class (Módulo 6): laminar below 2300, turbulent above 4000. */
export const LAMINAR_RE = 2300;
export const TURBULENT_RE = 4000;
/** Cv is defined with water at 60 °F (15,6 °C), 999,0 kg/m³, as specific gravity 1. */
const CV_WATER_DENSITY = 999.0;
/** MBL's flow exponent range: n = 1 laminar, n = 2 turbulent. */
const MIN_EXPONENT = 1;
const MAX_EXPONENT = 2;

/** A liquid: density ρ (kg/m³) and dynamic viscosity μ (Pa·s). */
export interface Fluid {
  rho: number;
  mu: number;
}

/** A measured loss law Δp = a·Qᵇ (Pa, Q in m³/s): MBL's Δp ∝ ṁⁿ, with b = n between 1 and 2. */
export interface LossCurve {
  a: number;
  b: number;
}

/**
 * One stretch of the circuit: length L, inner diameter D, roughness ε (m) and rise Δy (m), plus
 * optional local losses: a K on its velocity head, a Cv, or a measured curve. A component
 * characterised by a Cv or a curve (a coupling, a cold plate) carries its whole loss in that law:
 * its length only places it along x and adds no Darcy friction.
 */
export interface Segment {
  id: string;
  label: string;
  length: number;
  diameter: number;
  roughness: number;
  dy: number;
  K?: number;
  /** Flow coefficient of a component measured as a whole; replaces the segment's friction. */
  cv?: number;
  /** Measured law of a component as a whole; replaces the segment's friction. */
  curve?: LossCurve;
  /** Flow area (m²) of a section that is not circular; `diameter` is then D_h = 4A/P. */
  area?: number;
  /** Times the path's flow Q crosses this segment (continuity at the nodes); 1 by default. */
  flowMultiple?: number;
}

/** A point of the path: position x (m), velocity (m/s), ideal and real pressure (Pa). */
export interface ProfilePoint {
  x: number;
  segmentId: string;
  v: number;
  pIdeal: number;
  pReal: number;
}

/** Direct return (inlet and outlet at the same end, «U») or reverse return («Z»). */
export type ReturnLayout = 'directo' | 'invertido';

function requireFluid(f: Fluid): void {
  requirePositive('rho', f.rho);
  requirePositive('mu', f.mu);
}

function requireExponent(b: number): void {
  requireFinite('b', b);
  if (b < MIN_EXPONENT || b > MAX_EXPONENT) {
    throw new RangeError(`b must be between ${MIN_EXPONENT} and ${MAX_EXPONENT}, got ${b}`);
  }
}

/** Circular section, A = πD²/4. */
export function pipeArea(D: number): number {
  requirePositive('D', D);
  return (Math.PI * D * D) / 4;
}

/** Continuity (13.1): v = Q/A. */
export function flowVelocity(Q: number, D: number): number {
  requireNonNegative('Q', Q);
  return Q / pipeArea(D);
}

/** Re = ρvD/μ. */
export function reynolds(f: Fluid, v: number, D: number): number {
  requireFluid(f);
  requireNonNegative('v', v);
  requirePositive('D', D);
  return (f.rho * v * D) / f.mu;
}

/** Swamee–Jain, as EPANET: f = 0,25/[log₁₀(ε/3,7D + 5,74/Re^0,9)]², with its slope df/dRe. */
function swameeJain(Re: number, relativeRoughness: number): { f: number; slope: number } {
  const y = relativeRoughness / 3.7 + 5.74 / Re ** 0.9;
  const log = Math.log10(y);
  const f = 0.25 / (log * log);
  const slope = (0.5 * 0.9 * 5.74 * Re ** -1.9) / (log ** 3 * y * Math.LN10);
  return { f, slope };
}

/**
 * Transition: EPANET's cubic (Dunlop), which matches value and slope of the laminar law and of
 * Swamee–Jain at both ends; here between the class's 2300 and 4000 instead of EPANET's 2000.
 */
function transitionFactor(Re: number, relativeRoughness: number): number {
  const span = TURBULENT_RE - LAMINAR_RE;
  const t = (Re - LAMINAR_RE) / span;
  const fL = 64 / LAMINAR_RE;
  const slopeL = -64 / LAMINAR_RE ** 2;
  const { f: fT, slope: slopeT } = swameeJain(TURBULENT_RE, relativeRoughness);
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * fL +
    (t3 - 2 * t2 + t) * span * slopeL +
    (-2 * t3 + 3 * t2) * fT +
    (t3 - t2) * span * slopeT
  );
}

/** Darcy friction factor: 64/Re up to 2300, Swamee–Jain from 4000, EPANET's cubic between. */
export function frictionFactor(Re: number, roughness: number, D: number): number {
  requirePositive('Re', Re);
  requireNonNegative('roughness', roughness);
  requirePositive('D', D);
  if (Re <= LAMINAR_RE) return 64 / Re;
  if (Re >= TURBULENT_RE) return swameeJain(Re, roughness / D).f;
  return transitionFactor(Re, roughness / D);
}

/** Darcy–Weisbach (13.3): Δp_f = f (L/D) ½ρv². */
export function darcyLoss(fric: number, L: number, D: number, f: Fluid, v: number): number {
  requireNonNegative('fric', fric);
  requireNonNegative('L', L);
  requirePositive('D', D);
  requirePositive('rho', f.rho);
  return (fric * L * f.rho * v * v) / (2 * D);
}

/** Local loss (13.3): Δp = K ½ρv². */
export function minorLoss(K: number, f: Fluid, v: number): number {
  requireNonNegative('K', K);
  requirePositive('rho', f.rho);
  return K * 0.5 * f.rho * v * v;
}

/**
 * Cv = Q√(SG/Δp) with Q in GPM and Δp in psi, so Δp[psi] = SG (Q[GPM]/Cv)². Here Q is in m³/s
 * and the result in Pa.
 */
export function cvLoss(Q: number, cv: number, f: Fluid): number {
  requireNonNegative('Q', Q);
  requirePositive('cv', cv);
  requirePositive('rho', f.rho);
  const specificGravity = f.rho / CV_WATER_DENSITY;
  return specificGravity * (Q / M3S_PER_GPM / cv) ** 2 * PA_PER_PSI;
}

/** Bernoulli (13.2), g = 9,81 m/s²: p₂ = p₁ + ½ρ(v₁² − v₂²) + ρg(y₁ − y₂). */
export function bernoulliPressure(
  p1: number,
  v1: number,
  y1: number,
  v2: number,
  y2: number,
  f: Fluid,
): number {
  requireFluid(f);
  return p1 + 0.5 * f.rho * (v1 * v1 - v2 * v2) + f.rho * G_EARTH * (y1 - y2);
}

/** Δp = a·Qᵇ (0 at no flow). */
export function curveLoss(curve: LossCurve, Q: number): number {
  requirePositive('a', curve.a);
  requireExponent(curve.b);
  requireNonNegative('Q', Q);
  return curve.a * Q ** curve.b;
}

/** The curve Δp = a·Qⁿ through a nominal point (MBL: k = ṁ_nominal / Δp_nominal^(1/n)). */
export function powerLawCurve(dpNominal: number, qNominal: number, n: number): LossCurve {
  requirePositive('dpNominal', dpNominal);
  requirePositive('qNominal', qNominal);
  requireExponent(n);
  return { a: dpNominal / qNominal ** n, b: n };
}

/** Hydraulic power P = Δp·Q (W), the twin of P = F·v. */
export function hydraulicPower(dp: number, Q: number): number {
  requireFinite('dp', dp);
  requireNonNegative('Q', Q);
  return dp * Q;
}

function segmentArea(s: Segment): number {
  if (s.area === undefined) return pipeArea(s.diameter);
  requirePositive('area', s.area);
  return s.area;
}

/**
 * Loss in one segment carrying its own flow Q: Darcy friction plus K for a plain stretch of pipe
 * or hose; a component with a Cv or a measured curve takes its loss from that law alone (Cv is
 * defined across the mated coupling, and a cold plate's curve covers its internal piping), so
 * adding friction over its drawn length would count it twice. K adds in both cases.
 */
export function segmentLoss(s: Segment, Q: number, f: Fluid): number {
  requireNonNegative('Q', Q);
  requireFluid(f);
  if (Q === 0) return 0;
  const v = Q / segmentArea(s);
  const isMeasuredComponent = s.cv !== undefined || s.curve !== undefined;
  const friction =
    s.length > 0 && !isMeasuredComponent
      ? darcyLoss(
          frictionFactor(reynolds(f, v, s.diameter), s.roughness, s.diameter),
          s.length,
          s.diameter,
          f,
          v,
        )
      : 0;
  const local = s.K === undefined ? 0 : minorLoss(s.K, f, v);
  const connector = s.cv === undefined ? 0 : cvLoss(Q, s.cv, f);
  const measured = s.curve === undefined ? 0 : curveLoss(s.curve, Q);
  return friction + local + connector + measured;
}

/** Losses of a path in series at the path flow Q (each segment carries Q × its flowMultiple). */
export function seriesLoss(segments: readonly Segment[], Q: number, f: Fluid): number {
  return segments.reduce((sum, s) => sum + segmentLoss(s, Q * (s.flowMultiple ?? 1), f), 0);
}

/**
 * v(x), ideal p(x) and real p(x) along a path that starts at y = 0 with pressure p₀: two points
 * per segment, at its ends, so velocity steps where the section changes. The ideal pressure keeps
 * p + ½ρv² + ρgy constant (13.2); the real one also subtracts the losses, spread linearly over
 * each segment. Q is the path flow: each segment carries Q × its flowMultiple (for a rack, Q is
 * one server's flow, and rackProfile in the liquid-cooling data builds that call).
 */
export function circuitProfile(
  segments: readonly Segment[],
  Q: number,
  f: Fluid,
  p0: number,
): ProfilePoint[] {
  requirePositive('Q', Q);
  requireFluid(f);
  requireFinite('p0', p0);
  if (segments.length === 0) return [];
  const velocities = segments.map((s) => (Q * (s.flowMultiple ?? 1)) / segmentArea(s));
  const head = p0 + 0.5 * f.rho * velocities[0] ** 2;
  const points: ProfilePoint[] = [];
  let x = 0;
  let y = 0;
  let lost = 0;
  segments.forEach((s, i) => {
    const v = velocities[i];
    const ideal = (height: number) => head - 0.5 * f.rho * v * v - f.rho * G_EARTH * height;
    points.push({ x, segmentId: s.id, v, pIdeal: ideal(y), pReal: ideal(y) - lost });
    x += s.length;
    y += s.dy;
    lost += segmentLoss(s, Q * (s.flowMultiple ?? 1), f);
    points.push({ x, segmentId: s.id, v, pIdeal: ideal(y), pReal: ideal(y) - lost });
  });
  return points;
}

const SPLIT_MAX_ITERATIONS = 500;
const SPLIT_TOLERANCE = 1e-9;
/** manifold.py's under-relaxation: q ← ½q + ½q_nuevo. */
const SPLIT_RELAXATION = 0.5;
const BISECTION_STEPS = 200;

export interface BranchFlowsInput {
  /** Flow into the rack (m³/s). */
  Qrack: number;
  /** Every branch's law, Δp = a·Qᵇ, from its supply port to its return port. */
  branchCurve: LossCurve;
  /** One header piece between two ports (length = port pitch); its rise cancels in the loop. */
  header: Segment;
  ports: number;
  layout: ReturnLayout;
  f: Fluid;
}

export interface BranchFlowsResult {
  /** Flow of each server (m³/s), from the port nearest the inlet (1, bottom) to the top. */
  flows: number[];
  converged: boolean;
  iterations: number;
}

/** Running sums: out[i] = values[0] + … + values[i]. */
function cumulative(values: readonly number[]): number[] {
  let sum = 0;
  return values.map((value) => (sum += value));
}

/**
 * Pressure each branch gets on top of the rack's inlet–outlet difference: minus the supply header
 * loss up to its port and minus the return header loss from its port to the outlet (below port 1
 * in direct return, above port N in reverse return). Header piece i carries the cumulative flow.
 */
function availablePressure(q: readonly number[], input: BranchFlowsInput): number[] {
  const { Qrack, header, layout, f } = input;
  const pieceLoss = (flow: number) => segmentLoss(header, Math.max(flow, 0), f);
  const isDirect = layout === 'directo';
  const takenBelow = cumulative([0, ...q.slice(0, -1)]);
  const supply = cumulative(takenBelow.map((taken) => pieceLoss(Qrack - taken)));
  // Return piece next to port i: below it (q_i + … + q_N) in direct return, above it
  // (q_1 + … + q_i) in reverse return.
  const returnFlows = isDirect ? cumulative([...q].reverse()).reverse() : cumulative(q);
  const returnPieces = returnFlows.map(pieceLoss);
  const returnLoss = isDirect
    ? cumulative(returnPieces)
    : cumulative([...returnPieces].reverse()).reverse();
  return supply.map((loss, i) => -loss - returnLoss[i]);
}

/**
 * Flows when every branch sees C + available_i and they add up to the rack flow (bisection on C).
 * C is measured from the best-placed branch, so it lies in [0, a·Q_rackᵇ] (that branch alone takes
 * the whole flow at the top) and never cancels against huge header losses.
 */
function shareRackFlow(available: readonly number[], curve: LossCurve, Qrack: number): number[] {
  const best = Math.max(...available);
  const relative = available.map((extra) => extra - best);
  const flowsAt = (C: number) =>
    relative.map((extra) => (Math.max(C + extra, 0) / curve.a) ** (1 / curve.b));
  const total = (C: number) => flowsAt(C).reduce((sum, flow) => sum + flow, 0);
  let lo = 0;
  let hi = curveLoss(curve, Qrack);
  for (let step = 0; step < BISECTION_STEPS; step++) {
    const mid = 0.5 * (lo + hi);
    if (mid === lo || mid === hi) break;
    if (total(mid) > Qrack) hi = mid;
    else lo = mid;
  }
  return flowsAt(0.5 * (lo + hi));
}

/**
 * Split of the rack flow among `ports` equal branches between a supply and a return header
 * (13.4; manifold.py, research §7.2): iterate «header losses with the current flows → flows that
 * equalise every branch», under-relaxed, until the relative change is below 1e-9. After 500
 * iterations, or if a number stops being finite, it returns the last finite flows with
 * converged: false (Review Focus 3: never NaN). Bernoulli recovery in the header is left out.
 */
export function branchFlows(input: BranchFlowsInput): BranchFlowsResult {
  const { Qrack, branchCurve, ports, f } = input;
  requirePositive('Qrack', Qrack);
  requirePositive('a', branchCurve.a);
  requireExponent(branchCurve.b);
  requireFluid(f);
  if (!Number.isInteger(ports) || ports < 1) {
    throw new RangeError(`ports must be a positive integer, got ${ports}`);
  }
  const mean = Qrack / ports;
  let flows = Array.from({ length: ports }, () => mean);
  for (let iteration = 1; iteration <= SPLIT_MAX_ITERATIONS; iteration++) {
    const target = shareRackFlow(availablePressure(flows, input), branchCurve, Qrack);
    const next = flows.map((q, i) => SPLIT_RELAXATION * q + (1 - SPLIT_RELAXATION) * target[i]);
    if (!next.every(Number.isFinite)) return { flows, converged: false, iterations: iteration };
    const change = Math.max(...next.map((q, i) => Math.abs(q - flows[i]))) / mean;
    flows = next;
    if (change < SPLIT_TOLERANCE) return { flows, converged: true, iterations: iteration };
  }
  return { flows, converged: false, iterations: SPLIT_MAX_ITERATIONS };
}

/**
 * Where a pump curve meets a system curve, Δp_bomba(Q) = Δp_sistema(Q), searched in [0, Qmax]
 * (same units in both). Null when the pump cannot start the flow, when the crossing lies beyond
 * Qmax (the measured range of the curve) or when a curve is not finite.
 */
export function operatingPoint(
  pump: (Q: number) => number,
  system: (Q: number) => number,
  Qmax: number,
): { Q: number; dp: number } | null {
  requirePositive('Qmax', Qmax);
  const surplus = (Q: number) => pump(Q) - system(Q);
  const atZero = surplus(0);
  const atMax = surplus(Qmax);
  if (!Number.isFinite(atZero) || !Number.isFinite(atMax) || atZero < 0 || atMax > 0) return null;
  let lo = 0;
  let hi = Qmax;
  for (let step = 0; step < BISECTION_STEPS; step++) {
    const mid = 0.5 * (lo + hi);
    if (mid === lo || mid === hi) break;
    const value = surplus(mid);
    if (!Number.isFinite(value)) return null;
    if (value > 0) lo = mid;
    else hi = mid;
  }
  const Q = 0.5 * (lo + hi);
  return { Q, dp: system(Q) };
}
