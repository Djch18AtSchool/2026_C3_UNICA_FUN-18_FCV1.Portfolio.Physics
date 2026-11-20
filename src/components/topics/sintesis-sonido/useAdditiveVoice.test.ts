// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { toPeriodicWave } from '../../../lib/physics/harmonics';
import { FakeAudioContext, installFakeAudio, type FakeAudio } from '../../../test-audio';
import {
  GAIN_RAMP_S,
  NO_WEB_AUDIO,
  START_FAILED,
  unsupportedRateText,
  useAdditiveVoice,
  VOICE_GAIN,
} from './useAdditiveVoice';

const CLARINET = {
  amplitudes: [1, 0.02, 1.47, 0.087, 0.405, 0.026, 0.126, 0.014, 0.041, 0.013],
  phases: [0, 1.3, 1.44, 0.54, 1.97, 0.42, 2.37, 1.36, -1.27, 3.06],
};
const SQUARE = {
  amplitudes: [1, 0, 1 / 3, 0, 1 / 5, 0, 1 / 7, 0, 1 / 9, 0],
  phases: Array.from({ length: 10 }, () => 0),
};
const SILENCE = { amplitudes: Array.from({ length: 10 }, () => 0), phases: SQUARE.phases };
const RAMP_MS = GAIN_RAMP_S * 1000;
/** A 1 ms step may move the gain by at most this much: a 30 ms ramp to −18 dBFS, never a step. */
const MAX_STEP = VOICE_GAIN / RAMP_MS + 1e-9;

let audio: FakeAudio;

beforeEach(() => {
  vi.useFakeTimers();
  audio = installFakeAudio();
});

afterEach(() => {
  audio.uninstall();
  vi.useRealTimers();
});

function renderVoice(sampleRate = 44100) {
  const view = renderHook(() => useAdditiveVoice());
  act(() => {
    view.result.current.setSampleRate(sampleRate);
    view.result.current.setRecipe(CLARINET.amplitudes, CLARINET.phases);
    view.result.current.setFrequency(310.1);
  });
  return view;
}

async function startVoice(sampleRate = 44100) {
  const view = renderVoice(sampleRate);
  await act(() => view.result.current.start());
  return view;
}

const onlyContext = () => {
  expect(audio.contexts).toHaveLength(1);
  return audio.contexts[0];
};
const gainOf = (context: FakeAudioContext) => context.gains[0].gain;

/** The gain every millisecond over `ms`, advancing the clocks: what a listener would hear. */
function gainTrace(context: FakeAudioContext, ms: number): number[] {
  const trace = [gainOf(context).value];
  for (let i = 0; i < ms; i += 1) {
    act(() => audio.advance(1));
    trace.push(gainOf(context).value);
  }
  return trace;
}

const largestStep = (trace: readonly number[]) =>
  trace.slice(1).reduce((largest, value, i) => Math.max(largest, Math.abs(value - trace[i])), 0);

