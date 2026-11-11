/**
 * The words of «Conducir»: the hint before a run, the notices of a limit (said once each per run),
 * the summary when a run pauses or ends, and the scene's name for screen readers. With KaTeX
 * between `$…$` where a symbol appears (InlineMath draws them). Never one per frame.
 */
import { formatNumber } from '../../../lib/format';
import type { RegenParams } from '../../../lib/physics/energy';
import { FASTSIM_MOTOR_PMAX_W } from '../../../lib/physics/energy';
import type { DriveState } from '../../../lib/physics/regenDrive';
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
      return `Freno limitado por la batería: pasa de $P_\\text{máx}$ = ${kw(regen.pMax)} y el resto lo disipan las pastillas.`;
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
