import { describe, expect, test } from 'vitest';
import { formatNumber } from '../../../lib/format';
import { buildRun, lastJump } from './springScene';
import {
  comparisonLabel,
  comparisonText,
  jumpText,
  regimeLabel,
  settlingText,
} from './springLabText';

const MOTION_DEFAULT = { k: 100, b: 10, m: 1 };
const UNDAMPED = { k: 100, b: 0, m: 1 };
const NNBSP = ' ';
const critical = (scale: number) => ({ k: 100, b: 20 * scale, m: 1 });

describe('the regime chip', () => {
  test('names the regime and its condition for ζ = 0,5, 1 and 2, and b = 0', () => {
    expect(regimeLabel(MOTION_DEFAULT)).toBe('Subamortiguado, $\\zeta < 1$');
    expect(regimeLabel(critical(1))).toBe('Crítico, $\\zeta = 1$');
    expect(regimeLabel({ k: 100, b: 40, m: 1 })).toBe('Sobreamortiguado, $\\zeta > 1$');
    expect(regimeLabel(UNDAMPED)).toBe('Sin amortiguar, $b = 0$');
  });

  test('Review Focus 3: at ζ = 1 ± 1e-9 it never flickers; the tolerance alone decides', () => {
    const labels = (scale: number) => Array.from({ length: 5 }, () => regimeLabel(critical(scale)));

    for (const scale of [1 - 5e-10, 1 - 1e-12, 1 + 1e-12, 1 + 5e-10]) {
      expect(new Set(labels(scale))).toEqual(new Set(['Crítico, $\\zeta = 1$']));
    }
    expect(new Set(labels(1 - 2e-9))).toEqual(new Set(['Subamortiguado, $\\zeta < 1$']));
    expect(new Set(labels(1 + 2e-9))).toEqual(new Set(['Sobreamortiguado, $\\zeta > 1$']));
  });
});

describe('the summary of the run, in words', () => {
  test('the 2 % settling time of a plain step', () => {
    expect(settlingText(buildRun(MOTION_DEFAULT, []))).toBe(`0,81${NNBSP}s`);
  });

  test('Review Focus 3: with b = 0 the spring settles «nunca»', () => {
    expect(settlingText(buildRun(UNDAMPED, []))).toBe(
      'nunca: con $b = 0$ el resorte no pierde energía, $dE/dt = -b v^2 = 0$',
    );
    expect(settlingText(buildRun(UNDAMPED, [0.4]))).toMatch(/^nunca:/);
  });

  test('after a press, the last leg’s settling, on the clock and since the press', () => {
    const text = settlingText(buildRun(MOTION_DEFAULT, [0.2]));

    expect(text).toMatch(
      new RegExp(
        `^a los \\d,\\d\\d${NNBSP}s: \\d,\\d\\d${NNBSP}s después de la última interrupción$`,
      ),
    );
  });

  test('the curve lasts the spring’s t_s, or d of (10.10) when the spring never settles', () => {
    expect(comparisonText(buildRun(MOTION_DEFAULT, []))).toBe(
      `ease-in-out de 0,81${NNBSP}s, el $t_s$ del resorte: salen y llegan a la vez`,
    );
    expect(comparisonText(buildRun(UNDAMPED, []))).toBe(
      `ease-in-out de 0,63${NNBSP}s, la $d = 2\\pi/\\omega_0$ de la (10.10), porque el resorte nunca se asienta`,
    );
  });

  test('a curve whose leg starts inside the band also lasts d, and says why', () => {
    // A press right back at the start: the spring is a hair from the start, its new target.
    const run = buildRun(MOTION_DEFAULT, [1e-4]);

    expect(comparisonText(run)).toMatch(/porque el resorte no sale de la banda$/);
    expect(settlingText(run)).toMatch(/ya no sale de la banda$/);
  });

  test('the jump of the last press: none yet, or the spring’s v kept and the curve’s lost', () => {
    const run = buildRun(MOTION_DEFAULT, [0.2]);
    const jump = lastJump(run);
    const speed = (value: number) => formatNumber(value, { precision: 0, unit: 'px/s' });

    expect(jumpText(buildRun(MOTION_DEFAULT, []))).toBe(
      'ninguna todavía: pulsa «Interrumpir» con las tarjetas a mitad de camino',
    );
    expect(jumpText(run)).toBe(
      `a $t^*$ = 0,20${NNBSP}s el resorte sigue a ${speed(jump?.spring.after ?? 0)}; la curva pasa de ${speed(jump?.bezier.before ?? 0)} a 0`,
    );
  });

  test('a press at rest only changes the target', () => {
    expect(jumpText(buildRun(MOTION_DEFAULT, [2.9]))).toBe(
      `a $t^*$ = 2,90${NNBSP}s las dos estaban en reposo: solo cambia el destino`,
    );
  });

  test('the curve’s lane says its duration at the settled time', () => {
    const run = buildRun(MOTION_DEFAULT, [0.2]);

    expect(comparisonLabel(run, 0.1)).toBe(`ease-in-out, $T$ = 0,81${NNBSP}s`);
    expect(comparisonLabel(run, 0.3)).toBe(
      `ease-in-out, $T$ = ${formatNumber(run.bezier[1].duration, { precision: 2, unit: 's' })}`,
    );
  });
});
