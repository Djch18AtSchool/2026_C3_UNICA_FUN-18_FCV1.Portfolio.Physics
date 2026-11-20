import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SpringParams } from '../../../lib/physics/dampedSpring';
import type { Preset } from '../../../lib/presets';
import { useMotionReduced } from '../../lab/useMotionReduced';
import { useSimClock, type SimClock } from '../../lab/useSimClock';
import { DEFAULT_PRESET_ID, SPRING_LAB_PRESETS } from './springLabPresets';
import { buildRun, withRetarget, type SpringRun } from './springScene';

interface RunState {
  params: SpringParams;
  /** The clock times of the presses of «Interrumpir», in order. */
  retargets: readonly number[];
  /** The preset the parameters still equal; undefined once one was edited. */
  presetId?: string;
  /** Counts the runs started from the start (a preset, «Restablecer»). */
  runId: number;
}

function defaultPreset(): Preset<SpringParams> {
  const preset = SPRING_LAB_PRESETS.find(({ id }) => id === DEFAULT_PRESET_ID);
  if (!preset) throw new Error(`useSpringRun: falta el preajuste ${DEFAULT_PRESET_ID}`);
  return preset;
}

const DEFAULT_PRESET = defaultPreset();
const INITIAL_STATE: RunState = {
  params: DEFAULT_PRESET.values,
  retargets: [],
  presetId: DEFAULT_PRESET.id,
  runId: 0,
};

export interface SpringRunControls {
  params: SpringParams;
  presetId?: string;
  run: SpringRun;
  clock: SimClock;
  /** False at the start with the clock paused: there is no motion to interrupt yet. */
  canInterrupt: boolean;
  edit(patch: Partial<SpringParams>): void;
  choosePreset(preset: Preset<SpringParams>): void;
  /** «Interrumpir»: the target swaps at the clock's live time (never at t = 0). */
  interrupt(): void;
  reset(): void;
}

/**
 * Under reduced motion the lab opens on the final frame (the plot still shows the whole run), and
 * so does every new run; playing then steps through it as every clock does (useSimClock).
 */
function useFinalFrame({ seek }: SimClock, duration: number, runId: number): void {
  const isReduced = useMotionReduced();
  const durationRef = useRef(duration);
  durationRef.current = duration;
  useEffect(() => {
    if (isReduced) seek(durationRef.current);
  }, [isReduced, runId, seek]);
}

/**
 * The state of Tema 10's laboratory: k, b and m, the presses of «Interrumpir» and the clock that
 * plays the run (springScene.ts). Editing a parameter recomputes the whole run, presses included,
 * at the same clock time; a preset or «Restablecer» starts a new run from the start. A press takes
 * the clock's live time (its frame store), so two presses within a frame both count.
 */
export function useSpringRun(): SpringRunControls {
  const [state, setState] = useState<RunState>(INITIAL_STATE);
  const run = useMemo(
    () => buildRun(state.params, state.retargets),
    [state.params, state.retargets],
  );
  const clock = useSimClock(run.duration);
  useFinalFrame(clock, run.duration, state.runId);
  const { frame, reset: rewind } = clock;
  const isPlaying = clock.state.playing;
  const canInterrupt = isPlaying || clock.state.t > 0;

  const edit = useCallback((patch: Partial<SpringParams>) => {
    setState((previous) => ({
      ...previous,
      params: { ...previous.params, ...patch },
      presetId: undefined,
    }));
  }, []);
  const startRun = useCallback(
    (params: SpringParams, presetId: string) => {
      setState((previous) => ({ params, presetId, retargets: [], runId: previous.runId + 1 }));
      rewind();
    },
    [rewind],
  );
  const interrupt = useCallback(() => {
    const tStar = frame.get();
    // At t* = 0 the card has not moved: a press would only aim it at where it already is, also
    // right after «Reproducir», before the first frame.
    if (tStar === 0) return;
    setState((previous) => ({ ...previous, retargets: withRetarget(previous.retargets, tStar) }));
  }, [frame]);

  return {
    params: state.params,
    presetId: state.presetId,
    run,
    clock,
    canInterrupt,
    edit,
    choosePreset: (preset) => startRun(preset.values, preset.id),
    interrupt,
    reset: () => startRun(INITIAL_STATE.params, DEFAULT_PRESET.id),
  };
}
