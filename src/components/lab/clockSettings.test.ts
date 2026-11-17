import { describe, expect, test } from 'vitest';
import { fakeClock as fakeSimClock } from '../../test-fake-clock';
import { clockSettings } from './clockSettings';
import { DEFAULT_SPEEDS, speedLabel } from './transportSpeed';

const fakeClock = (speed = 1, loop = false) => fakeSimClock({ speed, loop }, 10);

describe('clockSettings', () => {
  test('is «Repetir» alone: the speed is the transport’s own select', () => {
    const settings = clockSettings(fakeClock(1.5, true));

    expect(settings).toHaveLength(1);
    expect(settings[0]).toMatchObject({
      key: 'loop',
      label: 'Repetir',
      kind: 'toggle',
      value: true,
    });
  });

  test('wires «Repetir» to the clock', () => {
    const clock = fakeClock(1, true);
    const [loop] = clockSettings(clock);

    if (loop.kind === 'toggle') loop.onChange(false);

    expect(clock.setLoop).toHaveBeenCalledWith(false);
  });
});

describe('transport speeds', () => {
  test('offers the spec speeds, 0,25× to 2×, read with a decimal comma', () => {
    expect(DEFAULT_SPEEDS).toEqual([0.25, 0.5, 1, 1.5, 2]);
    expect(DEFAULT_SPEEDS.map(speedLabel)).toEqual(['0,25×', '0,5×', '1×', '1,5×', '2×']);
  });
});
