/**
 * The numbers Tema 11's page states in its prose, captions and sources, pinned to the code that
 * produces them: one source per number (an open source, or our own calculation with a test).
 */
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { INSTRUMENT_SAMPLES } from '../../../lib/data/instrumentSamples';
import { formatNumber } from '../../../lib/format';
import { chromiumPeriodicWaveMemory } from '../../../lib/audio/periodicWaveMemory';
import { cents, classicAmplitudes, maxHarmonicBelowNyquist } from '../../../lib/physics/harmonics';
import { pipeLength } from '../../../lib/physics/pipes';
import { SAMPLE_CONTRAST, sampleMarkers } from './sampleTexts';
import { RECIPE_F1, recipeHalfWave, SOUND_SPEED } from './soundPlots';

const MDX = readFileSync(join(process.cwd(), 'src/content/topics/sintesis-sonido.mdx'), 'utf8');
const { clarinete } = INSTRUMENT_SAMPLES;
const comma = (value: number, precision: number) =>
  formatNumber(value, { precision }).replace(/ /g, ' ');
const KIB = 1024;

describe('Tema 11: every number the page states has its source in code', () => {
  test('Pasos 1 and 3 sound at the clarinet’s f₁: 310,10 Hz and T = 3,22 ms', () => {
    expect(RECIPE_F1).toBe(clarinete.f1);
    expect(MDX).toContain(`Un tono puro de ${comma(RECIPE_F1, 2)} Hz`);
    expect(MDX).toContain(`$T$ = ${comma(1000 / RECIPE_F1, 2)} ms`);
    expect(MDX).toContain(`$f_1$ = ${comma(RECIPE_F1, 2)} Hz y doce armónicos`);
  });

  test('Paso 2: 310 Hz with v ≈ 340 m/s gives 0,55 m open and 0,27 m closed', () => {
    expect(SOUND_SPEED).toBe(340);
    expect(MDX).toContain('unos 340 m/s');
    expect(MDX).toContain(`mide ${comma(pipeLength('abierto', 310, SOUND_SPEED), 2)} m y admite`);
    expect(MDX).toContain(`mide ${comma(pipeLength('cerrado', 310, SOUND_SPEED), 2)} m y solo`);
  });

  test('Paso 3: the drawn sawtooth has ρ = 0,52 and the square wave 1', () => {
    expect(recipeHalfWave(classicAmplitudes('cuadrada', 12))).toBeCloseTo(1, 9);
    expect(MDX).toContain(
      `$\\rho$ = ${comma(recipeHalfWave(classicAmplitudes('sierra', 12)), 2)}.`,
    );
  });

  test('Paso 4: 71 harmonics fit under Nyquist at 310 Hz and 44,1 kHz', () => {
    expect(maxHarmonicBelowNyquist(clarinete.f1, 44100)).toBe(71);
    expect(MDX).toContain('con 310 Hz y 44,1 kHz caben 71 armónicos (cálculo propio)');
  });

  test('the use case: 576 KiB per recipe in 36 tables; Hammond’s 5th harmonic 13,69 cents sharp', () => {
    const { bytes, ranges } = chromiumPeriodicWaveMemory(44100);

    expect(MDX).toContain(`${bytes / KIB} KiB por receta en ${ranges} tablas (cálculo propio)`);
    expect(MDX).toContain(
      `queda ${comma(cents(5, 2 ** (28 / 12)), 2)} cents alto (cálculo propio)`,
    );
  });

  test('the recordings: clipped, mono and at −20 LUFS, as the source line says', () => {
    expect(INSTRUMENT_SAMPLES.flauta.clip.loudnessLufs).toBe(-20);
    expect(clarinete.clip.loudnessLufs).toBe(-20);
    expect(MDX).toContain('Los recorté, los pasé a mono e igualé su sonoridad a −20 LUFS');
  });
});

describe('Tema 11: «fuente N» in figures and analyses names the right entry of the source list', () => {
  const sources = (matter(MDX).data.sources as { id: string }[]).map(({ id }) => id);
  const sourceOf = (n: number) => sources[n - 1];
  const contrast = SAMPLE_CONTRAST.map(({ text }) => text).join(' ');
  const clarinetSustain = sampleMarkers('clarinete')[1].analysis;

  test('the figures’ source lines: 1 is the W3C, 3 the MIS, 5 Wolfe on pipes, 12 Helmholtz', () => {
    expect(sourceOf(1)).toBe('webaudio-2021');
    expect(MDX).toContain('Web Audio API (W3C, 2021), fuente 1');
    expect(sourceOf(3)).toBe('iowa-mis');
    expect(MDX).toContain('Musical Instrument Samples (dir. Lawrence Fritts), fuente 3');
    expect(sourceOf(5)).toBe('wolfe-pipes');
    expect(MDX).toContain('de Wolfe (UNSW), fuente 5');
    expect(sourceOf(12)).toBe('helmholtz-1885');
    expect(MDX).toContain('«a slight modification» («una ligera modificación»), fuente 12.');
  });

  test('the analyses: Wolfe’s caveat is fuente 4 and the reed’s odd harmonics fuente 6', () => {
    expect(sourceOf(4)).toBe('wolfe-spectrum');
    expect(contrast).toContain('Wolfe (fuente 4) advierte que los libros de introducción a veces');
    expect(contrast).toContain('es la contribución dominante al timbre');
    expect(sourceOf(6)).toBe('wolfe-clarinet');
    expect(clarinetSustain).toContain('según Wolfe (fuente 6)');
    expect(MDX).toContain('<Cite id="wolfe-clarinet" sources={frontmatter.sources} />');
  });

  test('Helmholtz is quoted verbatim in the caption of figure 11.4 and cited in Paso 4', () => {
    expect(MDX).toContain(
      '«solely on the number and relative strength of its partial simple tones, and in no respect on their differences of phase»',
    );
    expect(MDX).toContain('no las fases, que casi no se oyen <Cite id="helmholtz-1885"');
  });
});
