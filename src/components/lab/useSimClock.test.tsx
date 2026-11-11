// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../lib/settingsStore';
import { CLOCK_SYNC_HZ, MAX_FRAME_DT_S, useSimClock } from './useSimClock';

const FRAME_MS = 16;
const REDUCED_STEP_MS = 250;
const SYNC_MS = 1000 / CLOCK_SYNC_HZ;

type ChangeListener = (event: MediaQueryListEvent) => void;

/** requestAnimationFrame on top of the fake setTimeout: one frame every `frameMs`, with a timestamp. */
function stubAnimationFrame(frameMs = FRAME_MS) {
  let now = 0;
  const request = vi.fn(
    (callback: FrameRequestCallback) =>
      setTimeout(() => {
        now += frameMs;
        callback(now);
      }, frameMs) as unknown as number,
  );
  const cancel = vi.fn((id: number) => clearTimeout(id));
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  return { request, cancel };
}

/** A controllable `prefers-reduced-motion` query. */
function stubReducedMotion(initiallyReduced: boolean) {
  const listeners = new Set<ChangeListener>();
  const query = {
    matches: initiallyReduced,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_type: 'change', listener: ChangeListener) => listeners.add(listener),
    removeEventListener: (_type: 'change', listener: ChangeListener) => listeners.delete(listener),
  };
  vi.stubGlobal('matchMedia', () => query);
  return {
    listenerCount: () => listeners.size,
    setReduced(reduced: boolean) {
      query.matches = reduced;
      listeners.forEach((listener) => listener({ matches: reduced } as MediaQueryListEvent));
    },
  };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function renderClock(duration: number) {
  return renderHook(({ d }) => useSimClock(d), { initialProps: { d: duration } });
}

