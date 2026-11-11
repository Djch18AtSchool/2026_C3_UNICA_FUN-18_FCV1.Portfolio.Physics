/**
 * «Conducir» on the lab's shared clock. The clock plays the course at real time; on every frame the
 * run is driven on to the live time with the pedals held (a frame listener, no React render), and
 * the moving layers read it through liveAt. React renders at the clock's 10 Hz sync and on discrete
 * changes only (a new run, another car or model, a run cut to drive on from an earlier instant).
 *
 * The clock the lab hands to its transport is wrapped: a seek never passes the recorded end (there
 * is nothing driven there to show), and play cuts the run at the instant it resumes from (or starts
 * a new one at the end). A pedal pressed while paused plays. Pausing (or the end) releases the
 * pedals and says a summary; a limit met while driving is said once per run.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DriveState } from '../../../lib/physics/regenDrive';
import type { SimClock } from '../../lab/useSimClock';
import {
  DRIVE_STEP_S,
  extendRun,
  newRun,
  resimulateRun,
  runEnd,
  stateAt,
  stepAt,
  truncateRun,
  type DriveCourse,
  type DriveModel,
  type DriveRun,
} from './driveRun';
import { noticeOf, type DriveNotice } from './driveText';
import {
  heldOf,
  NO_PEDALS,
  pressPedal,
  releasePedal,
  type PedalId,
  type PedalSource,
} from './pedalInput';

/** What the drive's status line says: the hint, a limit met, the summary at a pause, or nothing. */
export type DriveMessage =
  | { kind: 'hint' }
  | { kind: 'notice'; notice: DriveNotice }
  | { kind: 'summary'; t: number }
  | { kind: 'none' };

const HINT: DriveMessage = { kind: 'hint' };
const QUIET: DriveMessage = { kind: 'none' };
/** An instant within half a step of the recorded end is at the end. */
const HALF_STEP_S = DRIVE_STEP_S / 2;
const NO_NOTICES: ReadonlySet<DriveNotice> = new Set();

export interface DriveSessionInput {
  isActive: boolean;
  course: DriveCourse;
  /** Memoised by the caller: a new object recomputes the run from its pedals. */
  model: DriveModel;
  clock: SimClock;
}

export interface DriveSession {
  /** The clock for the transport and the settings: seek clamped, play cuts the run. */
  clock: SimClock;
  /** The run's state at the clock's settled time (readouts, flows, bars). */
  settled: DriveState;
  /** The run's state at any live time, driven on with the pedals held if not recorded yet. */
  liveAt(t: number): DriveState;
  /** The run as of this render (the speed trace). */
  run: DriveRun;
  message: DriveMessage;
  press(pedal: PedalId, source: PedalSource): void;
  release(pedal: PedalId, source: PedalSource): void;
  releaseAll(): void;
}

/** The run and the notices already said, in refs; `replace` re-renders only when told to. */
function useRunStore(course: DriveCourse, model: DriveModel) {
  const runRef = useRef<DriveRun>(newRun(course));
  const saidRef = useRef(NO_NOTICES);
  const [, setVersion] = useState(0);
  const replace = useCallback((next: DriveRun) => {
    if (stepAt(runEnd(next)) === 0) saidRef.current = NO_NOTICES;
    runRef.current = next;
    setVersion((version) => version + 1);
  }, []);
  const seen = useRef({ course, model });
  useEffect(() => {
    if (seen.current.course !== course) replace(newRun(course));
    else if (seen.current.model !== model) replace(resimulateRun(runRef.current, course, model));
    seen.current = { course, model };
  }, [course, model, replace]);
  return { runRef, saidRef, replace };
}

type RunStore = ReturnType<typeof useRunStore>;

/**
 * On every change of the live time past the recording, the run is driven on with the pedals held;
 * a limit met for the first time in the run becomes the message.
 */
function useFrameDrive(
  { isActive, clock }: Pick<DriveSessionInput, 'isActive' | 'clock'>,
  store: RunStore,
  latest: {
    current: { course: DriveCourse; model: DriveModel; held: () => ReturnType<typeof heldOf> };
  },
  say: (message: DriveMessage) => void,
) {
  const { frame } = clock;
  const { runRef, saidRef } = store;
  useEffect(() => {
    if (!isActive) return;
    const onFrame = () => {
      const t = frame.get();
      const run = runRef.current;
      if (!(t > runEnd(run) + HALF_STEP_S)) return;
      const { course, model, held } = latest.current;
      const next = extendRun(run, t, held(), course, model);
      runRef.current = next;
      const met = next.states.slice(run.states.length).map(noticeOf);
      const fresh = met.find(
        (kind): kind is DriveNotice => kind !== null && !saidRef.current.has(kind),
      );
      if (!fresh) return;
      saidRef.current = new Set([...saidRef.current, fresh]);
      say({ kind: 'notice', notice: fresh });
    };
    return frame.subscribe(onFrame);
  }, [isActive, frame, runRef, saidRef, latest, say]);
}

