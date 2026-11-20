/**
 * Tables of Tema 11. The classic recipes are the Web Audio specification's (product values,
 * computed by classicAmplitudes from §1.28.6); every other number is our own measurement of the
 * two MIS recordings (src/data/instrument-harmonics.json, read through INSTRUMENT_SAMPLES).
 */
import {
  INSTRUMENT_SAMPLES,
  periodMs,
  recordingText,
  typesetFlat,
  type InstrumentId,
  type InstrumentSample,
} from '../../data/instrumentSamples';
import { formatFixed as fixed } from '../../format';
import { classicAmplitudes, type ClassicWave } from '../../physics/harmonics';
import type { DataTableSpec, TableColumn } from '../types';

const HARMONICS = 12;
const IDS: readonly InstrumentId[] = ['flauta', 'clarinete'];
const { flauta, clarinete } = INSTRUMENT_SAMPLES;

const label = (sample: InstrumentSample) => typesetFlat(sample.name);

const WAVES: readonly { wave: ClassicWave; label: string }[] = [
  { wave: 'seno', label: 'Seno, $b_1 = 1$' },
  { wave: 'cuadrada', label: 'Cuadrada, $4/(n\\pi)$ en impares' },
  { wave: 'sierra', label: 'Diente de sierra, $(-1)^{n+1}\\,2/(n\\pi)$' },
  { wave: 'triangular', label: 'Triangular, $8\\sin(n\\pi/2)/(\\pi n)^2$' },
];
const RECIPES = Object.fromEntries(
  WAVES.map(({ wave }) => [wave, classicAmplitudes(wave, HARMONICS)]),
);

const RECETAS: DataTableSpec = {
  id: 'sintesis-sonido-recetas',
  caption:
    'Las cuatro ondas de un OscillatorNode como recetas de armónicos: los coeficientes $b_n$ de cada armónico en la (11.5), con todos los $a_n$ = 0, son valores del producto, la Web Audio API. La cuadrada y la triangular solo tienen impares; el diente de sierra tiene todos, con signo alterno.',
  columns: [
    { key: 'n', label: 'Armónico $n$', align: 'num', precision: 0 },
    ...WAVES.map(({ wave, label: text }): TableColumn => ({
      key: wave,
      label: text,
      align: 'num',
      precision: 3,
    })),
  ],
  rows: Array.from({ length: HARMONICS }, (_, i) => ({
    n: i + 1,
    ...Object.fromEntries(WAVES.map(({ wave }) => [wave, RECIPES[wave][i]])),
  })),
  source: {
    text: 'W3C, Web Audio API, Recomendación del 17 de junio de 2021, §1.28.6; las mismas recetas en Chromium, periodic_wave_handler.cc L408-L428 (tag 160.0.8168.1)',
    url: 'https://www.w3.org/TR/2021/REC-webaudio-20210617/#oscillator-coefficients',
  },
};

/** «−18,5 a 5,6»: the lowest and highest level of a harmonic over the 0,25 s windows. */
function rangeText(sample: InstrumentSample, i: number): string {
  if (i === 0) return 'referencia';
  const { min, max } = sample.amplitudeRangesDb;
  return `${fixed(min[i], 1)} a ${fixed(max[i], 1)}`;
}

const sampleColumns = (sample: InstrumentSample): TableColumn[] => [
  {
    key: `${sample.id}-db`,
    label: `${label(sample)}, $A_n/A_1$`,
    unit: 'dB',
    align: 'num',
    precision: 1,
  },
  {
    key: `${sample.id}-rango`,
    label: `${label(sample)}, rango`,
    unit: 'dB',
    align: 'text',
    minWidthCh: 12,
  },
];

