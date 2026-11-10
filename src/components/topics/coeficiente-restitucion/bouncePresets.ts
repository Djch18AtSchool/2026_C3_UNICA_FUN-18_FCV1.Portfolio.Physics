import { ballStandardById, type BallStandard } from '../../../lib/data/ballStandards';
import { ENGINE_RESTITUTION } from '../../../lib/data/engineRestitution';
import { formatNumber } from '../../../lib/format';
import {
  bouncesAboveThreshold,
  combineRestitution,
  G_EARTH,
  type CombineRule,
} from '../../../lib/physics';
import type { Preset } from '../../../lib/presets';

/**
 * The bounce laboratory's settings and presets (spec §7; research §7, the preset table, and §4).
 * Every e comes from lib/data (computed from the rules and measurements cited there) or from the
 * research's table; the notes' derived numbers are computed here by the tested kernel.
 */

/** Which real ball is drawn: its color is the object's (tokens --tennis, --basketball). */
export type BallKind = 'tenis' | 'baloncesto' | 'neutra';

/** Engine frame rates offered: Δt = 1/rate s. */
export const STEP_RATES = [30, 60, 120, 240] as const;
export type StepRate = (typeof STEP_RATES)[number];

export interface BounceSettings {
  /** Coefficient of restitution of the ball against this floor (the measured pair value). */
  e: number;
  /** Drop height (m), ball's underside. */
  h0: number;
  /** Engine frames per second; Δt = 1/rate. */
  rate: StepRate;
  substeps: number;
  /** Restitution threshold (m/s): impacts at or below it do not bounce. */
  threshold: number;
  /** The e the engine gives the floor's material, mixed with the ball's by `combine`. */
  floorE: number;
  combine: CombineRule;
  /** Baumgarte position-correction factor β (0: none). */
  baumgarte: number;
  /** Use e(v) = e₀ − k|v| (illustrative fit) instead of the constant e. */
  speedDependent: boolean;
  ball: BallKind;
}

export type BounceGroup = 'realista' | 'se-siente-mal';

export interface BouncePreset extends Preset<BounceSettings> {
  group: BounceGroup;
}

/** Slider ranges (spec §7, research §7). */
export const BOUNCE_LIMITS = {
  e: [0, 1.2],
  h0: [0.2, 3],
  substeps: [1, 8],
  threshold: [0, 3],
  floorE: [0, 1],
  baumgarte: [0, 1],
} as const;

/** e(v) = e₀ − k|v|: linear fit to Cross (1999), Fig. 8, research §5 Paso 4 (illustrative). */
export const SPEED_FIT = { e0: 0.79, k: 0.009 } as const;

const BOX2D = ENGINE_RESTITUTION[0];

/** Box2D v3's defaults (research §4): 1/60 s with 4 substeps, 1 m/s threshold, max mixing. */
const ENGINE_DEFAULTS: Omit<BounceSettings, 'e' | 'h0' | 'ball'> = {
  rate: 60,
  substeps: 4,
  threshold: BOX2D.threshold ?? 1,
  floorE: 0,
  combine: BOX2D.combine === 'unknown' ? 'max' : BOX2D.combine,
  baumgarte: 0,
  speedDependent: false,
};

/** Release height when the research gives none: 1 m, as in its "parada en seco" examples. */
const DEFAULT_DROP = 1;
const E_DECIMALS = 3;

/** The centre of a ball's admitted e range, to three decimals (research §7). */
function centreOf(ball: BallStandard, decimals = E_DECIMALS): number {
  return Number(((ball.eMin + ball.eMax) / 2).toFixed(decimals));
}

const comma = (value: number, precision: number) => formatNumber(value, { precision });
const sourceOf = (ball: BallStandard) => ball.sources.map((source) => source.title).join(' y ');

const TENNIS = ballStandardById('tenis-itf');
const BASKETBALL = ballStandardById('baloncesto-fiba');
const FOOTBALL = ballStandardById('futbol-fifa-pro');
const SUPERBALL = ballStandardById('superbola');
const BASEBALL = ballStandardById('beisbol');
const CLAY = ballStandardById('plastilina');

function dropHeight(ball: BallStandard): number {
  return ball.test.kind === 'drop' ? ball.test.dropHeight : DEFAULT_DROP;
}