/**
 * Playing starts clean (no message); pausing or the end releases the pedals and says the summary;
 * back at t = 0 the hint returns; a loop that wraps starts a new run.
 */
function usePlaybackMessages(
  { isActive, clock }: Pick<DriveSessionInput, 'isActive' | 'clock'>,
  store: RunStore,
  say: (message: DriveMessage) => void,
  releaseAll: () => void,
) {
  const { playing, t } = clock.state;
  const previous = useRef({ playing, t });
  const { frame } = clock;
  const { runRef, replace } = store;
  useEffect(() => {
    const before = previous.current;
    previous.current = { playing, t };
    if (!isActive) return;
    if (playing && before.playing && t < before.t) replace(truncateRun(runRef.current, 0));
    if (playing === before.playing) {
      if (!playing && t === 0) say(HINT);
      return;
    }
    if (playing) {
      say(QUIET);
      return;
    }
    releaseAll();
    say(t === 0 ? HINT : { kind: 'summary', t: frame.get() });
  }, [isActive, playing, t, frame, runRef, replace, say, releaseAll]);
}

/** The pedals let go when the page or the window loses the focus, or the view goes. */
function useReleaseOnLeave(isActive: boolean, releaseAll: () => void) {
  useEffect(() => {
    if (!isActive) return;
    const onHidden = () => {
      if (document.visibilityState === 'hidden') releaseAll();
    };
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      releaseAll();
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [isActive, releaseAll]);
}

/** Play from the live time (or a new run at the end), cutting what was driven after it. */
function useDriveClock(clock: SimClock, store: RunStore): SimClock {
  const { runRef, replace } = store;
  return useMemo(() => {
    const play = () => {
      const isAtEnd = clock.state.t >= clock.state.duration;
      const cut = truncateRun(runRef.current, isAtEnd ? 0 : clock.frame.get());
      if (cut !== runRef.current) replace(cut);
      clock.play();
    };
    return {
      ...clock,
      play,
      toggle: () => (clock.state.playing ? clock.pause() : play()),
      seek: (t: number) => clock.seek(Math.min(t, runEnd(runRef.current))),
    };
  }, [clock, runRef, replace]);
}

/** The drive of «Conducir»: its run, its clock, its pedals and its status line. */
export function useDriveSession(input: DriveSessionInput): DriveSession {
  const { isActive, course, model, clock } = input;
  const store = useRunStore(course, model);
  const sourcesRef = useRef(NO_PEDALS);
  const [message, setMessage] = useState<DriveMessage>(HINT);
  const latest = useRef({ course, model, held: () => heldOf(sourcesRef.current) });
  latest.current = { ...latest.current, course, model };
  const releaseAll = useCallback(() => {
    sourcesRef.current = NO_PEDALS;
  }, []);
  const driveClock = useDriveClock(clock, store);
  useFrameDrive(input, store, latest, setMessage);
  usePlaybackMessages(input, store, setMessage, releaseAll);
  useReleaseOnLeave(isActive, releaseAll);
  const press = (pedal: PedalId, source: PedalSource) => {
    sourcesRef.current = pressPedal(sourcesRef.current, pedal, source);
    const isBeforeEnd = clock.frame.get() < clock.state.duration;
    if (!clock.state.playing && isBeforeEnd) driveClock.play();
  };
  const release = (pedal: PedalId, source: PedalSource) => {
    sourcesRef.current = releasePedal(sourcesRef.current, pedal, source);
  };
  const run = store.runRef.current;
  // Read at call time: the frame listener has usually driven the run to t already (no copy then).
  const liveAt = (t: number) =>
    stateAt(extendRun(store.runRef.current, t, heldOf(sourcesRef.current), course, model), t);
  return {
    clock: isActive ? driveClock : clock,
    settled: stateAt(run, clock.state.t),
    liveAt,
    run,
    message,
    press,
    release,
    releaseAll,
  };
}
