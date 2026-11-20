/**
 * What one Web Audio PeriodicWave costs in Chromium's memory (Tema 11, use case): a port of the
 * table sizes and ranges of periodic_wave_handler.cc (tag 160.0.8168.1, commit 22cf9aec).
 */
import { requirePositive } from '../physics/validate';

/** Chromium's table size by sample rate (L42-L54): 2 048 up to 24 kHz, 4 096 up to 88,2 kHz. */
const CHROMIUM_TABLE_SIZES = [
  { upTo: 24000, size: 2048 },
  { upTo: 88200, size: 4096 },
] as const;
const LARGEST_TABLE_SIZE = 16384;
const CHROMIUM_BANDS_PER_OCTAVE = 3;
const FLOAT_BYTES = 4;

/**
 * The memory one PeriodicWave takes in Chromium (cálculo propio with its constants): a table of
 * `tableSize` floats per range, round(3 log₂ tableSize) ranges of a third of an octave (L80-L87),
 * so 36 × 4 096 × 4 B = 576 KiB at 44,1 or 48 kHz, whatever the recipe, the note or the duration.
 */
export function chromiumPeriodicWaveMemory(sampleRate: number): {
  tableSize: number;
  ranges: number;
  bytes: number;
} {
  requirePositive('sampleRate', sampleRate);
  const tableSize =
    CHROMIUM_TABLE_SIZES.find(({ upTo }) => sampleRate <= upTo)?.size ?? LARGEST_TABLE_SIZE;
  const ranges = Math.round(CHROMIUM_BANDS_PER_OCTAVE * Math.log2(tableSize));
  return { tableSize, ranges, bytes: ranges * tableSize * FLOAT_BYTES };
}
