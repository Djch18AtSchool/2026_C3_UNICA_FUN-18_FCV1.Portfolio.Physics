/**
 * The numbers Tema 11's page states in its prose, captions and sources, pinned to the code that
 * produces them: one source per number (an open source, or our own calculation with a test).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { INSTRUMENT_SAMPLES } from '../../../lib/data/instrumentSamples';
import { formatNumber } from '../../../lib/format';
import {
  cents,
  chromiumPeriodicWaveMemory,
  classicAmplitudes,
  maxHarmonicBelowNyquist,
  pipeLength,
} from '../../../lib/physics/harmonics';
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
