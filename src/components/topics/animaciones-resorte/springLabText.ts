/**
 * What Tema 10's laboratory says in words: the regime chip, the curve's lane, the summary of the
 * run in its canvas notes and the lab's own «Cómo se usa». Times with two decimals and speeds in
 * whole px/s, whatever the global decimals: the readouts of this lab fix theirs too.
 */
import { formatNumber } from '../../../lib/format';
import {
  dampingRegime,
  type DampingRegime,
  type SpringParams,
} from '../../../lib/physics/dampedSpring';
import {
  bezierLegAt,
  lastJump,
  legSettle,
  MOTION_REST,
  type SpringLeg,
  type SpringRun,
} from './springScene';

const REGIME_LABELS: Readonly<Record<DampingRegime, string>> = {
  'sin-amortiguar': 'Sin amortiguar, $b = 0$',
  subamortiguado: 'Subamortiguado, $\\zeta < 1$',
  critico: 'Crítico, $\\zeta = 1$',
  sobreamortiguado: 'Sobreamortiguado, $\\zeta > 1$',
};

/** The regime in words, inside a sentence (the scene's description, the plot's). */
export const REGIME_WORDS: Readonly<Record<DampingRegime, string>> = {
  'sin-amortiguar': 'sin amortiguar',
  subamortiguado: 'subamortiguado',
  critico: 'crítico',
  sobreamortiguado: 'sobreamortiguado',
};

export const SPRING_LANE = 'Resorte';
export const COMPARISON_LANE = 'Curva de duración fija';

/** The lab's keys, said in «Cómo se usa» and in the canvas's accessible name. */
const SPRING_SHORTCUTS =
  'Espacio o K reproduce y pausa; I interrumpe; R vuelve al inicio; «,» y «.» retroceden o avanzan 1/60 s';
/** The same keys for aria-keyshortcuts. */
export const SPRING_KEYS = 'Space K I R , .';
/** The canvas's accessible name: it takes the focus so its keys work where the reader is. */
export const CANVAS_NAME = `Tarjetas del laboratorio. Atajos: ${SPRING_SHORTCUTS}.`;

/** «Cómo se usa», the lab's own lines: the interruption and the keys. */
export const SPRING_USAGE = [
  'Reproduce y pulsa «Interrumpir» con las tarjetas a mitad de camino: el destino pasa a la otra marca. También puedes pausar, llevar la línea de tiempo o el cursor de la gráfica a un instante e interrumpir ahí. Cada interrupción queda en la línea de tiempo; una nueva antes de otra la reemplaza a ella y a las siguientes.',
  `Atajos, con el foco en el lienzo (un clic en él, o Tab) o en el cursor de la gráfica: ${SPRING_SHORTCUTS}.`,
];

/** Under «Interrumpir»: what it does, or why it waits (at the start, paused). */
export const INTERRUPT_HINT =
  'Cambia el destino al instante: el resorte sigue con su velocidad y la curva arranca otra vez desde el reposo.';
export const INTERRUPT_WAIT_HINT =
  'En el inicio no hay movimiento que interrumpir: reproduce o mueve la línea de tiempo.';

/** A time of the lab, at its fixed two decimals: «0,81 s». */
export const formatSeconds = (value: number) => formatNumber(value, { precision: 2, unit: 's' });
const seconds = formatSeconds;
const speed = (value: number) => formatNumber(value, { precision: 0, unit: 'px/s' });

/** The regime chip: its name and its condition, from the core's tolerance alone (no flicker). */
export function regimeLabel(params: SpringParams): string {
  return REGIME_LABELS[dampingRegime(params)];
}

const lastLeg = (run: SpringRun): SpringLeg => run.spring[run.spring.length - 1];

/**
 * When the spring enters the 2 % band for good: «nunca» without damping; on a plain step its t_s;
 * after a press, on the clock and since the press.
 */
export function settlingText(run: SpringRun): string {
  const leg = lastLeg(run);
  const settle = legSettle(run.params, leg);
  if (!Number.isFinite(settle)) {
    return 'nunca: con $b = 0$ el resorte no pierde energía, $dE/dt = -b v^2 = 0$';
  }
  if (leg.start === 0) return seconds(settle);
  if (settle === 0) {
    return `${seconds(leg.start)}: tras la última interrupción ya no sale de la banda`;
  }
  return `a los ${seconds(leg.start + settle)}: ${seconds(settle)} después de la última interrupción`;
}

/** How long the curve of the last leg lasts, and why. */
export function comparisonText(run: SpringRun): string {
  const curve = run.bezier[run.bezier.length - 1];
  const settle = legSettle(run.params, lastLeg(run));
  const lead = `ease-in-out de ${seconds(curve.duration)}`;
  if (Number.isFinite(settle) && settle > 0) {
    return `${lead}, el $t_s$ del resorte: salen y llegan a la vez`;
  }
  const why = Number.isFinite(settle) ? 'no sale de la banda' : 'nunca se asienta';
  return `${lead}, la $d = 2\\pi/\\omega_0$ de la (10.10), porque el resorte ${why}`;
}

/** The velocities at the last press: the spring's kept (10.9), the curve's dropped to 0. */
export function jumpText(run: SpringRun): string {
  const jump = lastJump(run);
  if (!jump) return 'ninguna todavía: pulsa «Interrumpir» con las tarjetas a mitad de camino';
  const lead = `a $t^*$ = ${seconds(jump.t)}`;
  const isAtRest = jump.spring.after === 0 && Math.abs(jump.spring.before) <= MOTION_REST.speed;
  if (isAtRest && jump.bezier.before === 0) {
    return `${lead} las dos estaban en reposo: solo cambia el destino`;
  }
  return `${lead} el resorte sigue a ${speed(jump.spring.after)}; la curva pasa de ${speed(jump.bezier.before)} a 0`;
}

/** The curve's lane under its title: its easing and the duration of the leg at time t. */
export function comparisonLabel(run: SpringRun, t: number): string {
  return `ease-in-out, $T$ = ${seconds(bezierLegAt(run, t).duration)}`;
}