function ballPreset(
  id: string,
  name: string,
  standard: BallStandard,
  e: number,
  kind: BallKind,
  h0 = dropHeight(standard),
): BouncePreset {
  const range =
    standard.eMin === standard.eMax
      ? `e = ${comma(standard.eMin, E_DECIMALS)}`
      : `e entre ${comma(standard.eMin, E_DECIMALS)} y ${comma(standard.eMax, E_DECIMALS)}`;
  return {
    id,
    name,
    group: 'realista',
    values: { ...ENGINE_DEFAULTS, e, h0, ball: kind },
    sourceLabel: sourceOf(standard),
    note: `${standard.standard}; de ahí ${range} (cálculo propio, e = $\\sqrt{h'/h}$ o $v'/v$), y uso ${comma(e, E_DECIMALS)} con $h_0$ = ${comma(h0, 2)} m en el motor con los valores por defecto de Box2D.`,
  };
}

const GAINING_E = 1.1;
const LOW_E = 0.2;
const PERCENT = 100;

const MIX_BALL = 0.85;
const MIX_FLOOR = 0.5;
const MIX_RULES: readonly { rule: CombineRule; name: string }[] = [
  { rule: 'max', name: 'máx' },
  { rule: 'average', name: 'promedio' },
  { rule: 'multiply', name: 'producto' },
  { rule: 'sumClamped', name: 'suma recortada' },
];
/** "suelo de 0,5: máx → 0,850; …": the pair e under every rule over one floor (cálculo propio). */
const mixOver = (floorE: number) =>
  `suelo de ${comma(floorE, 1).replace(/,0$/, '')}: ${MIX_RULES.map(
    ({ rule, name }) => `${name} $\\to$ ${comma(combineRestitution(MIX_BALL, floorE, rule), 3)}`,
  ).join('; ')}`;
const mixNote = `${mixOver(MIX_FLOOR)}, y sobre un ${mixOver(0)}`;

/** Unity's default floor bounciness (0), and the pair it gives under "promedio" for e = 0,9. */
const UNITY_E = 0.9;
const UNITY_DEFAULT_FLOOR = 0;
/** Unity 3D's Physics.bounceThreshold default, 2 (m/s, as in PhysX). */
const UNITY_THRESHOLD = 2;
const CM_PER_M = 100;
/** Where Unity's threshold stops the 1 m drop: N rebounds, the last e^{2N}·h₀ (cálculo propio). */
const UNITY_STOP = bouncesAboveThreshold(
  Math.sqrt(2 * G_EARTH * DEFAULT_DROP),
  UNITY_E,
  UNITY_THRESHOLD,
);
const UNITY_LAST_APEX_CM = UNITY_E ** (2 * UNITY_STOP) * DEFAULT_DROP * CM_PER_M;

