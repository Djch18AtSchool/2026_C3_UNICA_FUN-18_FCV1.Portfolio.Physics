import { useEffect, useState, type RefObject } from 'react';
import { rateAt, type RealSpeed } from '../../lib/media';

/**
 * When the rate is checked outside the frame loop: each time update, each seek (a marker, the
 * native scrubber; `currentTime` already holds the target, so a seek lands at its instant's rate)
 * and each start.
 */
const RATE_EVENTS = ['timeupdate', 'seeking', 'play'] as const;
/** What ends a playback, and with it the frame loop. */
const STOP_EVENTS = ['pause', 'ended'] as const;
const NORMAL_RATE = 1;

export interface RealSpeedToggle {
  isOn: boolean;
  toggle(): void;
}

interface FrameClock {
  request(callback: () => void): number;
  cancel(id: number): void;
}

/** Writes the rate only when it changes, so the medium fires no `ratechange` on every update. */
function setRate(media: HTMLMediaElement, rate: number): void {
  if (media.playbackRate !== rate) media.playbackRate = rate;
}

/**
 * A video's own frames where the browser offers them (requestVideoFrameCallback, each new frame
 * the compositor gets), else the display's (requestAnimationFrame): an audio, or an older browser.
 */
function frameClock(media: HTMLMediaElement): FrameClock {
  if (media instanceof HTMLVideoElement && typeof media.requestVideoFrameCallback === 'function') {
    return {
      request: (callback) => media.requestVideoFrameCallback(callback),
      cancel: (id) => media.cancelVideoFrameCallback(id),
    };
  }
  return {
    request: (callback) => window.requestAnimationFrame(callback),
    cancel: (id) => window.cancelAnimationFrame(id),
  };
}

/**
 * Checks the rate on every frame while the medium plays, so a range boundary changes it within
 * one frame (a time update comes only every 15 to 250 ms). Returns how to stop it.
 */
function runFrameLoop(media: HTMLMediaElement, apply: () => void): () => void {
  const clock = frameClock(media);
  let frame: number | undefined;
  const tick = () => {
    apply();
    frame = clock.request(tick);
  };
  const start = () => {
    if (frame === undefined) frame = clock.request(tick);
  };
  const stop = () => {
    if (frame !== undefined) clock.cancel(frame);
    frame = undefined;
  };
  media.addEventListener('play', start);
  STOP_EVENTS.forEach((type) => media.addEventListener(type, stop));
  if (!media.paused) start();
  return () => {
    stop();
    media.removeEventListener('play', start);
    STOP_EVENTS.forEach((type) => media.removeEventListener(type, stop));
  };
}

/**
 * The «Velocidad real» toggle of a hosted medium: off at first; while on, the medium plays at
 * `rateAt` (the real-speed rate inside its ranges, 1× elsewhere), checked on every frame while it
 * plays and on every seek; off again, it is back at 1×. While off it never touches the rate, so a
 * speed the reader picked in the native controls stays. Without `realSpeed` it does nothing.
 */
export function useRealSpeed(
  mediaRef: RefObject<HTMLMediaElement | null>,
  realSpeed: RealSpeed | undefined,
): RealSpeedToggle {
  const [isOn, setIsOn] = useState(false);

  useEffect(() => {
    const media = mediaRef.current;
    if (!isOn || !media || !realSpeed) return undefined;
    const apply = () => setRate(media, rateAt(media.currentTime, realSpeed, true));
    apply();
    RATE_EVENTS.forEach((type) => media.addEventListener(type, apply));
    const stopFrames = runFrameLoop(media, apply);
    return () => {
      stopFrames();
      RATE_EVENTS.forEach((type) => media.removeEventListener(type, apply));
      setRate(media, NORMAL_RATE);
    };
  }, [mediaRef, realSpeed, isOn]);

  return { isOn, toggle: () => setIsOn((wasOn) => !wasOn) };
}
