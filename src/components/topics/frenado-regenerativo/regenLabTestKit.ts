/** What Tema 6's lab tests share: the animation-frame queue they drive playback with. */
import { act } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Replaces requestAnimationFrame with a queue the test flushes at chosen timestamps (ms);
 * cancelAnimationFrame removes a queued frame, as the browser does.
 */
export function installFrameQueue() {
  let queue = new Map<number, FrameRequestCallback>();
  let nextId = 0;
  const request = vi.fn((callback: FrameRequestCallback) => {
    nextId += 1;
    queue.set(nextId, callback);
    return nextId;
  });
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => queue.delete(id));
  return {
    request,
    flush(now: number) {
      const pending = [...queue.values()];
      queue = new Map();
      act(() => pending.forEach((callback) => callback(now)));
    },
    get pending() {
      return queue.size;
    },
  };
}
