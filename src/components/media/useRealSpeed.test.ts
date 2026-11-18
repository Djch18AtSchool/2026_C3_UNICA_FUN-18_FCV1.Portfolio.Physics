// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
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

describe('useRealSpeed', () => {
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
});
