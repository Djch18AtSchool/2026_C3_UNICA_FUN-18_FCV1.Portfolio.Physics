/**
 * The written analysis of Tema 11's two recordings (research §6.4, with the corrections of rulings
 * R9 and R12): the two markers of each audio, at the attack and in the sustain, and the joint
 * analysis of what difference produces what. Every number is read from INSTRUMENT_SAMPLES (our
 * own measurement of the MIS recordings), so the text cannot drift from the data.
 */
import {
  INSTRUMENT_SAMPLES,
  periodMs,
  recordingText,
  spokenFlat,
  toClipTime,
  type InstrumentId,
} from '../../../lib/data/instrumentSamples';
import { formatFixed as fixed } from '../../../lib/format';
import { cents, predictedHalfWaveCorrelation } from '../../../lib/physics/harmonics';
import type { MediaMarker } from '../../../lib/media';

const { flauta, clarinete } = INSTRUMENT_SAMPLES;

/** The attack marker opens the clip; the sustain one is 1 s in, inside both analysis windows. */
export const ATTACK_MARKER_S = 0;
export const SUSTAIN_MARKER_S = 1;
const EVEN_SHOWN = [2, 4, 6, 8];
const FIRST_FLAT = 6;
/** Above this correlation the dashed −y(t + T/2) visibly lies on the solid curve. */
const SYMMETRIC_FROM = 0.9;

const signedDb = (db: number) => `${db > 0 ? '+' : ''}${fixed(db, 1, 'dB')}`;
const clipTime = (id: InstrumentId, aiffS: number) => toClipTime(INSTRUMENT_SAMPLES[id], aiffS);
const levelOf = (id: InstrumentId, n: number) => INSTRUMENT_SAMPLES[id].amplitudesDb[n - 1];

/** The harmonic with the highest level, n. */
export function strongestHarmonic(id: InstrumentId): number {
  const levels = INSTRUMENT_SAMPLES[id].amplitudesDb;
  return levels.indexOf(Math.max(...levels)) + 1;
}

/** How far the clarinet's even harmonics 2, 4, 6 and 8 sit below its fundamental, dB. */
export function evenGapDb(): { least: number; most: number } {
  const gaps = EVEN_SHOWN.map((n) => -levelOf('clarinete', n));
  return { least: Math.min(...gaps), most: Math.max(...gaps) };
}

/** The widest level of the flute's first six harmonics around its fundamental, dB. */
export function fluteSpreadDb(): number {
  return Math.max(...flauta.amplitudesDb.slice(0, FIRST_FLAT).map(Math.abs));
}

function attackSpan(id: InstrumentId): string {
  const { attack } = INSTRUMENT_SAMPLES[id];
  return `de ${fixed(clipTime(id, attack.startS), 2)} a ${fixed(clipTime(id, attack.endS), 2, 's')} del audio`;
}

const FLUTE_MARKERS: readonly MediaMarker[] = [
  {
    time: ATTACK_MARKER_S,
    title: 'El ataque',
    analysis: `Desde aquí se oye cómo empieza la nota. En la envolvente, el nivel pasa del 10 al 90 % del sostenido en ${fixed(flauta.attackS, 2, 's')}, ${attackSpan('flauta')}: la flauta arranca casi de golpe. La receta (11.4) sola sonaría completa desde el primer instante; la (11.7) le da esta subida con la envolvente $E(t)$.`,
  },
  {
    time: SUSTAIN_MARKER_S,
    title: 'El sostenido',
    analysis: `A 1 s la nota ya es estable: estoy dentro de la ventana de análisis. En el espectro, los seis primeros armónicos quedan a ±${fixed(Math.ceil(fluteSpreadDb()), 0, 'dB')} del fundamental y el más fuerte es el ${strongestHarmonic('flauta')}.º, ${signedDb(levelOf('flauta', strongestHarmonic('flauta')))}: suenan pares e impares, como pide la (11.2) en un tubo abierto. Por eso la discontinua $-y(t + T/2)$ no sigue a la continua: su correlación con $y(t)$ es ${fixed(flauta.halfWaveCorrelation, 3)} y la (11.6) no se cumple. En el 7.º armónico el nivel cae de golpe, a ${signedDb(levelOf('flauta', 7))}.`,
  },
];

const CLARINET_MARKERS: readonly MediaMarker[] = [
  {
    time: ATTACK_MARKER_S,
    title: 'El ataque',
    analysis: `El clarinete tarda ${fixed(clarinete.attackS, 2, 's')} en pasar del 10 al 90 % de su nivel, ${attackSpan('clarinete')}: más del triple que la flauta, y se oye cómo la nota crece. Es la envolvente $E(t)$ de la (11.7). La ventana de análisis empieza a los ${fixed(clipTime('clarinete', clarinete.analysisWindow.startS), 2, 's')}, todavía dentro de este ataque: en la envolvente, la ventana y el ataque se solapan.`,
  },
  {
    time: SUSTAIN_MARKER_S,
    title: 'El sostenido',
    analysis: `En el espectro, los armónicos pares (2, 4, 6 y 8) quedan entre ${fixed(evenGapDb().least, 0)} y ${fixed(evenGapDb().most, 0, 'dB')} por debajo del fundamental, y el ${strongestHarmonic('clarinete')}.º es más fuerte que el propio fundamental: ${signedDb(levelOf('clarinete', strongestHarmonic('clarinete')))}. Es la (11.3) de un tubo cerrado en un extremo: solo los impares forman ondas estacionarias, y esas refuerzan los impares de la caña, según Wolfe (fuente 6). Con los impares ${fixed(clarinete.oddEvenDb, 1, 'dB')} por encima de los pares, la (11.6) se ve a simple vista: la discontinua $-y(t + T/2)$ cae sobre la continua, con correlación ${fixed(clarinete.halfWaveCorrelation, 3)}.`,
  },
];