describe('useAdditiveVoice: no sound before a gesture', () => {
  test('no AudioContext exists before start(), whatever the recipe, the note and the rate', () => {
    const { result } = renderVoice();
    act(() => result.current.setSampleRate(8000));

    expect(audio.contexts).toHaveLength(0);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('start() opens one context at the chosen f_s, one oscillator with the recipe’s PeriodicWave (11.5) at f₁, and a gain from 0 to −18 dBFS in 30 ms', async () => {
    const { result } = await startVoice();
    const context = onlyContext();
    const { real, imag } = toPeriodicWave(CLARINET.amplitudes, CLARINET.phases);

    expect(context.options).toEqual({ sampleRate: 44100, latencyHint: 'interactive' });
    expect(context.calls).toContain('resume');
    expect(context.oscillators).toHaveLength(1);
    expect(context.waves).toHaveLength(1);
    expect(context.waves[0].real).toEqual(real);
    expect(context.waves[0].imag).toEqual(imag);
    expect(context.waves[0].constraints).toEqual({ disableNormalization: false });
    const [oscillator] = context.oscillators;
    expect(oscillator.waveSwaps.map(({ wave }) => wave)).toEqual([context.waves[0]]);
    expect(oscillator.frequency.value).toBeCloseTo(310.1, 9);
    expect(oscillator.startedAt).toBe(0);
    expect(oscillator.outputs).toEqual([context.gains[0]]);
    expect(context.gains[0].outputs).toEqual([context.destination]);
    expect(VOICE_GAIN).toBeCloseTo(10 ** (-18 / 20), 12);
    expect(gainOf(context).valueAt(0)).toBe(0);
    expect(gainOf(context).valueAt(GAIN_RAMP_S / 2)).toBeCloseTo(VOICE_GAIN / 2, 9);
    expect(gainOf(context).valueAt(GAIN_RAMP_S)).toBeCloseTo(VOICE_GAIN, 12);
    expect(gainOf(context).valueAt(1)).toBeCloseTo(VOICE_GAIN, 12);
    expect(result.current.isPlaying).toBe(true);
  });

  test('two presses before the context resumes make one voice', async () => {
    const { result } = renderVoice();
    await act(() => Promise.all([result.current.start(), result.current.start()]));
    await act(() => result.current.start());

    expect(onlyContext().oscillators).toHaveLength(1);
  });
});

describe('useAdditiveVoice: changes while it plays', () => {
  test('a new recipe ramps the gain down, swaps the wave at the bottom and ramps up: never a step', async () => {
    const { result } = await startVoice();
    const context = onlyContext();
    act(() => audio.advance(100));

    act(() => result.current.setRecipe(SQUARE.amplitudes, SQUARE.phases));
    const trace = gainTrace(context, 4 * RAMP_MS);

    const [oscillator] = context.oscillators;
    expect(oscillator.waveSwaps).toHaveLength(2);
    const swap = oscillator.waveSwaps[1];
    expect(gainOf(context).valueAt(swap.time)).toBe(0);
    expect(swap.wave.imag).toEqual(toPeriodicWave(SQUARE.amplitudes, SQUARE.phases).imag);
    expect(Math.min(...trace)).toBe(0);
    expect(largestStep(trace)).toBeLessThanOrEqual(MAX_STEP);
    expect(trace.at(-1)).toBeCloseTo(VOICE_GAIN, 12);
  });

  test('changes inside one dip are swapped once, with the latest recipe', async () => {
    const { result } = await startVoice();
    const context = onlyContext();
    act(() => audio.advance(100));

    act(() => result.current.setRecipe(SQUARE.amplitudes, SQUARE.phases));
    act(() => audio.advance(10));
    act(() => result.current.setRecipe(CLARINET.amplitudes, [0, ...CLARINET.phases.slice(1)]));
    const trace = gainTrace(context, 4 * RAMP_MS);

    const swaps = context.oscillators[0].waveSwaps;
    expect(swaps).toHaveLength(2);
    expect(swaps[1].wave.real).toEqual(
      toPeriodicWave(CLARINET.amplitudes, [0, ...CLARINET.phases.slice(1)]).real,
    );
    expect(largestStep(trace)).toBeLessThanOrEqual(MAX_STEP);
  });

  test('a silent recipe ramps to 0 and keeps the last wave; a sounding one ramps back up', async () => {
    const { result } = await startVoice();
    const context = onlyContext();
    act(() => audio.advance(100));

    act(() => result.current.setRecipe(SILENCE.amplitudes, SILENCE.phases));
    const silent = gainTrace(context, 3 * RAMP_MS);
    expect(silent.at(-1)).toBe(0);
    expect(context.waves).toHaveLength(1);

    act(() => result.current.setRecipe(SQUARE.amplitudes, SQUARE.phases));
    const back = gainTrace(context, 3 * RAMP_MS);
    expect(largestStep([...silent, ...back])).toBeLessThanOrEqual(MAX_STEP);
    expect(back.at(-1)).toBeCloseTo(VOICE_GAIN, 12);
    expect(context.waves).toHaveLength(2);
  });

  test('a new f₁ glides the oscillator there, with no change of gain', async () => {
    const { result } = await startVoice();
    const context = onlyContext();
    act(() => audio.advance(100));

    act(() => result.current.setFrequency(440));
    const trace = gainTrace(context, 50);

    expect(context.oscillators[0].frequency.value).toBeCloseTo(440, 1);
    expect(largestStep(trace)).toBe(0);
  });
});

describe('useAdditiveVoice: one stop silences it', () => {
  test('stop() ramps to 0 in 30 ms, stops the oscillator at the bottom and suspends the context', async () => {
    const { result } = await startVoice();
    const context = onlyContext();
    act(() => audio.advance(100));

    act(() => result.current.stop());
    expect(result.current.isPlaying).toBe(false);
    const trace = gainTrace(context, 2 * RAMP_MS);

    const [oscillator] = context.oscillators;
    expect(oscillator.stoppedAt).toBeCloseTo(0.1 + GAIN_RAMP_S, 9);
    expect(gainOf(context).valueAt(oscillator.stoppedAt ?? 0)).toBe(0);
    expect(largestStep(trace)).toBeLessThanOrEqual(MAX_STEP);
    expect(context.calls).toContain('suspend');
    act(() => oscillator.end());
    expect(oscillator.isDisconnected).toBe(true);
    expect(context.gains[0].isDisconnected).toBe(true);
  });

  test('stop() while the context is still resuming cancels the start: nothing plays', async () => {
    FakeAudioContext.resumeBehaviour = 'hang';
    const { result } = renderVoice();
    let started: Promise<void> = Promise.resolve();
    act(() => {
      started = result.current.start();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => result.current.stop());
    await act(async () => {
      onlyContext().release?.();
      await started;
    });

    expect(onlyContext().oscillators).toHaveLength(0);
    expect(result.current.isPlaying).toBe(false);
  });

  test('play again after a stop reuses the context and resumes it', async () => {
    const { result } = await startVoice();
    act(() => result.current.stop());
    act(() => audio.advance(100));
    await act(() => result.current.start());

    const context = onlyContext();
    expect(context.oscillators).toHaveLength(2);
    expect(context.calls.filter((call) => call === 'resume')).toHaveLength(2);
    expect(result.current.isPlaying).toBe(true);
  });

  test('leaving the page (pagehide) closes the AudioContext; the next start opens a new one', async () => {
    const { result } = await startVoice();
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(onlyContext().state).toBe('closed');
    expect(result.current.isPlaying).toBe(false);
    await act(() => result.current.start());
    expect(audio.contexts).toHaveLength(2);
    expect(audio.contexts[1].oscillators).toHaveLength(1);
  });

  test('unmounting closes the AudioContext and stops listening to pagehide', async () => {
    const view = await startVoice();
    view.unmount();

    expect(onlyContext().state).toBe('closed');
    expect(() => window.dispatchEvent(new Event('pagehide'))).not.toThrow();
  });
});

describe('useAdditiveVoice: the sample rate', () => {
  test('a new f_s while playing ramps the old voice out, closes its context after the ramp and plays on a new one', async () => {
    const { result } = await startVoice();
    const old = onlyContext();
    act(() => audio.advance(100));

    await act(async () => result.current.setSampleRate(8000));
    const oldTrace = gainTrace(old, 2 * RAMP_MS);

    expect(largestStep(oldTrace)).toBeLessThanOrEqual(MAX_STEP);
    expect(old.state).toBe('closed');
    expect(audio.contexts).toHaveLength(2);
    const fresh = audio.contexts[1];
    expect(fresh.options.sampleRate).toBe(8000);
    expect(fresh.oscillators).toHaveLength(1);
    expect(result.current.isPlaying).toBe(true);
  });

  test('a new f_s while stopped closes the idle context; the next start opens one at that rate', async () => {
    const { result } = await startVoice();
    act(() => result.current.stop());
    act(() => audio.advance(100));
    act(() => result.current.setSampleRate(16000));
    act(() => audio.advance(100));

    expect(onlyContext().state).toBe('closed');
    await act(() => result.current.start());
    expect(audio.contexts[1].options.sampleRate).toBe(16000);
  });
});

describe('useAdditiveVoice: when it cannot sound', () => {
  test('without Web Audio, start() says so and nothing plays', async () => {
    audio.uninstall();
    const { result } = renderVoice();
    await act(() => result.current.start());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.error).toBe(NO_WEB_AUDIO);
  });

  test('a refused resume is reported and leaves it stopped; the next press tries again', async () => {
    FakeAudioContext.resumeBehaviour = 'reject';
    const { result } = renderVoice();
    await act(() => result.current.start());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.error).toBe(START_FAILED);
    FakeAudioContext.resumeBehaviour = 'resolve';
    await act(() => result.current.start());
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.error).toBeNull();
  });

  test('a rate the browser refuses names it', async () => {
    FakeAudioContext.unsupportedRates = [8000];
    const { result } = renderVoice(8000);
    await act(() => result.current.start());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.error).toBe(unsupportedRateText(8000));
    expect(unsupportedRateText(8000)).toBe(
      'Este navegador no admite $f_s$ = 8\u202f000\u202fHz: elige otra frecuencia de muestreo.',
    );
  });
});

