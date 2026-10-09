import { G_EARTH, PERSON_HEIGHT } from './constants';
import { requirePositive } from './validate';

const SECONDS_PER_MINUTE = 60;
const TWO_PI = 2 * Math.PI;

/** Revolutions per minute to angular speed: ω = 2π·rpm/60 (rad/s). */
export function rpmToOmega(rpm: number): number {
  return (TWO_PI * rpm) / SECONDS_PER_MINUTE;
}

/** Angular speed to revolutions per minute: rpm = 60 ω/(2π). */
export function omegaToRpm(omega: number): number {
  return (omega * SECONDS_PER_MINUTE) / TWO_PI;
}

/** Centripetal acceleration from angular speed: a_c = ω² r. */
export function centripetalFromOmega(omega: number, r: number): number {
  return omega * omega * r;
}

/** Centripetal acceleration from tangential speed: a_c = v²/r. */
export function centripetalFromSpeed(v: number, r: number): number {
  requirePositive('r', r);
  return (v * v) / r;
}

/** Tangential speed: v = ω r. */
export function tangentialSpeed(omega: number, r: number): number {
  return omega * r;
}

/** Period of revolution: T = 2π/ω. */
export function period(omega: number): number {
  requirePositive('omega', omega);
  return TWO_PI / omega;
}

/** Frequency of revolution: f = ω/(2π). */
export function frequency(omega: number): number {
  return omega / TWO_PI;
}

/** Radius that yields a target centripetal acceleration at a spin rate: r = a/ω². */
export function radiusForGravity(targetA: number, rpm: number): number {
  requirePositive('targetA', targetA);
  requirePositive('rpm', rpm);
  const omega = rpmToOmega(rpm);
  return targetA / (omega * omega);
}

/** Spin rate that yields a target centripetal acceleration at a radius: ω = √(a/r), in rpm. */
export function rpmForGravity(targetA: number, r: number): number {
  requirePositive('targetA', targetA);
  requirePositive('r', r);
  return omegaToRpm(Math.sqrt(targetA / r));
}

/** Relative head-to-foot gravity gradient: Δa/a = h/r. */
export function headToFootGradient(r: number, height: number): number {
  requirePositive('r', r);
  return height / r;
}

/** Maximum flat-curve speed before sliding: v_max = √(μ g r). */
export function maxCorneringSpeed(mu: number, g: number, r: number): number {
  requirePositive('mu', mu);
  requirePositive('g', g);
  requirePositive('r', r);
  return Math.sqrt(mu * g * r);
}

/** Full description of a rotating habitat at radius r and spin rate rpm. */
export interface HabitatSolution {
  r: number;
  rpm: number;
  omega: number;
  v: number;
  aC: number;
  gRatio: number;
  period: number;
  frequency: number;
  gradient: number;
}

/** Rotating habitat: ω = 2π·rpm/60, v = ω r, a_c = ω² r, a_c/g, T = 2π/ω, f = ω/(2π), Δa/a = h/r. */
export function solveHabitat(
  input: { r: number; rpm: number },
  g: number = G_EARTH,
): HabitatSolution {
  const { r, rpm } = input;
  requirePositive('r', r);
  requirePositive('rpm', rpm);
  requirePositive('g', g);
  const omega = rpmToOmega(rpm);
  const aC = centripetalFromOmega(omega, r);
  return {
    r,
    rpm,
    omega,
    v: tangentialSpeed(omega, r),
    aC,
    gRatio: aC / g,
    period: period(omega),
    frequency: frequency(omega),
    gradient: headToFootGradient(r, PERSON_HEIGHT),
  };
}
