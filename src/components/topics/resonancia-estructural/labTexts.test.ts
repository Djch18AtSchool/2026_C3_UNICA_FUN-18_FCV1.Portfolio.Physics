import { describe, expect, test } from 'vitest';
import { MARCH_PACE_HZ } from '../../../lib/data/bridges';
import { KLIPPER } from '../../../lib/data/klipper';
import { formatNumber } from '../../../lib/format';
import { TROOP_DRAWING_FULL_M } from './bridgeFrames';
import { COARSE_STEPS } from './FrequencyRuler';
import { KNOB_HINT, MODE_HINT, SCENE_NOTE } from './labTexts';
import {
  SLOW_SWEEP_ERROR,
  SLOW_SWEEP_FACTOR,
  SOLDIER_FORCE_N,
  SWEEP_RANGE,
  TROOP_MODAL_MASS_KG,
  ZV_DESIGN_ZETA,
} from './resonanceScene';

const comma = (value: number, precision: number) => formatNumber(value, { precision });
const texComma = (value: number, precision: number) => comma(value, precision).replace(',', '{,}');

describe('the lab’s own texts print the numbers of the constants they describe', () => {
  test('the knob moves a step, and COARSE_STEPS with Shift', () => {
    expect(KNOB_HINT).toContain(`con Mayús, ${COARSE_STEPS})`);
  });

  test('«Barrido»: the sweep’s range and the slow-sweep rule with its bound', () => {
    expect(MODE_HINT.barrido).toContain(
      `de $${texComma(SWEEP_RANGE.start, 1)}\\,f_0$ a $${texComma(SWEEP_RANGE.end, 1)}\\,f_0$`,
    );
    expect(MODE_HINT.barrido).toContain(`$T_b \\ge ${SLOW_SWEEP_FACTOR}/(\\zeta^2 f_0)$`);
    expect(MODE_HINT.barrido).toContain(`a menos de un ${comma(SLOW_SWEEP_ERROR * 100, 0)} %`);
  });

  test('«Tropa»: the march pace, each soldier’s force and the illustrative modal mass', () => {
    expect(MODE_HINT.tropa).toContain(
      `marchan a ${comma(MARCH_PACE_HZ, 1)} Hz con ${comma(SOLDIER_FORCE_N, 0)} N cada uno`,
    );
    expect(MODE_HINT.tropa).toContain(`${comma(TROOP_MODAL_MASS_KG / 1000, 0)} toneladas`);
    expect(SCENE_NOTE.tropa).toContain(`hasta ${comma(TROOP_DRAWING_FULL_M, 1)} m arriba y abajo`);
  });

  test('«Filtro ZV»: Klipper’s ζ, its ± 5 % and its estimate of the residual', () => {
    expect(MODE_HINT['filtro-zv']).toContain(`$\\zeta$ = ${comma(ZV_DESIGN_ZETA, 1)}`);
    expect(MODE_HINT['filtro-zv']).toContain(`±${comma(KLIPPER.zvTolerance.value * 100, 0)} %`);
    expect(MODE_HINT['filtro-zv']).toContain('estimación de Klipper');
    expect(SCENE_NOTE['filtro-zv']).toContain('estimación de Klipper');
  });
});