describe('useAdditiveVoice: a ramp interrupted, or a clock behind, never steps (fix round 1)', () => {
  /** The gain every millisecond from now, after `act`, without the clocks having moved yet. */
  function traceAfter(context: FakeAudioContext, action: () => void, ms: number): number[] {
    const before = gainOf(context).value;
    act(action);
    return [before, ...gainTrace(context, ms)];
  }

  test('the same coefficients again (a new f₁ recomputes them) neither dip nor swap', async () => {
    const { result } = await startVoice();
    const context = onlyContext();
    act(() => audio.advance(100));

    const trace = traceAfter(
      context,
      () => result.current.setRecipe([...CLARINET.amplitudes], [...CLARINET.phases]),
      3 * RAMP_MS,
    );

    expect(context.oscillators[0].waveSwaps).toHaveLength(1);
    expect(largestStep(trace)).toBe(0);
  });

  test('stop 10 ms into a dip ramps down from where the gain is', async () => {
    const { result } = await startVoice();
    const context = onlyContext();
    act(() => audio.advance(100));
    act(() => result.current.setRecipe(SQUARE.amplitudes, SQUARE.phases));
    const dip = gainTrace(context, 10);

    const rest = traceAfter(context, () => result.current.stop(), 2 * RAMP_MS);

    expect(largestStep([...dip, ...rest])).toBeLessThanOrEqual(MAX_STEP);
    expect(rest.at(-1)).toBe(0);
  });

  test('a new recipe 10 ms into the ramp up starts its dip from there', async () => {
    const { result } = await startVoice();
    const context = onlyContext();
    act(() => audio.advance(100));
    act(() => result.current.setRecipe(SQUARE.amplitudes, SQUARE.phases));
    const first = gainTrace(context, RAMP_MS + 20);

    const second = traceAfter(
      context,
      () => result.current.setRecipe(SILENCE.amplitudes, SILENCE.phases),
      3 * RAMP_MS,
    );

    expect(largestStep([...first, ...second])).toBeLessThanOrEqual(MAX_STEP);
    expect(second.at(-1)).toBe(0);
  });

  test('stop 10 ms into the start ramp: no step', async () => {
    const { result } = await startVoice();
    const context = onlyContext();
    const start = gainTrace(context, 10);

    const rest = traceAfter(context, () => result.current.stop(), 2 * RAMP_MS);

    expect(largestStep([...start, ...rest])).toBeLessThanOrEqual(MAX_STEP);
    expect(rest.at(-1)).toBe(0);
  });

  test('a swap whose timer fires before the audio clock passes the ramp’s end waits for it: the wave changes only at gain 0', async () => {
    const { result } = await startVoice(8000);
    const context = onlyContext();
    act(() => audio.advance(100));
    act(() => result.current.setRecipe(SQUARE.amplitudes, SQUARE.phases));

    // The page's timers run 40 ms; the audio clock, one 8 kHz quantum short of the ramp's end.
    act(() => audio.advance(40, 25));
    const trace = gainTrace(context, 3 * RAMP_MS);

    const swaps = context.oscillators[0].waveSwaps;
    expect(swaps).toHaveLength(2);
    expect(gainOf(context).valueAt(swaps[1].time)).toBe(0);
    expect(largestStep(trace)).toBeLessThanOrEqual(MAX_STEP);
    expect(trace.at(-1)).toBeCloseTo(VOICE_GAIN, 12);
  });

  test('a stop whose suspend timer fires before the ramp has ended waits for the audio clock', async () => {
    const { result } = await startVoice();
    const context = onlyContext();
    act(() => audio.advance(100));
    act(() => result.current.stop());

    act(() => audio.advance(40, 20));
    expect(context.calls).not.toContain('suspend');
    act(() => audio.advance(30));
    expect(context.calls).toContain('suspend');
  });

  test('a stop while the context resumes suspends it once it has resumed', async () => {
    FakeAudioContext.resumeBehaviour = 'hang';
    const { result } = renderVoice();
    let started: Promise<void> = Promise.resolve();
    act(() => {
      started = result.current.start();
    });
    act(() => result.current.stop());
    await act(async () => {
      onlyContext().release?.();
      await started;
    });

    expect(onlyContext().calls).toContain('suspend');
    expect(onlyContext().state).toBe('suspended');
  });
});
