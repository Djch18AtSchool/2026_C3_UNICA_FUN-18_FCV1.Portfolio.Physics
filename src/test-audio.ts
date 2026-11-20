/**
 * A fake Web Audio API for jsdom (which has none): just what the Tema 11 synthesiser uses, with
 * every call recorded and the AudioParam automation simulated (setValueAtTime, linear ramps,
 * setTargetAtTime, cancelScheduledValues), so a test reads a gain at any instant and can prove
 * that it never steps. Time is the test's: `advance(ms)` moves every context's clock and the
 * fake timers (vi.useFakeTimers) together. The e2e uses its own stub in the page.
 */
import { vi } from 'vitest';

type ParamEvent =
  | { type: 'set' | 'linear'; time: number; value: number }
  | { type: 'target'; time: number; value: number; tau: number };

export interface ParamCall {
  method: string;
  args: number[];
}

/** An AudioParam whose value follows its scheduled events, as the specification computes them. */
export class FakeAudioParam {
  readonly calls: ParamCall[] = [];
  private events: ParamEvent[] = [];

  constructor(
    private readonly context: FakeAudioContext,
    private readonly defaultValue: number,
  ) {}

  get value(): number {
    return this.valueAt(this.context.currentTime);
  }

  set value(value: number) {
    this.calls.push({ method: 'value', args: [value] });
    this.insert({ type: 'set', time: this.context.currentTime, value });
  }

  setValueAtTime(value: number, time: number): this {
    this.calls.push({ method: 'setValueAtTime', args: [value, time] });
    this.insert({ type: 'set', time, value });
    return this;
  }

  linearRampToValueAtTime(value: number, time: number): this {
    this.calls.push({ method: 'linearRampToValueAtTime', args: [value, time] });
    this.insert({ type: 'linear', time, value });
    return this;
  }

  setTargetAtTime(value: number, time: number, tau: number): this {
    this.calls.push({ method: 'setTargetAtTime', args: [value, time, tau] });
    this.insert({ type: 'target', time, value, tau });
    return this;
  }

  cancelScheduledValues(time: number): this {
    this.calls.push({ method: 'cancelScheduledValues', args: [time] });
    this.events = this.events.filter((event) => event.time < time);
    return this;
  }

  private insert(event: ParamEvent): void {
    this.events = [...this.events, event].sort((a, b) => a.time - b.time);
  }

  /** The value at `t` (s): steps, linear ramps from the previous event, exponential approaches. */
  valueAt(t: number): number {
    let value = this.defaultValue;
    let since = 0;
    for (const [i, event] of this.events.entries()) {
      if (event.type === 'linear') {
        if (t < event.time) {
          const share = event.time > since ? (t - since) / (event.time - since) : 1;
          return value + (event.value - value) * Math.max(0, share);
        }
      } else if (event.time > t) {
        return value;
      }
      if (event.type === 'target') {
        const end = Math.min(t, this.events[i + 1]?.time ?? t);
        value = event.value + (value - event.value) * Math.exp(-(end - event.time) / event.tau);
        since = end;
        continue;
      }
      value = event.value;
      since = event.time;
    }
    return value;
  }
}

export class FakePeriodicWave {
  constructor(
    readonly real: Float32Array,
    readonly imag: Float32Array,
    readonly constraints?: PeriodicWaveConstraints,
  ) {}
}

class FakeNode {
  readonly outputs: unknown[] = [];
  isDisconnected = false;

  connect<T>(destination: T): T {
    this.outputs.push(destination);
    return destination;
  }

  disconnect(): void {
    this.isDisconnected = true;
  }
}

export class FakeGain extends FakeNode {
  readonly gain: FakeAudioParam;

  constructor(context: FakeAudioContext) {
    super();
    this.gain = new FakeAudioParam(context, 1);
  }
}

