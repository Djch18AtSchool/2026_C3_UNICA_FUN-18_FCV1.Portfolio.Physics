/** The frequency ruler's bands and marks in the mode in view (FrequencyRuler draws them). */
import { MARCH_PACE_HZ, SETRA_RANGES } from '../../../lib/data/bridges';
import { KLIPPER } from '../../../lib/data/klipper';
import { formatNumber } from '../../../lib/format';
import type { ActiveModel } from './bridgeFrames';
import type { RulerBand, RulerMark } from './FrequencyRuler';
import { BUILDS_UP_COLOR, DIES_OUT_COLOR, REFERENCE_COLOR } from './resonancePlots';

const PERCENT = 100;

/** The ruler's bands and marks in the mode in view. */
export function rulerOf(active: ActiveModel): {
  domain: { min: number; max: number };
  bands: RulerBand[];
  marks: RulerMark[];
} {
  if (active.mode === 'barrido') {
    const { f0 } = active.sweep.settings;
    return {
      domain: { min: 0, max: 3 },
      bands: [{ from: 0.5 * f0, to: 1.5 * f0, label: 'barrido', color: REFERENCE_COLOR }],
      marks: [],
    };
  }
  if (active.mode === 'tropa') {
    const { min, max } = SETRA_RANGES.vertical;
    return {
      domain: { min: 1, max: 3 },
      bands: [{ from: min, to: max, label: 'Sétra: riesgo máximo', color: BUILDS_UP_COLOR }],
      marks: [{ at: MARCH_PACE_HZ, label: 'paso militar' }],
    };
  }
  const { fZv } = active.zv.settings;
  const tolerance = KLIPPER.zvTolerance.value;
  return {
    domain: { min: 0, max: 2.5 },
    bands: [
      {
        from: fZv * (1 - tolerance),
        to: fZv * (1 + tolerance),
        label: `±${formatNumber(tolerance * PERCENT, { precision: 0 })} %`,
        color: DIES_OUT_COLOR,
      },
    ],
    marks: [{ at: fZv, label: '$f_\\text{ZV}$' }],
  };
}
