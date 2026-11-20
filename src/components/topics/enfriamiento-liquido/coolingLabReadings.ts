/**
 * The sentences of Tema 13's lab that read a scene: the readouts' names, the status chips, the
 * worst server against OCP's design target, the pump's chart in words and the rack in words.
 * Ruling R28: OCP's 1,5 L/min per kW is a typical design target (OCP recommends 1,25 to 2,0), so
 * a server below it is «por debajo del objetivo de diseño de OCP», never short of a minimum.
 */
import { DESCHUTES_PUMP } from '../../../lib/data/liquidCooling';
import type { StatusChip } from '../../lab/StatusChips';
import { CURVE_END, OCP_TARGET, RULE } from './coolingLabText';
import type { CoolingScene, SceneFailure } from './coolingScene';
import { kpa, litres, lpm, number, PERCENT } from './coolingUnits';

/** «más lejano» when the server that gets least is the top one, else «peor servido». */
export function worstName(worst: CoolingScene['worst']): string {
  return worst.isFarthest ? 'más lejano' : 'peor servido';
}

export function readoutLabels(scene: CoolingScene) {
  return {
    worst: `Caudal del servidor ${scene.worst.port}, el ${worstName(scene.worst)}`,
    target: `Objetivo de diseño de OCP por servidor (${RULE})`,
    drop: 'Caída hasta el más lejano $\\Delta p$',
    power: 'Potencia de bombeo del CDU $P = \\Delta p\\,Q$',
  } as const;
}

/** What each failure says: only a split that did not converge says so. */
export const FAILURE_TEXT: Readonly<Record<SceneFailure, string>> = {
  reparto: 'El reparto no converge con estos valores',
  valores: 'Estos valores quedan fuera del modelo',
};

/** The chips over the rack: why the state has no scene, if so; the worst server; the UQD04. */
export function statusChips(scene: CoolingScene, failure: SceneFailure | null): StatusChip[] {
  const name = worstName(scene.worst);
  return [
    ...(failure ? [{ id: 'fallo', text: FAILURE_TEXT[failure] }] : []),
    {
      id: 'objetivo',
      text: `El servidor ${name} ${scene.isShort ? 'está por debajo del' : 'alcanza el'} ${OCP_TARGET}`,
    },
    {
      id: 'uqd',
      text: `Cada UQD04 ${scene.isUqdOver ? 'pasa de' : 'va dentro de'} su caudal nominal`,
    },
  ];
}

const percent = (factor: number) => number((factor - 1) * PERCENT, 1);

/** The worst server's margin over the target, or the flow and power it would take to reach it. */
export function shortfallNote(scene: CoolingScene): string {
  const { worst, minimum, needed, neededPower, config } = scene;
  if (!scene.isShort) {
    return `El servidor ${worst.port}, el ${worstName(worst)}, recibe ${lpm(worst.flow)}: un ${percent(worst.flow / minimum)} % más que el ${OCP_TARGET}, ${lpm(minimum)} por servidor.`;
  }
  return `El servidor ${worst.port} está por debajo del ${OCP_TARGET}: para alcanzarlo, el caudal de la bomba tiene que subir un ${percent(needed)} %, a ${lpm(config.rackFlow * needed, 1)} por rack, y la potencia de bombeo se multiplica por ${number(neededPower, 2)}.`;
}

/** The pump's chart in words: the duty point, the published curve that gives it, where it runs. */
export function pumpNote(scene: CoolingScene): string {
  const { duty, curve, operating } = scene.pump;
  const asked = `Para mover ${litres(duty.Q)} por los ${scene.config.racks} racks, la bomba tiene que vencer ${kpa(duty.dp)}: el punto pedido.`;
  if (!curve) {
    return duty.Q > DESCHUTES_PUMP.curveMaxFlow.value
      ? `${asked} Ese caudal pasa de los ${CURVE_END} de las curvas publicadas de Deschutes.`
      : `${asked} Ninguna curva publicada de Deschutes, ni la de 100 % PWM, da esa presión a ese caudal.`;
  }
  const lowest = `La curva publicada más baja que lo da es la de ${curve.pwm} % PWM`;
  if (!operating) {
    return `${asked} ${lowest}, pero a esa velocidad fija cruzaría la curva del circuito más allá de los ${CURVE_END} medidos.`;
  }
  return `${asked} ${lowest}; a esa velocidad fija, la bomba trabajaría en ${litres(operating.Q)} y ${kpa(operating.dp)}. El control por omisión de Deschutes ajusta la velocidad para sostener una $\\Delta p$ fija: con la del punto pedido, la bomba se queda en él.`;
}

/** The rack drawing in words: its accessible name. */
export function rackSummary(scene: CoolingScene): string {
  const { config, worst, minimum } = scene;
  const outlet = config.layout === 'directo' ? 'abajo' : 'arriba';
  return `Rack de ${config.servers} ${config.servers === 1 ? 'servidor' : 'servidores'} con retorno ${config.layout}: el líquido entra abajo por el manifold de impulsión y sale ${outlet} por el de retorno. Cada barra es el caudal de un servidor, y la línea discontinua, el ${OCP_TARGET}: ${lpm(minimum)} por servidor. El servidor ${worst.port}, el ${worstName(worst)}, recibe ${lpm(worst.flow)}.`;
}
