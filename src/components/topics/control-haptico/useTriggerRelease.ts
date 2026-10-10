import { useCallback, useEffect, useRef, useState } from 'react';
import type { OscillatorParams } from '../../../lib/physics';
import { advanceRelease, startRelease, toMillimetres } from './triggerScene';

const MS_PER_S = 1000;

export interface TriggerReleaseOptions {
  /** The oscillator the lever returns with; read on every frame, so edits apply mid-release. */
  params: OscillatorParams;
  /** Reduced motion: a release jumps straight to rest, with no animation. */
  isReduced: boolean;
  /** The lever's travel (mm) after each frame of the release. */
  onPosition(xMm: number): void;
}

export interface TriggerRelease {
  /** Lets the lever go from x (mm), still; it returns to rest on animation frames. */
  start(xMm: number): void;
  /** Stops a release where it is (a new press, a reset). */
  cancel(): void;
  isReleasing: boolean;
}

/**
 * The trigger's release on requestAnimationFrame: each frame advances the kernel's damped spring
 * by the real elapsed time in fixed steps (advanceRelease) until it is at rest or 3 s have passed.
 * Under reduced motion the lever goes to x = 0 at once. Unmounting stops the loop.
 */
export function useTriggerRelease({
  params,
  isReduced,
  onPosition,
}: TriggerReleaseOptions): TriggerRelease {
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;
  const isReducedRef = useRef(isReduced);
  isReducedRef.current = isReduced;
  const frameRef = useRef<number | undefined>(undefined);
  const [isReleasing, setIsReleasing] = useState(false);

  const cancel = useCallback(() => {
    if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    frameRef.current = undefined;
    setIsReleasing(false);
  }, []);

  const start = useCallback(
    (xMm: number) => {
      cancel();
      if (isReducedRef.current) {
        onPositionRef.current(0);
        return;
      }
      let release = startRelease(xMm);
      let last: number | undefined;
      const onFrame = (now: number) => {
        const frameSeconds = last === undefined ? 0 : (now - last) / MS_PER_S;
        last = now;
        release = advanceRelease(release, frameSeconds, paramsRef.current);
        onPositionRef.current(toMillimetres(release.state.x));
        if (release.isDone) {
          frameRef.current = undefined;
          setIsReleasing(false);
        } else {
          frameRef.current = requestAnimationFrame(onFrame);
        }
      };
      setIsReleasing(true);
      frameRef.current = requestAnimationFrame(onFrame);
    },
    [cancel],
  );

  useEffect(
    () => () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return { start, cancel, isReleasing };
}
