import { G_EARTH } from './constants';
import { requireFinite, requireNonNegative, requirePositive } from './validate';

/*
 * Energy balance of an electric car over a drive cycle (Tema 6). SI units throughout: energies in
 * J, powers in W, speeds in m/s. EPA imperial units only enter through roadLoadFromEpa.
 * Source of the scheme and of every reference number: docs/superpowers/research/
 * 2026-10-30-frenado-regenerativo.md, §6 Paso 4 and §7.
 */

/** Exact by definition (international pound, 1959). */
export const KG_PER_LB = 0.45359237;
/** Standard gravity g_n, which defines the pound-force; not the textbook g = 9,81 m/s². */
const STANDARD_GRAVITY = 9.80665;
/** 1 lbf = 0,453 592 37 kg × 9,806 65 m/s² = 4,448 221 6 N. */
export const N_PER_LBF = KG_PER_LB * STANDARD_GRAVITY;
/** Exact: 1 mi = 1609,344 m, so 1 mph = 1609,344 m / 3600 s. */
export const MS_PER_MPH = 0.44704;

/** EPA road-load coefficients in SI: F_RL = A + B v + C v² (A in N, B in N·s/m, C in N·s²/m²). */
export interface RoadLoad {
  A: number;
  B: number;
  C: number;
}

/** A car for the balance: mass m (kg; the EPA equivalent test weight) and its road load. */
export interface Vehicle {
  name: string;
  m: number;
  roadLoad: RoadLoad;
}

/**
 * Regenerative braking model: wheel-to-battery efficiency η (0…1), the regenerative power limit
 * P_máx (W) and whether FASTSim's low-speed fade f(v) applies (otherwise f = 1).
 */
export interface RegenParams {
  eta: number;
  pMax: number;
  lowSpeedFade: boolean;
}

/** One point of a drive cycle: time t (s) and speed v (m/s). */
export interface CycleSample {
  t: number;
  v: number;
}

/**
 * The balance at sample i: the powers (W) of the interval [t_{i−1}, t_i] and the energies (J)
 * accumulated from the start of the cycle to t_i.
 */
export interface BalanceStep {
  t: number;
  v: number;
  pWheel: number;
  pBrake: number;
  pRegen: number;
  pFriction: number;
  eTraction: number;
  eRoadLoad: number;
  eKineticRemoved: number;
  eBrake: number;
  eBattery: number;
  eFriction: number;
  /** (1 − η)·P_regen accumulated: what the motor takes from the wheels but loses before the battery. */
  eConversionLoss: number;
}

/**
 * Totals of the cycle (J, except recoveredShare = battery / traction, peakBrakePower in W and
 * peakDecelG in units of g = 9,81 m/s²). kineticRemoved = roadLoadWhileSlowing + brake: of the
 * kinetic energy removed while slowing, road load dissipates a part and the brakes take the rest.
 */
export interface BalanceTotals {
  traction: number;
  roadLoad: number;
  kineticRemoved: number;
  roadLoadWhileSlowing: number;
  brake: number;
  battery: number;
  friction: number;
  /** brake − friction − battery = Σ (1 − η)·P_regen·Δt; with friction, what the braking dissipates. */
  conversionLoss: number;
  recoveredShare: number;
  peakBrakePower: number;
  peakDecelG: number;
}

/** P_máx of the FASTSim 3.1.0 Tesla Model 3 RWD motor (research §5). */
const FASTSIM_MOTOR_PMAX_W = 239_000;
/**
 * The site's improved model (spec §6, ruling R19): η constant 0,80 (Boretti measured 70–80 % on
 * the 2012 Leaf and 72–87 % on the 2013 one, research §5), P_máx 239 kW and FASTSim's low-speed
 * fade f(v) on. Without the fade friction is never needed in these cycles and the balance could
 * not show what is dissipated; pass `lowSpeedFade: false` for that simple-model contrast.
 */
export const DEFAULT_REGEN: RegenParams = {
  eta: 0.8,
  pMax: FASTSIM_MOTOR_PMAX_W,
  lowSpeedFade: true,
};

