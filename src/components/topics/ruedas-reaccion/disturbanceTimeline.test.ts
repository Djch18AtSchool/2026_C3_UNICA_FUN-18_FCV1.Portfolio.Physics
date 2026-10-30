import { describe, expect, test } from 'vitest';
import {
  disturbanceTimeline,
  firstDumpPlayback,
  MIN_DUMP_PLAYBACK,
  orbitTimeAt,
  playbackTimeAt,
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
});
