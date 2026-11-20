/**
 * One additive voice on the Web Audio API (W3C Recommendation 2021-06-17): an OscillatorNode that
 * plays the recipe as a PeriodicWave (11.5) into a GainNode. Review Focus 2 lives here:
 * - no AudioContext exists before start(), which a press calls (autoplay policy: research §3.5);
 * - the gain never steps: it ramps from 0 to −18 dBFS in 30 ms, and down again before a new wave,
 *   on stop() and when the sample rate changes (a context of another rate replaces it);
 * - stop() silences the only voice; close() (pagehide, unmount) closes every context.
 * The browser normalizes each PeriodicWave to peak 1 (§1.28.5), so the gain is the peak level.
 */
import { formatNumber } from '../../../lib/format';
import { toPeriodicWave } from '../../../lib/physics/harmonics';

export const VOICE_LEVEL_DBFS = -18;
export const VOICE_GAIN = 10 ** (VOICE_LEVEL_DBFS / 20);
/** Every change of level takes this long: no click, and never a step to full volume. */
export const GAIN_RAMP_S = 0.03;
/** A swap, a suspend or a close waits this long: the ramp and a margin for the main thread. */
const AFTER_RAMP_MS = GAIN_RAMP_S * 1000 + 10;
/** A new f₁ is approached with this time constant (setTargetAtTime). */
const GLIDE_TAU_S = 0.005;

export const NO_WEB_AUDIO =
  'Este navegador no tiene Web Audio: la receta se dibuja, pero no puede sonar.';
export const START_FAILED = 'El navegador no dejó empezar el sonido: vuelve a pulsar «Reproducir».';
export const unsupportedRateText = (sampleRate: number): string =>
  `Este navegador no admite $f_s$ = ${formatNumber(sampleRate, { precision: 0, unit: 'Hz' })}: elige otra frecuencia de muestreo.`;

export interface VoiceListener {
  onPlaying(isPlaying: boolean): void;
  onError(message: string | null): void;
}

interface Voice {
  context: AudioContext;
  oscillator: OscillatorNode;
  gain: GainNode;
}

class NoWebAudioError extends Error {}

/** From the param's current value to `value` in GAIN_RAMP_S, starting now. */
function rampTo(param: AudioParam, value: number, now: number): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + GAIN_RAMP_S);
}

const isSilent = (amplitudes: readonly number[]) => amplitudes.every((a) => a === 0);

function errorText(error: unknown, sampleRate: number): string {
  if (error instanceof NoWebAudioError) return NO_WEB_AUDIO;
  if (error instanceof DOMException && error.name === 'NotSupportedError') {
    return unsupportedRateText(sampleRate);
  }
  return START_FAILED;
}

export class AdditiveVoiceEngine {
  private context: AudioContext | null = null;
  private voice: Voice | null = null;
  private pending: Promise<void> | null = null;
  /** A stop, a close or a change of rate makes a start still resuming stale. */
  private generation = 0;
  private amplitudes: readonly number[] = [];
  private phases: readonly number[] = [];
  private f1 = 440;
  private sampleRate = 44100;
  private swapTimer: ReturnType<typeof setTimeout> | undefined;
  private suspendTimer: ReturnType<typeof setTimeout> | undefined;
  /** Contexts of a former rate, ramping out before they close. */
  private readonly retiring = new Set<AudioContext>();

  constructor(private readonly listener: VoiceListener) {}

  setRecipe(amplitudes: readonly number[], phases: readonly number[]): void {
    this.amplitudes = [...amplitudes];
    this.phases = [...phases];
    if (this.voice) this.scheduleSwap(this.voice);
  }

  setFrequency(f1: number): void {
    this.f1 = f1;
    const voice = this.voice;
    if (voice)
      voice.oscillator.frequency.setTargetAtTime(f1, voice.context.currentTime, GLIDE_TAU_S);
  }

  /** A new f_s: the context of the old one ramps out and closes; a playing voice goes on in a new one. */
  setSampleRate(sampleRate: number): void {
    if (sampleRate === this.sampleRate) return;
    this.sampleRate = sampleRate;
    const context = this.context;
    if (!context) return;
    const wasPlaying = this.voice !== null || this.pending !== null;
    this.halt();
    this.context = null;
    this.retire(context);
    if (wasPlaying) void this.start();
  }

