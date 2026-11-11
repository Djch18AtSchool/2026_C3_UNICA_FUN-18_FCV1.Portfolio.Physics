import { describe, expect, test } from 'vitest';
import {
  disturbanceTimeline,
  firstDumpPlayback,
  MIN_DUMP_PLAYBACK,
  orbitTimeAt,
  playbackRateAt,
  playbackTimeAt,
  wheelTimeScale,
} from './disturbanceTimeline';
import {
  DAY_LAPSE,
  DISTURBANCE_SPAN,
  disturbanceReadings,
  SECONDS_PER_HOUR,
} from './wheelLabModel';

describe('disturbanceTimeline', () => {
  test('fills play at DAY_LAPSE and each dump is stretched to MIN_DUMP_PLAYBACK s of playback', () => {
    for (const actuator of ['magnetopar', 'propulsor'] as const) {
      const { segments, duration } = disturbanceTimeline(actuator);
      const dumps = segments.filter((segment) => segment.dumping);
      const fills = segments.filter((segment) => !segment.dumping);

      expect(dumps).toHaveLength(1);
      expect(dumps[0].u1 - dumps[0].u0).toBeCloseTo(MIN_DUMP_PLAYBACK, 9);
      for (const fill of fills) {
        expect((fill.t1 - fill.t0) / (fill.u1 - fill.u0)).toBeCloseTo(DAY_LAPSE, 6);
      }
      expect(segments[segments.length - 1].t1).toBe(DISTURBANCE_SPAN);
      expect(duration).toBeCloseTo(
        (DISTURBANCE_SPAN - (dumps[0].t1 - dumps[0].t0)) / DAY_LAPSE + MIN_DUMP_PLAYBACK,
        6,
      );
    }
  });

  test('the propulsor dump lasts about 5 s of orbit and is the stretched segment', () => {
    const dump = disturbanceTimeline('propulsor').segments.find((segment) => segment.dumping);

    expect(dump?.t0).toBeCloseTo(48.63 * SECONDS_PER_HOUR, -2);
    expect((dump?.t1 ?? 0) - (dump?.t0 ?? 0)).toBeCloseTo(5, 2);
  });

  test('orbit and playback times invert each other and clamp to the span', () => {
    const timeline = disturbanceTimeline('propulsor');

    for (const hours of [0, 10, 48.633, 50, 72]) {
      const t = hours * SECONDS_PER_HOUR;
      expect(orbitTimeAt(timeline, playbackTimeAt(timeline, t))).toBeCloseTo(t, 3);
    }
    expect(orbitTimeAt(timeline, -1)).toBe(0);
    expect(orbitTimeAt(timeline, timeline.duration + 1)).toBe(DISTURBANCE_SPAN);
    expect(playbackTimeAt(timeline, DISTURBANCE_SPAN * 2)).toBeCloseTo(timeline.duration, 9);
  });

  test('the middle of the first dump is a playback time where the wheel is dumping', () => {
    for (const actuator of ['magnetopar', 'propulsor'] as const) {
      const timeline = disturbanceTimeline(actuator);
      const u = firstDumpPlayback(timeline);

      expect(disturbanceReadings(actuator, orbitTimeAt(timeline, u)).dumping).toBe(true);
    }
  });

  test('the orbit seconds per playback second are DAY_LAPSE on a fill and stretched on a dump', () => {
    for (const actuator of ['magnetopar', 'propulsor'] as const) {
      const timeline = disturbanceTimeline(actuator);
      const dump = timeline.segments.find((segment) => segment.dumping);
      const dumpRate = ((dump?.t1 ?? 0) - (dump?.t0 ?? 0)) / MIN_DUMP_PLAYBACK;

      expect(playbackRateAt(timeline, 0)).toBeCloseTo(DAY_LAPSE, 6);
      expect(playbackRateAt(timeline, firstDumpPlayback(timeline))).toBeCloseTo(dumpRate, 6);
      expect(playbackRateAt(timeline, timeline.duration)).toBeCloseTo(DAY_LAPSE, 6);
    }
  });

  test('the dump of the propulsor runs near real time and the magnetorquer one at about ×1700', () => {
    const rateAtDump = (actuator: 'magnetopar' | 'propulsor') => {
      const timeline = disturbanceTimeline(actuator);
      return playbackRateAt(timeline, firstDumpPlayback(timeline));
    };

    expect(rateAtDump('propulsor')).toBeCloseTo(2.5, 1);
    expect(rateAtDump('magnetopar')).toBeGreaterThan(1500);
    expect(rateAtDump('magnetopar')).toBeLessThan(1900);
  });

  test('outside the clock range the rate is the nearest piece’s', () => {
    const timeline = disturbanceTimeline('propulsor');

    expect(playbackRateAt(timeline, -5)).toBeCloseTo(DAY_LAPSE, 6);
    expect(playbackRateAt(timeline, timeline.duration + 5)).toBeCloseTo(DAY_LAPSE, 6);
  });
});

describe('wheelTimeScale', () => {
  const warp = disturbanceTimeline('propulsor');

  test('the maneuver runs in real time: the factor is the clock rate (the speed, or the reduced pace)', () => {
    expect(wheelTimeScale({ isManeuver: true, warp, playbackTime: 12, clockRate: 1 })).toBe(1);
    expect(wheelTimeScale({ isManeuver: true, warp, playbackTime: 12, clockRate: 4 })).toBe(4);
  });

  test('the disturbance multiplies the piece’s orbit seconds per playback second by the clock rate', () => {
    expect(wheelTimeScale({ isManeuver: false, warp, playbackTime: 5, clockRate: 1 })).toBeCloseTo(
      DAY_LAPSE,
      6,
    );
    expect(wheelTimeScale({ isManeuver: false, warp, playbackTime: 5, clockRate: 4 })).toBeCloseTo(
      4 * DAY_LAPSE,
      6,
    );
    expect(
      wheelTimeScale({
        isManeuver: false,
        warp,
        playbackTime: firstDumpPlayback(warp),
        clockRate: 0.5,
      }),
    ).toBeCloseTo(1.25, 1);
  });
});
