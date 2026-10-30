import { describe, expect, test } from 'vitest';
import {
  TIMELINE_STEPS,
  transportTimeText,
  transportTimeUnit,
  transportTimeValue,
} from './transportTime';

const NNBSP = ' ';
const HOUR = 3600;
const DAY = 86_400;

describe('transportTimeUnit', () => {
  test('a run shorter than 120 s reads in seconds with three decimals', () => {
    expect(transportTimeUnit(4)).toEqual({ symbol: 's', seconds: 1, precision: 3 });
    expect(transportTimeUnit(119.999)).toMatchObject({ symbol: 's' });
  });

  test('from 120 s, and below 2 h, a run reads in minutes', () => {
    expect(transportTimeUnit(120)).toMatchObject({ symbol: 'min', seconds: 60 });
    expect(transportTimeUnit(2 * HOUR - 0.001)).toMatchObject({ symbol: 'min' });
  });

  test('from 2 h, and below 2 d, a run reads in hours', () => {
    expect(transportTimeUnit(2 * HOUR)).toMatchObject({ symbol: 'h', seconds: HOUR });
    expect(transportTimeUnit(2 * DAY - 0.001)).toMatchObject({ symbol: 'h' });
  });

  test('from 2 d on, a run reads in days', () => {
    expect(transportTimeUnit(2 * DAY)).toMatchObject({ symbol: 'd', seconds: DAY });
    expect(transportTimeUnit(30 * DAY)).toMatchObject({ symbol: 'd' });
  });

  test('a duration that is not a finite number falls back to seconds', () => {
    expect(transportTimeUnit(0)).toMatchObject({ symbol: 's' });
    expect(transportTimeUnit(Number.NaN)).toMatchObject({ symbol: 's' });
    expect(transportTimeUnit(Number.POSITIVE_INFINITY)).toMatchObject({ symbol: 's' });
  });

  test('a larger unit shows the decimals one timeline step needs, no more', () => {
    // Steps of 0,002 min, 0,0228 min, 0,1 min (exactly), 0,0432 h, 0,0300 d and 2 d.
    expect(transportTimeUnit(120).precision).toBe(3);
    expect(transportTimeUnit(1369).precision).toBe(2);
    expect(transportTimeUnit(6000).precision).toBe(1);
    expect(transportTimeUnit(1.8 * DAY).precision).toBe(2);
    expect(transportTimeUnit(30 * DAY).precision).toBe(2);
    expect(transportTimeUnit(2000 * DAY).precision).toBe(0);
  });

  test('a lab can fix the unit; a fixed unit still takes its decimals from the step', () => {
    expect(transportTimeUnit(1369, 's')).toEqual({ symbol: 's', seconds: 1, precision: 0 });
    expect(transportTimeUnit(30, 'min')).toMatchObject({ symbol: 'min', precision: 4 });
    expect(transportTimeUnit(1369, 'h')).toMatchObject({ symbol: 'h', precision: 4 });
    expect(transportTimeUnit(4 * DAY, 'auto')).toMatchObject({ symbol: 'd' });
  });

  test('fixed seconds show the decimals one step needs: 0 for the UDDS, 2 for a 60 s run', () => {
    // Steps of 1,369 s, 0,765 s, 0,15 s, 0,06 s and 0,008 s.
    expect(transportTimeUnit(1369, 's').precision).toBe(0);
    expect(transportTimeUnit(765, 's').precision).toBe(1);
    expect(transportTimeUnit(150, 's').precision).toBe(1);
    expect(transportTimeUnit(60, 's').precision).toBe(2);
    expect(transportTimeUnit(8, 's').precision).toBe(3);
  });

  test('fixed seconds of a run with no finite duration keep three decimals', () => {
    expect(transportTimeUnit(0, 's').precision).toBe(3);
    expect(transportTimeUnit(Number.NaN, 's').precision).toBe(3);
  });
});

describe('transportTimeText', () => {
  test('seconds keep the three decimals the short labs have always shown', () => {
    expect(transportTimeText(1.2344, 4)).toBe(`t = 1,234${NNBSP}s`);
    expect(transportTimeText(116, 119)).toBe(`t = 116,000${NNBSP}s`);
  });

  test('a lab that fixes seconds reads a 22-minute run in whole seconds, not 1 369,000 s', () => {
    expect(transportTimeText(116, 1369, 's')).toBe(`t = 116${NNBSP}s`);
    expect(transportTimeText(1369, 1369, 's')).toBe(`t = 1${NNBSP}369${NNBSP}s`);
  });

  test.each([8, 60, 150, 596, 765, 1369])(
    'every timeline step of a %d s run reads a different value in fixed seconds',
    (duration) => {
      const texts = Array.from({ length: TIMELINE_STEPS + 1 }, (_, k) =>
        transportTimeText((k / TIMELINE_STEPS) * duration, duration, 's'),
      );

      expect(new Set(texts).size).toBe(texts.length);
    },
  );

  test('the unit follows the run, not the instant: t = 0 of a long run reads in its unit', () => {
    expect(transportTimeText(0, 1369)).toBe(`t = 0,00${NNBSP}min`);
    expect(transportTimeText(0, 3 * DAY)).toBe(`t = 0,000${NNBSP}d`);
  });

  test('a 22-minute run reads in minutes, two decimals', () => {
    expect(transportTimeText(116, 1369)).toBe(`t = 1,93${NNBSP}min`);
    expect(transportTimeText(1369, 1369)).toBe(`t = 22,82${NNBSP}min`);
  });

  test('a flyby pass of a day and a half reads in hours, not 143 969,559 s', () => {
    expect(transportTimeText(143_969.559, 1.8 * DAY)).toBe(`t = 39,99${NNBSP}h`);
  });

  test('a pass of a week reads in days, to the thousandth a step needs', () => {
    expect(transportTimeText(144_288, 7 * DAY)).toBe(`t = 1,670${NNBSP}d`);
  });

  test('at each boundary the end of the run prints in the larger unit', () => {
    expect(transportTimeText(120, 120)).toBe(`t = 2,000${NNBSP}min`);
    expect(transportTimeText(2 * HOUR, 2 * HOUR)).toBe(`t = 2,000${NNBSP}h`);
    expect(transportTimeText(2 * DAY, 2 * DAY)).toBe(`t = 2,000${NNBSP}d`);
  });

  test('thousands keep their grouping in any unit', () => {
    expect(transportTimeText(1500 * DAY, 2000 * DAY)).toBe(`t = 1${NNBSP}500${NNBSP}d`);
  });

  test.each([120, 1369, 6000, 7199, 2 * HOUR, 144_000, 2 * DAY, 7 * DAY, 1_879_308])(
    'every timeline step of a %d s run reads a different value in the auto unit',
    (duration) => {
      const texts = Array.from({ length: TIMELINE_STEPS + 1 }, (_, k) =>
        transportTimeText((k / TIMELINE_STEPS) * duration, duration),
      );

      expect(new Set(texts).size).toBe(texts.length);
    },
  );
});

describe('transportTimeValue', () => {
  test('is the readout without "t = ", for texts that state a duration', () => {
    expect(transportTimeValue(232_209, 232_209)).toBe(`2,688${NNBSP}d`);
    expect(transportTimeValue(17_340, 17_340)).toBe(`4,817${NNBSP}h`);
  });
});
