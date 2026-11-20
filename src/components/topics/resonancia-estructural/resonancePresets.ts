/**
 * The resonance laboratory's settings, control ranges and presets. Every number a note prints is
 * computed here by the lab's own models (resonanceScene.ts), never typed by hand; every value says
 * whether it is a product's or a source's (Klipper, Sétra, FM 3-21.5, The Philosophical Magazine)
 * or an illustrative model assumption.
 */
import {
  BROUGHTON,
  MARCH_PACE_HZ,
  SETRA_RANGES,
  STEEL_FOOTBRIDGE_DAMPING,
} from '../../../lib/data/bridges';
import { KLIPPER } from '../../../lib/data/klipper';
import { formatNumber } from '../../../lib/format';
import type { Preset, PresetGroup } from '../../../lib/presets';
import {
  sweepModel,
  troopModel,
  zvModel,
  TROOP_MODAL_MASS_KG,
  SOLDIER_FORCE_N,
  type ResonanceMode,
  type SweepSettings,
  type TroopSettings,
  type ZvSettings,
} from './resonanceScene';

export interface ResonanceSettings {
  mode: ResonanceMode;
  sweep: SweepSettings;
  troop: TroopSettings;
  zv: ZvSettings;
}

export interface Limit {
  min: number;
  max: number;
  step: number;
}

/** The sliders: f0 and ζ of each structure, the sweep's length, the troop, the filter's f_ZV. */
export const RESONANCE_LIMITS = {
  sweep: {
    f0: { min: 0.5, max: 2, step: 0.05 },
    zeta: { min: 0, max: 0.3, step: 0.005 },
    sweepS: { min: 10, max: 1200, step: 10 },
  },
  troop: {
    n: { min: 1, max: 200, step: 1 },
    f0: { min: 1, max: 3, step: 0.05 },
    zeta: { min: 0, max: 0.05, step: 0.001 },
  },
  zv: {
    f0: { min: 0.5, max: 2, step: 0.01 },
    fZv: { min: 0.5, max: 2, step: 0.01 },
    zeta: { min: 0, max: 0.3, step: 0.005 },
  },
} as const satisfies Record<string, Record<string, Limit>>;

const KLIPPER_ZETA = KLIPPER.defaultDampingRatio.value;
/**
 * The seed of the first breaking-step draw. With 60 soldiers it gives |Σ e^{iφ}| = 6,4, near the
 * median of a draw, √(N ln 2) = 6,4, so the first ratio the reader sees (9,3) is a typical one;
 * «Nuevo sorteo» shows how far a single draw strays (seed 1831, the Paso 3 figure's, gives 21,5).
 */
const TROOP_SEED = 1832;
/** An illustrative oscillator for the sweep and the filter: 1 Hz, one swing a second. */
const ILLUSTRATIVE_F0 = 1;
const SLOW_SWEEP_S = 400;
const FAST_SWEEP_S = 40;
const OFF_SETRA_F0 = 2.5;
const DETUNED_F0 = 1.1;

export const DEFAULT_SETTINGS: ResonanceSettings = {
  mode: 'barrido',
  sweep: { f0: ILLUSTRATIVE_F0, zeta: KLIPPER_ZETA, sweepS: SLOW_SWEEP_S },
  troop: {
    n: BROUGHTON.soldiersOnBridge.value,
    f0: MARCH_PACE_HZ,
    zeta: STEEL_FOOTBRIDGE_DAMPING.value,
    step: 'al-paso',
    seed: TROOP_SEED,
  },
  zv: { f0: ILLUSTRATIVE_F0, zeta: KLIPPER_ZETA, fZv: ILLUSTRATIVE_F0 },
};

const n = (value: number, precision: number) => formatNumber(value, { precision });
const PERCENT = 100;
const MM_PER_M = 1000;
const N_PER_KN = 1000;
const KG_PER_T = 1000;
const TWO_PI = 2 * Math.PI;

const SHAPER_URL = 'https://github.com/Klipper3d/klipper/blob/v0.13.0/klippy/extras/shaper_defs.py';
const DOCS_URL = 'https://github.com/Klipper3d/klipper/blob/v0.13.0/docs/Resonance_Compensation.md';
const TROOP_SOURCES =
  'The Philosophical Magazine (1831); FM 3-21.5 (2003); Sétra (2006), §1.2.1 y tabla 2.6';

const sweepAt = (patch: Partial<SweepSettings>): ResonanceSettings => ({
  ...DEFAULT_SETTINGS,
  sweep: { ...DEFAULT_SETTINGS.sweep, ...patch },
});
const troopAt = (patch: Partial<TroopSettings>): ResonanceSettings => ({
  ...DEFAULT_SETTINGS,
  mode: 'tropa',
  troop: { ...DEFAULT_SETTINGS.troop, ...patch },
});
const zvAt = (patch: Partial<ZvSettings>): ResonanceSettings => ({
  ...DEFAULT_SETTINGS,
  mode: 'filtro-zv',
  zv: { ...DEFAULT_SETTINGS.zv, ...patch },
});

