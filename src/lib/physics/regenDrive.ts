/*
 * «Conducir» (Tema 6): the reader's pedals drive the car and the energy kernel of the cycle
 * (stepBalance: intervalFlow, road load, f(v) and P_máx) books every step. Pure and deterministic:
 * a state and the pedals held during dt give the next state. SI units: m, s, m/s, N, W, J.
 * Sources: the FASTSim 3.1.0 vehicle file of the 2022 Tesla Model 3 RWD (research §2, FASTSim) for
 * the chassis and the motor; the EPA cars of the lab for the mass and the road load.
 */
import { G_EARTH } from './constants';
import {
  FASTSIM_MOTOR_PMAX_W,
  stepBalance,
  type BalanceStep,
  type RegenParams,
  type Vehicle,
} from './energy';
import { requireFinite, requireNonNegative, requirePositive } from './validate';

/**
 * Chassis of `fastsim-core/resources/vehicles/2022 Tesla Model 3 RWD thrml.yaml` (FASTSim v3.1.0,
 * sha256 a66abe1b…, the file of research §2): `wheel_fric_coef` 0.7, `drive_axle_weight_frac`
 * 0.59, `cg_height_meters` −0.53 (FASTSim takes its absolute value) and `wheel_base_meters`
 * 2.87528. Estimates of the FASTSim team, not Tesla's data, as its motor's 239 kW.
 */
export const FASTSIM_MODEL3_CHASSIS = {
  wheelFricCoef: 0.7,
  driveAxleWeightFrac: 0.59,
  cgHeight: 0.53,
  wheelBase: 2.87528,
} as const;

export type Chassis = typeof FASTSIM_MODEL3_CHASSIS;

/**
 * The most the drive wheels can push the car, as an acceleration (m/s²): FASTSim 3.1.0's
 * traction limit (`vehicle_model.rs`, `set_curr_pwr_out_max`) for a rear drive, whose axle gains
 * weight as the car accelerates: a = μ φ g / (1 − h μ / L). 4,65 m/s² for the Model 3 (with
 * g = 9,81 m/s², the site's, where FASTSim uses 9,806 65).
 */
export function tractionAccelMax(chassis: Chassis = FASTSIM_MODEL3_CHASSIS): number {
  const { wheelFricCoef: mu, driveAxleWeightFrac: phi, cgHeight: h, wheelBase: l } = chassis;
  return (mu * phi * G_EARTH) / (1 - (h * mu) / l);
}

/** The car as the pedals see it: its EPA mass and road load, and what each pedal can ask. */
export interface DriveCar {
  vehicle: Vehicle;
  /** Accelerator on the floor: the traction limit m·a_máx (N). */
  tractionForceMax: number;
  /** …and never more than the motor's power (W): above P/F the force is P/v. */
  tractionPowerMax: number;
  /** Brake on the floor: the grip of the four tyres, μ n with n = m g (N). */
  brakeForceMax: number;
}

/**
 * The pedals' limits for a car of the lab: the FASTSim Model 3's traction limit and motor, and
 * brakes up to μ m g with the same μ, applied to the car's own mass. The LEAF keeps the Model 3's
 * chassis and its 239 kW motor (the topic has no figure of its own): the lab says so in «Qué deja
 * fuera el modelo».
 */
export function driveCar(vehicle: Vehicle, chassis: Chassis = FASTSIM_MODEL3_CHASSIS): DriveCar {
  requirePositive('m', vehicle.m);
  return {
    vehicle,
    tractionForceMax: vehicle.m * tractionAccelMax(chassis),
    tractionPowerMax: FASTSIM_MOTOR_PMAX_W,
    brakeForceMax: chassis.wheelFricCoef * vehicle.m * G_EARTH,
  };
}

/**
 * A key or a button is on or off, a foot is not: a held pedal sinks from rest to the floor in
 * PEDAL_APPLY_S and a released one comes back from the floor in PEDAL_RETURN_S, so a short press
 * brakes softly and a long one hard.
 */
export const PEDAL_APPLY_S = 2;
export const PEDAL_RETURN_S = 0.5;

/** The pedal's depth (0 at rest, 1 on the floor) after dt (s) held or released. */
export function pedalTravel(depth: number, isHeld: boolean, dt: number): number {
  requireNonNegative('dt', dt);
  const next = isHeld ? depth + dt / PEDAL_APPLY_S : depth - dt / PEDAL_RETURN_S;
  return Math.min(Math.max(next, 0), 1);
}

/** Which pedals the reader holds during a step. */
export interface PedalsHeld {
  throttle: boolean;
  brake: boolean;
}

/**
 * The run at an instant: the kernel's step (powers of the last interval, energies from the start
 * of the run), the distance (m), each pedal's depth and what limited the last step.
 */
export interface DriveState extends BalanceStep {
  distance: number;
  throttle: number;
  brake: number;
  /** η·P_regen of the last interval: what reaches the battery now (W). */
  pBattery: number;
  /** The accelerator asked for more than the motor's power: the force was P/v. */
  isTractionPowerLimited: boolean;
  /** P_regen was held at P_máx: the battery took no more and the pads took the rest. */
  isRegenAtLimit: boolean;
  /**
   * Below P_máx the pads braked more than the motor: f(v) < ½ near rest (about 5 mph). FASTSim's
   * 2 % at road speed (f = 0,98) is not this.
   */
  isFadeFriction: boolean;
}

