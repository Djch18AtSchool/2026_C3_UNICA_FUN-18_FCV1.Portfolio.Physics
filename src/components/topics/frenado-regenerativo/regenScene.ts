/**
 * Pure helpers of Tema 6's laboratory, shared with its figures: the balance read at any instant of
 * a cycle, the distance covered, the live power flow (battery ↔ motor ↔ wheels → brakes) with
 * its drawn widths, the drive regime and the cumulative-energy series in kWh with their colors.
 * Powers in W, energies in J and distances in m unless a name says otherwise.
 */
import type { BalanceStep, CycleSample } from '../../../lib/physics/energy';

export const J_PER_KWH = 3_600_000;
export const W_PER_KW = 1000;
export const KMH_PER_MS = 3.6;
export const M_PER_KM = 1000;

/** Powers below this (W) are float residue: the link is idle and the regime ignores them. */
const POWER_EPSILON = 1;
/** Flow widths: 4 kW per pixel, so 20 kW draws 5 px and the largest cycle peak (96 kW, US06) 24 px. */
const W_PER_PX = 4000;
/** A trickle still shows as a hairline; no flow is wider than the 32 px node it meets. */
export const MIN_FLOW_WIDTH = 1.5;
export const MAX_FLOW_WIDTH = 26;
/** Energy axis and bars end at the largest final energy rounded up to this many kWh. */
const AXIS_GRAIN_KWH = 0.5;
/** A plotted series keeps at most this many points (plus the last). */
const DEFAULT_MAX_POINTS = 400;

/** The balance at an instant t of the cycle, with the distance covered so far. */
export interface BalanceAt {
  t: number;
  v: number;
  distance: number;
  pWheel: number;
  pBrake: number;
  pRegen: number;
  pFriction: number;
  /** η·P_regen: what reaches the battery. */
  pBattery: number;
  eTraction: number;
  eRoadLoad: number;
  eBrake: number;
  eBattery: number;
  eFriction: number;
  /** Σ (1 − η)·P_regen·Δt so far: taken by the motor, lost before the battery. */
  eConversionLoss: number;
  /** E_batería / E_tracción so far; 0 while nothing has gone into traction. */
  recoveredShare: number;
}

/** Distance covered at each sample (m): the trapezoid of v, exact for a linear v between samples. */
export function cumulativeDistance(samples: readonly CycleSample[]): number[] {
  const distances: number[] = [0];
  for (let i = 1; i < samples.length; i += 1) {
    const [s0, s1] = [samples[i - 1], samples[i]];
    distances.push(distances[i - 1] + ((s0.v + s1.v) / 2) * (s1.t - s0.t));
  }
  return distances;
}

/** Index i ≥ 1 of the interval [t_{i−1}, t_i] holding t (binary search); 0 at or before the start. */
function intervalIndex(steps: readonly BalanceStep[], t: number): number {
  if (t <= steps[0].t) return 0;
  let low = 1;
  let high = steps.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (steps[mid].t >= t) high = mid;
    else low = mid + 1;
  }
  return low;
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/**
 * The balance at time t, clamped to the cycle: v and the energies interpolated linearly inside the
 * interval (the powers are constant there, so the energies grow linearly), the powers of the
 * interval that holds t, and the distance with the uniform acceleration of that interval.
 */
export function balanceAt(
  steps: readonly BalanceStep[],
  distances: readonly number[],
  t: number,
): BalanceAt {
  const last = steps[steps.length - 1];
  const time = Math.min(Math.max(t, steps[0].t), last.t);
  const i = intervalIndex(steps, time);
  const s1 = steps[i];
  const s0 = steps[Math.max(i - 1, 0)];
  const dt = s1.t - s0.t;
  const tau = time - s0.t;
  const u = dt > 0 ? tau / dt : 1;
  const accel = dt > 0 ? (s1.v - s0.v) / dt : 0;
  const energy = (key: EnergyKey) => lerp(s0[key], s1[key], u);
  const eTraction = energy('eTraction');
  const eBattery = energy('eBattery');
  const isStart = i === 0;
  return {
    t: time,
    v: lerp(s0.v, s1.v, u),
    distance: isStart ? distances[0] : distances[i - 1] + s0.v * tau + 0.5 * accel * tau * tau,
    pWheel: s1.pWheel,
    pBrake: s1.pBrake,
    pRegen: s1.pRegen,
    pFriction: s1.pFriction,
    pBattery: dt > 0 ? (s1.eBattery - s0.eBattery) / dt : 0,
    eTraction,
    eRoadLoad: energy('eRoadLoad'),
    eBrake: energy('eBrake'),
    eBattery,
    eFriction: energy('eFriction'),
    eConversionLoss: energy('eConversionLoss'),
    recoveredShare: eTraction > 0 ? eBattery / eTraction : 0,
  };
}

/** The end of the interval with the largest brake power: the cycle's hardest braking. */
export function peakBrakeTime(steps: readonly BalanceStep[]): number {
  return steps.reduce((best, step) => (step.pBrake > best.pBrake ? step : best), steps[0]).t;
}

export type FlowId = 'battery-motor' | 'motor-wheels' | 'wheels-brakes';
export type FlowKind = 'traction' | 'regen' | 'friction' | 'idle';

/**
 * One link of the power-flow diagram, drawn left to right as battery, motor, wheels, brakes:
 * its power (W, ≥ 0), where it goes and whether the model only bounds it from below.
 */
export interface FlowLink {
  id: FlowId;
  kind: FlowKind;
  power: number;
  towards: 'left' | 'right';
  /**
   * The model knows only the power at the wheels while driving: the battery gives at least that
   * (the motor's losses in traction are not modelled).
   */
  isLowerBound: boolean;
}

