// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { RealSpeed } from '../../lib/media';
import { useRealSpeed } from './useRealSpeed';

const REAL_SPEED: RealSpeed = {
  label: 'Velocidad real (×2/3)',
  rate: 2 / 3,
  ranges: [
    [2, 9.6],
    [20, 30],
  ],
};

/** Tema 12's shots: Elliott's at 16 fps, then the collapse at 24 fps from 115,8 s. */
const SHOTS: RealSpeed = {
  ...REAL_SPEED,
  ranges: [
    [2, 42.8],
    [46.1, 115.8],
  ],
};

/** A video element and the hook on it; `null` stands for a medium without a real speed. */
function setup(realSpeed: RealSpeed | null = REAL_SPEED) {
  const media = document.createElement('video');
  const mediaRef = { current: media };
  const hook = renderHook(() => useRealSpeed(mediaRef, realSpeed ?? undefined));
  return { media, hook };
}

/** The browser moves the playback position and reports it with `event`, as it does while playing. */
function reach(media: HTMLMediaElement, time: number, event = 'timeupdate'): void {
  media.currentTime = time;
  act(() => {
    media.dispatchEvent(new Event(event));
  });
}

/**
 * A stand-in for the browser's frame clock: requestAnimationFrame queues its callback, and
 * `runFrame` runs the frame that is due, as the browser does before painting.
 */
function stubFrames() {
  const due = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    due.set(nextId, callback);
    return nextId++;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    due.delete(id);
  });
  return {
    pending: () => due.size,
    runFrame() {
      const callbacks = [...due.values()];
      due.clear();
      callbacks.forEach((callback) => callback(performance.now()));
    },
  };
}

/** jsdom never plays: `paused` follows these calls, and each fires its event, as in a browser. */
function emulatePlayState(media: HTMLMediaElement) {
  let isPaused = true;
  Object.defineProperty(media, 'paused', { configurable: true, get: () => isPaused });
  const set = (paused: boolean, event: string) => {
    isPaused = paused;
    act(() => {
      media.dispatchEvent(new Event(event));
    });
  };
  return {
    play: () => set(false, 'play'),
    pause: () => set(true, 'pause'),
    end: () => set(true, 'ended'),
  };
}