/** FASTSim 2 (simdrive.py): max_regen 0,98, regen_a 500, regen_b 0,99 (research §5). */
const FADE_MAX_REGEN = 0.98;
const FADE_A = 500;
const FADE_B = 0.99;

/** Road-load force at speed v ≥ 0: F_RL = A + B v + C v² (N). */
export function roadLoadForce(v: number, c: RoadLoad): number {
  requireNonNegative('v', v);
  return c.A + c.B * v + c.C * v * v;
}

/**
 * FASTSim 2 low-speed regenerative fraction at speed v (m/s):
 * f = 0,98 / (1 + 500·exp(−0,99·(v_mph + 1))). Near 0 at rest, 0,49 at ≈ 5,3 mph, 0,98 at road
 * speed: at low speed the motor's braking torque fades and friction finishes the stop.
 */
export function lowSpeedFade(v: number): number {
  requireNonNegative('v', v);
  const mph = v / MS_PER_MPH;
  return FADE_MAX_REGEN / (1 + FADE_A * Math.exp(-FADE_B * (mph + 1)));
}

/**
 * EPA Test Car List target coefficients (A in lbf, B in lbf/mph, C in lbf/mph²) to SI:
 * A·4,448 22 N, B·4,448 22/0,447 04 N·s/m, C·4,448 22/0,447 04² N·s²/m² (pitfall 3: C is divided
 * by the square).
 */
export function roadLoadFromEpa(Albf: number, Blbf_mph: number, Clbf_mph2: number): RoadLoad {
  requireFinite('A', Albf);
  requireFinite('B', Blbf_mph);
  requireFinite('C', Clbf_mph2);
  return {
    A: Albf * N_PER_LBF,
    B: (Blbf_mph * N_PER_LBF) / MS_PER_MPH,
    C: (Clbf_mph2 * N_PER_LBF) / MS_PER_MPH ** 2,
  };
}

/** What happens in one interval [t0, t1]: powers in W, energies in J, deceleration in m/s². */
interface IntervalFlow {
  dt: number;
  pWheel: number;
  pBrake: number;
  pRegen: number;
  eRoadLoad: number;
  kineticRemoved: number;
  roadLoadWhileSlowing: number;
  decel: number;
}

/**
 * Research §6 Paso 4 on one interval, with the mean speed v̄ = (v0 + v1)/2 (as FASTSim 3):
 * ΔK = ½ m (v1² − v0²), P = ΔK/Δt + F_RL(v̄)·v̄, P_freno = max(0, −P),
 * P_regen = min(f·P_freno, P_máx). The fade f is taken at the end speed v1, as FASTSim 2 and the
 * research script do.
 */
function intervalFlow(
  s0: CycleSample,
  s1: CycleSample,
  vehicle: Vehicle,
  regen: RegenParams,
): IntervalFlow {
  const dt = s1.t - s0.t;
  const vMean = (s0.v + s1.v) / 2;
  const deltaK = 0.5 * vehicle.m * (s1.v * s1.v - s0.v * s0.v);
  const eRoadLoad = roadLoadForce(vMean, vehicle.roadLoad) * vMean * dt;
  const pWheel = deltaK / dt + eRoadLoad / dt;
  const pBrake = Math.max(0, -pWheel);
  const fade = regen.lowSpeedFade ? lowSpeedFade(s1.v) : 1;
  const kineticRemoved = Math.max(0, -deltaK);
  return {
    dt,
    pWheel,
    pBrake,
    pRegen: Math.min(fade * pBrake, regen.pMax),
    eRoadLoad,
    kineticRemoved,
    roadLoadWhileSlowing: Math.min(eRoadLoad, kineticRemoved),
    decel: Math.max(0, (s0.v - s1.v) / dt),
  };
}

