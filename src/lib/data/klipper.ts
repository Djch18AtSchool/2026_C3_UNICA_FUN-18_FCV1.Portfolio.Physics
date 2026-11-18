/*
 * Tema 12's use case: Klipper, the 3D-printer firmware (GPLv3), at tag v0.13.0 (commit 61c0c8d,
 * 2025-04-12). Every value is the product's own, read from its code or documentation at that tag
 * (docs/superpowers/research/2026-11-17-resonancia-estructural.md §3.4, CONFIRMADO, accessed
 * 2026-11-17).
 */
import type { SourcedValue, ValueOrigin } from './bridges';

const KLIPPER_TAG = 'Klipper v0.13.0 (commit 61c0c8d)';
const SWEEP = `${KLIPPER_TAG}, klippy/extras/resonance_tester.py L49-L78`;
const DOCS = `${KLIPPER_TAG}, docs/Resonance_Compensation.md L466-L482`;

const product = (value: number, source: string): SourcedValue => ({
  value,
  origin: 'producto',
  source,
});

export const KLIPPER = {
  /** The test generator sweeps the excitation upward from min_freq to max_freq at hz_per_sec. */
  sweepMinHz: product(5, SWEEP),
  sweepMaxHz: product(135, SWEEP),
  sweepHzPerSecond: product(1, SWEEP),
  /** DEFAULT_DAMPING_RATIO: «the damping ratio is usually unknown», so Klipper assumes 0,1. */
  defaultDampingRatio: product(0.1, `${KLIPPER_TAG}, klippy/extras/shaper_defs.py L9`),
  /** TEST_DAMPING_RATIOS: the ζ the calibration scores each shaper against. */
  testDampingRatios: {
    values: [0.075, 0.1, 0.15] as const,
    origin: 'producto' as ValueOrigin,
    source: `${KLIPPER_TAG}, klippy/extras/shaper_calibrate.py L14`,
  },
  /** ZV reduces the vibration 10 times within ± 5 % of its frequency (the shaper table). */
  zvTolerance: product(0.05, DOCS),
  zvReduction: product(10, DOCS),
} as const;