describe('useRealSpeed', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('starts off, and the medium plays at 1× inside a range too', () => {
    const { media, hook } = setup();

    reach(media, 5);

    expect(hook.result.current.isOn).toBe(false);
    expect(media.playbackRate).toBe(1);
  });

  test('on, the rate follows the declared ranges as the playback reports its time', () => {
    const { media, hook } = setup();
    act(() => hook.result.current.toggle());

    reach(media, 5);
    expect(media.playbackRate).toBe(2 / 3);
    reach(media, 12);
    expect(media.playbackRate).toBe(1);
    reach(media, 25);
    expect(media.playbackRate).toBe(2 / 3);
    reach(media, 30);
    expect(media.playbackRate).toBe(1);
  });

  test('on, a seek lands at the rate of its instant, before any time update', () => {
    const { media, hook } = setup();
    act(() => hook.result.current.toggle());

    reach(media, 25, 'seeking');
    expect(media.playbackRate).toBe(2 / 3);
    reach(media, 40, 'seeking');
    expect(media.playbackRate).toBe(1);
  });

  test('turned on inside a range it slows down at once; off, it is back at 1× and stays there', () => {
    const { media, hook } = setup();
    media.currentTime = 5;

    act(() => hook.result.current.toggle());
    expect(hook.result.current.isOn).toBe(true);
    expect(media.playbackRate).toBe(2 / 3);

    act(() => hook.result.current.toggle());
    expect(hook.result.current.isOn).toBe(false);
    expect(media.playbackRate).toBe(1);
    reach(media, 6);
    expect(media.playbackRate).toBe(1);
  });

  test('off, a rate the reader chose in the native controls is left alone', () => {
    const { media } = setup();
    media.playbackRate = 1.5;

    reach(media, 5);
    reach(media, 25, 'seeking');

    expect(media.playbackRate).toBe(1.5);
  });

  test('a playback restarted inside a range is slowed down when it starts', () => {
    const { media, hook } = setup();
    act(() => hook.result.current.toggle());
    reach(media, 40);
    media.currentTime = 3;

    act(() => {
      media.dispatchEvent(new Event('play'));
    });

    expect(media.playbackRate).toBe(2 / 3);
  });

  test('without a real speed the toggle changes nothing', () => {
    const { media, hook } = setup(null);
    act(() => hook.result.current.toggle());

    reach(media, 5);

    expect(media.playbackRate).toBe(1);
  });

  test('unmounted, it stops listening to the medium', () => {
    const { media, hook } = setup();
    act(() => hook.result.current.toggle());
    hook.unmount();

    reach(media, 5);

    expect(media.playbackRate).toBe(1);
  });

  describe('while playing, every frame', () => {
    test('playing from 115,6 s at 2/3, the rate is 1 within one frame of 115,8 s, with no time update', () => {
      const frames = stubFrames();
      const { media, hook } = setup(SHOTS);
      const playback = emulatePlayState(media);
      act(() => hook.result.current.toggle());
      media.currentTime = 115.6;

      playback.play();
      expect(media.playbackRate).toBe(2 / 3);
      media.currentTime = 115.79;
      frames.runFrame();
      expect(media.playbackRate).toBe(2 / 3);
      media.currentTime = 115.81;
      frames.runFrame();

      expect(media.playbackRate).toBe(1);
      expect(frames.pending()).toBe(1);
    });

    test('entering a shot slows down within one frame too', () => {
      const frames = stubFrames();
      const { media, hook } = setup(SHOTS);
      const playback = emulatePlayState(media);
      act(() => hook.result.current.toggle());
      media.currentTime = 45.9;
      playback.play();
      expect(media.playbackRate).toBe(1);

      media.currentTime = 46.11;
      frames.runFrame();

      expect(media.playbackRate).toBe(2 / 3);
    });

    test('switched on while the video already plays, the loop starts at once', () => {
      const frames = stubFrames();
      const { media, hook } = setup(SHOTS);
      emulatePlayState(media).play();
      expect(frames.pending()).toBe(0);

      act(() => hook.result.current.toggle());

      expect(frames.pending()).toBe(1);
    });

    test('the loop stops on pause and on the end, and starts again with play', () => {
      const frames = stubFrames();
      const { media, hook } = setup(SHOTS);
      const playback = emulatePlayState(media);
      act(() => hook.result.current.toggle());

      playback.play();
      playback.pause();
      expect(frames.pending()).toBe(0);
      playback.play();
      expect(frames.pending()).toBe(1);
      playback.end();
      expect(frames.pending()).toBe(0);
    });

    test('the loop stops when the toggle goes off and on unmount', () => {
      const frames = stubFrames();
      const { media, hook } = setup(SHOTS);
      const playback = emulatePlayState(media);
      act(() => hook.result.current.toggle());
      playback.play();

      act(() => hook.result.current.toggle());
      expect(frames.pending()).toBe(0);
      act(() => hook.result.current.toggle());
      expect(frames.pending()).toBe(1);
      hook.unmount();

      expect(frames.pending()).toBe(0);
    });

    test('off, nothing runs while the video plays', () => {
      const frames = stubFrames();
      const { media } = setup(SHOTS);

      emulatePlayState(media).play();

      expect(frames.pending()).toBe(0);
    });

    test('a video with requestVideoFrameCallback is checked on each new frame instead', () => {
      const frames = stubFrames();
      const { media, hook } = setup(SHOTS);
      const video = media as HTMLVideoElement;
      const due = new Map<number, VideoFrameRequestCallback>();
      let nextId = 1;
      video.requestVideoFrameCallback = (callback) => {
        due.set(nextId, callback);
        return nextId++;
      };
      video.cancelVideoFrameCallback = (id) => {
        due.delete(id);
      };
      const playback = emulatePlayState(media);
      act(() => hook.result.current.toggle());
      media.currentTime = 115.6;
      playback.play();

      media.currentTime = 115.81;
      const [callback] = due.values();
      due.clear();
      callback(performance.now(), {} as VideoFrameCallbackMetadata);

      expect(media.playbackRate).toBe(1);
      expect(frames.pending()).toBe(0);
      expect(due.size).toBe(1);
      playback.pause();
      expect(due.size).toBe(0);
    });
  });
});