export class FakeOscillator extends FakeNode {
  readonly frequency: FakeAudioParam;
  /** Every wave set, with the context's time at the call. */
  readonly waveSwaps: { wave: FakePeriodicWave; time: number }[] = [];
  startedAt?: number;
  stoppedAt?: number;
  onended: (() => void) | null = null;

  constructor(private readonly context: FakeAudioContext) {
    super();
    this.frequency = new FakeAudioParam(context, 440);
  }

  setPeriodicWave(wave: FakePeriodicWave): void {
    this.waveSwaps.push({ wave, time: this.context.currentTime });
  }

  start(when = 0): void {
    this.startedAt = when;
  }

  stop(when = 0): void {
    this.stoppedAt = when;
  }

  /** What the browser does once the scheduled stop is reached. */
  end(): void {
    this.onended?.();
  }
}

export type ResumeBehaviour = 'resolve' | 'reject' | 'hang';

export class FakeAudioContext {
  static resumeBehaviour: ResumeBehaviour = 'resolve';
  static unsupportedRates: readonly number[] = [];
  static created: FakeAudioContext[] = [];

  readonly sampleRate: number;
  readonly destination = { kind: 'destination' };
  readonly calls: string[] = [];
  readonly oscillators: FakeOscillator[] = [];
  readonly gains: FakeGain[] = [];
  readonly waves: FakePeriodicWave[] = [];
  state: AudioContextState = 'suspended';
  currentTime = 0;
  /** Settles a 'hang' resume by hand. */
  release?: () => void;

  constructor(readonly options: AudioContextOptions = {}) {
    if (FakeAudioContext.unsupportedRates.includes(options.sampleRate ?? 0)) {
      throw new DOMException('rate out of range', 'NotSupportedError');
    }
    this.sampleRate = options.sampleRate ?? 48000;
    FakeAudioContext.created.push(this);
  }

  createOscillator(): FakeOscillator {
    const oscillator = new FakeOscillator(this);
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain(): FakeGain {
    const gain = new FakeGain(this);
    this.gains.push(gain);
    return gain;
  }

  createPeriodicWave(
    real: ArrayLike<number>,
    imag: ArrayLike<number>,
    constraints?: PeriodicWaveConstraints,
  ): FakePeriodicWave {
    const wave = new FakePeriodicWave(
      Float32Array.from(real),
      Float32Array.from(imag),
      constraints,
    );
    this.waves.push(wave);
    return wave;
  }

  resume(): Promise<void> {
    this.calls.push('resume');
    if (FakeAudioContext.resumeBehaviour === 'reject') {
      return Promise.reject(new DOMException('not allowed', 'NotAllowedError'));
    }
    if (FakeAudioContext.resumeBehaviour === 'hang') {
      return new Promise((resolve) => {
        this.release = () => {
          this.state = 'running';
          resolve();
        };
      });
    }
    this.state = 'running';
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.calls.push('suspend');
    this.state = 'suspended';
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.calls.push('close');
    this.state = 'closed';
    return Promise.resolve();
  }
}

export interface FakeAudio {
  /** Every context created, in order. */
  contexts: FakeAudioContext[];
  /** Moves every context's clock and the fake timers by `ms`. */
  advance(ms: number): void;
  uninstall(): void;
}

/** Puts the fake on `window.AudioContext` (fake timers are the test's to install). */
export function installFakeAudio(): FakeAudio {
  const previous = Object.getOwnPropertyDescriptor(window, 'AudioContext');
  FakeAudioContext.created = [];
  FakeAudioContext.resumeBehaviour = 'resolve';
  FakeAudioContext.unsupportedRates = [];
  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    writable: true,
    value: FakeAudioContext,
  });
  return {
    contexts: FakeAudioContext.created,
    advance(ms) {
      for (const context of FakeAudioContext.created) context.currentTime += ms / 1000;
      vi.advanceTimersByTime(ms);
    },
    uninstall() {
      if (previous) Object.defineProperty(window, 'AudioContext', previous);
      else Reflect.deleteProperty(window, 'AudioContext');
    },
  };
}