/** The two analysed instants of a recording, in time order. */
export function sampleMarkers(id: InstrumentId): readonly MediaMarker[] {
  return id === 'flauta' ? FLUTE_MARKERS : CLARINET_MARKERS;
}

/** The audio's accessible name, said in words: «Clarinete en si bemol, mi bemol 4 fortísimo». */
export function sampleTitle(id: InstrumentId): string {
  return spokenFlat(`${INSTRUMENT_SAMPLES[id].name}, mi♭4 fortísimo sin vibrato`);
}

/** The credit line under each audio (it prints after «Audio: »); the figure's source line has the rest. */
export function sampleCredit(id: InstrumentId): string {
  const sample = INSTRUMENT_SAMPLES[id];
  const { file, clip } = sample;
  return `${recordingText(sample)}; University of Iowa, Musical Instrument Samples, archivo ${file}. Lo recorté desde ${fixed(clip.trimStartS, 2, 's')} y lo igualé a ${fixed(clip.loudnessLufs, 0, 'LUFS')}.`;
}

export interface ContrastItem {
  lead: string;
  text: string;
}

/** «Qué diferencia produce qué»: the joint analysis under the two recordings. */
export const SAMPLE_CONTRAST: readonly ContrastItem[] = [
  {
    lead: 'Lo que comparten: el tono.',
    text: `Las dos notas repiten su forma cada $T$ = ${fixed(periodMs(clarinete), 2, 'ms')}: $f_1$ = ${fixed(clarinete.f1, 2, 'Hz')} en el clarinete y ${fixed(flauta.f1, 2, 'Hz')} en la flauta, a ${fixed(cents(clarinete.f1, flauta.f1), 1)} cents. El corchete de $T$ mide lo mismo en las dos formas de onda: por la (11.4), el tono lo pone $f_1$, no la forma.`,
  },
  {
    lead: 'Lo que cambia: qué armónicos suenan.',
    text: `Los impares pesan ${fixed(clarinete.oddEvenDb, 1, 'dB')} más que los pares en el clarinete y ${fixed(flauta.oddEvenDb, 1, 'dB')} en la flauta: la (11.3) de un tubo cerrado frente a la (11.2) de uno abierto. Con el mismo tono y la misma sonoridad, esa receta es lo que distingue aquí sus timbres.`,
  },
  {
    lead: 'Dónde se ve: la simetría de media onda.',
    text: `Con esas potencias, la (11.6) predice correlaciones de ${fixed(predictedHalfWaveCorrelation(clarinete.oddEvenDb), 3)} y ${fixed(predictedHalfWaveCorrelation(flauta.oddEvenDb), 3)} entre $y(t)$ y $-y(t + T/2)$; mido ${fixed(clarinete.halfWaveCorrelation, 3)} y ${fixed(flauta.halfWaveCorrelation, 3)}. Por eso la curva discontinua solo cae sobre la continua en el clarinete.`,
  },
  {
    lead: 'Lo que el espectro no cuenta.',
    text: `El ataque, de ${fixed(clarinete.attackS, 2, 's')} frente a ${fixed(flauta.attackS, 2, 's')} (11.7), y el ruido del soplido. Wolfe (fuente 4) advierte que los libros de introducción a veces dan a entender que el espectro es la contribución dominante al timbre de un instrumento y que, «with the exception of the closed pipes mentioned above, this is very misleading» («salvo en los tubos cerrados, eso es muy engañoso»): esta pareja funciona porque el clarinete es uno.`,
  },
];

export interface SampleDescriptions {
  envelope: string;
  waveform: string;
  spectrum: string;
}

/** What a screen reader hears for each plot of a recording: its reading, in words. */
export function sampleDescriptions(id: InstrumentId): SampleDescriptions {
  const sample = INSTRUMENT_SAMPLES[id];
  const of = id === 'flauta' ? 'de la flauta' : `del ${spokenFlat(sample.name).toLowerCase()}`;
  const span = (s: { startS: number; endS: number }) =>
    `de ${fixed(clipTime(id, s.startS), 2)} a ${fixed(clipTime(id, s.endS), 2, 's')}`;
  const strongest = strongestHarmonic(id);
  const matches = sample.halfWaveCorrelation > SYMMETRIC_FROM;
  const shape =
    id === 'flauta'
      ? `los seis primeros armónicos dentro de ±${fixed(Math.ceil(fluteSpreadDb()), 0, 'dB')} del fundamental`
      : `los pares 2, 4, 6 y 8 entre ${fixed(evenGapDb().least, 0)} y ${fixed(evenGapDb().most, 0, 'dB')} por debajo del fundamental`;
  return {
    envelope: `Envolvente RMS ${of}, relativa a su sostenido: sube del 10 al 90 % en ${fixed(sample.attackS, 2, 's')}, ${span(sample.attack)}; la ventana de análisis va ${span(sample.analysisWindow)} y la caída, ${span(sample.release)}.`,
    waveform: `Cuatro periodos de la forma de onda ${of}, cada uno de T = ${fixed(periodMs(sample), 2, 'ms')}. La misma curva medio periodo después e invertida ${matches ? 'cae sobre la original' : 'no sigue a la original'}: correlación ${fixed(sample.halfWaveCorrelation, 3)}.`,
    spectrum: `Espectro ${of}, armónicos 1 a 12 en dB respecto del fundamental: ${shape}; el más fuerte es el ${strongest}.º, con ${signedDb(levelOf(id, strongest))}. Los impares pesan ${signedDb(sample.oddEvenDb)} sobre los pares.`,
  };
}
