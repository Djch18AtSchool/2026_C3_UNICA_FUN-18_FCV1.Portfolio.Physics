/**
 * The synthesiser lab's texts: its status line, the notes that change with the state, the
 * fields' labels and what a screen reader hears of its two drawings. Every number comes from the
 * state or the voice's constants (one source per number).
 */
import { formatNumber } from '../../../lib/format';
import {
  maxHarmonicBelowNyquist,
  predictedHalfWaveCorrelation,
} from '../../../lib/physics/harmonics';
import { GAIN_RAMP_S, VOICE_LEVEL_DBFS } from './additiveVoiceEngine';
import { audibleCount, HARMONIC_COUNT, type SynthReadings } from './synthScene';

/** Above this correlation, −y(t + T/2) is said to fall on y(t) (as in sampleTexts.ts). */
const SYMMETRIC_FROM = 0.99;
const levelDbfs = formatNumber(VOICE_LEVEL_DBFS, { precision: 0 });
const rampMs = formatNumber(GAIN_RAMP_S * 1000, { precision: 0, unit: 'ms' });
const hertz = (value: number, precision = 0) => formatNumber(value, { precision, unit: 'Hz' });

export const IDLE_STATUS = 'Nada suena hasta que pulses «Reproducir».';
export const PLAYING_STATUS = `Suena a ${levelDbfs} dBFS de pico; «Detener» lo apaga.`;
export const SILENT_STATUS = 'Todas las amplitudes que suenan valen 0: no se oye nada.';

/** The line beside «Reproducir»: an error first, then what the voice is doing. */
export function statusText(isPlaying: boolean, isSilent: boolean, error: string | null): string {
  if (error) return error;
  if (!isPlaying) return IDLE_STATUS;
  return isSilent ? SILENT_STATUS : PLAYING_STATUS;
}

/** Under «Fases aleatorias»: what plays now, and with the draw, Helmholtz (figure 11.4, R18). */
export function randomPhasesNote(isOn: boolean): string {
  return isOn
    ? 'Fases sorteadas: la forma de onda cambia y el espectro no. Para Helmholtz el timbre no depende de las fases, con la ligera salvedad de Ellis (pie de la figura 11.4).'
    : 'Apagado, cada armónico suena con la fase de su receta: la medida, o 0 y $\\pi$ en las clásicas.';
}

/** «Armónico 3, $A_{3}$», and «(sobre $f_s/2$)» when it cannot sound. */
export function amplitudeLabel(n: number, isAudible: boolean): string {
  return `Armónico ${n}, $A_{${n}}$${isAudible ? '' : ' (sobre $f_s/2$)'}`;
}

/** Equation (11.9) in the lab: how many harmonics fit under f_s/2, and which are disabled. */
export function nyquistNote(f1: number, sampleRate: number): string {
  const count = audibleCount(f1, sampleRate);
  const fs = hertz(sampleRate);
  if (count === HARMONIC_COUNT) {
    return `Con $f_s$ = ${fs} caben bajo $f_s/2$ los diez armónicos: la (11.9) admite hasta $n$ = ${maxHarmonicBelowNyquist(f1, sampleRate)}.`;
  }
  return `Con $f_s$ = ${fs} y $f_1$ = ${hertz(f1, 1)} solo caben ${count} armónicos bajo $f_s/2$ (11.9): de $A_{${count + 1}}$ a $A_{${HARMONIC_COUNT}}$ no suenan y quedan desactivados, como Chromium quita los parciales que se plegarían.`;
}

/** «Cómo se usa». */
export const USAGE: readonly string[] = [
  `Pulsa «Reproducir» para oír la receta: nada suena antes. Empieza a ${levelDbfs} dBFS de pico con una rampa de ${rampMs}, y «Detener» lo apaga; cada cambio de receta baja el volumen, cambia la onda y lo vuelve a subir en ${rampMs}.`,
  'Las amplitudes $A_1$ a $A_{10}$ son relativas al $A_1$ = 1 de los preajustes; las barras dan su nivel, $20\\log_{10} A_n$, que con $A_1$ = 1 es el $A_n/A_1$ de la figura 11.4. $f_1$ cambia la nota y deja la receta: el timbre se conserva.',
  'El navegador normaliza el pico de cada receta (§1.28.5 de la Web Audio API): todas llegan al mismo pico, no a la misma sonoridad. La $f_s$ y el nivel de pico son elecciones mías, no valores de un producto.',
  'Arrastra el cursor de la forma de onda, o enfócalo y muévelo con las flechas (1 % del eje; con Mayús, 10 %): marca $y(t)$ y $-y(t + T/2)$ en el mismo instante. La curva discontinua se quita en los ajustes del engranaje.',
];

const ordinal = (n: number) => `${n}.º`;

/** What a screen reader hears of the waveform: f₁, T and the half-wave symmetry (11.6). */
export function waveformDescription(readings: SynthReadings, isRandom: boolean): string {
  const head = `Forma de onda que suena a ${hertz(readings.f1, 1)}, cada periodo de T = ${formatNumber(readings.periodMs, { precision: 2, unit: 'ms' })}${isRandom ? ', con fases sorteadas' : ''}.`;
  if (Number.isNaN(readings.oddEvenDb)) return `${head} No suena ningún armónico: es una recta.`;
  const rho = predictedHalfWaveCorrelation(readings.oddEvenDb);
  return rho >= SYMMETRIC_FROM
    ? `${head} La misma curva medio periodo después e invertida cae sobre la original.`
    : `${head} La curva medio periodo después e invertida es otra: correlación ${formatNumber(rho, { precision: 2 })}.`;
}

/** What a screen reader hears of the spectrum: the strongest harmonic and the Nyquist cut. */
export function spectrumDescription(readings: SynthReadings, audible: number): string {
  const head = 'Espectro de la receta, armónicos 1 a 10 en dB:';
  const strongest = Number.isNaN(readings.strongest)
    ? ' ninguno suena.'
    : ` el más fuerte es el ${ordinal(readings.strongest)}.`;
  const cut =
    audible < HARMONIC_COUNT
      ? ` Del ${ordinal(audible + 1)} en adelante no suenan: pasan de la mitad de la frecuencia de muestreo.`
      : '';
  return `${head}${strongest}${cut}`;
}
