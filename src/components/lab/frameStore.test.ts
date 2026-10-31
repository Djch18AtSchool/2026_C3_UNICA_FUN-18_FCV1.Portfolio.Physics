import { describe, expect, test, vi } from 'vitest';
import { createFrameStore } from './frameStore';

describe('createFrameStore', () => {
  test('starts at the given time, 0 by default', () => {
    expect(createFrameStore().get()).toBe(0);
    expect(createFrameStore(2.5).get()).toBe(2.5);
  });

  test('set changes the time and notifies every subscriber once', () => {
    const store = createFrameStore();
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);

    store.set(1.5);

    expect(store.get()).toBe(1.5);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  test('setting the same time again notifies nobody', () => {
    const store = createFrameStore(1);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set(1);

    expect(listener).not.toHaveBeenCalled();
  });

  test('unsubscribing stops the notifications', () => {
    const store = createFrameStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.set(3);

    expect(listener).not.toHaveBeenCalled();
  });

  test('rejects a non-finite time', () => {
    const store = createFrameStore();
    expect(() => store.set(Number.NaN)).toThrow(RangeError);
    expect(() => store.set(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
