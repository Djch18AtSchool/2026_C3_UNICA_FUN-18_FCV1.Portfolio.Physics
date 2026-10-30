/**
 * Data of Tema 8's figures and of the prescribed diagram, from the rotation kernel and the wheel
 * data (research docs/superpowers/research/2026-10-30-ruedas-reaccion.md, §6 and §7). Every number
 * a figure prints is built here, so the tests pin it.
 */
import { GRAVITY_GRADIENT_6U, MAGNETORQUER_6U, RW400 } from '../../../lib/data/reactionWheels';
import { formatNumber } from '../../../lib/format';
import { restToRestSlew, wheelMomentumAt, wheelTurnsForSlew } from '../../../lib/physics';
import {
  formatScientific,
  maneuverRow,
  WORKED_SLEW,
} from '../../../lib/tables/topics/ruedas-reaccion';

type XY = { x: number; y: number };

/**
 * One meaning per color across the topic: the wheel and its ω_w and L_w, the body and its ω_s and
 * L_s, every torque (τ and −τ of the motor, τ_ext, τ = m × B), the L_max limit in the house warning tone (--chart-2, orange),
 * the Earth and its field lines in chart 1 (as in Tema 2) and the Sun in its own token.
 */
export const WHEEL_COLORS = {
  wheel: 'var(--chart-4)',
  body: 'var(--chart-6)',
  torque: 'var(--chart-3)',
  limit: 'var(--chart-2)',
  earth: 'var(--chart-1)',
  sun: 'var(--sun)',
} as const;

const MANEUVER_SAMPLES = 120;

/** Step 2: θ_s(t) in degrees (an S) and ω_w(t) in rpm (a triangle down and back), 0 to T. */
export function maneuverSeries(samples = MANEUVER_SAMPLES): { theta: XY[]; wheel: XY[] } {
  const rows = Array.from({ length: samples + 1 }, (_, index) =>
    maneuverRow((WORKED_SLEW.T * index) / samples),
  );
  return {
    theta: rows.map((row) => ({ x: row.t, y: row.thetaS })),
    wheel: rows.map((row) => ({ x: row.t, y: row.omegaW })),
  };
}

const halfTurn = maneuverRow(WORKED_SLEW.T / 2);

/** The middle of the turn, where the body is fastest and the wheel holds the most momentum. */
export const MANEUVER_PEAK = {
  t: halfTurn.t,
  thetaDeg: halfTurn.thetaS,
  wheelRpm: halfTurn.omegaW,
  thetaLabel: `${formatNumber(halfTurn.thetaS, { precision: 0 })}° a los ${halfTurn.t} s`,
  wheelLabel: `${formatNumber(halfTurn.omegaW, { precision: 0 })} rpm a los ${halfTurn.t} s`,
  /** The same notes on two lines, for a phone-width plot. */
  thetaLines: [`${formatNumber(halfTurn.thetaS, { precision: 0 })}°`, `a los ${halfTurn.t} s`],
  wheelLines: [`${formatNumber(halfTurn.omegaW, { precision: 0 })} rpm`, `a los ${halfTurn.t} s`],
} as const;

const SECONDS_PER_DAY = 86_400;
/**
 * τ_gg,max = 2,2847·10⁻⁷ N·m, printed as the code gives it, 2,28·10⁻⁷ (research §6b's 2,29 is
 * 2,285 rounded twice; controller ruling R17).
 */
const DISTURBANCE_LABEL = `${formatScientific(GRAVITY_GRADIENT_6U.torque)} N·m`;
const PERCENT = 100;
const saturationSeconds = RW400.Lmax / GRAVITY_GRADIENT_6U.torque;
const maneuverPeak = restToRestSlew(
  WORKED_SLEW.Is,
  WORKED_SLEW.Iw,
  WORKED_SLEW.theta,
  WORKED_SLEW.T,
).peakWheelMomentum;

/**
 * Step 3: the largest gravity-gradient torque at 500 km, held constant, fills an empty RW400 in
 * L_max/τ_ext. Constant is the worst case: it bounds how fast the wheel fills, not how it usually
 * does. The 90° turn's peak is there for contrast.
 */
export const SATURATION = {
  torque: GRAVITY_GRADIENT_6U.torque,
  seconds: saturationSeconds,
  days: saturationSeconds / SECONDS_PER_DAY,
  torqueLabel: DISTURBANCE_LABEL,
  secondsLabel: `${formatScientific(saturationSeconds)} s`,
  daysLabel: `${formatNumber(saturationSeconds / SECONDS_PER_DAY, { precision: 1 })} días`,
  maneuverPeak,
  maneuverShareLabel: `${formatNumber((maneuverPeak / RW400.Lmax) * PERCENT, { precision: 0 })} %`,
} as const;

const SATURATION_END_DAYS = 3.5;
const SATURATION_SAMPLES = 70;

/** L_w (N·m·s) against time (days) from an empty wheel, past saturation, with no dumping. */
export function saturationSeries(endDays = SATURATION_END_DAYS): XY[] {
  const params = {
    tauExt: GRAVITY_GRADIENT_6U.torque,
    tauDump: 0,
    Lmax: RW400.Lmax,
    dumpAt: 1,
    dumpTo: 0,
  };
  const saturationDay = saturationSeconds / SECONDS_PER_DAY;
  const days = Array.from(
    { length: SATURATION_SAMPLES + 1 },
    (_, index) => (endDays * index) / SATURATION_SAMPLES,
  );
  return [...days, saturationDay]
    .filter((day) => day <= endDays)
    .sort((a, b) => a - b)
    .map((day) => ({ x: day, y: wheelMomentumAt(day * SECONDS_PER_DAY, params).Lw }));
}

const QUARTER_TURN = Math.PI / 2;
/** Ratios are written to the nearest ten, as the research rounds them (I_s/I_w ≈ 1940). */
const RATIO_STEP = 10;

/** Numbers written on the prescribed diagram. */
export const DIAGRAM_FACTS = {
  turns: Math.round(wheelTurnsForSlew(WORKED_SLEW.Is, WORKED_SLEW.Iw, QUARTER_TURN)),
  inertiaRatio: Math.round(WORKED_SLEW.Is / WORKED_SLEW.Iw / RATIO_STEP) * RATIO_STEP,
  LmaxLabel: `${formatNumber(RW400.Lmax, { precision: 3 })} N·m·s`,
  disturbanceLabel: DISTURBANCE_LABEL,
  magnetorquerLabel: `${formatScientific(MAGNETORQUER_6U.torque, 2)} N·m`,
  /** τ_MTQ/τ_ext to the nearest ten ("unas 50 veces", research §6c). */
  dumpRatio:
    Math.round(MAGNETORQUER_6U.torque / GRAVITY_GRADIENT_6U.torque / RATIO_STEP) * RATIO_STEP,
} as const;
