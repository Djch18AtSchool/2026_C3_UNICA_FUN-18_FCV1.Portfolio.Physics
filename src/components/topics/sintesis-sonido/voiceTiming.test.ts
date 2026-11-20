import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { GAIN_RAMP_S, levelAt, rampGain, whenAudioReaches, type GainRamp } from './voiceTiming';

const RAMP: GainRamp = { from: 0.1, to: 0.4, start: 1, end: 1.3 };

describe('voiceTiming', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('levelAt holds before the ramp, interpolates inside it and holds its target after', () => {
    expect(levelAt(RAMP, 0.5)).toBe(0.1);
    expect(levelAt(RAMP, 1.1)).toBeCloseTo(0.2, 12);
    expect(levelAt(RAMP, 2)).toBe(0.4);
  });

  test('rampGain cancels, holds the level the ramp has now and ramps to the target in 30 ms', () => {
    const calls: unknown[][] = [];
    const param = {
      cancelScheduledValues: (t: number) => calls.push(['cancel', t]),
      setValueAtTime: (v: number, t: number) => calls.push(['set', v, t]),
      linearRampToValueAtTime: (v: number, t: number) => calls.push(['linear', v, t]),
    } as unknown as AudioParam;

    const next = rampGain(param, RAMP, 0, 1.15);

    expect(calls).toEqual([
      ['cancel', 1.15],
      ['set', expect.closeTo(0.25, 12), 1.15],
      ['linear', 0, 1.15 + GAIN_RAMP_S],
    ]);
    expect(next).toEqual({ from: expect.closeTo(0.25, 12), to: 0, start: 1.15, end: 1.18 });
  });

  test('whenAudioReaches waits for the audio clock, however late, and acts at once when it is not running', () => {
    const context = { currentTime: 0, state: 'running' } as { currentTime: number; state: string };
    const action = vi.fn();
    const timers: unknown[] = [];

    whenAudioReaches(context as unknown as BaseAudioContext, 0.03, action, (t) => timers.push(t));
    context.currentTime = 0.02;
    vi.advanceTimersByTime(40);
    expect(action).not.toHaveBeenCalled();
    expect(timers).toHaveLength(2);
    context.currentTime = 0.05;
    vi.advanceTimersByTime(40);
    expect(action).toHaveBeenCalledTimes(1);

    const idle = { currentTime: 0, state: 'suspended' } as unknown as BaseAudioContext;
    const now = vi.fn();
    whenAudioReaches(idle, 10, now);
    expect(now).toHaveBeenCalledTimes(1);
  });
});
