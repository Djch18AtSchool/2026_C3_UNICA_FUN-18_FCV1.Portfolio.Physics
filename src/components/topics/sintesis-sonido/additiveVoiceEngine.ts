/**
 * One additive voice on the Web Audio API (W3C Recommendation 2021-06-17): an OscillatorNode that
 * plays the recipe as a PeriodicWave (11.5) into a GainNode. Review Focus 2 lives here:
 * - no AudioContext exists before start(), which a press calls (autoplay policy: research §3.5);
 * - the gain never steps: it ramps from 0 to −18 dBFS in 30 ms, and down again before a new wave,
 *   on stop() and when the sample rate changes (a context of another rate replaces it); every ramp
 *   starts from the level the gain has, and what needs it over waits for the audio clock
 *   (voiceTiming.ts);
 * - the same coefficients again (a new f₁ recomputes them) change nothing: f₁ glides on its own;
 * - stop() silences the only voice; close() (pagehide, unmount) closes every context.
 * The browser normalizes each PeriodicWave to peak 1 (§1.28.5), so the gain is the peak level.
 */
import { formatNumber } from '../../../lib/format';
import { toPeriodicWave } from '../../../lib/physics/harmonics';
import { GAIN_RAMP_S, rampGain, whenAudioReaches, type GainRamp } from './voiceTiming';

export { GAIN_RAMP_S } from './voiceTiming';
export const VOICE_LEVEL_DBFS = -18;
export const VOICE_GAIN = 10 ** (VOICE_LEVEL_DBFS / 20);
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
  /** The last ramp scheduled on the gain: where its level is at any instant. */
  ramp: GainRamp;
}

class NoWebAudioError extends Error {}

const isSilent = (amplitudes: readonly number[]) => amplitudes.every((a) => a === 0);
const sameValues = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

function errorText(error: unknown, sampleRate: number): string {
  if (error instanceof NoWebAudioError) return NO_WEB_AUDIO;
  if (error instanceof DOMException && error.name === 'NotSupportedError') {
    return unsupportedRateText(sampleRate);
  }
  return START_FAILED;
}

/**
 * Closing a context that is going away: a rejection (it was closed already, InvalidStateError)
 * leaves nothing sounding and nothing to undo, so it is safe to let it go.
 */
function closeQuietly(context: AudioContext): void {
  if (context.state !== 'closed') context.close().catch(() => undefined);
}

/**
 * Suspending an idle context only stops its rendering thread: the voice has already ramped to 0,
 * so a rejection costs CPU, never sound, and nobody needs to hear of it.
 */
function suspendQuietly(context: AudioContext): void {
  if (context.state === 'running') context.suspend().catch(() => undefined);
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

  /** A new recipe dips the gain, swaps the wave and comes back; the same coefficients do nothing. */
  setRecipe(amplitudes: readonly number[], phases: readonly number[]): void {
    if (sameValues(amplitudes, this.amplitudes) && sameValues(phases, this.phases)) return;
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
    const end = this.halt();
    this.context = null;
    this.retire(context, end);
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
      .then((context) => this.started(context, generation))
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
    const end = this.halt();
    this.listener.onPlaying(false);
    if (this.context) this.scheduleSuspend(this.context, end);
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
    for (const context of contexts) if (context) closeQuietly(context);
    this.listener.onPlaying(false);
  }

  /** The context has resumed: the voice, unless a stop (or a close) came first. */
  private started(context: AudioContext, generation: number): void {
    if (generation === this.generation) {
      this.voice = this.createVoice(context);
    } else if (context === this.context && !this.voice && !this.pending) {
      // Stopped while it resumed: it would run idle.
      suspendQuietly(context);
    }
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
    const ramp: GainRamp = {
      from: 0,
      to: sounds ? VOICE_GAIN : 0,
      start: now,
      end: now + GAIN_RAMP_S,
    };
    gain.gain.setValueAtTime(ramp.from, now);
    gain.gain.linearRampToValueAtTime(ramp.to, ramp.end);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    return { context, oscillator, gain, ramp };
  }

  /** Down to 0, then the latest recipe and up again; changes during the dip wait for it. */
  private scheduleSwap(voice: Voice): void {
    if (this.swapTimer !== undefined) return;
    voice.ramp = rampGain(voice.gain.gain, voice.ramp, 0, voice.context.currentTime);
    this.waitForAudio(voice.context, voice.ramp.end, () => this.swap(voice), 'swap');
  }

  /** At gain 0 on the audio clock: the new wave, and up again. */
  private swap(voice: Voice): void {
    this.swapTimer = undefined;
    if (voice !== this.voice) return;
    const sounds = !isSilent(this.amplitudes);
    if (sounds) voice.oscillator.setPeriodicWave(this.wave(voice.context));
    const target = sounds ? VOICE_GAIN : 0;
    voice.ramp = rampGain(voice.gain.gain, voice.ramp, target, voice.context.currentTime);
  }

  /**
   * No voice and no start under way; the voice there was ramps out from its level and stops at
   * the bottom. Returns when that is, on the audio clock (−∞ without a voice).
   */
  private halt(): number {
    this.generation += 1;
    this.pending = null;
    this.clearTimers();
    const voice = this.voice;
    this.voice = null;
    if (!voice) return Number.NEGATIVE_INFINITY;
    const { context, oscillator, gain } = voice;
    const ramp = rampGain(gain.gain, voice.ramp, 0, context.currentTime);
    oscillator.stop(ramp.end);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    return ramp.end;
  }

  /** An idle context stops its rendering thread once the voice has ramped out. */
  private scheduleSuspend(context: AudioContext, end: number): void {
    this.waitForAudio(
      context,
      end,
      () => {
        this.suspendTimer = undefined;
        if (context === this.context && !this.voice && !this.pending) suspendQuietly(context);
      },
      'suspend',
    );
  }

  /** A context of a former rate closes once its voice has ramped out (unless close() came first). */
  private retire(context: AudioContext, end: number): void {
    this.retiring.add(context);
    whenAudioReaches(context, end, () => {
      if (this.retiring.delete(context)) closeQuietly(context);
    });
  }

  private waitForAudio(
    context: AudioContext,
    time: number,
    action: () => void,
    slot: 'swap' | 'suspend',
  ): void {
    whenAudioReaches(context, time, action, (timer) => {
      if (slot === 'swap') this.swapTimer = timer;
      else this.suspendTimer = timer;
    });
  }

  private clearTimers(): void {
    clearTimeout(this.swapTimer);
    clearTimeout(this.suspendTimer);
    this.swapTimer = undefined;
    this.suspendTimer = undefined;
  }
}
