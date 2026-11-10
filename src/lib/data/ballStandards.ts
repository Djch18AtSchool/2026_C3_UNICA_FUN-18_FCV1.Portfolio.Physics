import type { Source } from '../../content/topicSchema';
import { restitutionFromHeights } from '../physics';

/**
 * Restitution of real balls from their rules and from Cross's measurements
 * (docs/superpowers/research/2026-10-30-coeficiente-restitucion.md, §3.3, §3.4 and §4). Only
 * sources the research marks CONFIRMADO; golf (USGA COR 0,830) is left out on purpose. Every e
 * is computed here, e = √(h′/h) for drop tests and e = v₂/v₁ for measured speeds.
 */

const ACCESSED = '2026-10-30';

/** A drop test: height (m, underside of the ball where the rule says so) and admitted rebound. */
export interface DropTest {
  kind: 'drop';
  dropHeight: number;
  reboundMin: number;
  reboundMax: number;
}

/** Measured vertical speeds (m/s) just before and just after the bounce. */
export interface SpeedTest {
  kind: 'speeds';
  incident: number;
  rebound: number;
}

export interface BallStandard {
  id: string;
  /** Ball name as the page shows it. */
  name: string;
  /** The rule or measurement the numbers come from. */
  standard: string;
  test: DropTest | SpeedTest;
  /** Derived e range (cálculo propio); eMin = eMax for a single measurement. */
  eMin: number;
  eMax: number;
  sources: readonly Source[];
}

const ITF_RULES: Source = {
  id: 'itf-rules-2026',
  title: 'ITF Rules of Tennis 2026, Appendix I «The Ball»',
  authors: 'International Tennis Federation',
  year: 2025,
  url: 'https://www.itftennis.com/media/7221/2026-rules-of-tennis-english.pdf',
  accessed: ACCESSED,
};

const ITF_TESTS: Source = {
  id: 'itf-tests',
  title: 'Ball Approval Tests',
  authors: 'ITF Technical Centre',
  year: 2019,
  url: 'https://m.itftennis.com/media/2100/balls-ball-approval-tests.pdf',
  accessed: ACCESSED,
};

const FIBA_EQUIPMENT: Source = {
  id: 'fiba-2026-eq',
  title: 'Official Basketball Rules 2026: Basketball Equipment, v1.0',
  authors: 'FIBA',
  year: 2026,
  url: 'https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-equipment-v1-0.pdf',
  accessed: ACCESSED,
};

const FIFA_BALLS: Source = {
  id: 'fifa-balls-2018',
  title: 'FIFA Quality Programme for Footballs, Testing Manual',
  authors: 'FIFA',
  year: 2018,
  url: 'https://digitalhub.fifa.com/m/4e93a32cd03542cf/original/testing-manual-fifa-quality-programme-for-footballs-2018.pdf',
  accessed: ACCESSED,
};

const CROSS_SUPERBALL: Source = {
  id: 'cross-2002-superball',
  title:
    'Measurements of the horizontal coefficient of restitution for a superball and a tennis ball',
  authors: 'Rod Cross',
  year: 2002,
  publisher: 'American Journal of Physics 70(5), 482-489',
  url: 'https://www.physics.usyd.edu.au/~cross/PUBLICATIONS/20.%20HorizCOR.PDF',
  accessed: ACCESSED,
};

const CROSS_BOUNCE: Source = {
  id: 'cross-1999-bounce',
  title: 'The bounce of a ball',
  authors: 'Rod Cross',
  year: 1999,
  publisher: 'American Journal of Physics 67(3), 222-227',
  url: 'https://www.physics.usyd.edu.au/~cross/PUBLICATIONS/5.%20BallBounce.pdf',
  accessed: ACCESSED,
};

function fromDrop(
  base: Omit<BallStandard, 'test' | 'eMin' | 'eMax'>,
  dropHeight: number,
  reboundMin: number,
  reboundMax: number,
): BallStandard {
  return {
    ...base,
    test: { kind: 'drop', dropHeight, reboundMin, reboundMax },
    eMin: restitutionFromHeights(dropHeight, reboundMin),
    eMax: restitutionFromHeights(dropHeight, reboundMax),
  };
}

function fromSpeeds(
  base: Omit<BallStandard, 'test' | 'eMin' | 'eMax'>,
  incident: number,
  rebound: number,
): BallStandard {
  const e = rebound / incident;
  return { ...base, test: { kind: 'speeds', incident, rebound }, eMin: e, eMax: e };
}

export const BALL_STANDARDS: readonly BallStandard[] = [
  fromDrop(
    {
      id: 'tenis-itf',
      name: 'Tenis (ITF, tipo 2)',
      standard:
        'ITF Rules of Tennis 2026, Appendix I: rebote de 135–147 cm; caída de 254 cm (100 in) sobre granito, ITF Technical Centre',
      sources: [ITF_RULES, ITF_TESTS],
    },
    2.54,
    1.35,
    1.47,
  ),
  fromDrop(
    {
      id: 'baloncesto-fiba',
      name: 'Baloncesto (FIBA)',
      standard:
        'FIBA Basketball Equipment 2026, cláusula 2.4: caída desde aproximadamente 1 800 mm y rebote de 1 035–1 085 mm, medidos a la base de la pelota',
      sources: [FIBA_EQUIPMENT],
    },
    1.8,
    1.035,
    1.085,
  ),
  fromDrop(
    {
      id: 'futbol-fifa-pro',
      name: 'Fútbol (FIFA Quality PRO)',
      standard:
        'FIFA Testing Manual 2018, Test 03: caída de 2,00 m sobre metal y rebote de 135–155 cm a 20 °C, talla 5',
      sources: [FIFA_BALLS],
    },
    2,
    1.35,
    1.55,
  ),
  fromSpeeds(
    {
      id: 'superbola',
      name: 'Superbola',
      standard:
        'Cross (2002): bote vertical sobre madera dura, $v_{y1}$ = −4,13 m/s y $v_{y2}$ = 3,57 m/s',
      sources: [CROSS_SUPERBALL],
    },
    4.13,
    3.57,
  ),
  fromSpeeds(
    {
      id: 'beisbol',
      name: 'Béisbol (baja velocidad)',
      standard: 'Cross (1999), Tabla I: v1 = 1,25 m/s y v2 = 0,61 m/s',
      sources: [CROSS_BOUNCE],
    },
    1.25,
    0.61,
  ),
  fromSpeeds(
    {
      id: 'plastilina',
      name: 'Plastilina',
      standard: 'Cross (1999), Tabla I: v1 = 1,47 m/s y v2 = 0',
      sources: [CROSS_BOUNCE],
    },
    1.47,
    0,
  ),
];

/** The ball with this id; throws a RangeError for an unknown one. */
export function ballStandardById(id: string): BallStandard {
  const ball = BALL_STANDARDS.find((candidate) => candidate.id === id);
  if (!ball) throw new RangeError(`No existe la pelota "${id}"`);
  return ball;
}
