// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../lib/settingsStore';
import { useSimClock } from './useSimClock';

const FRAME_MS = 16;
const REDUCED_STEP_MS = 250;

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

    expect(normal.result.current.state.t).toBeGreaterThan(0);
    expect(fast.result.current.state.t).toBeCloseTo(2 * normal.result.current.state.t, 10);
  });

  test('caps the real dt of a frame at 50 ms', () => {
    stubAnimationFrame(1000);
    const { result } = renderClock(10);

    act(() => result.current.play());
    advance(2000);

    // First frame only sets the reference timestamp; the second adds min(1 s, 50 ms).
    expect(result.current.state.t).toBeCloseTo(0.05, 10);
  });

  test('pause cancels the frame loop', () => {
    const { cancel } = stubAnimationFrame();
    const { result } = renderClock(1);

    act(() => result.current.play());
    advance(100);
    const t = result.current.state.t;
    act(() => result.current.pause());
    advance(500);

    expect(cancel).toHaveBeenCalled();
    expect(result.current.state.t).toBe(t);
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
