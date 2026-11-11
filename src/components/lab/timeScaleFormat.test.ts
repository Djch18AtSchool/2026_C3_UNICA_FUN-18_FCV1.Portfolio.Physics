import { describe, expect, test } from 'vitest';
import {
  formatTimeScale,
  inlineMathToNotation,
  timeScaleLabel,
  timeScaleSpoken,
} from './timeScaleFormat';

const NNBSP = ' ';

describe('formatTimeScale', () => {
  test('writes the factor after «×», with the decimal comma', () => {
    expect(formatTimeScale(1)).toBe('×1');
    expect(formatTimeScale(4)).toBe('×4');
    expect(formatTimeScale(0.25)).toBe('×0,25');
    expect(formatTimeScale(1.5)).toBe('×1,5');
    expect(formatTimeScale(20)).toBe('×20');
  });

  test('rounds to two significant digits: a factor is an order of size', () => {
    expect(formatTimeScale(91.27)).toBe('×91');
    expect(formatTimeScale(144)).toBe('×140');
    expect(formatTimeScale(2.25)).toBe('×2,3');
    expect(formatTimeScale(0.0123)).toBe('×0,012');
  });

  test('groups thousands with a narrow no-break space, as the site does: «×19 000»', () => {
    expect(formatTimeScale(19_345)).toBe(`×19${NNBSP}000`);
    expect(formatTimeScale(12_000)).toBe(`×12${NNBSP}000`);
    expect(formatTimeScale(1_250_000)).toBe(`×1${NNBSP}300${NNBSP}000`);
  });

  test('never prints trailing zeros after rounding', () => {
    expect(formatTimeScale(9.996)).toBe('×10');
    expect(formatTimeScale(6.0001)).toBe('×6');
  });

  test('a factor that is not a positive finite number reads «×—»', () => {
    expect(formatTimeScale(0)).toBe('×—');
    expect(formatTimeScale(-2)).toBe('×—');
    expect(formatTimeScale(Number.NaN)).toBe('×—');
    expect(formatTimeScale(Number.POSITIVE_INFINITY)).toBe('×—');
  });
});

describe('timeScaleLabel', () => {
  test('1 is real time, above is fast motion and below slow motion', () => {
    expect(timeScaleLabel(1)).toBe('velocidad real');
    expect(timeScaleLabel(20)).toBe('cámara rápida');
    expect(timeScaleLabel(0.25)).toBe('cámara lenta');
  });

  test('a factor that rounds to «×1» still reads as real time', () => {
    expect(timeScaleLabel(1.0001)).toBe('velocidad real');
    expect(timeScaleLabel(0.999)).toBe('velocidad real');
  });

  test('no label for a factor that is not a positive finite number', () => {
    expect(timeScaleLabel(0)).toBeUndefined();
    expect(timeScaleLabel(Number.NaN)).toBeUndefined();
  });
});

describe('timeScaleSpoken', () => {
  test('says the factor in words, with the label after a comma', () => {
    expect(timeScaleSpoken(20, 'cámara rápida')).toBe(
      'Escala de tiempo: 20 veces la velocidad real, cámara rápida',
    );
    expect(timeScaleSpoken(0.25)).toBe('Escala de tiempo: 0,25 veces la velocidad real');
  });

  test('at ×1 it says «velocidad real» once, not «1 veces»', () => {
    expect(timeScaleSpoken(1, 'velocidad real')).toBe('Escala de tiempo: velocidad real');
    expect(timeScaleSpoken(1)).toBe('Escala de tiempo: velocidad real');
    expect(timeScaleSpoken(1, 'tramo')).toBe('Escala de tiempo: velocidad real, tramo');
  });

  test('says a label with $…$ in words', () => {
    expect(timeScaleSpoken(12_000, 'paso de $r_p$')).toBe(
      `Escala de tiempo: 12${NNBSP}000 veces la velocidad real, paso de r sub p`,
    );
  });

  test('says when the factor is unknown', () => {
    expect(timeScaleSpoken(Number.NaN)).toBe('Escala de tiempo: sin definir');
  });
});

describe('inlineMathToNotation', () => {
  test('turns the formulas of a $…$ label into the MathText notation', () => {
    expect(inlineMathToNotation('paso de $r_p$')).toBe('paso de r_p');
    expect(inlineMathToNotation('a $v_\\infty$')).toBe('a v_∞');
    expect(inlineMathToNotation('cámara rápida')).toBe('cámara rápida');
  });

  test('escapes a literal _ or ^ of the text, which MathText would take as a script', () => {
    expect(inlineMathToNotation('archivo_1 ^ $x$')).toBe('archivo\\_1 \\^ x');
  });
});

describe('requireInlineMathLabel', () => {
  test('accepts plain words and $…$ formulas', async () => {
    const { requireInlineMathLabel } = await import('./timeScaleFormat');

    expect(() => requireInlineMathLabel('paso de $r_p$')).not.toThrow();
    expect(() => requireInlineMathLabel('cámara rápida')).not.toThrow();
  });

  test('rejects a subscript or power written outside $…$', async () => {
    const { requireInlineMathLabel } = await import('./timeScaleFormat');

    expect(() => requireInlineMathLabel('paso de r_p')).toThrow(/«paso de r_p».*\$…\$/u);
    expect(() => requireInlineMathLabel('10^-7')).toThrow(/\$…\$/u);
  });
});
