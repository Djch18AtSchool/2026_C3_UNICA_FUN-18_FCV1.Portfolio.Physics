import { describe, expect, test } from 'vitest';
import { DEFAULT_REGEN } from '../../../lib/physics/energy';
import { startDrive, type DriveState } from '../../../lib/physics/regenDrive';
import { uncoveredChars } from '../../../lib/typography';
import type { DriveCourse } from './driveRun';
import {
  DRIVE_CANVAS_NOTE,
  DRIVE_HINT,
  DRIVE_LEFT_OUT,
  DRIVE_USAGE,
  longestSummary,
  driveSceneCaption,
  driveSummary,
  noticeOf,
  noticeText,
  type DriveNotice,
} from './driveText';
import { driveBalance } from './driveViews';
import type { BalanceAt } from './regenScene';

const COURSE: DriveCourse = {
  offset: 376,
  duration: 26,
  startSpeed: 16.1,
  startDistance: 4590,
  stopLine: 4826,
  roadEnd: 4885,
};
/** Text with plain spaces: formatNumber separates units with U+202F. */
const plain = (text: string) => text.replace(/\s/g, ' ');

const balance = (patch: Partial<BalanceAt>): BalanceAt => ({
  ...driveBalance(startDrive(0, COURSE.startDistance), COURSE),
  ...patch,
});
const REFERENCE_END = balance({
  distance: 4826,
  eBrake: 224_000,
  eBattery: 168_100,
  recoveredShare: 0.7504,
});

describe('noticeOf: what limited a step, in order of what the reader can do about it', () => {
  const state = (patch: Partial<DriveState>): DriveState => ({ ...startDrive(10, 0), ...patch });

  test('the battery’s limit first, then f(v), then the motor’s power; none otherwise', () => {
    expect(noticeOf(state({ isRegenAtLimit: true, isTractionPowerLimited: true }))).toBe(
      'regenLimit',
    );
    expect(noticeOf(state({ isFadeFriction: true }))).toBe('fade');
    expect(noticeOf(state({ isTractionPowerLimited: true }))).toBe('traction');
    expect(noticeOf(state({}))).toBeNull();
  });
});

describe('noticeText', () => {
  test.each<[DriveNotice, string]>([
    [
      'regenLimit',
      'Freno limitado por $P_\\text{máx}$ = 10 kW: el resto lo disipan las pastillas.',
    ],
    ['fade', 'Casi detenido, $f(v)$ apaga el freno del motor: las pastillas terminan la frenada.'],
    ['traction', 'El acelerador llegó a la potencia del motor, 239 kW.'],
  ])('%s', (kind, text) => {
    expect(plain(noticeText(kind, { ...DEFAULT_REGEN, pMax: 10_000 }))).toBe(text);
  });
});

describe('driveSummary: said when the run ends or pauses', () => {
  test('at the end, stopped past the line: distance, where, and both shares', () => {
    const own = balance({
      v: 0,
      distance: 4828.4,
      eBrake: 216_000,
      eBattery: 160_200,
      recoveredShare: 0.7417,
    });

    expect(
      plain(
        driveSummary({ own, reference: REFERENCE_END, course: COURSE, cycleName: 'UDDS', t: 26 }),
      ),
    ).toBe(
      'Fin del tramo: recorriste 238 m y te detuviste 2 m después de la línea. A la batería llegaron 160,2 kJ, el 74,2 % del frenado en las ruedas; el auto del UDDS en el tramo: 168,1 kJ y 75,0 %.',
    );
  });

  test('at the end, still moving and short of the line', () => {
    const own = balance({ v: 5, distance: 4800, eBrake: 1000, eBattery: 700, recoveredShare: 0.7 });

    expect(
      plain(
        driveSummary({ own, reference: REFERENCE_END, course: COURSE, cycleName: 'UDDS', t: 26 }),
      ),
    ).toMatch(
      /^Fin del tramo: recorriste 210 m y no te detuviste: vas a 18 km\/h, 26 m antes de la línea\./,
    );
  });

  test('stopped on the line itself', () => {
    const own = balance({ v: 0, distance: 4826.3 });

    expect(
      driveSummary({ own, reference: REFERENCE_END, course: COURSE, cycleName: 'UDDS', t: 26 }),
    ).toMatch(/te detuviste justo en la línea\./);
  });

  test('on pause, the cycle’s time and the comparison up to that instant; before any braking', () => {
    const own = balance({ v: 16, distance: 4670 });
    const reference = balance({ distance: 4672 });

    expect(plain(driveSummary({ own, reference, course: COURSE, cycleName: 'UDDS', t: 5 }))).toBe(
      'En pausa en t = 381,00 s: llevas 80 m y vas a 58 km/h, 156 m antes de la línea. Todavía no frenaste: nada llegó a la batería; el auto del UDDS todavía no frenó.',
    );
  });

  test('on pause after braking, the cycle’s car up to the same instant', () => {
    const own = balance({
      v: 8,
      distance: 4760,
      eBrake: 90_000,
      eBattery: 70_000,
      recoveredShare: 0.778,
    });
    const reference = balance({
      distance: 4770,
      eBrake: 100_000,
      eBattery: 78_000,
      recoveredShare: 0.78,
    });

    expect(
      plain(driveSummary({ own, reference, course: COURSE, cycleName: 'UDDS', t: 13 })),
    ).toMatch(/; el auto del UDDS hasta este instante: 78,0 kJ y 78,0 %\.$/);
  });
});

