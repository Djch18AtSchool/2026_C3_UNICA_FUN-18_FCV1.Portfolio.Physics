/**
 * The disturbance mode's playback clock. Its days run at DAY_LAPSE, but a dump lasts minutes
 * (magnetorquer) or seconds (thruster): at 7200 s of orbit per second one frame would jump over a
 * 5 s dump. So the playback time u (s) maps onto the orbit time t (s) piecewise: fills at
 * DAY_LAPSE, and each dump stretched to MIN_DUMP_PLAYBACK s of screen at 1×, stated on the page.
 */
import {
  DAY_LAPSE,
  disturbanceReadings,
  dumpingParams,
  sawtoothCorners,
  type DumpActuator,
} from './wheelLabModel';

/** Seconds of playback (at 1×) every dump takes on screen, however short it is in orbit. */
export const MIN_DUMP_PLAYBACK = 2;

/** One linear piece: orbit times [t0, t1] (s) played over [u0, u1] (s). */
export interface TimelineSegment {
  t0: number;
  t1: number;
  u0: number;
  u1: number;
  dumping: boolean;
}

export interface DisturbanceTimeline {
  segments: readonly TimelineSegment[];
  /** Total playback time at 1× (s): the clock's duration. */
  duration: number;
}

/** The three days split at every corner of the sawtooth, fills at DAY_LAPSE, dumps stretched. */
export function disturbanceTimeline(actuator: DumpActuator): DisturbanceTimeline {
  const corners = sawtoothCorners(dumpingParams(actuator));
  const segments = corners.slice(1).reduce<TimelineSegment[]>((built, t1, i) => {
    const t0 = corners[i];
    const u0 = built.length === 0 ? 0 : built[built.length - 1].u1;
    const dumping = disturbanceReadings(actuator, (t0 + t1) / 2).dumping;
    const rate = dumping ? Math.min(DAY_LAPSE, (t1 - t0) / MIN_DUMP_PLAYBACK) : DAY_LAPSE;
    return [...built, { t0, t1, u0, u1: u0 + (t1 - t0) / rate, dumping }];
  }, []);
  return { segments, duration: segments[segments.length - 1].u1 };
}

const lerp = (from: [number, number], to: [number, number], value: number) =>
  to[0] + ((value - from[0]) / (from[1] - from[0])) * (to[1] - to[0]);

/** Orbit time (s) at playback time u (s), clamped to the three days. */
export function orbitTimeAt({ segments }: DisturbanceTimeline, u: number): number {
  const segment = segments.find((s) => u <= s.u1) ?? segments[segments.length - 1];
  const clamped = Math.min(Math.max(u, segment.u0), segment.u1);
  return lerp([segment.u0, segment.u1], [segment.t0, segment.t1], clamped);
}

/** Playback time (s) at orbit time t (s), clamped to the clock's range. */
export function playbackTimeAt({ segments }: DisturbanceTimeline, t: number): number {
  const segment = segments.find((s) => t <= s.t1) ?? segments[segments.length - 1];
  const clamped = Math.min(Math.max(t, segment.t0), segment.t1);
  return lerp([segment.t0, segment.t1], [segment.u0, segment.u1], clamped);
}

/** Playback time (s) at the middle of the first dump, for the "Ir a la descarga" button. */
export function firstDumpPlayback({ segments }: DisturbanceTimeline): number {
  const dump = segments.find((s) => s.dumping) ?? segments[0];
  return (dump.u0 + dump.u1) / 2;
}

/** Orbit seconds per playback second at playback time u: DAY_LAPSE on a fill, less on a dump. */
export function playbackRateAt({ segments }: DisturbanceTimeline, u: number): number {
  const segment = segments.find((s) => u <= s.u1) ?? segments[segments.length - 1];
  return (segment.t1 - segment.t0) / (segment.u1 - segment.u0);
}

export interface WheelTimeScaleInput {
  isManeuver: boolean;
  warp: DisturbanceTimeline;
  /** The clock's settled time: playback seconds in the disturbance, maneuver seconds in the turn. */
  playbackTime: number;
  /** SimClock.rate: playback seconds per real second (the speed, or the reduced-motion pace). */
  clockRate: number;
}

/**
 * The factor the canvas declares, in orbit (or maneuver) seconds per real second. The maneuver
 * plays in real time, so it is the clock's rate; the disturbance's clock counts playback seconds,
 * each worth the piece's orbit seconds, so the factor is that times the rate and it drops while a
 * dump plays stretched.
 */
export function wheelTimeScale({
  isManeuver,
  warp,
  playbackTime,
  clockRate,
}: WheelTimeScaleInput): number {
  return isManeuver ? clockRate : playbackRateAt(warp, playbackTime) * clockRate;
}
