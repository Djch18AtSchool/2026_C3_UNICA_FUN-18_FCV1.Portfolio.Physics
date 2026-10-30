import { describe, expect, test } from 'vitest';
import { monoTextWidth } from '../../lab/plotScales';
import {
  formatDate,
  formatTime,
  jdFromIso,
  MIN_LABEL_GAP,
  offsetDayTicks,
  yearTicks,
  type AxisTick,
} from './dateAxis';

const FONT = 12;
const MISSION = { min: jdFromIso('1977-08-20'), max: jdFromIso('1990-01-01') };

/** Horizontal gap (px) between consecutive labelled ticks, each centred on its tick. */
function labelGaps(ticks: AxisTick[], pxPerDay: number): number[] {
  const labelled = ticks.filter((tick) => tick.label !== undefined);
  return labelled.slice(1).map((tick, i) => {
    const previous = labelled[i];
    const halfWidths =
      (monoTextWidth(previous.label ?? '', FONT) + monoTextWidth(tick.label ?? '', FONT)) / 2;
    return (tick.x - previous.x) * pxPerDay - halfWidths;
  });
}

describe('Julian dates', () => {
  test('1980-01-01 00:00 UT is JD 2 444 239,5 and closest approach keeps its minute', () => {
    expect(jdFromIso('1980-01-01')).toBe(2444239.5);
    const jupiter = jdFromIso('1979-07-09T22:29Z');
    expect(formatDate(jupiter)).toBe('9 jul 1979');
    expect(formatTime(jupiter)).toBe('22:29');
  });

  test('rejects a date it cannot read', () => {
    expect(() => jdFromIso('ayer')).toThrow(RangeError);
  });
});

describe('yearTicks', () => {
  test('a wide chart labels every year from 1978 to 1990', () => {
    const pxPerDay = 600 / (MISSION.max - MISSION.min);
    const ticks = yearTicks(MISSION, pxPerDay, FONT);

    expect(ticks.map((tick) => tick.label)).toEqual(
      Array.from({ length: 13 }, (_, i) => String(1978 + i)),
    );
    expect(ticks[0].x).toBe(jdFromIso('1978-01-01'));
  });

  test('a phone chart (about 200 px of plot) ticks every year and labels every other one', () => {
    const pxPerDay = 200 / (MISSION.max - MISSION.min);
    const ticks = yearTicks(MISSION, pxPerDay, FONT);

    expect(ticks).toHaveLength(13);
    expect(ticks.flatMap((tick) => tick.label ?? [])).toEqual([
      '1978',
      '1980',
      '1982',
      '1984',
      '1986',
      '1988',
      '1990',
    ]);
  });

  test('labels never overlap, from a 160 px to a 700 px plot', () => {
    for (let width = 160; width <= 700; width += 10) {
      const pxPerDay = width / (MISSION.max - MISSION.min);
      const gaps = labelGaps(yearTicks(MISSION, pxPerDay, FONT), pxPerDay);
      expect(Math.min(...gaps), `${width} px`).toBeGreaterThanOrEqual(MIN_LABEL_GAP);
    }
  });
});

describe('offsetDayTicks', () => {
  test('days from closest approach, signed, every day when there is room, every other one on a narrow plot', () => {
    const ca = jdFromIso('1979-07-09T22:29Z');
    const window = { min: ca - 5, max: ca + 5 };
    const wide = offsetDayTicks(ca, window, 600 / 10, FONT);
    const phone = offsetDayTicks(ca, window, 150 / 10, FONT);

    expect(wide.map((tick) => tick.label)).toEqual([
      '−5',
      '−4',
      '−3',
      '−2',
      '−1',
      '0',
      '+1',
      '+2',
      '+3',
      '+4',
      '+5',
    ]);
    expect(wide[5].x).toBe(ca);
    expect(phone.flatMap((tick) => tick.label ?? [])).toEqual(['−4', '−2', '0', '+2', '+4']);
  });
});
