/**
 * The words of «Conducir»: the hint before a run, the notices of a limit (said once each per run),
 * the summary when a run pauses or ends, and the scene's name for screen readers. With KaTeX
 * between `$…$` where a symbol appears (InlineMath draws them). Never one per frame.
 */
import { formatNumber } from '../../../lib/format';
import type { RegenParams } from '../../../lib/physics/energy';
import { FASTSIM_MOTOR_PMAX_W } from '../../../lib/physics/energy';
import {
  FASTSIM_MODEL3_CHASSIS,
  PEDAL_APPLY_S,
  PEDAL_RETURN_S,
  tractionAccelMax,
  type DriveState,
} from '../../../lib/physics/regenDrive';
import { transportTimeText } from '../../lab/transportTime';
import type { DriveCourse } from './driveRun';
import { J_PER_KJ, KMH_PER_MS, W_PER_KW, type BalanceAt } from './regenScene';

/** Under this distance (m) the car stands on the line, or alongside the cycle's car. */
const ON_LINE_M = 0.5;
const M_PRECISION = 0;
const KMH_PRECISION = 0;
const KJ_PRECISION = 1;
const SHARE_PRECISION = 1;
const KW_PRECISION = 0;
const PERCENT = 100;
/** The clock's last instant, give or take float residue (s). */
const END_EPSILON_S = 1e-6;

export const DRIVE_HINT =
  'Mantén pulsado el freno o el acelerador para arrancar; el auto del ciclo sale contigo.';

/** A limit the reader met: the battery's P_máx, the fade f(v) near rest, the motor's power. */
export type DriveNotice = 'regenLimit' | 'fade' | 'traction';

/** What limited a step, the braking first (the lab's subject): none when nothing did. */
export function noticeOf(state: DriveState): DriveNotice | null {
  if (state.isRegenAtLimit) return 'regenLimit';
  if (state.isFadeFriction) return 'fade';
  return state.isTractionPowerLimited ? 'traction' : null;
}

const kw = (watts: number) =>
  formatNumber(watts / W_PER_KW, { precision: KW_PRECISION, unit: 'kW' });

export function noticeText(kind: DriveNotice, regen: RegenParams): string {
  switch (kind) {
    case 'regenLimit':
      // P_máx is the motor's by default and the battery's only in the cold-battery preset: name the limit.
      return `Freno limitado por $P_\\text{máx}$ = ${kw(regen.pMax)}: el resto lo disipan las pastillas.`;
    case 'fade':
      return 'Casi detenido, $f(v)$ apaga el freno del motor: las pastillas terminan la frenada.';
    case 'traction':
      return `El acelerador llegó a la potencia del motor, ${kw(FASTSIM_MOTOR_PMAX_W)}.`;
  }
}

const meters = (value: number) => formatNumber(value, { precision: M_PRECISION, unit: 'm' });
const kmh = (v: number) => formatNumber(v * KMH_PER_MS, { precision: KMH_PRECISION, unit: 'km/h' });
const kj = (joules: number) =>
  formatNumber(joules / J_PER_KJ, { precision: KJ_PRECISION, unit: 'kJ' });
const share = (value: number) =>
  formatNumber(value * PERCENT, { precision: SHARE_PRECISION, unit: '%' });

/** Where the car is against the line: «12 m antes de la línea», «justo en la línea». */
function lineRelation(course: DriveCourse, distance: number): string {
  const ahead = course.stopLine - distance;
  if (Math.abs(ahead) < ON_LINE_M) return 'justo en la línea';
  return ahead > 0 ? `${meters(ahead)} antes de la línea` : `${meters(-ahead)} después de la línea`;
}

export interface SummaryInput {
  own: BalanceAt;
  reference: BalanceAt;
  course: DriveCourse;
  cycleName: string;
  /** The run's clock (s). */
  t: number;
}

/** First sentence: where the run is and how it moves. */
function motionSentence({ own, course, t }: SummaryInput, isEnd: boolean): string {
  const covered = meters(own.distance - course.startDistance);
  const where = lineRelation(course, own.distance);
  if (!isEnd) {
    const time = transportTimeText(course.offset + t, course.duration, 's');
    return `En pausa en ${time}: llevas ${covered} y vas a ${kmh(own.v)}, ${where}.`;
  }
  if (own.v > 0) {
    return `Fin del tramo: recorriste ${covered} y no te detuviste: vas a ${kmh(own.v)}, ${where}.`;
  }
  return `Fin del tramo: recorriste ${covered} y te detuviste ${where}.`;
}

/** Second sentence: your energy to the battery and the cycle's car's, by the same definition. */
function energySentence({ own, reference, cycleName }: SummaryInput, isEnd: boolean): string {
  const yours =
    own.eBrake > 0
      ? `A la batería llegaron ${kj(own.eBattery)}, el ${share(own.recoveredShare)} del frenado en las ruedas`
      : 'Todavía no frenaste: nada llegó a la batería';
  const car = `el auto del ${cycleName}`;
  if (!(reference.eBrake > 0)) return `${yours}; ${car} todavía no frenó.`;
  const scope = isEnd ? 'en el tramo' : 'hasta este instante';
  return `${yours}; ${car} ${scope}: ${kj(reference.eBattery)} y ${share(reference.recoveredShare)}.`;
}

/**
 * What a run did, when it pauses or ends: the distance and where it stopped against the line, then
 * the energy to the battery and the share of the braking, yours and the cycle's car's.
 */