export const BOUNCE_PRESETS: readonly BouncePreset[] = [
  ballPreset('tenis-itf', 'Tenis ITF (tipo 2)', TENNIS, centreOf(TENNIS), 'tenis'),
  ballPreset('baloncesto-fiba', 'Baloncesto FIBA', BASKETBALL, centreOf(BASKETBALL), 'baloncesto'),
  ballPreset('futbol-fifa', 'Fútbol FIFA Quality PRO', FOOTBALL, centreOf(FOOTBALL), 'neutra'),
  ballPreset('superbola', 'Superbola', SUPERBALL, centreOf(SUPERBALL, 2), 'neutra'),
  ballPreset('beisbol', 'Béisbol (baja velocidad)', BASEBALL, centreOf(BASEBALL, 2), 'neutra', 0.5),
  ballPreset('plastilina', 'Plastilina', CLAY, 0, 'neutra'),
  {
    id: 'box2d',
    name: 'Box2D por defecto',
    group: 'realista',
    values: { ...ENGINE_DEFAULTS, e: 0.9, h0: DEFAULT_DROP, ball: 'neutra' },
    sourceLabel: BOX2D.source.title,
    note: 'Paso de 1/60 s con 4 subpasos, umbral de 1 m/s y mezcla máx, los valores por defecto de Box2D v3, con una pelota viva de e = 0,9.',
  },
  {
    id: 'realista-mejorado',
    name: 'Realista mejorado: e(v)',
    group: 'realista',
    values: {
      ...ENGINE_DEFAULTS,
      e: centreOf(TENNIS),
      h0: dropHeight(TENNIS),
      speedDependent: true,
      ball: 'tenis',
    },
    sourceLabel: 'Cross (1999), «Dynamic properties of tennis balls», Fig. 8',
    note: 'e(v) = 0,79 − 0,009·|v|: ajuste lineal ilustrativo (cálculo propio) a la medida de Cross, que baja de $\\approx$ 0,76 a $\\approx$ 0,64 entre 4 y 17 m/s; a baja velocidad e sube, así que la serie de botes pequeños se alarga en vez de cortarse.',
  },
  {
    id: 'e-uno',
    name: 'e = 1 sin umbral',
    group: 'se-siente-mal',
    values: { ...ENGINE_DEFAULTS, e: 1, h0: DEFAULT_DROP, threshold: 0, ball: 'neutra' },
    sourceLabel: 'Box2D, documentación: «perfectly elastic»',
    note: 'Choque perfectamente elástico: la pelota vuelve siempre a $h_0$ y no se detiene nunca, porque E no cambia; ninguna pelota real lo hace.',
  },
  {
    id: 'e-mayor-que-uno',
    name: 'e = 1,1',
    group: 'se-siente-mal',
    values: { ...ENGINE_DEFAULTS, e: GAINING_E, h0: DEFAULT_DROP, ball: 'neutra' },
    sourceLabel: 'Unity, PhysicsMaterial2D.bounciness (permite e > 1 con advertencia)',
    note: `Con e > 1 cada bote devuelve más energía de la que recibe: E sube un factor e² = ${comma(GAINING_E ** 2, 2)} por bote y la pelota se dispara.`,
  },
  {
    id: 'e-bajo',
    name: 'e demasiado bajo (0,2)',
    group: 'se-siente-mal',
    values: { ...ENGINE_DEFAULTS, e: LOW_E, h0: dropHeight(TENNIS), ball: 'tenis' },
    sourceLabel: `Cálculo propio: 1 − e² = ${comma(1 - LOW_E ** 2, 2)}`,
    note: `Una pelota «de tenis» con e = ${comma(LOW_E, 1)} pierde el ${comma((1 - LOW_E ** 2) * PERCENT, 0)} % de su energía en el primer bote: se siente de plomo.`,
  },
  {
    id: 'umbral-unity',
    name: 'Umbral alto (Unity)',
    group: 'se-siente-mal',
    values: {
      ...ENGINE_DEFAULTS,
      e: UNITY_E,
      h0: DEFAULT_DROP,
      threshold: UNITY_THRESHOLD,
      floorE: UNITY_E,
      combine: 'average',
      ball: 'neutra',
    },
    sourceLabel: 'Physics.bounceThreshold de Unity (por defecto, 2)',
    note: `Tomo de Unity solo el umbral de 2 m/s y la mezcla promedio, los valores por defecto de Unity 3D (el paso, 1/60 s con 4 subpasos, es el fino de Box2D), y le doy al suelo el mismo e = ${comma(UNITY_E, 1)} que a la pelota: con el suelo en 0, el valor por defecto de Unity, el promedio daría ${comma(combineRestitution(UNITY_E, UNITY_DEFAULT_FLOOR, 'average'), 3)}; e quedaría a la mitad y la altura del rebote, a la cuarta parte; tras ${UNITY_STOP} botes, el último de ${comma(UNITY_LAST_APEX_CM, 1)} cm, la pelota se para en seco.`,
  },
  {
    id: 'mezcla',
    name: 'Choque de reglas de combinación',
    group: 'se-siente-mal',
    values: {
      ...ENGINE_DEFAULTS,
      e: MIX_BALL,
      h0: DEFAULT_DROP,
      floorE: MIX_FLOOR,
      combine: 'sumClamped',
      ball: 'neutra',
    },
    sourceLabel: 'Box2D, PhysX/Unity, Bullet y Godot (reglas por defecto)',
    note: `Pelota de 0,85 sobre un suelo al que el motor da 0,5: según la regla, el par queda así sobre un ${mixNote} (cálculo propio); cambia la regla en los ajustes: e es del par, no de cada material.`,
  },
  {
    id: 'pocos-fps',
    name: 'Pocos fps con Baumgarte',
    group: 'se-siente-mal',
    values: {
      ...ENGINE_DEFAULTS,
      e: 0.75,
      h0: DEFAULT_DROP,
      rate: 30,
      substeps: 1,
      baumgarte: 0.2,
      ball: 'neutra',
    },
    sourceLabel: 'Catto, Solver2D y GDC 2014: el sesgo de Baumgarte «adds kinetic energy»',
    note: 'A 1/30 s sin subpasos la pelota se hunde varios centímetros en el piso antes de detectar el contacto, y el sesgo $\\beta$ = 0,2 que la saca le suma velocidad: rebota más alto de lo que e permite (ilustrativo).',
  },
];

export const PRESET_GROUPS: readonly { id: BounceGroup; label: string }[] = [
  { id: 'realista', label: 'Rebotes realistas' },
  { id: 'se-siente-mal', label: 'Rebotes que se sienten mal' },
];

export const DEFAULT_PRESET_ID = 'tenis-itf';

/** The preset with this id; throws a RangeError for an unknown one. */
export function presetById(id: string): BouncePreset {
  const preset = BOUNCE_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new RangeError(`No existe el preajuste "${id}"`);
  return preset;
}

/** The lab opens on the ITF tennis ball with Box2D's engine. */
export const BOUNCE_DEFAULTS: BounceSettings = presetById(DEFAULT_PRESET_ID).values;
