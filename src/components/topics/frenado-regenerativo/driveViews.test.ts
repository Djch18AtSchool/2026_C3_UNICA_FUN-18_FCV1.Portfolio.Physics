import { describe, expect, test } from 'vitest';
import { DRIVE_CYCLES } from '../../../lib/data/driveCycles';
import { MODEL3_LR_RWD_2025 } from '../../../lib/data/evModels';
import { cycleBalance, DEFAULT_REGEN } from '../../../lib/physics/energy';
import { startDrive } from '../../../lib/physics/regenDrive';
import {
  DRIVE_COURSES,
  driveBalance,
  driveCourse,
  driveEnergyScale,
  driveReadouts,
  driveRoad,
  LINE_ROOM_SHARE,
  referenceAt,
} from './driveViews';
import { cumulativeDistance } from './regenScene';
import { STOPS, STRETCHES, viewMarkers } from './regenViews';

const UDDS = DRIVE_CYCLES.udds.samples;
const DISTANCES = cumulativeDistance(UDDS);
const { steps: STEPS } = cycleBalance(UDDS, MODEL3_LR_RWD_2025, DEFAULT_REGEN);
const COURSE = DRIVE_COURSES.udds;

describe('the course of «Conducir»: the stretch of «Tramo», from its start to the cycle’s stop', () => {
  test('in the UDDS: from 376 s at 57,9 km/h, 26 s, and the line 236 m on, where the car stops at 397 s', () => {
    const at397 = DISTANCES[UDDS.findIndex(({ t }) => t === 397)];

    expect(COURSE.offset).toBe(376);
    expect(COURSE.duration).toBe(26);
    expect(COURSE.startSpeed * 3.6).toBeCloseTo(57.9, 1);
    expect(COURSE.startDistance).toBe(DISTANCES[376]);
    expect(COURSE.stopLine).toBe(at397);
    expect(COURSE.stopLine - COURSE.startDistance).toBeCloseTo(236, 0);
  });

  test('the road runs a quarter of the way past the line, room to overshoot it', () => {
    expect(LINE_ROOM_SHARE).toBe(0.25);
    expect(COURSE.roadEnd - COURSE.stopLine).toBeCloseTo(
      (COURSE.stopLine - COURSE.startDistance) * LINE_ROOM_SHARE,
      9,
    );
  });

  test('every cycle has its course: its stretch and the stop inside it (HWFET 763 s, US06 128 s)', () => {
    const samples = { hwfet: DRIVE_CYCLES.hwfet.samples, us06: DRIVE_CYCLES.us06.samples };
    const stopOf = (id: 'hwfet' | 'us06', t: number) =>
      cumulativeDistance(samples[id])[samples[id].findIndex((s) => s.t === t)];

    expect(DRIVE_COURSES.hwfet.offset).toBe(STRETCHES.hwfet.start);
    expect(DRIVE_COURSES.hwfet.stopLine).toBe(stopOf('hwfet', 763));
    expect(DRIVE_COURSES.us06.stopLine).toBe(stopOf('us06', 128));
  });

  test('a stretch without a stop has its line at the stretch’s end', () => {
    const cruise = [0, 1, 2, 3].map((t) => ({ t, v: 10 }));
    const course = driveCourse(cruise, { start: 1, end: 3 }, []);

    expect(course.stopLine).toBe(30);
    expect(course.startDistance).toBe(10);
  });

  test('rejects a stretch whose ends are not samples of the cycle', () => {
    expect(() => driveCourse(UDDS, { start: 376.5, end: 402 }, STOPS.udds)).toThrow(RangeError);
  });

  test('has no transport events: the stops are the cycle’s, not the reader’s', () => {
    expect(viewMarkers('conducir', 'udds')).toEqual([]);
  });
});

describe('driveBalance: a drive state read as the lab’s balance', () => {
  test('keeps the kernel’s values, the cycle’s time, and the share of its own braking', () => {
    const state = { ...startDrive(10, 4600, 1.5), eBrake: 200, eBattery: 150 };
    const at = driveBalance(state, COURSE);

    expect(at.t).toBe(377.5);
    expect(at.distance).toBe(4600);
    expect(at.recoveredShare).toBe(0.75);
    expect(driveBalance(startDrive(10, 0), COURSE).recoveredShare).toBe(0);
  });
});

describe('referenceAt: the cycle’s own car on the same course, the comparison', () => {
  test('at the end, the stretch of figure 6.3: 168,1 kJ to the battery, 75,0 % of the braking', () => {
    const end = referenceAt(STEPS, DISTANCES, COURSE, 26);

    expect(end.eBattery / 1000).toBeCloseTo(168.1, 1);
    expect(end.recoveredShare * 100).toBeCloseTo(75.0, 1);
    expect(end.distance).toBeCloseTo(COURSE.stopLine, 6);
  });

  test('at the start nothing is counted yet', () => {
    expect(referenceAt(STEPS, DISTANCES, COURSE, 0).eBrake).toBe(0);
  });
});

describe('driveReadouts', () => {
  const own = { ...driveBalance(startDrive(5, COURSE.stopLine - 12.4), COURSE), pWheel: -4000 };
  const ref = referenceAt(STEPS, DISTANCES, COURSE, 26);
  const readouts = driveReadouts(own, ref, COURSE, 'UDDS');

  test('your v, P and energies in kJ, both shares and the distance left to the line', () => {
    expect(readouts.map(({ label }) => label)).toEqual([
      'Velocidad v',
      'Potencia en las ruedas P',
      'Energía a la batería en tu conducción $E_\\text{batería}$',
      'Pérdidas de conversión en tu conducción $E_\\text{conversión}$',
      'Calor de fricción en tu conducción $E_\\text{fricción}$',
      'Recuperado en tu conducción, % del frenado en las ruedas',
      'Recuperado en el tramo del UDDS, % del frenado en las ruedas',
      'Hasta la línea de detención',
    ]);
  });

  test('the reference share is the cycle’s; the line is 12 m ahead, and negative once passed', () => {
    const byId = new Map(readouts.map((readout) => [readout.id, readout]));
    const passed = driveReadouts(
      driveBalance(startDrive(0, COURSE.stopLine + 3), COURSE),
      ref,
      COURSE,
      'UDDS',
    );

    expect(byId.get('reference')?.value).toBeCloseTo(75.0, 1);
    expect(byId.get('line')).toMatchObject({ unit: 'm', precision: 0 });
    expect(byId.get('line')?.value).toBeCloseTo(12.4, 9);
    expect(passed.find(({ id }) => id === 'line')?.value).toBeCloseTo(-3, 9);
    expect(byId.get('battery')?.unit).toBe('kJ');
  });
});

describe('driveRoad and driveEnergyScale', () => {
  test('the road: from the start past the line, every 50 m, saying how far the line is', () => {
    const road = driveRoad(COURSE);

    expect(road).toMatchObject({ from: COURSE.startDistance, to: COURSE.roadEnd, tickEvery: 50 });
    expect(road.note).toBe('línea a 236\u202fm · auto no a escala');
    expect(road.line).toBe(COURSE.stopLine);
  });

  test('the bars read in kJ on the stretch’s scale, widened by 50 kJ when your run needs it', () => {
    const quiet = driveEnergyScale(driveBalance(startDrive(16, 0), COURSE), 250);
    const hard = driveEnergyScale(
      { ...driveBalance(startDrive(16, 0), COURSE), eTraction: 420_000 },
      250,
    );

    expect(quiet).toMatchObject({ unit: 'kJ', axisMax: 250, scope: 'en tu conducción, hasta t' });
    expect(hard.axisMax).toBe(450);
  });
});
