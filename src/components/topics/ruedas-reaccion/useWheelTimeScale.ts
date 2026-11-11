import type { SimClock } from '../../lab/useSimClock';
import { wheelTimeScale, type DisturbanceTimeline } from './disturbanceTimeline';

/** The factor the wheel canvas declares at the clock's settled time (see wheelTimeScale). */
export function useWheelTimeScale(
  clock: SimClock,
  isManeuver: boolean,
  warp: DisturbanceTimeline,
): number {
  return wheelTimeScale({
    isManeuver,
    warp,
    playbackTime: clock.state.t,
    clockRate: clock.rate,
  });
}
