/**
 * What the resonance lab's canvas says to a screen reader, at the settled time: the mode's
 * structure, what drives it and how much it moves (formulas between $…$, spoken by the scene with
 * mathTextToString).
 */
import { MARCH_PACE_HZ } from '../../../lib/data/bridges';
import { formatNumber } from '../../../lib/format';
import type { ActiveModel } from './bridgeFrames';
import { envelopeAt } from './resonanceRun';

const MM_PER_M = 1000;
const PERCENT = 100;

export interface SceneTextInput {
  active: ActiveModel;
  t: number;
  decimals: number;
}

export function describeScene({ active, t, decimals }: SceneTextInput): string {
  const hz = (value: number) => formatNumber(value, { precision: decimals, unit: 'Hz' });
  if (active.mode === 'barrido') {
    const { sweep } = active;
    const { f0 } = sweep.settings;
    return `Puente de prueba de $f_0$ = ${hz(f0)} con un vibrador en el centro del vano. La frecuencia de la fuerza sube de ${hz(0.5 * f0)} a ${hz(1.5 * f0)}; ahora vale ${hz(sweep.driveHzAt(t))} y la amplitud es ${formatNumber(envelopeAt(sweep.run, t), { precision: decimals })} veces la deformación estática.`;
  }
  if (active.mode === 'tropa') {
    const { troop, step } = active;
    const run = step === 'al-paso' ? troop.runs.inStep : troop.runs.breaking;
    const how = step === 'al-paso' ? 'al paso' : 'rompiendo el paso';
    return `Pasarela de $f_0$ = ${hz(troop.settings.f0)} con ${troop.settings.n} soldados ${how} a ${hz(MARCH_PACE_HZ)}; el tablero sube y baja ${formatNumber(envelopeAt(run, t) * MM_PER_M, { precision: 0, unit: 'mm' })}.`;
  }
  const { zv } = active;
  return `Dos tableros iguales de $f_0$ = ${hz(zv.settings.f0)}: arriba, un solo empujón; abajo, los dos impulsos del filtro ZV de ${hz(zv.settings.fZv)}. Tras el segundo impulso queda, según la estimación de Klipper, el ${formatNumber(zv.residual * PERCENT, { precision: 1 })} % de la vibración de un solo empujón.`;
}