function link(id: FlowId, kind: FlowKind, power: number, towards: 'left' | 'right'): FlowLink {
  const isActive = kind !== 'idle' && power > POWER_EPSILON;
  return {
    id,
    kind: isActive ? kind : 'idle',
    power: isActive ? power : 0,
    towards,
    isLowerBound: isActive && kind === 'traction' && id === 'battery-motor',
  };
}

/** The three links at an instant: traction to the right, regeneration back to the left, friction out. */
export function powerFlows(at: BalanceAt): FlowLink[] {
  const friction = link('wheels-brakes', 'friction', at.pFriction, 'right');
  if (at.pWheel > POWER_EPSILON) {
    return [
      link('battery-motor', 'traction', at.pWheel, 'right'),
      link('motor-wheels', 'traction', at.pWheel, 'right'),
      friction,
    ];
  }
  return [
    link('battery-motor', 'regen', at.pBattery, 'left'),
    link('motor-wheels', 'regen', at.pRegen, 'left'),
    friction,
  ];
}

/** Drawn width (px) of a flow of `power` W: proportional to it, kept between the hairline and the node. */
export function flowWidth(power: number): number {
  if (!(power > POWER_EPSILON)) return 0;
  return Math.min(Math.max(power / W_PER_PX, MIN_FLOW_WIDTH), MAX_FLOW_WIDTH);
}

export type DrivePhase = 'stopped' | 'traction' | 'regen' | 'blended' | 'friction' | 'coasting';

/** What the wheels are doing: at rest, driving, braking (motor, motor and friction, friction) or neither. */
export function drivePhase(at: BalanceAt): DrivePhase {
  if (at.pWheel > POWER_EPSILON) return 'traction';
  if (at.pBrake > POWER_EPSILON) {
    const isRegen = at.pRegen > POWER_EPSILON;
    const isFriction = at.pFriction > POWER_EPSILON;
    if (isRegen && isFriction) return 'blended';
    return isRegen ? 'regen' : 'friction';
  }
  return at.v > 0 ? 'coasting' : 'stopped';
}

export const PHASE_TEXT: Readonly<Record<DrivePhase, string>> = {
  stopped: 'Detenido',
  traction: 'Traccionando',
  regen: 'Frenando con el motor',
  blended: 'Frenando con el motor y con fricción',
  friction: 'Frenando solo con fricción',
  coasting: 'Sin potencia en las ruedas',
};

export type EnergyKey =
  'eTraction' | 'eRoadLoad' | 'eBrake' | 'eBattery' | 'eConversionLoss' | 'eFriction';

export interface EnergySeriesSpec {
  key: EnergyKey;
  label: string;
  color: string;
  dashed?: boolean;
}

/** The three parts the braking at the wheels splits into: E_freno = batería + pérdidas + fricción. */
export const BRAKE_PARTS: readonly EnergyKey[] = ['eBattery', 'eConversionLoss', 'eFriction'];

/**
 * The six cumulative energies of the balance (spec §4.3 and §6, Paso 4): the battery green, the
 * friction heat orange-red and the conversion loss (1 − η) cyan, the only slot that stays clear of
 * both and of every other energy here in both themes, also for deuteranopes (CIE76 ΔE ≥ 16);
 * traction blue, road load muted and dashed, the braking at the wheels purple. What braking
 * dissipates is the conversion loss plus the friction heat.
 */
export const ENERGY_SERIES: readonly EnergySeriesSpec[] = [
  { key: 'eTraction', label: 'Tracción en las ruedas', color: 'var(--chart-1)' },
  { key: 'eRoadLoad', label: 'Carga en carretera', color: 'var(--fg-muted)', dashed: true },
  { key: 'eBrake', label: 'Frenado en las ruedas', color: 'var(--chart-4)' },
  { key: 'eBattery', label: 'A la batería', color: 'var(--chart-3)' },
  {
    key: 'eConversionLoss',
    label: 'Pérdidas de conversión (1\u00a0−\u00a0η)',
    color: 'var(--chart-6)',
  },
  { key: 'eFriction', label: 'Calor de fricción', color: 'var(--chart-2)' },
];

/** Colors of the power-flow links, the same as the energies they feed. */
export const FLOW_COLORS: Readonly<Record<Exclude<FlowKind, 'idle'>, string>> = {
  traction: 'var(--chart-1)',
  regen: 'var(--chart-3)',
  friction: 'var(--chart-2)',
};

/** One cumulative energy against t, in kWh, thinned to at most maxPoints + 1 points (both ends kept). */
export function energySeries(
  steps: readonly BalanceStep[],
  key: EnergyKey,
  maxPoints = DEFAULT_MAX_POINTS,
): { x: number; y: number }[] {
  const every = Math.max(1, Math.ceil(steps.length / maxPoints));
  const kept = steps.filter((_, i) => i % every === 0 || i === steps.length - 1);
  return kept.map((step) => ({ x: step.t, y: step[key] / J_PER_KWH }));
}

/** The energy axis end (kWh): the largest final energy, rounded up to 0,5 kWh (at least 0,5). */
export function energyAxisMax(steps: readonly BalanceStep[]): number {
  const last = steps[steps.length - 1];
  const largest = Math.max(...ENERGY_SERIES.map(({ key }) => last[key] / J_PER_KWH));
  return Math.max(AXIS_GRAIN_KWH, Math.ceil(largest / AXIS_GRAIN_KWH) * AXIS_GRAIN_KWH);
}

/** The car's x on a road drawn from x0 to x1 for a cycle of `total` m, clamped to the road. */
export function roadPosition(distance: number, total: number, x0: number, x1: number): number {
  const share = total > 0 ? Math.min(Math.max(distance / total, 0), 1) : 0;
  return x0 + share * (x1 - x0);
}
