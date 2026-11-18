import { useEffect, useState, type RefObject } from 'react';
import { rateAt, type RealSpeed } from '../../lib/media';

/**
 * When the rate is checked again: each time update while playing (every 15 to 250 ms), each seek
 * (a marker, the native scrubber; `currentTime` already holds the target) and each start.
 */
const RATE_EVENTS = ['timeupdate', 'seeking', 'play'] as const;
const NORMAL_RATE = 1;

export interface RealSpeedToggle {
  isOn: boolean;
  toggle(): void;
}

/** Writes the rate only when it changes, so the medium fires no `ratechange` on every update. */
function setRate(media: HTMLMediaElement, rate: number): void {
  if (media.playbackRate !== rate) media.playbackRate = rate;
}

/**
 * The «Velocidad real» toggle of a hosted medium: off at first; while on, the medium plays at
 * `rateAt` (the real-speed rate inside its ranges, 1× elsewhere), checked again as the playback
 * moves; off again, it is back at 1×. While off it never touches the rate, so a speed the reader
 * picked in the native controls stays. Without `realSpeed` it does nothing.
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
    return () => {
      RATE_EVENTS.forEach((type) => media.removeEventListener(type, apply));
      setRate(media, NORMAL_RATE);
    };
  }, [mediaRef, realSpeed, isOn]);

  return { isOn, toggle: () => setIsOn((wasOn) => !wasOn) };
}
