/**
 * The synthesiser's presets: the four waveforms of Web Audio's OscillatorNode (§1.28.6, table
 * 11.1; product values) and the two measured recipes of the recordings (table 11.2; our own
 * calculation, ruling R8). A recipe is ten non-negative amplitudes relative to A₁ = 1 and their
 * phases: a negative coefficient of the specification is the same amplitude with phase π.
 */
import { INSTRUMENT_SAMPLES, type InstrumentId } from '../../../lib/data/instrumentSamples';
import { formatNumber } from '../../../lib/format';
import { classicAmplitudes, type ClassicWave } from '../../../lib/physics/harmonics';
import type { Preset } from '../../../lib/presets';
import { OSCILLATOR_COEFFICIENTS_URL } from '../../../lib/tables/topics/sintesis-sonido';
import { strongestHarmonic } from './sampleTexts';

/** The lab's harmonics: n = 1…10 (spec §6.2). */
export const HARMONIC_COUNT = 10;

/** Ten amplitudes A_n (relative to the presets' A₁ = 1) and phases φ_n in rad, index 0 = n 1. */
export interface SynthRecipe {
  amplitudes: readonly number[];
  phases: readonly number[];
}

/** A product's value (the specification's recipes) or our own measurement (the recordings). */
export type RecipeOrigin = 'producto' | 'calculo';

export interface SynthPreset extends Preset<SynthRecipe> {
  origin: RecipeOrigin;
}

/** What each option of the select says about where its recipe comes from (ruling R8). */
const ORIGIN_LABEL: Readonly<Record<RecipeOrigin, string>> = {
  producto: 'receta clásica',
  calculo: 'medida: grabación MIS',
};

const CLASSIC_SOURCE = 'W3C, Web Audio API, §1.28.6 (tabla 11.1)';
const MEASURED_SOURCE = 'cálculo propio sobre la grabación del MIS (tabla 11.2)';

/** The specification's coefficients over A₁: |A_n/A₁|, with phase π where the sign is negative. */
function classicRecipe(wave: ClassicWave): SynthRecipe {
  const signed = classicAmplitudes(wave, HARMONIC_COUNT);
  return {
    amplitudes: signed.map((a) => Math.abs(a / signed[0])),
    phases: signed.map((a) => (a < 0 ? Math.PI : 0)),
  };
}

/** The recording's first ten harmonics: A_n/A₁ from its dB and φ_n as measured. */
function measuredRecipe(id: InstrumentId): SynthRecipe {
  const { amplitudesDb, phasesRad } = INSTRUMENT_SAMPLES[id];
  return {
    amplitudes: amplitudesDb.slice(0, HARMONIC_COUNT).map((db) => 10 ** (db / 20)),
    phases: phasesRad.slice(0, HARMONIC_COUNT),
  };
}

const classic = (id: ClassicWave, name: string, note: string): SynthPreset => ({
  id,
  name,
  optionLabel: `${name} (${ORIGIN_LABEL.producto})`,
  values: classicRecipe(id),
  origin: 'producto',
  sourceLabel: CLASSIC_SOURCE,
  sourceUrl: OSCILLATOR_COEFFICIENTS_URL,
  note,
});

/**
 * «el clarinete de la figura 11.4, a 310,10 Hz»: the recording pitched from its data. The name
 * leaves «en si♭» out: no font of the page draws ♭ («Plex Symbols» stops at U+22FF), even in KaTeX.
 */
const RECORDING_NAMES: Readonly<Record<InstrumentId, string>> = {
  flauta: 'la flauta',
  clarinete: 'el clarinete',
};

function recordingPhrase(id: InstrumentId): string {
  const { f1 } = INSTRUMENT_SAMPLES[id];
  return `${RECORDING_NAMES[id]} de la figura 11.4, a ${formatNumber(f1, { precision: 2, unit: 'Hz' })}`;
}

const measured = (id: InstrumentId, name: string, ending: string): SynthPreset => ({
  id,
  name,
  optionLabel: `${name.replace(/ \(.*\)$/, '')} (${ORIGIN_LABEL.calculo})`,
  values: measuredRecipe(id),
  origin: 'calculo',
  sourceLabel: MEASURED_SOURCE,
  sourceUrl: INSTRUMENT_SAMPLES[id].source.page,
  note: `Los diez primeros armónicos de la tabla 11.2, con sus fases, medidos en ${recordingPhrase(id)}: ${ending}.`,
});

export const SYNTH_PRESETS: readonly SynthPreset[] = [
  classic('seno', 'Seno', 'Un solo armónico, $A_1$ = 1: el tono puro de la (11.1).'),
  classic(
    'cuadrada',
    'Cuadrada',
    'Solo impares, $A_n = 1/n$: la segunda mitad de cada periodo es la primera invertida, la (11.6).',
  ),
  classic(
    'sierra',
    'Diente de sierra',
    'Todos los armónicos, $A_n = 1/n$, con fase $\\pi$ en los pares: el signo alterno de la tabla 11.1.',
  ),
  classic(
    'triangular',
    'Triangular',
    'Solo impares, $A_n = 1/n^2$, con fase $\\pi$ en $n$ = 3 y 7: el signo de $\\sin(n\\pi/2)$ en la tabla 11.1.',
  ),
  measured(
    'flauta',
    'Flauta (medida)',
    `el más fuerte es el ${strongestHarmonic('flauta')}.º, pares e impares por igual`,
  ),
  measured(
    'clarinete',
    'Clarinete (medido)',
    `el ${strongestHarmonic('clarinete')}.º supera al fundamental y los pares casi no suenan`,
  ),
];