function slowNote(): string {
  const model = sweepModel(DEFAULT_SETTINGS.sweep);
  return `Un oscilador de $f_0$ = 1 Hz (ilustrativo) con el $\\zeta$ = 0,1 que supone Klipper, barrido en $T_b$ = ${SLOW_SWEEP_S} s, lo que pide mi regla $T_b \\ge 4/(\\zeta^2 f_0)$: la envolvente sigue a la (12.3) a menos de un 5 % y su pico llega a ${n(model.run.maxPeak, 2)}, frente a $1/(2\\zeta)$ = ${n(model.peakGain, 2)}.`;
}

function fastNote(): string {
  const model = sweepModel({ ...DEFAULT_SETTINGS.sweep, sweepS: FAST_SWEEP_S });
  const tau = 1 / (KLIPPER_ZETA * TWO_PI * ILLUSTRATIVE_F0);
  return `El mismo oscilador barrido en ${FAST_SWEEP_S} s, diez veces más rápido: el transitorio dura del orden de $1/(\\zeta\\omega_0)$ = ${n(tau, 1)} s, la amplitud no alcanza a seguir a la fuerza y su pico, ${n(model.run.maxPeak, 2)} en vez de ${n(model.peakGain, 2)}, llega tarde, en $\\omega_d/\\omega_0$ = ${n(model.ratioAt(model.peakTime), 2)}.`;
}

function undampedNote(): string {
  const model = sweepModel({ ...DEFAULT_SETTINGS.sweep, zeta: 0 });
  return `Con $\\zeta$ = 0 la (12.3) no tiene estado estacionario en $\\omega_d = \\omega_0$, crece sin límite; el barrido cruza la resonancia en un tiempo finito y la envolvente llega a ${n(model.run.maxPeak, 1)} veces $F_0/k$.`;
}

function inStepNote(): string {
  const model = troopModel(DEFAULT_SETTINGS.troop);
  return `Los unos ${BROUGHTON.soldiersOnBridge.value} soldados que cruzaban el puente de Broughton en 1831, a ${n(MARCH_PACE_HZ, 1)} Hz y ${n(SOLDIER_FORCE_N, 0)} N cada uno, sobre una pasarela de acero de $f_0$ = ${n(MARCH_PACE_HZ, 1)} Hz con el $\\zeta$ = ${n(STEEL_FOOTBRIDGE_DAMPING.value * PERCENT, 1)} % de Sétra y ${n(TROOP_MODAL_MASS_KG / KG_PER_T, 0)} t de masa modal (las dos, ilustrativas): el tablero llega al 90 % de su amplitud estacionaria, ${n(model.steady.inStep * MM_PER_M, 0)} mm, a los ${n(model.reach90.inStep ?? Number.NaN, 0)} s.`;
}

function breakingNote(): string {
  const model = troopModel({ ...DEFAULT_SETTINGS.troop, step: 'rompiendo' });
  const soldiers = DEFAULT_SETTINGS.troop.n;
  const kN = (force: number) => n(force / N_PER_KN, 1);
  const mm = (amplitude: number) => n(amplitude * MM_PER_M, 0);
  return `Los mismos ${soldiers} rompiendo el paso, con fases al azar de un sorteo con semilla fija: la fuerza total baja de ${kN(model.forces.inStep)} kN a ${kN(model.forces.breaking)} kN y la amplitud estacionaria, de ${mm(model.steady.inStep)} mm a ${mm(model.steady.breaking)} mm, ${n(model.ratio, 1)} veces menos; en media cuadrática sobre muchos sorteos, $\\sqrt{${soldiers}}$ = ${n(model.rmsRatio, 1)} veces.`;
}

function offRangeNote(): string {
  const model = troopModel({ ...DEFAULT_SETTINGS.troop, f0: OFF_SETRA_F0 });
  const { min, max } = SETRA_RANGES.vertical;
  return `La misma tropa al paso sobre una pasarela de $f_0$ = ${n(OFF_SETRA_F0, 1)} Hz (ilustrativa), fuera del rango de riesgo máximo de Sétra, de ${n(min, 1)} a ${n(max, 1)} Hz: a ${n(MARCH_PACE_HZ, 1)} Hz la fuerza ya no va al ritmo del puente y la amplitud estacionaria se queda en ${n(model.steady.inStep * MM_PER_M, 1)} mm.`;
}

function tunedNote(): string {
  const model = zvModel(DEFAULT_SETTINGS.zv);
  const [a1, a2] = model.shaper.amplitudes;
  const residual = model.simulatedResidual < 1 / PERCENT ? 'menos del 1 %' : 'más del 1 %';
  return `Klipper reparte el empujón en $a_1$ = ${n(a1, 3)} en $t = 0$ y $a_2$ = ${n(a2, 3)} en $t_2$ = ${n(model.secondImpulse, 3)} s, medio periodo amortiguado, con $f_\\text{ZV}$ = 1 Hz y $\\zeta$ = 0,1; sobre una estructura con esos mismos valores (ilustrativos), la vibración que queda tras el segundo impulso es ${residual} de la de un solo empujón.`;
}

