import { describe, expect, test, vi } from 'vitest';
import { createClock } from '../../lib/physics/clock';
import { clockSettings, DEFAULT_SPEEDS } from './clockSettings';
import type { SimClock } from './useSimClock';

function fakeClock(speed = 1, loop = false): SimClock {
  return {
    state: { ...createClock(10), speed, loop },
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    reset: vi.fn(),
    seek: vi.fn(),
    step: vi.fn(),
    setSpeed: vi.fn(),
    setLoop: vi.fn(),
  };
}

describe('clockSettings', () => {
  test('offers the spec speeds, 0,25× to 2×, as a select with comma labels', () => {
    const [speed] = clockSettings(fakeClock(1.5));

    expect(DEFAULT_SPEEDS).toEqual([0.25, 0.5, 1, 1.5, 2]);
    expect(speed).toMatchObject({ key: 'speed', label: 'Velocidad', kind: 'select', value: '1.5' });
    expect(speed.kind === 'select' && speed.options).toEqual([
      { value: '0.25', label: '0,25×' },
      { value: '0.5', label: '0,5×' },
      { value: '1', label: '1×' },
      { value: '1.5', label: '1,5×' },
      { value: '2', label: '2×' },
    ]);
  });

  test('wires speed and repeat to the clock', () => {
    const clock = fakeClock(1, true);
    const [speed, loop] = clockSettings(clock);

    if (speed.kind === 'select') speed.onChange('0.5');
    if (loop.kind === 'toggle') loop.onChange(false);

    expect(loop).toMatchObject({ key: 'loop', label: 'Repetir', kind: 'toggle', value: true });
    expect(clock.setSpeed).toHaveBeenCalledWith(0.5);
    expect(clock.setLoop).toHaveBeenCalledWith(false);
  });

  test('takes a lab-specific list of speeds', () => {
    const [speed] = clockSettings(fakeClock(8), [1, 8]);

    expect(speed.kind === 'select' && speed.options.map(({ label }) => label)).toEqual([
      '1×',
      '8×',
    ]);
  });
});
