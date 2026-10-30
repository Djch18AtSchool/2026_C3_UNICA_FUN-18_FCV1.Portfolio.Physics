/**
 * Tema 8 tables: the two wheel datasheets, the 90° turn of the worked example and the mission
 * facts. Every value comes from src/lib/data/reactionWheels.ts or from the rotation kernel at
 * module load (research docs/superpowers/research/2026-10-30-ruedas-reaccion.md, §4, §6 and §7).
 */
import {
  CUBESAT_6U,
  MISSIONS,
  REACTION_WHEEL_SOURCES,
  RW400,
  VRW_D_4,
  type ReactionWheel,
  type WheelSourceId,
} from '../../data/reactionWheels';
import { formatNumber } from '../../format';
import { omegaToRpm, slewStateAt } from '../../physics';
import type { DataTableSpec } from '../types';

const SUPERSCRIPT: Readonly<Record<string, string>> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};
const MINUS = '−';
const NOT_A_NUMBER = '—';
const SIGNIFICANT_DIGITS = 3;

/**
 * A number in scientific notation as the page writes it: "2,29·10⁻⁷", with a decimal comma, a
 * true minus sign and `digits` significant figures (a mantissa that rounds to 10 carries into the
 * exponent). 0 prints as "0" and a non-finite value as "—".
 */
export function formatScientific(value: number, digits = SIGNIFICANT_DIGITS): string {
  if (!Number.isFinite(value)) return NOT_A_NUMBER;
  if (value === 0) return '0';
  const [mantissa, exponent] = Math.abs(value)
    .toExponential(digits - 1)
    .split('e');
  const power = String(Number(exponent))
    .split('')
    .map((character) => SUPERSCRIPT[character])
    .join('');
  const sign = value < 0 ? MINUS : '';
  return `${sign}${mantissa.replace('.', ',')}·10${power}`;
}

const RADIANS_TO_DEGREES = 180 / Math.PI;

/**
 * The worked example (research §6a): the 6U CubeSat turns 90° in 60 s, rest to rest, about its
 * largest axis (I_s) with the RW400 (I_w = L_max/ω_max, cálculo propio).
 */
export const WORKED_SLEW = {
  Is: CUBESAT_6U.Is,
  Iw: RW400.inertiaDerived,
  theta: Math.PI / 2,
  T: 60,
} as const;

/** The table's instants: every 10 s from the start to the end of the turn. */
export const MANEUVER_TIMES: readonly number[] = [0, 10, 20, 30, 40, 50, 60];

/** One instant of the turn: t (s), ω_s (rad/s), θ_s (°), ω_w (rpm) and L_w (N·m·s), signed. */
export interface ManeuverRow {
  t: number;
  omegaS: number;
  thetaS: number;
  omegaW: number;
  Lw: number;
}

export function maneuverRow(t: number): ManeuverRow {
  const { Is, Iw, theta, T } = WORKED_SLEW;
  const state = slewStateAt(Is, Iw, theta, T, t);
  return {
    t,
    omegaS: state.omegaS,
    thetaS: state.thetaS * RADIANS_TO_DEGREES,
    omegaW: omegaToRpm(state.omegaW),
    Lw: state.Lw,
  };
}

const GRAMS_PER_KG = 1000;
const MILLI = 1000;

/**
 * How each datasheet prints L_max and the mass (research §4.1): VRW-D-4 "4,0 N·m·s" and
 * "2,5 kg"; RW400 "±0,050" and "375 g". The table repeats that precision and invents no digits.
 */
const PRINTED: Readonly<
  Partial<Record<WheelSourceId, { LmaxDecimals: number; massIn: 'kg' | 'g'; massDecimals: number }>>
> = {
  W1: { LmaxDecimals: 1, massIn: 'kg', massDecimals: 1 },
  W2: { LmaxDecimals: 3, massIn: 'g', massDecimals: 0 },
};

function wheelRow(wheel: ReactionWheel) {
  const isPrinted = wheel.inertiaPrinted !== null;
  const printed = PRINTED[wheel.sourceId];
  if (!printed) throw new Error(`tablas: falta la precisión impresa de ${wheel.name}`);
  const mass = printed.massIn === 'g' ? wheel.mass * GRAMS_PER_KG : wheel.mass;
  return {
    rueda: wheel.name,
    Lmax: formatNumber(wheel.Lmax, { precision: printed.LmaxDecimals }),
    tauMax: wheel.tauMax * MILLI,
    rpmMax: wheel.rpmMax,
    mass: formatNumber(mass, { precision: printed.massDecimals, unit: printed.massIn }),
    inertia: formatScientific(wheel.inertiaPrinted ?? wheel.inertiaDerived),
    origin: isPrinted ? 'impresa en la hoja' : 'cálculo propio: L_máx/ω_máx',
  };
}

