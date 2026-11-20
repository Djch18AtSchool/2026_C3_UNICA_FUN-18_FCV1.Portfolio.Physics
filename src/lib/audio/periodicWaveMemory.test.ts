import { describe, expect, test } from 'vitest';
import { chromiumPeriodicWaveMemory } from './periodicWaveMemory';

describe('chromiumPeriodicWaveMemory: the tables Chromium builds per recipe (periodic_wave_handler.cc)', () => {
  test('at 44,1 and 48 kHz: 4 096 samples, 36 ranges of a third of an octave, 576 KiB (research §4.4)', () => {
    for (const rate of [44100, 48000]) {
      expect(chromiumPeriodicWaveMemory(rate)).toEqual({
        tableSize: 4096,
        ranges: 36,
        bytes: 589824,
      });
    }
    expect(chromiumPeriodicWaveMemory(48000).bytes / 1024).toBe(576);
  });

  test('2 048 samples up to 24 kHz and 16 384 above 88,2 kHz (L42-L54)', () => {
    expect(chromiumPeriodicWaveMemory(22050).tableSize).toBe(2048);
    expect(chromiumPeriodicWaveMemory(96000).tableSize).toBe(16384);
    expect(chromiumPeriodicWaveMemory(96000).ranges).toBe(42);
    expect(() => chromiumPeriodicWaveMemory(0)).toThrow(RangeError);
  });
});
