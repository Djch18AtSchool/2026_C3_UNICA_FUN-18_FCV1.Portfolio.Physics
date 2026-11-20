/**
 * The synthesiser's voice for React: the recipe, f₁ and f_s are kept from the first render, but
 * nothing touches Web Audio until start() (a press). Leaving the page (pagehide) or unmounting
 * closes the AudioContext. The engine (additiveVoiceEngine.ts) holds the audio rules.
 */
import { useEffect, useMemo, useState } from 'react';
import { AdditiveVoiceEngine } from './additiveVoiceEngine';

export {
  GAIN_RAMP_S,
  NO_WEB_AUDIO,
  START_FAILED,
  unsupportedRateText,
  VOICE_GAIN,
  VOICE_LEVEL_DBFS,
} from './additiveVoiceEngine';

export interface AdditiveVoice {
  /** True from the press until stop(), a failure or pagehide: «Detener» shows meanwhile. */
  isPlaying: boolean;
  /** Why it could not sound, in Spanish (may hold `$…$`); null otherwise. */
  error: string | null;
  start(): Promise<void>;
  stop(): void;
  setRecipe(amplitudes: readonly number[], phases: readonly number[]): void;
  setFrequency(f1: number): void;
  setSampleRate(sampleRate: number): void;
}

export function useAdditiveVoice(): AdditiveVoice {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engine] = useState(
    () => new AdditiveVoiceEngine({ onPlaying: setIsPlaying, onError: setError }),
  );

  useEffect(() => {
    const onPageHide = () => engine.close();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      engine.close();
    };
  }, [engine]);

  const controls = useMemo(
    () => ({
      start: () => engine.start(),
      stop: () => engine.stop(),
      setRecipe: (amplitudes: readonly number[], phases: readonly number[]) =>
        engine.setRecipe(amplitudes, phases),
      setFrequency: (f1: number) => engine.setFrequency(f1),
      setSampleRate: (sampleRate: number) => engine.setSampleRate(sampleRate),
    }),
    [engine],
  );
  return { ...controls, isPlaying, error };
}
