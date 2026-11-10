/**
 * The reaction-wheel laboratory's presets and control ranges. Every number in a note is computed
 * here from the kernel and the Tema 8 data (cálculo propio, research §6), never typed by hand.
 */
import { GRAVITY_GRADIENT_6U } from '../../../lib/data/reactionWheels';
import { formatNumber } from '../../../lib/format';
import type { Preset } from '../../../lib/presets';
import { formatScientific } from '../../../lib/tables/topics/ruedas-reaccion';
import {
  disturbanceReadings,
  DAY_LAPSE,
  DISTURBANCE_DAYS,
  dumpingParams,
  DUMP_THRESHOLD,
  maneuverFeasibility,
  maneuverReadings,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SPACECRAFT,
  type WheelSettings,
} from './wheelLabModel';
import { TARGET_LIMITS } from './wheelScene';

/** Target θ (°) in 1° steps; maneuver time T (s) in 0,1 s steps. */
export const WHEEL_LIMITS = { thetaDeg: TARGET_LIMITS, T: [5, 300] } as const;
export const THETA_STEP = 1;
export const T_STEP = 0.1;
const T_DECIMALS = 1;
const PERCENT = 100;
const MILLI = 1000;
const SECONDS_PER_MINUTE = 60;

export const DEFAULT_SETTINGS: WheelSettings = {
  mode: 'maniobra',
  thetaDeg: 90,
  T: 60,
  actuator: 'magnetopar',
};

const n = (value: number, precision: number, unit?: string) =>
  formatNumber(value, { precision, unit });
const percent = (share: number) => n(share * PERCENT, 0, '%');

/** The shortest feasible T for the default 90°, rounded up to the T grid (12,1 s). */
const FASTEST = maneuverFeasibility(DEFAULT_SETTINGS);
const FASTEST_T = Number((Math.ceil(FASTEST.tMin / T_STEP) * T_STEP).toFixed(T_DECIMALS));

function slowNote(): string {
  const plan = maneuverFeasibility(DEFAULT_SETTINGS);
  const peak = maneuverReadings(DEFAULT_SETTINGS, DEFAULT_SETTINGS.T / 2);
  const end = maneuverReadings(DEFAULT_SETTINGS, DEFAULT_SETTINGS.T);
  const torque = plan.torqueShare * SPACECRAFT.tauMax * MILLI;
  return `Giro de reposo a reposo del 6U ($I_s$ = ${n(SPACECRAFT.Is, 4, 'kg·m²')}) con la RW400: $\\tau$ = ${n(torque, 2, 'mN·m')}, el ${percent(plan.torqueShare)} de $\\tau_\\text{máx}$; a los ${n(DEFAULT_SETTINGS.T / 2, 0, 's')} la nave gira a ${n(peak.omegaS, 1, '°/s')} y la rueda va a ${n(peak.omegaW, 0, 'rpm')}, el ${percent(peak.share)} de $L_\\text{máx}$, y al final vuelve a 0 rpm tras ${n(Math.abs(end.turns), 0)} vueltas.`;
}

function fastestNote(): string {
  const plan = maneuverFeasibility({ ...DEFAULT_SETTINGS, T: FASTEST_T });
  return `$T_\\text{mín}$ = ${n(FASTEST.byTorque, 1, 's')} por torque y ${n(FASTEST.byMomentum, 1, 's')} por momento: las dos cotas casi coinciden, así que la rueda está bien dimensionada para este 6U, y con T = ${n(FASTEST_T, 1, 's')} el giro pide el ${percent(plan.torqueShare)} de $\\tau_\\text{máx}$ y el ${percent(plan.momentumShare)} de $L_\\text{máx}$.`;
}

function disturbanceNote(): string {
  const { tauExt, tauDump, Lmax } = dumpingParams('magnetopar');
  const fillTime = (DUMP_THRESHOLD * Lmax) / tauExt;
  const dumpTime = (DUMP_THRESHOLD * Lmax) / (tauDump - tauExt);
  const reached = disturbanceReadings('magnetopar', fillTime);
  return `El gradiente de gravedad a 500 km, tomado constante en su máximo ($${formatScientific(GRAVITY_GRADIENT_6U.torque)}$ N·m, una cota superior), llena la rueda mientras la nave sigue quieta hasta el ${percent(reached.share)} de $L_\\text{máx}$ a las ${n(fillTime / SECONDS_PER_HOUR, 1, 'h')}, y el magnetopar ($${formatScientific(tauDump, 2)}$ N·m) la vacía en ${n(dumpTime / SECONDS_PER_MINUTE, 0, 'min')}, en el tercero de los ${DISTURBANCE_DAYS} días que muestra la reproducción a cámara rápida (a 1×, un día cada ${n(SECONDS_PER_DAY / DAY_LAPSE, 0, 's')}).`;
}

export const WHEEL_PRESETS: Preset<WheelSettings>[] = [
  {
    id: 'giro-90-60',
    name: '90° en 60 s',
    values: DEFAULT_SETTINGS,
    sourceLabel: 'Ejemplo del tema (cálculo propio)',
    note: slowNote(),
  },
  {
    id: 'giro-mas-rapido',
    name: 'El giro más rápido ($\\approx$ 12 s)',
    values: { ...DEFAULT_SETTINGS, T: FASTEST_T },
    sourceLabel: 'Límites de la RW400 (cálculo propio)',
    note: fastestNote(),
  },
  {
    id: 'tres-dias-perturbacion',
    name: 'Tres días de perturbación',
    values: { ...DEFAULT_SETTINGS, mode: 'perturbacion' },
    sourceLabel: 'Gradiente de gravedad y magnetopar (cálculo propio)',
    note: disturbanceNote(),
  },
];

/** The controls each mode uses: a preset matches on those alone. */
const MODE_KEYS: Record<WheelSettings['mode'], (keyof WheelSettings)[]> = {
  maniobra: ['mode', 'thetaDeg', 'T'],
  perturbacion: ['mode', 'actuator'],
};

/** The preset whose values match the settings on the controls their mode uses, if any. */
export function presetIdFor(settings: WheelSettings): string | undefined {
  return WHEEL_PRESETS.find(({ values }) =>
    MODE_KEYS[values.mode].every((key) => values[key] === settings[key]),
  )?.id;
}
