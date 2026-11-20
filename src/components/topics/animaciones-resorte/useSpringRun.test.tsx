// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { SPRING_LAB_PRESETS } from './springLabPresets';
import { MARKS, springAt } from './springScene';
import { useSpringRun } from './useSpringRun';

const FRAME_MS = 16;

/** requestAnimationFrame on the fake setTimeout: one frame every 16 ms, with its timestamp. */
function stubAnimationFrame(): void {
  let now = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => {
      now += FRAME_MS;
      callback(now);
    }, FRAME_MS),
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
}

const preset = (id: string) => {
  const found = SPRING_LAB_PRESETS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no preset ${id}`);
  return found;
};

describe('useSpringRun', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubAnimationFrame();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('opens on Motion’s default, paused at the start, with nothing to interrupt yet', () => {
    const { result } = renderHook(() => useSpringRun());

    expect(result.current.params).toEqual({ k: 100, b: 10, m: 1 });
    expect(result.current.presetId).toBe('motion-defecto');
    expect(result.current.run.retargets).toEqual([]);
    expect(result.current.clock.state).toMatchObject({ t: 0, duration: 3, playing: false });
    expect(result.current.canInterrupt).toBe(false);
  });

  test('«Interrumpir» at the paused clock time records t* and keeps the clock there', () => {
    const { result } = renderHook(() => useSpringRun());
    act(() => result.current.clock.seek(0.2));

    act(() => result.current.interrupt());

    expect(result.current.canInterrupt).toBe(true);
    expect(result.current.run.retargets).toEqual([0.2]);
    expect(result.current.clock.state.t).toBe(0.2);
    expect(springAt(result.current.run, 0.2).target).toBe(MARKS.from);
  });

  test('Review Focus 4: two presses before React renders both count, at the same instant', () => {
    const { result } = renderHook(() => useSpringRun());
    act(() => result.current.clock.seek(0.2));

    act(() => {
      result.current.interrupt();
      result.current.interrupt();
    });

    expect(result.current.run.retargets).toEqual([0.2, 0.2]);
    expect(springAt(result.current.run, 0.3).target).toBe(MARKS.to);
  });

  test('while playing, the press takes the live time of the frame, not the 10 Hz one', () => {
    const { result } = renderHook(() => useSpringRun());
    act(() => result.current.clock.play());
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 5);
    });
    const live = result.current.clock.frame.get();

    act(() => result.current.interrupt());

    expect(live).toBeGreaterThan(0);
    expect(result.current.run.retargets).toEqual([live]);
    expect(result.current.clock.state.playing).toBe(true);
  });

  test('a press at the start, paused, does nothing: there is no motion to interrupt', () => {
    const { result } = renderHook(() => useSpringRun());

    act(() => result.current.interrupt());

    expect(result.current.run.retargets).toEqual([]);
  });

  test('editing k, b or m leaves the preset and keeps the presses and the time', () => {
    const { result } = renderHook(() => useSpringRun());
    act(() => result.current.clock.seek(0.2));
    act(() => result.current.interrupt());

    act(() => result.current.edit({ b: 0 }));

    expect(result.current.params).toEqual({ k: 100, b: 0, m: 1 });
    expect(result.current.presetId).toBeUndefined();
    expect(result.current.run.retargets).toEqual([0.2]);
    expect(result.current.run.params.b).toBe(0);
    expect(result.current.clock.state.t).toBe(0.2);
  });

  test('a preset starts a new run from the start; «Restablecer» returns to Motion’s default', () => {
    const { result } = renderHook(() => useSpringRun());
    act(() => result.current.clock.seek(0.2));
    act(() => result.current.interrupt());

    act(() => result.current.choosePreset(preset('sobreamortiguado')));

    expect(result.current.params).toEqual({ k: 100, b: 40, m: 1 });
    expect(result.current.presetId).toBe('sobreamortiguado');
    expect(result.current.run.retargets).toEqual([]);
    expect(result.current.clock.state.t).toBe(0);

    act(() => result.current.edit({ k: 200 }));
    act(() => result.current.reset());

    expect(result.current.params).toEqual({ k: 100, b: 10, m: 1 });
    expect(result.current.presetId).toBe('motion-defecto');
    expect(result.current.clock.state.t).toBe(0);
  });

  test('with reduced motion the clock shows the final frame, also after a new preset', () => {
    setSettings({ motion: 'reduced' });
    const { result } = renderHook(() => useSpringRun());

    expect(result.current.clock.state.t).toBe(result.current.run.duration);

    act(() => result.current.choosePreset(preset('apple-ejemplo')));

    expect(result.current.clock.state.t).toBe(result.current.run.duration);
    expect(springAt(result.current.run, result.current.clock.state.t).x).toBeCloseTo(MARKS.to, 1);
  });
});
