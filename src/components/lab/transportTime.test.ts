import { describe, expect, test } from 'vitest';
import { transportTimeText, transportTimeUnit } from './transportTime';

const NNBSP = ' ';
const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;

describe('transportTimeUnit', () => {
  test('a run shorter than 120 s reads in seconds with three decimals', () => {
    expect(transportTimeUnit(4)).toMatchObject({ symbol: 's', seconds: 1, precision: 3 });
    expect(transportTimeUnit(119.999)).toMatchObject({ symbol: 's' });
  });

  test('from 120 s, and below 2 h, a run reads in minutes', () => {
    expect(transportTimeUnit(120)).toMatchObject({ symbol: 'min', seconds: MINUTE, precision: 2 });
    expect(transportTimeUnit(2 * HOUR - 0.001)).toMatchObject({ symbol: 'min' });
  });

  test('from 2 h, and below 2 d, a run reads in hours', () => {
    expect(transportTimeUnit(2 * HOUR)).toMatchObject({ symbol: 'h', seconds: HOUR, precision: 2 });
    expect(transportTimeUnit(2 * DAY - 0.001)).toMatchObject({ symbol: 'h' });
  });

  test('from 2 d on, a run reads in days', () => {
    expect(transportTimeUnit(2 * DAY)).toMatchObject({ symbol: 'd', seconds: DAY, precision: 2 });
    expect(transportTimeUnit(30 * DAY)).toMatchObject({ symbol: 'd' });
  });

  test('a duration that is not a positive finite number falls back to seconds', () => {
    expect(transportTimeUnit(0)).toMatchObject({ symbol: 's' });
    expect(transportTimeUnit(Number.NaN)).toMatchObject({ symbol: 's' });
    expect(transportTimeUnit(Number.POSITIVE_INFINITY)).toMatchObject({ symbol: 's' });
  });
});

describe('transportTimeText', () => {
  test('seconds keep the three decimals the short labs have always shown', () => {
    expect(transportTimeText(1.2344, 4)).toBe(`t = 1,234${NNBSP}s`);
    expect(transportTimeText(116, 119)).toBe(`t = 116,000${NNBSP}s`);
  });

  test('the unit follows the run, not the instant: t = 0 of a long run reads in its unit', () => {
    expect(transportTimeText(0, 1369)).toBe(`t = 0,00${NNBSP}min`);
    expect(transportTimeText(0, 3 * DAY)).toBe(`t = 0,00${NNBSP}d`);
  });

  test('a 22-minute drive cycle reads in minutes, two decimals', () => {
    expect(transportTimeText(116, 1369)).toBe(`t = 1,93${NNBSP}min`);
    expect(transportTimeText(1369, 1369)).toBe(`t = 22,82${NNBSP}min`);
  });

  test('a flyby pass of a day and a half reads in hours, not 143 969,559 s', () => {
    expect(transportTimeText(143_969.559, 1.8 * DAY)).toBe(`t = 39,99${NNBSP}h`);
  });

  test('a pass of a week reads in days', () => {
    expect(transportTimeText(144_288, 7 * DAY)).toBe(`t = 1,67${NNBSP}d`);
  });

  test('at each boundary the end of the run prints in the larger unit', () => {
    expect(transportTimeText(120, 120)).toBe(`t = 2,00${NNBSP}min`);
    expect(transportTimeText(2 * HOUR, 2 * HOUR)).toBe(`t = 2,00${NNBSP}h`);
    expect(transportTimeText(2 * DAY, 2 * DAY)).toBe(`t = 2,00${NNBSP}d`);
  });

  test('thousands keep their grouping in any unit', () => {
    expect(transportTimeText(1500 * DAY, 2000 * DAY)).toBe(`t = 1${NNBSP}500,00${NNBSP}d`);
  });
});