export function driveSummary(input: SummaryInput): string {
  const isEnd = input.t >= input.course.duration - END_EPSILON_S;
  return `${motionSentence(input, isEnd)} ${energySentence(input, isEnd)}`;
}

/** The scene's name, after the car's: the cycle's car against yours, and the line. */
export function driveSceneCaption(
  own: BalanceAt,
  reference: BalanceAt,
  course: DriveCourse,
  cycleName: string,
): string {
  const gap = reference.distance - own.distance;
  const where =
    Math.abs(gap) < ON_LINE_M
      ? 'a tu altura'
      : `${meters(Math.abs(gap))} ${gap > 0 ? 'por delante' : 'por detrás'}`;
  const ahead = course.stopLine - own.distance;
  const line =
    Math.abs(ahead) < ON_LINE_M
      ? 'Estás en la línea de detención.'
      : ahead > 0
        ? `La línea de detención está ${meters(ahead)} adelante.`
        : `Pasaste la línea de detención por ${meters(-ahead)}.`;
  return `El auto de contorno discontinuo es el del ${cycleName}: va a ${kmh(reference.v)}, ${where}. ${line}`;
}

/** The longest a summary reads: 4-digit distances and energies, 3-digit speeds (the reserve). */
const LONG_DISTANCE_M = 9_999;
const LONG_ENERGY_J = 9_999_900;
const LONG_SPEED_MS = 99;

/**
 * The longest summary the course can say, for the status line's reserve: the end while still moving
 * and a pause near the end, with every number at its widest; the longer of the two.
 */
export function longestSummary(course: DriveCourse, cycleName: string): string {
  const wide: BalanceAt = {
    t: 0,
    v: LONG_SPEED_MS,
    distance: course.startDistance + LONG_DISTANCE_M,
    pWheel: 0,
    pBrake: 0,
    pRegen: 0,
    pFriction: 0,
    pBattery: 0,
    eTraction: LONG_ENERGY_J,
    eRoadLoad: LONG_ENERGY_J,
    eBrake: LONG_ENERGY_J,
    eBattery: LONG_ENERGY_J,
    eFriction: LONG_ENERGY_J,
    eConversionLoss: LONG_ENERGY_J,
    recoveredShare: 1,
  };
  const input = { own: wide, reference: wide, course, cycleName };
  const atEnd = driveSummary({ ...input, t: course.duration });
  const paused = driveSummary({ ...input, t: course.duration - END_EPSILON_S * 2 });
  return atEnd.length >= paused.length ? atEnd : paused;
}

const seconds = (value: number, precision: number) => formatNumber(value, { precision, unit: 's' });

/** «Cómo se usa» of «Conducir»: the challenge, the pedals and their keys, the timeline, the summary. */
export const DRIVE_USAGE = `En «Conducir» conduces tú el tramo: el auto sale a la velocidad del ciclo y el reto es detenerte en la línea donde se detiene el auto del ciclo, para comparar qué parte de tu frenado vuelve a la batería con la del ciclo, con la misma definición que en «Tramo». Mantén pulsado el freno o el acelerador con el puntero, el dedo, Espacio o Intro, o usa ↓ y ↑ con un pedal enfocado: un pedal mantenido se hunde hasta el fondo en ${seconds(PEDAL_APPLY_S, 0)} y vuelve en ${seconds(PEDAL_RETURN_S, 1)} al soltarlo, así que los toques cortos frenan suave; el freno anula el acelerador. Pulsar un pedal arranca la reproducción; al final del tramo, empieza otra conducción. La línea de tiempo solo recorre lo ya conducido: al volver atrás y reproducir, sigues desde ahí. Al pausar o al terminar, un resumen dice la distancia, la energía a la batería y el porcentaje recuperado, tuyos y del ciclo. Con «Repetir», cada vuelta termina con su resumen y la siguiente empieza de nuevo.`;

const { wheelFricCoef, driveAxleWeightFrac } = FASTSIM_MODEL3_CHASSIS;

/** «Qué deja fuera el modelo» of «Conducir»: where the pedals' limits come from, and what is left out. */
export const DRIVE_LEFT_OUT = `En «Conducir», el acelerador empuja como mucho con la adherencia del eje trasero del Model 3 de FASTSim: $\\mu$ = ${formatNumber(wheelFricCoef, { precision: 1 })} y el ${formatNumber(driveAxleWeightFrac * PERCENT, { precision: 0, unit: '%' })} del peso sobre ese eje, con la transferencia de carga al acelerar, dan ${formatNumber(tractionAccelMax(), { precision: 2, unit: 'm/s²' })}; y nunca con más de los ${kw(FASTSIM_MOTOR_PMAX_W)} del motor. El freno llega a $\\mu n = \\mu m g$ en las cuatro ruedas. En el modelo, el preajuste del LEAF usa el mismo chasis y el mismo motor de ${kw(FASTSIM_MOTOR_PMAX_W)} que el del Model 3. El motor no tiene un límite de par propio y la adherencia del eje trasero no limita la regeneración. Sin pedal el auto rueda libre: lo frena solo la carga en carretera, sin el freno regenerativo al soltar el acelerador que traen muchos eléctricos.`;

/** The canvas note of «Conducir»: which car and which curve is whose, not by color alone. */
export const DRIVE_CANVAS_NOTE =
  'En «Conducir», el auto relleno es el tuyo y el de contorno discontinuo, el del ciclo; la barra que cruza la carretera es la línea de detención. En la gráfica de velocidad, tu conducción va en línea continua y el dato del ciclo, en línea discontinua.';