const ARMONICOS: DataTableSpec = {
  id: 'sintesis-sonido-armonicos',
  caption:
    'Receta medida de las dos grabaciones: el nivel de cada armónico respecto del fundamental, como promedio de Welch con ventanas de Hann de 0,25 s sobre la ventana de análisis, y el menor y el mayor de esas ventanas. Es una medida mía sobre los originales (cálculo propio), no un valor del producto ni un supuesto: la flauta fluctúa más que el clarinete.',
  columns: [
    { key: 'n', label: 'Armónico $n$', align: 'num', precision: 0 },
    ...IDS.flatMap((id) => sampleColumns(INSTRUMENT_SAMPLES[id])),
  ],
  rows: Array.from({ length: HARMONICS }, (_, i) => ({
    n: i + 1,
    ...Object.fromEntries(
      IDS.flatMap((id) => {
        const sample = INSTRUMENT_SAMPLES[id];
        return [
          [`${id}-db`, sample.amplitudesDb[i]],
          [`${id}-rango`, rangeText(sample, i)],
        ];
      }),
    ),
  })),
  source: {
    text: 'Cálculo propio con un FFT en TypeScript (src/lib/audio/spectrum.ts, pnpm run data:harmonics) sobre Flute.nonvib.ff.Eb4.stereo.aif y BbClarinet.ff.Eb4.stereo.aif del MIS de la University of Iowa',
    url: 'https://theremin.music.uiowa.edu/MIS.html',
  },
};

const span = ({ startS, endS }: { startS: number; endS: number }) => fixed(endS - startS, 2, 's');
const PERMISSION = `«${flauta.license}»`;

const CHANNEL_WORDS: Readonly<Record<number, string>> = { 1: 'un canal', 2: 'dos canales' };

/** «AIFF de 24 bits a 44 100 Hz, dos canales idénticos», from the format research §3.2 records. */
function originalFormatText(format: InstrumentSample['original']): string {
  const channels = CHANNEL_WORDS[format.channels] ?? `${format.channels} canales`;
  return `${format.container} de ${format.bitDepth} bits a ${fixed(format.sampleRateHz, 0, 'Hz')}, ${channels}${format.identicalChannels ? ' idénticos' : ''}`;
}

/** One row of the sample table: a datum and its value for each recording. */
function row(datum: string, value: (sample: InstrumentSample) => string) {
  return { dato: datum, flauta: value(flauta), clarinete: value(clarinete) };
}

const MUESTRAS: DataTableSpec = {
  id: 'sintesis-sonido-muestras',
  caption:
    'Las dos grabaciones del MIS de la University of Iowa y lo que medí en ellas, con el método de la investigación (cálculo propio). Los audios de la figura 11.4 son estos archivos recortados, en mono y a la misma sonoridad.',
  columns: [
    { key: 'dato', label: 'Dato', align: 'text', minWidthCh: 18 },
    { key: 'flauta', label: label(flauta), align: 'text', minWidthCh: 16 },
    { key: 'clarinete', label: label(clarinete), align: 'text', minWidthCh: 16 },
  ],
  rows: [
    row('Archivo del MIS', (s) => s.file),
    row('Intérprete y fecha', recordingText),
    row('Formato del original', (s) => originalFormatText(s.original)),
    row('Fundamental $f_1$', (s) => fixed(s.f1, 2, 'Hz')),
    row('Periodo $T = 1/f_1$', (s) => fixed(periodMs(s), 3, 'ms')),
    row('Impares sobre pares ($n \\le 10$)', (s) => fixed(s.oddEvenDb, 1, 'dB')),
    row('Correlación de $y(t)$ y $-y(t + T/2)$', (s) => fixed(s.halfWaveCorrelation, 3)),
    row('Ataque, 10 → 90 %', (s) => fixed(s.attackS, 2, 's')),
    row('Caída, 90 → 10 %', (s) => span(s.release)),
    row(
      'Audio publicado',
      (s) =>
        `desde ${fixed(s.clip.trimStartS, 2, 's')} del original; ${fixed(s.clip.durationS, 2, 's')}, MP3 mono a ${fixed(s.clip.loudnessLufs, 0, 'LUFS')}`,
    ),
    row('Origen de los números', () => 'Medida propia (cálculo propio)'),
    row('Permiso de uso', () => `${PERMISSION}, según la página del MIS`),
  ],
  source: {
    text: 'University of Iowa Electronic Music Studios, Musical Instrument Samples (dir. Lawrence Fritts), fichas de la flauta y del clarinete en si bemol; medidas: cálculo propio',
    url: 'https://theremin.music.uiowa.edu/MIS.html',
  },
};

export const TABLES: readonly DataTableSpec[] = [RECETAS, ARMONICOS, MUESTRAS];
