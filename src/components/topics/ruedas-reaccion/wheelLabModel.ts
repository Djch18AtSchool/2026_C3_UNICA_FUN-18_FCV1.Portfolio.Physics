/**
 * The reaction-wheel laboratory's physics, on the Tema 8 kernel and data: the 6U CubeSat with the
 * AAC Clyde RW400 (research §6). "Maniobra" is a rest-to-rest turn about the slew axis;
 * "Perturbación y descarga" holds the body still while the gravity-gradient bound fills the wheel
 * and a second actuator dumps it from a design-choice threshold. Angles in °, rates in °/s and rpm.
 */
import {
  CUBESAT_6U,
  GRAVITY_GRADIENT_6U,
  MAGNETORQUER_6U,
  RW400,
} from '../../../lib/data/reactionWheels';
import {
  minSlewTime,
  omegaToRpm,
  restToRestSlew,
  slewStateAt,
  wheelMomentumAt,
  type DumpingParams,
} from '../../../lib/physics';
import { DEG } from './wheelScene';

export type WheelMode = 'maniobra' | 'perturbacion';
export type DumpActuator = 'magnetopar' | 'propulsor';

/** The laboratory's controls: mode, target angle θ (°), maneuver time T (s) and dump actuator. */
export interface WheelSettings {
  mode: WheelMode;
  thetaDeg: number;
  T: number;
  actuator: DumpActuator;
}

/** The spacecraft and wheel of the worked example: I_s (kg·m²) and the RW400's limits. */
export const SPACECRAFT = {
  Is: CUBESAT_6U.Is,
  Iw: RW400.inertiaDerived,
  Lmax: RW400.Lmax,
  tauMax: RW400.tauMax,
  rpmMax: RW400.rpmMax,
} as const;

/**
 * The dump starts at 80 % of L_max and empties the wheel: a design choice in the style of
 * Basilisk's `hs_min` (research §7), not a datum.
 */
export const DUMP_THRESHOLD = 0.8;
const DUMP_FLOOR = 0;
export const SECONDS_PER_HOUR = 3600;
const HOURS_PER_DAY = 24;
/** The disturbance runs for three days: the fill to the threshold (48,6 h), the dump and a refill. */
export const DISTURBANCE_DAYS = 3;
export const SECONDS_PER_DAY = HOURS_PER_DAY * SECONDS_PER_HOUR;
export const DISTURBANCE_SPAN = DISTURBANCE_DAYS * SECONDS_PER_DAY;
/**
 * Seconds of disturbance per second of playback at 1×: two hours of orbit a second, so a day
 * plays in 12 s at 1× (each dump is then stretched, see disturbanceTimeline.ts). The maneuver
 * plays in real time.
 */
export const DAY_LAPSE = 2 * SECONDS_PER_HOUR;
const PERCENT = 100;
const DEG_PER_RAD = 1 / DEG;
const TWO_PI = 2 * Math.PI;

/**
 * Dump torque (N·m). Magnetorquer: m·B = 1,2·10⁻⁵ N·m with m ⊥ B, its best case. Thruster: τ = r × F
 * can be large, but the wheel must brake by as much while the body stays still, so the dump rate
 * is bounded by the wheel's own τ_max (8 mN·m); the laboratory uses that bound.
 */
export function dumpTorque(actuator: DumpActuator): number {
  return actuator === 'magnetopar' ? MAGNETORQUER_6U.torque : SPACECRAFT.tauMax;
}

export function dumpingParams(actuator: DumpActuator): DumpingParams {
  return {
    tauExt: GRAVITY_GRADIENT_6U.torque,
    tauDump: dumpTorque(actuator),
    Lmax: SPACECRAFT.Lmax,
    dumpAt: DUMP_THRESHOLD,
    dumpTo: DUMP_FLOOR,
  };
}

/**
 * What the readouts show at one instant, signed (counterclockwise positive): θ_s (°), ω_s (°/s),
 * ω_w (rpm), L_w (N·m·s), the motor torque on the wheel τ = dL_w/dt (N·m) and |L_w|/L_max.
 */
export interface WheelReadings {
  thetaS: number;
  omegaS: number;
  omegaW: number;
  Lw: number;
  torque: number;
  share: number;
}

export interface ManeuverReadings extends WheelReadings {
  /** Inertial wheel angle (rad), to draw the spinning wheel. */
  thetaW: number;
  /** Wheel turns so far, signed like θ_w. */
  turns: number;
  /** The plan's peak wheel rate (rpm), signed against θ. */
  peakOmegaW: number;
}