describe('driveSceneCaption: the scene’s name says where the cycle’s car and the line are', () => {
  test('ahead, behind, alongside; the line ahead, passed, reached', () => {
    const own = balance({ distance: 4700 });

    expect(plain(driveSceneCaption(own, balance({ distance: 4712, v: 10 }), COURSE, 'UDDS'))).toBe(
      'El auto de contorno discontinuo es el del UDDS: va a 36 km/h, 12 m por delante. La línea de detención está 126 m adelante.',
    );
    expect(driveSceneCaption(own, balance({ distance: 4690 }), COURSE, 'UDDS')).toMatch(
      /10\sm por detrás/,
    );
    expect(driveSceneCaption(own, balance({ distance: 4700.2 }), COURSE, 'UDDS')).toMatch(
      /a tu altura/,
    );
    expect(plain(driveSceneCaption(balance({ distance: 4830 }), own, COURSE, 'UDDS'))).toMatch(
      /Pasaste la línea de detención por 4 m\.$/,
    );
    expect(driveSceneCaption(balance({ distance: 4826 }), own, COURSE, 'UDDS')).toMatch(
      /Estás en la línea de detención\.$/,
    );
  });
});

describe('the mode’s own notes («Cómo se usa», «Qué deja fuera el modelo», the canvas)', () => {
  test('usage states the challenge, the pedals, the keys and the pedal’s travel from the model', () => {
    const text = plain(DRIVE_USAGE);

    expect(text).toMatch(/detenerte en la línea/);
    expect(text).toMatch(/↓ y ↑/);
    expect(text).toMatch(/hasta el fondo en 2 s y vuelve en 0,5 s/);
    expect(text).toMatch(/Pulsar un pedal arranca/);
  });

  test('what it leaves out names the sources’ numbers: μ = 0,7, 59 %, 4,65 m/s² and 239 kW', () => {
    const text = plain(DRIVE_LEFT_OUT);

    expect(text).toMatch(/\$\\mu\$ = 0,7/);
    expect(text).toMatch(/59 %/);
    expect(text).toMatch(/4,65 m\/s²/);
    expect(text).toMatch(/239 kW/);
    expect(text).toMatch(/rueda libre/);
    // The LEAF gets the Model 3's motor too, not only its chassis (review D3, M4).
    expect(text).toMatch(/El LEAF usa el mismo chasis y el mismo motor de 239 kW\./);
  });

  test('the canvas note tells the two cars and the two curves apart without color', () => {
    expect(DRIVE_CANVAS_NOTE).toMatch(/contorno discontinuo/);
    expect(DRIVE_CANVAS_NOTE).toMatch(/línea continua/);
  });
});

describe('longestSummary: the status line’s reserve', () => {
  test('is at least as long as any summary of the course, and says no formula', () => {
    const own = balance({
      v: 30,
      distance: 5400,
      eBrake: 9e5,
      eBattery: 7e5,
      recoveredShare: 0.778,
    });
    const longest = longestSummary(COURSE, 'HWFET');
    const real = driveSummary({
      own,
      reference: REFERENCE_END,
      course: COURSE,
      cycleName: 'HWFET',
      t: 26,
    });

    expect(longest.length).toBeGreaterThanOrEqual(real.length);
    // A pause can read longer than the end (a long time of the cycle): the longer one wins.
    expect(longestSummary({ ...COURSE, offset: 100_000_000 }, 'UDDS')).toMatch(/^En pausa/);
    expect(longest).not.toMatch(/\$/);
  });
});

describe('glyphs', () => {
  test('every fixed text draws with Plex outside its formulas', () => {
    const texts = [
      DRIVE_HINT,
      DRIVE_USAGE,
      DRIVE_LEFT_OUT,
      DRIVE_CANVAS_NOTE,
      longestSummary(COURSE, 'UDDS'),
      ...(['regenLimit', 'fade', 'traction'] as const).map((kind) =>
        noticeText(kind, DEFAULT_REGEN),
      ),
    ];

    // Outside its formulas (KaTeX draws those).
    texts.forEach((text) => expect(uncoveredChars(text.replace(/\$[^$]*\$/g, ''))).toEqual([]));
  });
});