function detunedNote(): string {
  const model = zvModel({ ...DEFAULT_SETTINGS.zv, f0: DETUNED_F0 });
  const tolerance = n(KLIPPER.zvTolerance.value * PERCENT, 0);
  return `Si $f_0$ sube un 10 %, a ${n(DETUNED_F0, 1)} Hz, y el filtro sigue en 1 Hz, el segundo impulso ya no llega en contrafase: queda un ${n(model.residual * PERCENT, 1)} % de la vibración, cuando Klipper promete dividirla por ${KLIPPER.zvReduction.value} solo dentro de ±${tolerance} %.`;
}

export const PRESET_GROUPS: readonly PresetGroup[] = [
  { id: 'barrido', label: 'Barrido' },
  { id: 'tropa', label: 'Tropa' },
  { id: 'filtro-zv', label: 'Filtro ZV' },
];

export type ResonancePreset = Preset<ResonanceSettings>;

export const RESONANCE_PRESETS: readonly ResonancePreset[] = [
  {
    id: 'barrido-lento',
    name: 'Barrido lento',
    group: 'barrido',
    values: DEFAULT_SETTINGS,
    sourceLabel: 'Klipper v0.13.0, shaper_defs.py L9; regla de barrido lento (cálculo propio)',
    sourceUrl: SHAPER_URL,
    note: slowNote(),
  },
  {
    id: 'barrido-rapido',
    name: 'Barrido rápido',
    group: 'barrido',
    values: sweepAt({ sweepS: FAST_SWEEP_S }),
    sourceLabel: 'Cálculo propio con la (12.2)',
    note: fastNote(),
  },
  {
    id: 'sin-amortiguamiento',
    name: 'Sin amortiguamiento',
    group: 'barrido',
    values: sweepAt({ zeta: 0 }),
    sourceLabel: 'Cálculo propio con la (12.2) y la (12.3)',
    note: undampedNote(),
  },
  {
    id: 'tropa-al-paso',
    name: '60 soldados al paso',
    group: 'tropa',
    values: troopAt({}),
    sourceLabel: TROOP_SOURCES,
    note: inStepNote(),
  },
  {
    id: 'tropa-rompiendo',
    name: '60 soldados rompiendo el paso',
    group: 'tropa',
    values: troopAt({ step: 'rompiendo' }),
    sourceLabel: `${TROOP_SOURCES}; fases sorteadas con una semilla fija`,
    note: breakingNote(),
  },
  {
    id: 'tropa-fuera-de-setra',
    name: 'Pasarela fuera del rango de Sétra',
    group: 'tropa',
    values: troopAt({ f0: OFF_SETRA_F0 }),
    sourceLabel: 'Sétra (2006), tabla 2.3; $f_0$ ilustrativa',
    note: offRangeNote(),
  },
  {
    id: 'zv-afinado',
    name: 'Filtro afinado',
    group: 'filtro-zv',
    values: zvAt({}),
    sourceLabel: 'Klipper v0.13.0, shaper_defs.py L17-L23',
    sourceUrl: SHAPER_URL,
    note: tunedNote(),
  },
  {
    id: 'zv-desafinado',
    name: 'Frecuencia natural un 10 % mayor',
    group: 'filtro-zv',
    values: zvAt({ f0: DETUNED_F0 }),
    sourceLabel: 'Klipper v0.13.0, docs/Resonance_Compensation.md L466-L482',
    sourceUrl: DOCS_URL,
    note: detunedNote(),
  },
];

const sameValues = <T extends object>(a: T, b: T) =>
  (Object.keys(a) as (keyof T)[]).every((key) => a[key] === b[key]);

/** The troop's values that count: the draw only matters breaking step. */
function sameTroop(a: TroopSettings, b: TroopSettings): boolean {
  const { seed: seedA, ...restA } = a;
  const { seed: seedB, ...restB } = b;
  return sameValues(restA, restB) && (a.step === 'al-paso' || seedA === seedB);
}

/** Whether two settings agree on the mode in view and on that mode's values. */
function matches(preset: ResonanceSettings, settings: ResonanceSettings): boolean {
  if (preset.mode !== settings.mode) return false;
  if (settings.mode === 'barrido') return sameValues(preset.sweep, settings.sweep);
  if (settings.mode === 'tropa') return sameTroop(preset.troop, settings.troop);
  return sameValues(preset.zv, settings.zv);
}

/** The preset whose values the settings still show, if any. */
export function presetIdFor(settings: ResonanceSettings): string | undefined {
  return RESONANCE_PRESETS.find((preset) => matches(preset.values, settings))?.id;
}