/** Powers below this (W) are float residue, as in the lab's drawing. */
const POWER_EPSILON_W = 1;

/** A car at speed v (m/s) and distance x (m) at time t (s), pedals up and the books empty. */
export function startDrive(v: number, distance: number, t = 0): DriveState {
  requireNonNegative('v', v);
  requireFinite('distance', distance);
  requireFinite('t', t);
  return {
    t,
    v,
    distance,
    pWheel: 0,
    pBrake: 0,
    pRegen: 0,
    pFriction: 0,
    pBattery: 0,
    eTraction: 0,
    eRoadLoad: 0,
    eKineticRemoved: 0,
    eBrake: 0,
    eBattery: 0,
    eFriction: 0,
    eConversionLoss: 0,
    throttle: 0,
    brake: 0,
    isTractionPowerLimited: false,
    isRegenAtLimit: false,
    isFadeFriction: false,
  };
}

/**
 * The force the pedals put on the car at speed v (N, + forward): the brake overrides the
 * accelerator (no traction while the brake pedal is down), as cars do; the accelerator pushes with
 * its depth times the traction limit, never more than the motor's power over v.
 */
function pedalForce(car: DriveCar, throttle: number, brake: number, v: number) {
  const powerForce = v > 0 ? car.tractionPowerMax / v : Number.POSITIVE_INFINITY;
  const asked = brake > 0 ? 0 : throttle * car.tractionForceMax;
  return {
    force: Math.min(asked, powerForce) - brake * car.brakeForceMax,
    isTractionPowerLimited: asked > powerForce,
  };
}

/**
 * The speed after dt under a force F with the road load taken at the mean speed v̄, as the kernel
 * books it: m (v1 − v0)/dt = F − F_RL(v̄). Then P = ΔK/dt + F_RL(v̄) v̄ = F v̄ exactly, so coasting
 * books no power at the wheels. With s = v0 + v1 it is (C/4) s² + (m/dt + B/2) s + A − F − 2 m v0/dt
 * = 0, solved in the form stable for C → 0. Negative when the car would stop within dt.
 */
function endSpeed({ m, roadLoad: { A, B, C } }: Vehicle, v0: number, force: number, dt: number) {
  const a = C / 4;
  const b = m / dt + B / 2;
  const c = A - force - (2 * m * v0) / dt;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) throw new RangeError(`dt = ${dt} s is too long for this road load`);
  return (-2 * c) / (b + Math.sqrt(discriminant)) - v0;
}

/**
 * When the car stops within the step: the time τ (s) it takes from v0 to rest under F and the road
 * load at the mean speed v0/2, m v0 / τ = F_RL(v0/2) − F.
 */
function stopTime({ m, roadLoad: { A, B, C } }: Vehicle, v0: number, force: number): number {
  const mean = v0 / 2;
  return (m * v0) / (A + B * mean + C * mean * mean - force);
}

/** The kernel's intervals of one step: one, or two when the car stops inside it (to rest, at rest). */
function stepIntervals(state: DriveState, force: number, dt: number, vehicle: Vehicle) {
  const v1 = endSpeed(vehicle, state.v, force, dt);
  if (v1 >= 0) return [{ t: state.t + dt, v: v1 }];
  if (state.v === 0) return [{ t: state.t + dt, v: 0 }];
  return [
    { t: state.t + stopTime(vehicle, state.v, force), v: 0 },
    { t: state.t + dt, v: 0 },
  ];
}

/**
 * One step of dt (s): the pedals move (pedalTravel), they push or brake the car (pedalForce), the
 * kernel books the interval with the lab's η, P_máx and f(v) (stepBalance, the same as the cycle's),
 * and v ≥ 0 always: a step that would pass rest stops the car within it. The flags say what limited
 * the moving part of the step. Returns a new state; nothing is mutated.
 */
export function driveStep(
  state: DriveState,
  held: PedalsHeld,
  dt: number,
  car: DriveCar,
  regen: RegenParams,
): DriveState {
  requirePositive('dt', dt);
  requireNonNegative('v', state.v);
  const throttle = pedalTravel(state.throttle, held.throttle, dt);
  const brake = pedalTravel(state.brake, held.brake, dt);
  const { force, isTractionPowerLimited } = pedalForce(car, throttle, brake, state.v);
  const intervals = stepIntervals(state, force, dt, car.vehicle);
  const steps = intervals.reduce<BalanceStep[]>(
    (acc, sample) => [...acc, stepBalance(acc[acc.length - 1], sample, car.vehicle, regen)],
    [state],
  );
  const moving = steps[1];
  const last = steps[steps.length - 1];
  const isBraking = moving.pFriction > POWER_EPSILON_W;
  const isRegenAtLimit = isBraking && moving.pRegen >= regen.pMax;
  return {
    ...last,
    distance: state.distance + ((state.v + moving.v) / 2) * (moving.t - state.t),
    throttle,
    brake,
    pBattery: regen.eta * last.pRegen,
    isTractionPowerLimited,
    isRegenAtLimit,
    isFadeFriction: isBraking && !isRegenAtLimit && moving.pFriction > moving.pRegen,
  };
}