  /** Called by a press: creates or resumes the context inside it, then the voice. Idempotent. */
  start(): Promise<void> {
    if (this.voice) return Promise.resolve();
    if (this.pending) return this.pending;
    const generation = ++this.generation;
    clearTimeout(this.suspendTimer);
    this.listener.onError(null);
    this.listener.onPlaying(true);
    this.pending = this.open()
      .then((context) => {
        if (generation === this.generation) this.voice = this.createVoice(context);
      })
      .catch((error: unknown) => {
        if (generation !== this.generation) return;
        this.listener.onPlaying(false);
        this.listener.onError(errorText(error, this.sampleRate));
      })
      .finally(() => {
        if (generation === this.generation) this.pending = null;
      });
    return this.pending;
  }

  /** The one stop: ramps the voice out, cancels a start under way, then suspends the context. */
  stop(): void {
    const context = this.voice?.context;
    this.halt();
    this.listener.onPlaying(false);
    if (context) this.scheduleSuspend(context);
  }

  /** Leaving the page or unmounting: every context closes now. */
  close(): void {
    this.generation += 1;
    this.pending = null;
    this.clearTimers();
    this.voice = null;
    const contexts = [this.context, ...this.retiring];
    this.context = null;
    this.retiring.clear();
    for (const context of contexts) {
      if (context && context.state !== 'closed') void context.close();
    }
    this.listener.onPlaying(false);
  }

  /** Synchronous up to resume(), so both happen inside the press. */
  private open(): Promise<AudioContext> {
    try {
      const context = this.context ?? this.createContext();
      return context.state === 'running'
        ? Promise.resolve(context)
        : context.resume().then(() => context);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private createContext(): AudioContext {
    const AudioContextClass = typeof window === 'undefined' ? undefined : window.AudioContext;
    if (!AudioContextClass) throw new NoWebAudioError();
    this.context = new AudioContextClass({
      sampleRate: this.sampleRate,
      latencyHint: 'interactive',
    });
    return this.context;
  }

  private wave(context: AudioContext): PeriodicWave {
    const { real, imag } = toPeriodicWave(this.amplitudes, this.phases);
    return context.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  private createVoice(context: AudioContext): Voice {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const sounds = !isSilent(this.amplitudes);
    if (sounds) oscillator.setPeriodicWave(this.wave(context));
    oscillator.frequency.setValueAtTime(this.f1, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(sounds ? VOICE_GAIN : 0, now + GAIN_RAMP_S);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    return { context, oscillator, gain };
  }

  /** Down to 0, then the latest recipe and up again; changes during the dip wait for it. */
  private scheduleSwap(voice: Voice): void {
    if (this.swapTimer !== undefined) return;
    rampTo(voice.gain.gain, 0, voice.context.currentTime);
    this.swapTimer = setTimeout(() => this.swap(voice), AFTER_RAMP_MS);
  }

  private swap(voice: Voice): void {
    this.swapTimer = undefined;
    if (voice !== this.voice) return;
    const sounds = !isSilent(this.amplitudes);
    if (sounds) voice.oscillator.setPeriodicWave(this.wave(voice.context));
    rampTo(voice.gain.gain, sounds ? VOICE_GAIN : 0, voice.context.currentTime);
  }

  /** No voice and no start under way; the voice there was ramps out and stops at the bottom. */
  private halt(): void {
    this.generation += 1;
    this.pending = null;
    this.clearTimers();
    const voice = this.voice;
    this.voice = null;
    if (!voice) return;
    const { context, oscillator, gain } = voice;
    const now = context.currentTime;
    rampTo(gain.gain, 0, now);
    oscillator.stop(now + GAIN_RAMP_S);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  /** An idle context stops its rendering thread once the voice has ramped out. */
  private scheduleSuspend(context: AudioContext): void {
    this.suspendTimer = setTimeout(() => {
      this.suspendTimer = undefined;
      if (context === this.context && !this.voice && context.state === 'running') {
        void context.suspend();
      }
    }, AFTER_RAMP_MS);
  }

  private retire(context: AudioContext): void {
    this.retiring.add(context);
    setTimeout(() => {
      // close() may have closed it already.
      if (this.retiring.delete(context) && context.state !== 'closed') void context.close();
    }, AFTER_RAMP_MS);
  }

  private clearTimers(): void {
    clearTimeout(this.swapTimer);
    clearTimeout(this.suspendTimer);
    this.swapTimer = undefined;
    this.suspendTimer = undefined;
  }
}