describe('useSimClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    // Storage first: resetSettingsForTests reloads the in-memory state from it.
    localStorage.clear();
    resetSettingsForTests();
  });

  test('starts paused at t = 0 with the given duration', () => {
    stubAnimationFrame();

    const { result } = renderClock(1);

    expect(result.current.state).toEqual({
      t: 0,
      duration: 1,
      playing: false,
      speed: 1,
      loop: false,
    });
  });

  test('plays to the end and stops at duration after 2 s of frames', () => {
    stubAnimationFrame();
    const { result } = renderClock(1);

    act(() => result.current.play());
    advance(2000);

    expect(result.current.state.t).toBe(1);
    expect(result.current.state.playing).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('keeps playing past the end when looping', () => {
    stubAnimationFrame();
    const { result } = renderClock(1);

    act(() => result.current.setLoop(true));
    act(() => result.current.play());
    advance(2000);

    expect(result.current.state.playing).toBe(true);
    expect(result.current.state.t).toBeGreaterThanOrEqual(0);
    expect(result.current.state.t).toBeLessThan(1);
  });

  test('seek(0.5) moves to 0.5 s and pauses', () => {
    stubAnimationFrame();
    const { result } = renderClock(1);

    act(() => result.current.play());
    advance(100);
    act(() => result.current.seek(0.5));

    expect(result.current.state.t).toBe(0.5);
    expect(result.current.state.playing).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('setSpeed(2) doubles the advance', () => {
    stubAnimationFrame();
    const normal = renderClock(10);
    const fast = renderClock(10);

    act(() => fast.result.current.setSpeed(2));
    act(() => {
      normal.result.current.play();
      fast.result.current.play();
    });
    advance(400);

    expect(normal.result.current.frame.get()).toBeGreaterThan(0);
    expect(fast.result.current.frame.get()).toBeCloseTo(2 * normal.result.current.frame.get(), 10);
  });

  test('a time scale of 20 advances the simulation 20 times the real time', () => {
    stubAnimationFrame();
    const real = renderClock(1000);
    const lapse = renderHook(() => useSimClock(1000, { timeScale: 20 }));

    act(() => {
      real.result.current.play();
      lapse.result.current.play();
    });
    advance(400);

    expect(real.result.current.frame.get()).toBeGreaterThan(0);
    expect(lapse.result.current.frame.get()).toBeCloseTo(20 * real.result.current.frame.get(), 10);
  });

  test('the time scale also stops at the end without looping', () => {
    stubAnimationFrame();
    const { result } = renderHook(() => useSimClock(10, { timeScale: 20 }));

    act(() => result.current.play());
    advance(1000);

    expect(result.current.state.t).toBe(10);
    expect(result.current.state.playing).toBe(false);
  });

  test('a stalled frame advances the clock by MAX_FRAME_DT_S (250 ms), not by the stall', () => {
    stubAnimationFrame(1000);
    const { result } = renderClock(10);

    act(() => result.current.play());
    advance(2000);

    // First frame only sets the reference timestamp; the second adds min(1 s, 0,25 s).
    expect(MAX_FRAME_DT_S).toBe(0.25);
    expect(result.current.frame.get()).toBeCloseTo(0.25, 10);
    expect(result.current.state.t).toBeCloseTo(0.25, 10);
  });

  test('a slow frame advances by its real duration, so the pace never drops', () => {
    stubAnimationFrame(100);
    const { result } = renderClock(10);

    act(() => result.current.play());
    advance(1000);

    // Nine 100 ms frames after the reference one.
    expect(result.current.frame.get()).toBeCloseTo(0.9, 10);
  });

  describe('frame store', () => {
    test('advances every frame without re-rendering the owner', () => {
      stubAnimationFrame();
      let renders = 0;
      const { result } = renderHook(() => {
        renders += 1;
        return useSimClock(10);
      });

      act(() => result.current.play());
      const after = renders;
      advance(FRAME_MS * 3);

      expect(result.current.frame.get()).toBeCloseTo(0.032, 10);
      expect(renders).toBe(after);
      expect(result.current.state.t).toBe(0);
    });

    test('writes the live time into state at CLOCK_SYNC_HZ while playing', () => {
      stubAnimationFrame();
      const { result } = renderClock(10);

      act(() => result.current.play());
      advance(SYNC_MS + FRAME_MS * 2);

      expect(result.current.state.t).toBeGreaterThan(0);
      expect(result.current.state.t).toBeLessThanOrEqual(result.current.frame.get());
      expect(result.current.frame.get() - result.current.state.t).toBeLessThan(SYNC_MS / 1000);
    });

    test('pause settles state.t on the live time', () => {
      stubAnimationFrame();
      const { result } = renderClock(10);

      act(() => result.current.play());
      advance(FRAME_MS * 3);
      act(() => result.current.pause());

      expect(result.current.state.t).toBe(result.current.frame.get());
      expect(result.current.state.t).toBeCloseTo(0.032, 10);
    });

    test('seek, step and reset move the live time at once', () => {
      stubAnimationFrame();
      const { result } = renderClock(10);

      act(() => result.current.seek(4));
      expect(result.current.frame.get()).toBe(4);
      act(() => result.current.step(0.5));
      expect(result.current.frame.get()).toBe(4.5);
      act(() => result.current.reset());
      expect(result.current.frame.get()).toBe(0);
    });

    test('step while playing starts from the live time, not from the last settled one', () => {
      stubAnimationFrame();
      const { result } = renderClock(10);

      act(() => result.current.play());
      advance(FRAME_MS * 3);
      act(() => result.current.step(1));

      expect(result.current.state.t).toBeCloseTo(1.032, 10);
      expect(result.current.state.playing).toBe(false);
    });

    test('a shrinking duration clamps the live time too', () => {
      stubAnimationFrame();
      const { result, rerender } = renderClock(2);

      act(() => result.current.seek(1.5));
      rerender({ d: 1 });

      expect(result.current.frame.get()).toBe(1);
    });

    test('a frame queued before a pause runs no longer advances the live time', () => {
      // A queue whose cancel does nothing, so the frame requested before the pause still fires.
      let queue: FrameRequestCallback[] = [];
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        queue.push(callback);
        return queue.length;
      });
      vi.stubGlobal('cancelAnimationFrame', () => undefined);
      const flush = (now: number) => {
        const pending = queue;
        queue = [];
        act(() => pending.forEach((callback) => callback(now)));
      };
      const { result } = renderClock(10);

      act(() => result.current.play());
      flush(0);
      flush(16);
      const t = result.current.frame.get();
      act(() => result.current.pause());
      flush(32);

      expect(t).toBeCloseTo(0.016, 10);
      expect(result.current.frame.get()).toBe(t);
      expect(queue).toHaveLength(0);
    });

    test('keeps the same store across renders', () => {
      stubAnimationFrame();
      const { result } = renderClock(1);
      const { frame } = result.current;

      act(() => result.current.seek(0.5));

      expect(result.current.frame).toBe(frame);
    });
  });

  test('pause cancels the frame loop', () => {
    const { cancel } = stubAnimationFrame();
    const { result } = renderClock(1);

    act(() => result.current.play());
    advance(100);
    const t = result.current.frame.get();
    act(() => result.current.pause());
    advance(500);

    expect(cancel).toHaveBeenCalled();
    expect(t).toBeGreaterThan(0);
    expect(result.current.state.t).toBe(t);
    expect(result.current.frame.get()).toBe(t);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('toggle, step and reset drive the reducer', () => {
    stubAnimationFrame();
    const { result } = renderClock(1);

    act(() => result.current.toggle());
    expect(result.current.state.playing).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.state.playing).toBe(false);

    act(() => result.current.step(0.25));
    expect(result.current.state.t).toBe(0.25);
    act(() => result.current.reset());
    expect(result.current.state.t).toBe(0);
  });

  test('unmount cancels the loop without updating state afterwards', () => {
    const { cancel } = stubAnimationFrame();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result, unmount } = renderClock(1);

    act(() => result.current.play());
    advance(100);
    unmount();
    advance(1000);

    expect(cancel).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  test('clamps t when the duration prop shrinks', () => {
    stubAnimationFrame();
    const { result, rerender } = renderClock(2);

    act(() => result.current.seek(1.5));
    rerender({ d: 1 });

    expect(result.current.state.duration).toBe(1);
    expect(result.current.state.t).toBe(1);
  });

  test('keeps the same action functions across renders', () => {
    stubAnimationFrame();
    const { result } = renderClock(1);
    const { play, seek } = result.current;

    act(() => result.current.seek(0.5));

    expect(result.current.play).toBe(play);
    expect(result.current.seek).toBe(seek);
  });

  describe('rate', () => {
    test('is 1 simulated second per real second by default', () => {
      stubAnimationFrame();

      const { result } = renderClock(6);

      expect(result.current.rate).toBe(1);
    });

    test('is the time scale times the speed setting', () => {
      stubAnimationFrame();
      const { result } = renderHook(() => useSimClock(1369, { timeScale: 20 }));
      expect(result.current.rate).toBe(20);

      act(() => result.current.setSpeed(0.25));

      expect(result.current.rate).toBe(5);
    });

    test('under reduced motion it is the stepped pace: duration/60 every 250 ms, times the speed', () => {
      stubAnimationFrame();
      setSettings({ motion: 'reduced' });
      const { result } = renderHook(() => useSimClock(1369, { timeScale: 20 }));
      // 60 steps of 250 ms play the whole run in 15 s, whatever the time scale.
      expect(result.current.rate).toBeCloseTo(1369 / 15, 10);

      act(() => result.current.setSpeed(2));

      expect(result.current.rate).toBeCloseTo((2 * 1369) / 15, 10);
    });
  });

  describe('with reduced motion', () => {
    test('the settings choice advances by duration/60 every 250 ms without rAF', () => {
      const { request } = stubAnimationFrame();
      setSettings({ motion: 'reduced' });
      const { result } = renderClock(6);

      act(() => result.current.play());
      advance(REDUCED_STEP_MS);

      expect(result.current.state.t).toBeCloseTo(0.1, 10);
      expect(request).not.toHaveBeenCalled();
    });

    test('still ends exactly at duration and stops', () => {
      stubAnimationFrame();
      setSettings({ motion: 'reduced' });
      const { result } = renderClock(6);

      act(() => result.current.play());
      advance(REDUCED_STEP_MS * 61);

      expect(result.current.state.t).toBe(6);
      expect(result.current.state.playing).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });

    test('follows prefers-reduced-motion under the auto setting, live', () => {
      const { request } = stubAnimationFrame();
      const media = stubReducedMotion(true);
      const { result, unmount } = renderClock(6);

      act(() => result.current.play());
      advance(REDUCED_STEP_MS);
      expect(result.current.state.t).toBeCloseTo(0.1, 10);
      expect(request).not.toHaveBeenCalled();

      act(() => media.setReduced(false));
      advance(FRAME_MS * 3);
      expect(request).toHaveBeenCalled();

      unmount();
      expect(media.listenerCount()).toBe(0);
    });

    test('pause clears the interval', () => {
      stubAnimationFrame();
      setSettings({ motion: 'reduced' });
      const { result } = renderClock(6);

      act(() => result.current.play());
      advance(REDUCED_STEP_MS);
      act(() => result.current.pause());
      advance(REDUCED_STEP_MS * 4);

      expect(result.current.state.t).toBeCloseTo(0.1, 10);
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