function validateInputs(cycle: readonly CycleSample[], vehicle: Vehicle, regen: RegenParams): void {
  if (cycle.length < 2) {
    throw new RangeError(`a cycle needs at least 2 samples, got ${cycle.length}`);
  }
  cycle.forEach((sample, i) => {
    requireFinite(`cycle[${i}].t`, sample.t);
    requireNonNegative(`cycle[${i}].v`, sample.v);
    const previous = cycle[i - 1];
    if (previous && !(sample.t > previous.t)) {
      throw new RangeError(`cycle time must increase: t[${i}] = ${sample.t} after ${previous.t}`);
    }
  });
  requirePositive('m', vehicle.m);
  requireFinite('A', vehicle.roadLoad.A);
  requireFinite('B', vehicle.roadLoad.B);
  requireFinite('C', vehicle.roadLoad.C);
  requireNonNegative('pMax', regen.pMax);
  requireFinite('eta', regen.eta);
  if (regen.eta < 0 || regen.eta > 1) {
    throw new RangeError(`eta must be between 0 and 1, got ${regen.eta}`);
  }
}

const startStep = ({ t, v }: CycleSample): BalanceStep => ({
  t,
  v,
  pWheel: 0,
  pBrake: 0,
  pRegen: 0,
  pFriction: 0,
  eTraction: 0,
  eRoadLoad: 0,
  eKineticRemoved: 0,
  eBrake: 0,
  eBattery: 0,
  eFriction: 0,
  eConversionLoss: 0,
});

/** The step at the end of an interval: its powers and the previous step's energies plus its own. */
function nextStep(
  previous: BalanceStep,
  sample: CycleSample,
  flow: IntervalFlow,
  eta: number,
): BalanceStep {
  const { dt, pWheel, pBrake, pRegen } = flow;
  const pFriction = pBrake - pRegen;
  return {
    t: sample.t,
    v: sample.v,
    pWheel,
    pBrake,
    pRegen,
    pFriction,
    eTraction: previous.eTraction + Math.max(0, pWheel) * dt,
    eRoadLoad: previous.eRoadLoad + flow.eRoadLoad,
    eKineticRemoved: previous.eKineticRemoved + flow.kineticRemoved,
    eBrake: previous.eBrake + pBrake * dt,
    eBattery: previous.eBattery + eta * pRegen * dt,
    eFriction: previous.eFriction + pFriction * dt,
    eConversionLoss: previous.eConversionLoss + (1 - eta) * pRegen * dt,
  };
}

/**
 * Second-by-second energy balance of a car driving a cycle (research §6 Paso 4). Returns one
 * step per sample (steps[0] is the start, with nothing accumulated) and the totals:
 * E_tracción = Σ max(0, P) Δt, E_freno = Σ P_freno Δt, E_batería = Σ η P_regen Δt,
 * E_fricción = Σ (P_freno − P_regen) Δt, the conversion loss Σ (1 − η) P_regen Δt (so
 * E_freno = E_batería + pérdidas + E_fricción) and the recovered share E_batería / E_tracción (0 when
 * nothing is spent on traction). Flat road, no auxiliaries; on a cycle that starts and ends at
 * rest, traction − brake = road load.
 */
export function cycleBalance(
  cycle: readonly CycleSample[],
  vehicle: Vehicle,
  regen: RegenParams,
): { steps: BalanceStep[]; totals: BalanceTotals } {
  validateInputs(cycle, vehicle, regen);
  const steps: BalanceStep[] = [startStep(cycle[0])];
  let roadLoadWhileSlowing = 0;
  let peakBrakePower = 0;
  let peakDecel = 0;
  for (let i = 1; i < cycle.length; i += 1) {
    const flow = intervalFlow(cycle[i - 1], cycle[i], vehicle, regen);
    steps.push(nextStep(steps[i - 1], cycle[i], flow, regen.eta));
    roadLoadWhileSlowing += flow.roadLoadWhileSlowing;
    peakBrakePower = Math.max(peakBrakePower, flow.pBrake);
    peakDecel = Math.max(peakDecel, flow.decel);
  }
  const last = steps[steps.length - 1];
  return {
    steps,
    totals: {
      traction: last.eTraction,
      roadLoad: last.eRoadLoad,
      kineticRemoved: last.eKineticRemoved,
      roadLoadWhileSlowing,
      brake: last.eBrake,
      battery: last.eBattery,
      friction: last.eFriction,
      conversionLoss: last.eConversionLoss,
      recoveredShare: last.eTraction > 0 ? last.eBattery / last.eTraction : 0,
      peakBrakePower,
      peakDecelG: peakDecel / G_EARTH,
    },
  };
}
