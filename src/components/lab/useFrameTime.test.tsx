// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createFrameStore } from './frameStore';
import {
  frameOf,
  useFrameDerived,
  useFrameEffect,
  useFrameTime,
  useOptionalFrameTime,
} from './useFrameTime';

describe('frameOf', () => {
  test('accepts a store or anything that carries one as `frame`', () => {
    const frame = createFrameStore(1);
    expect(frameOf(frame)).toBe(frame);
    expect(frameOf({ frame })).toBe(frame);
  });
});

describe('useFrameTime', () => {
  afterEach(cleanup);

  test('returns the live time and re-renders on every change', () => {
    const frame = createFrameStore(0.5);
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useFrameTime(frame);
    });
    expect(result.current).toBe(0.5);
    const before = renders;

    act(() => frame.set(0.75));

    expect(result.current).toBe(0.75);
    expect(renders).toBe(before + 1);
  });

  test('follows an object that carries the store', () => {
    const frame = createFrameStore(2);
    const { result } = renderHook(() => useFrameTime({ frame }));

    act(() => frame.set(3));

    expect(result.current).toBe(3);
  });
});

describe('useFrameDerived', () => {
  afterEach(cleanup);

  test('derives from the live time on every change', () => {
    const frame = createFrameStore(1);
    const { result } = renderHook(() => useFrameDerived(frame, (t) => ({ doubled: 2 * t })));
    expect(result.current).toEqual({ doubled: 2 });

    act(() => frame.set(3));

    expect(result.current).toEqual({ doubled: 6 });
  });
});

describe('useOptionalFrameTime', () => {
  afterEach(cleanup);

  test('returns the fallback without a store and the live time with one', () => {
    const frame = createFrameStore(4);
    const without = renderHook(() => useOptionalFrameTime(undefined, 7));
    const withStore = renderHook(() => useOptionalFrameTime(frame, 7));

    act(() => frame.set(5));

    expect(without.result.current).toBe(7);
    expect(withStore.result.current).toBe(5);
  });
});

describe('useFrameEffect', () => {
  afterEach(cleanup);

  test('runs on mount with the live time, then on every change, without re-rendering', () => {
    const frame = createFrameStore(1);
    const effect = vi.fn();
    let renders = 0;
    renderHook(() => {
      renders += 1;
      useFrameEffect(frame, effect, []);
    });
    expect(effect).toHaveBeenCalledWith(1);
    const before = renders;

    act(() => frame.set(2));

    expect(effect).toHaveBeenLastCalledWith(2);
    expect(effect).toHaveBeenCalledTimes(2);
    expect(renders).toBe(before);
  });

  test('re-runs when a dependency changes and stops after unmount', () => {
    const frame = createFrameStore(1);
    const effect = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ scale }: { scale: number }) => useFrameEffect(frame, (t) => effect(t * scale), [scale]),
      { initialProps: { scale: 1 } },
    );

    rerender({ scale: 10 });
    expect(effect).toHaveBeenLastCalledWith(10);

    unmount();
    act(() => frame.set(3));
    expect(effect).toHaveBeenCalledTimes(2);
  });
});