export interface DisturbanceReadings extends WheelReadings {
  dumping: boolean;
}

const thetaRad = (settings: WheelSettings) => settings.thetaDeg * DEG;

/** The rest-to-rest turn at t (s): the kernel's ideal profile, finite even when T < T_min. */
export function maneuverReadings(settings: WheelSettings, t: number): ManeuverReadings {
  const { Is, Iw, Lmax } = SPACECRAFT;
  const theta = thetaRad(settings);
  const state = slewStateAt(Is, Iw, theta, settings.T, t);
  const plan = restToRestSlew(Is, Iw, theta, settings.T);
  return {
    thetaS: state.thetaS * DEG_PER_RAD,
    omegaS: state.omegaS * DEG_PER_RAD,
    omegaW: omegaToRpm(state.omegaW),
    Lw: state.Lw,
    torque: state.torque,
    share: Math.abs(state.Lw) / Lmax,
    thetaW: state.thetaW,
    turns: state.thetaW / TWO_PI,
    peakOmegaW: -Math.sign(theta) * omegaToRpm(plan.peakWheelRate),
  };
}

/** The shortest turn the wheel allows for θ (s), by torque and by momentum, and what T asks for. */
export interface Feasibility {
  byTorque: number;
  byMomentum: number;
  tMin: number;
  isFeasible: boolean;
  /** The plan's torque over τ_max and its peak |L_w| over L_max. */
  torqueShare: number;
  momentumShare: number;
}

export function maneuverFeasibility(settings: WheelSettings): Feasibility {
  const { Is, Iw, tauMax, Lmax } = SPACECRAFT;
  const theta = thetaRad(settings);
  const { byTorque, byMomentum } = minSlewTime(Is, theta, tauMax, Lmax);
  const tMin = Math.max(byTorque, byMomentum);
  const plan = restToRestSlew(Is, Iw, theta, settings.T);
  return {
    byTorque,
    byMomentum,
    tMin,
    isFeasible: settings.T >= tMin,
    torqueShare: plan.torque / tauMax,
    momentumShare: plan.peakWheelMomentum / Lmax,
  };
}

/** The held-still body at t (s): the wheel absorbs τ_ext, then the dump brakes it (τ < 0). */
export function disturbanceReadings(actuator: DumpActuator, t: number): DisturbanceReadings {
  const params = dumpingParams(actuator);
  const { Lw, dumping } = wheelMomentumAt(t, params);
  return {
    thetaS: 0,
    omegaS: 0,
    omegaW: omegaToRpm(Lw / SPACECRAFT.Iw),
    Lw,
    torque: dumping ? params.tauExt - params.tauDump : params.tauExt,
    share: Lw / SPACECRAFT.Lmax,
    dumping,
  };
}

export type SeriesPoint = { x: number; y: number };

/** Signed L_w/L_max (%) against t (s) for the maneuver: a triangle, exact with its three corners. */
export function maneuverSeries(settings: WheelSettings): SeriesPoint[] {
  return [0, settings.T / 2, settings.T].map((t) => ({
    x: t,
    y: (maneuverReadings(settings, t).Lw / SPACECRAFT.Lmax) * PERCENT,
  }));
}

/**
 * Corner times (s) of the sawtooth inside the span: the first fill, then every dump start and
 * end. L_w is linear between them, so these points draw it exactly.
 */
export function sawtoothCorners({
  tauExt,
  tauDump,
  Lmax,
  dumpAt,
  dumpTo,
}: DumpingParams): number[] {
  const reachHigh = (dumpAt * Lmax) / tauExt;
  const swing = (dumpAt - dumpTo) * Lmax;
  const dumpDuration = swing / (tauDump - tauExt);
  const period = dumpDuration + swing / tauExt;
  const corners = [0];
  for (let start = reachHigh; start < DISTURBANCE_SPAN; start += period) {
    corners.push(start, Math.min(start + dumpDuration, DISTURBANCE_SPAN));
  }
  return [...new Set([...corners, DISTURBANCE_SPAN])];
}

/** L_w/L_max (%) against t (h) over the three days, with every corner of the sawtooth. */
export function disturbanceSeries(actuator: DumpActuator): SeriesPoint[] {
  return sawtoothCorners(dumpingParams(actuator)).map((t) => ({
    x: t / SECONDS_PER_HOUR,
    y: disturbanceReadings(actuator, t).share * PERCENT,
  }));
}