const YEAR = /\d{4}(?!.*\d{4})/;

/** "Author, year" from a source label: the text before its first «title», and its last year. */
function shortCitation(id: WheelSourceId): string {
  const { label } = REACTION_WHEEL_SOURCES[id];
  const author = label.split('«')[0].replace(/,\s*$/, '').trim();
  const year = YEAR.exec(label)?.[0];
  return year ? `${author}, ${year}` : author;
}

const citations = (ids: readonly WheelSourceId[]): string =>
  [...new Set(ids.map(shortCitation))].join('; ');

const ruedas: DataTableSpec = {
  id: 'ruedas-reaccion-ruedas',
  caption:
    'Dos ruedas de reacción reales según sus hojas de datos: una grande y la de CubeSat del ejemplo. Solo la VRW-D-4 imprime la inercia del rotor; la de la RW400 la calculo como L_máx/ω_máx.',
  columns: [
    { key: 'rueda', label: 'Rueda', align: 'text' },
    { key: 'Lmax', label: 'L_máx', unit: 'N·m·s', align: 'text' },
    { key: 'tauMax', label: 'τ_máx', unit: 'mN·m', align: 'num', precision: 0 },
    { key: 'rpmMax', label: 'ω_máx', unit: 'rpm', align: 'num', precision: 0 },
    { key: 'mass', label: 'Masa', align: 'text' },
    { key: 'inertia', label: 'I_w', unit: 'kg·m²', align: 'text' },
    { key: 'origin', label: 'Origen de I_w', align: 'text' },
  ],
  rows: [wheelRow(VRW_D_4), wheelRow(RW400)],
  source: {
    text: `${REACTION_WHEEL_SOURCES.W1.label}; ${REACTION_WHEEL_SOURCES.W2.label}. La inercia de la RW400 es cálculo propio y supone que las ${formatNumber(RW400.rpmMax, { precision: 0, unit: 'rpm' })} de la hoja valen para la variante de 50 mN·m·s.`,
  },
};

const slewSource = [
  `Cálculo propio con la maniobra de reposo a reposo τ = 4 I_s θ/T², I_s = ${formatNumber(WORKED_SLEW.Is, { precision: 4 })} kg·m²`,
  `(CubeSat 6U de 12 kg modelado como caja) e I_w = ${formatScientific(WORKED_SLEW.Iw)} kg·m² (RW400), con la rueda partiendo de 0 rpm`,
].join(' ');

const maniobra: DataTableSpec = {
  id: 'ruedas-reaccion-maniobra',
  caption:
    'Giro de 90° en 60 s, de reposo a reposo, del CubeSat 6U con la RW400. La nave acelera durante 30 s y frena otros 30; la rueda gira al revés y vuelve a 0 rpm al final.',
  columns: [
    { key: 't', label: 't', unit: 's', align: 'num', precision: 0 },
    { key: 'omegaS', label: 'ω_s de la nave', unit: 'rad/s', align: 'num', precision: 4 },
    { key: 'thetaS', label: 'θ_s de la nave', unit: '°', align: 'num', precision: 0 },
    { key: 'omegaW', label: 'ω_w de la rueda', unit: 'rpm', align: 'num', precision: 0 },
    { key: 'Lw', label: 'L_w de la rueda', unit: 'N·m·s', align: 'num', precision: 5 },
  ],
  rows: MANEUVER_TIMES.map((t) => ({ ...maneuverRow(t) })),
  source: { text: slewSource },
};

const missionRows = MISSIONS.map((fact) => ({
  mission: fact.mission,
  fact: fact.fact,
  sources: citations(fact.sourceIds),
}));

const misiones: DataTableSpec = {
  id: 'ruedas-reaccion-misiones',
  caption:
    'Ruedas de reacción en cuatro misiones de la NASA: cuántas llevan, cómo fallaron y cómo descargan el momento angular.',
  columns: [
    { key: 'mission', label: 'Misión', align: 'text' },
    { key: 'fact', label: 'Dato', align: 'text' },
    { key: 'sources', label: 'Fuente', align: 'text' },
  ],
  rows: missionRows,
  // Every author and year the rows cite, once each, in the rows' order.
  source: { text: `${citations(MISSIONS.flatMap((fact) => fact.sourceIds))}.` },
};

export const TABLES: readonly DataTableSpec[] = [ruedas, maniobra, misiones];
