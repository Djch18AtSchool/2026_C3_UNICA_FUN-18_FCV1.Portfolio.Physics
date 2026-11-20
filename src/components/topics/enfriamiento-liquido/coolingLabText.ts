/**
 * What Tema 13's lab says: the choices, the two presets with their computed notes, where every
 * value comes from (model vs product: the professor's rule), the status chips, the readouts'
 * names and the sentences that read the scene. Every number is computed from the model or the
 * data modules, never copied.
 */
import {
  DESCHUTES_PUMP,
  FLOW_PER_KW_LPM,
  GF_PUBLISHED,
  MGX_MANIFOLD,
  MGX_RACK,
  RD109,
  SERVER_HOSES,
  UQD04,
  type Provenance,
  type ValueOrigin,
} from '../../../lib/data/liquidCooling';
import { PRESETS } from '../../../lib/data/liquidCoolingCircuit';
import { formatNumber } from '../../../lib/format';
import {
  flowFactorForPower,
  M3S_PER_GPM,
  M3S_PER_LPM,
  PA_PER_BAR,
  type ReturnLayout,
} from '../../../lib/physics/hydraulics';
import type { Preset } from '../../../lib/presets';
import type { StatusChip } from '../../lab/StatusChips';
import {
  coolingScene,
  presetState,
  type BaseId,
  type CoolingLabState,
  type CoolingScene,
} from './coolingScene';

const MM_PER_M = 1e3;
const L_PER_M3 = 1e3;
const PA_PER_KPA = 1e3;
const W_PER_KW = 1e3;
const PERCENT = 100;
const BASES: readonly BaseId[] = ['referencia24', 'mgx44'];

const lpm = (flow: number, precision = 2) =>
  formatNumber(flow / M3S_PER_LPM, { precision, unit: 'L/min' });
const number = (value: number, precision: number) => formatNumber(value, { precision });

/** The fewest decimals (up to two) that write a diameter in mm exactly. */
const mm = (diameter: number) => {
  const value = diameter * MM_PER_M;
  const precision = [0, 1, 2].find((p) => Math.abs(Number(value.toFixed(p)) - value) < 1e-9) ?? 2;
  return formatNumber(value, { precision, unit: 'mm' });
};

export const HOSE_OPTIONS = SERVER_HOSES.map((hose) => ({
  value: hose.id,
  label: `${hose.label} (${mm(hose.diameter.value)})`,
}));

export const LAYOUT_OPTIONS: readonly { value: ReturnLayout; label: string }[] = [
  { value: 'directo', label: 'Directo' },
  { value: 'invertido', label: 'Invertido' },
];

/* ── Presets ─────────────────────────────────────────────────────────────────────────── */

const presetScene = (id: BaseId) => {
  const scene = coolingScene(presetState(id));
  if (!scene) throw new Error(`coolingLabText: the preset "${id}" has no valid scene`);
  return scene;
};
const bar = (pa: number) => number(pa / PA_PER_BAR, 2);
const meanFlow = (scene: CoolingScene) => scene.config.rackFlow / scene.config.servers;
const NOMINAL = lpm(UQD04.nominalFlow.value);

function referenceNote(): string {
  const scene = presetScene('referencia24');
  return `Valida contra GF: hasta el servidor más lejano se pierden ${bar(scene.drop)} bar, frente a sus ${bar(GF_PUBLISHED.totalDrop.value)}; cada UQD04 lleva ${lpm(meanFlow(scene))}, más que sus ${NOMINAL} nominales.`;
}

function mgxNote(): string {
  const scene = presetScene('mgx44');
  return `Los ${lpm(scene.config.rackFlow, 0)} del CFD de GF en los ${scene.config.servers} puertos del manifold MGX: cada UQD04 lleva ${lpm(meanFlow(scene))}, dentro de sus ${NOMINAL} nominales, y hasta el más lejano se pierden ${bar(scene.drop)} bar.`;
}

export const COOLING_PRESETS: readonly Preset<CoolingLabState>[] = [
  {
    id: 'referencia24',
    name: PRESETS.referencia24.label,
    values: presetState('referencia24'),
    sourceLabel: 'GF Piping Systems (2026), tabla 1 y fig. 2; OCP, UQD v2.0.0, tabla 6',
    note: referenceNote(),
  },
  {
    id: 'mgx44',
    name: PRESETS.mgx44.label,
    values: presetState('mgx44'),
    sourceLabel: 'GF Piping Systems (2026), fig. 5; NVIDIA, MGX (OCP, 2024), fig. 7-13',
    note: mgxNote(),
  },
];

const sameState = (a: CoolingLabState, b: CoolingLabState) =>
  a.base === b.base &&
  a.pumpFlow === b.pumpFlow &&
  a.hose === b.hose &&
  a.servers === b.servers &&
  a.layout === b.layout;

/** The preset whose every value the state has, if any. */
export function presetIdFor(state: CoolingLabState): string | undefined {
  return COOLING_PRESETS.find((preset) => sameState(preset.values, state))?.id;
}

/* ── Where each value comes from ─────────────────────────────────────────────────────── */

export interface ValueOriginRow extends Provenance {
  id: string;
  /** The value, named: «Caudal de la bomba por rack, 172,5 L/min». */
  text: string;
}

const CHOSEN: Provenance = {
  origin: 'ilustrativo',
  source: 'Supuesto: valor elegido en el laboratorio',
};
const REVERSE_RETURN: Provenance = {
  origin: 'ilustrativo',
  source: 'Supuesto: retorno invertido, con la entrada abajo y la salida arriba',
};
const provenanceOf = ({ origin, source }: Provenance): Provenance => ({ origin, source });

/** A preset's own provenance for a value the state shares with that preset, else the reader's. */
function sharedWithPreset(
  matches: (preset: CoolingLabState) => boolean,
  field: 'rackFlow' | 'servers',
): Provenance {
  const id = BASES.find((base) => matches(presetState(base)));
  return id ? provenanceOf(PRESETS[id].provenance[field]) : CHOSEN;
}

const HEAT_KW = (MGX_RACK.power.value * MGX_RACK.liquidCapture.value) / W_PER_KW;

function minimumSource(scene: CoolingScene): string {
  const perServer = number(HEAT_KW / scene.config.servers, 2);
  return `Cálculo propio: ${number(FLOW_PER_KW_LPM, 1)} L/min por kW (OCP) por los ${perServer} kW de cada servidor, su parte de los ${number(HEAT_KW, 0)} kW que el líquido saca de un rack MGX de ${number(MGX_RACK.power.value / W_PER_KW, 0)} kW (${number(MGX_RACK.liquidCapture.value * PERCENT, 0)} %), repartidos por igual`;
}

const PUMP_SOURCE = `${DESCHUTES_PUMP.curves[0].source}; el eje de caudal acaba en ${number(DESCHUTES_PUMP.curveMaxFlow.value / M3S_PER_GPM, 0)} GPM, lectura aproximada`;

/** Every value the lab computes with, its origin and its one source, for the state shown. */
export function valueOrigins(state: CoolingLabState, scene: CoolingScene): ValueOriginRow[] {
  const base = PRESETS[state.base];
  const hose = SERVER_HOSES.find((candidate) => candidate.id === state.hose) ?? SERVER_HOSES[2];
  const layout = state.layout === 'directo' ? base.provenance.layout : REVERSE_RETURN;
  return [
    {
      id: 'caudal',
      text: `Caudal de la bomba por rack, ${formatNumber(state.pumpFlow, { precision: 1, unit: 'L/min' })}`,
      ...sharedWithPreset((preset) => preset.pumpFlow === state.pumpFlow, 'rackFlow'),
    },
    {
      id: 'servidores',
      text: `${state.servers} ${state.servers === 1 ? 'servidor' : 'servidores'} en el rack`,
      ...sharedWithPreset((preset) => preset.servers === state.servers, 'servers'),
    },
    {
      id: 'manguera',
      text: `Manguera del servidor de ${hose.label}, ${mm(hose.diameter.value)}`,
      ...provenanceOf(hose.diameter),
    },
    { id: 'retorno', text: `Retorno ${state.layout}`, ...provenanceOf(layout) },
    {
      id: 'placa',
      text: `Placa fría: ${number(RD109.plateDrop.value / PA_PER_BAR, 1)} bar a ${lpm(base.plateDesignFlow)}`,
      ...provenanceOf(base.provenance.plateDesignFlow),
    },
    { id: 'racks', text: `${base.racks} racks por CDU`, ...provenanceOf(base.provenance.racks) },
    {
      id: 'minimo',
      text: `Mínimo de cada servidor, ${lpm(scene.minimum)}`,
      origin: 'calculo',
      source: minimumSource(scene),
    },
    {
      id: 'bomba',
      text: 'Curvas de la bomba de Deschutes, de 33 a 100 % PWM',
      origin: 'producto' as ValueOrigin,
      source: PUMP_SOURCE,
    },
  ];
}

/* ── What the lab says about the scene ───────────────────────────────────────────────── */

/** «más lejano» when the server that gets least is the top one, else «peor servido». */
export function worstName(worst: CoolingScene['worst']): string {
  return worst.isFarthest ? 'más lejano' : 'peor servido';
}

export function readoutLabels(scene: CoolingScene) {
  return {
    worst: `Caudal del servidor ${scene.worst.port}, el ${worstName(scene.worst)}`,
    minimum: 'Mínimo de cada servidor, 1,5 L/min por kW',
    drop: 'Caída hasta el más lejano $\\Delta p$',
    power: 'Potencia de bombeo del CDU $P = \\Delta p\\,Q$',
  } as const;
}

/** The chips over the rack: the split when it fails, the worst server and the UQD04. */
export function statusChips(scene: CoolingScene, isConverged: boolean): StatusChip[] {
  const name = worstName(scene.worst);
  return [
    ...(isConverged ? [] : [{ id: 'reparto', text: 'El reparto no converge con estos valores' }]),
    {
      id: 'minimo',
      text: `El servidor ${name} ${scene.isShort ? 'no llega' : 'llega'} a su mínimo`,
    },
    {
      id: 'uqd',
      text: `Cada UQD04 ${scene.isUqdOver ? 'pasa de' : 'va dentro de'} su caudal nominal`,
    },
  ];
}

const percent = (factor: number) => number((factor - 1) * PERCENT, 1);

/** The worst server's margin over its minimum, or the flow and power it would take to reach it. */
export function shortfallNote(scene: CoolingScene): string {
  const { worst, minimum, needed, neededPower, config } = scene;
  if (!scene.isShort) {
    return `El servidor ${worst.port}, el ${worstName(worst)}, recibe ${lpm(worst.flow)}: un ${percent(worst.flow / minimum)} % más que su mínimo de ${lpm(minimum)}.`;
  }
  return `Para que el servidor ${worst.port} llegue a su mínimo, el caudal de la bomba tiene que subir un ${percent(needed)} %, a ${lpm(config.rackFlow * needed, 1)} por rack, y la potencia de bombeo se multiplica por ${number(neededPower, 2)}.`;
}

const litres = (flow: number) => formatNumber(flow * L_PER_M3, { precision: 1, unit: 'L/s' });
const kpa = (pa: number) => formatNumber(pa / PA_PER_KPA, { precision: 1, unit: 'kPa' });
const CURVE_END = `${number(DESCHUTES_PUMP.curveMaxFlow.value / M3S_PER_GPM, 0)} GPM`;

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
  return `Rack de ${config.servers} ${config.servers === 1 ? 'servidor' : 'servidores'} con retorno ${config.layout}: el líquido entra abajo por el manifold de impulsión y sale ${outlet} por el de retorno. Cada barra es el caudal de un servidor, y la línea discontinua, su mínimo de ${lpm(minimum)}. El servidor ${worst.port}, el ${worstName(worst)}, recibe ${lpm(worst.flow)}.`;
}

/**
 * With Δp ∝ Q^1,9 (the OAI loop, RD109.systemExponent), the rise in flow that triples the pumping
 * power P = Δp·Q ∝ Q^2,9: the «46 %» of the use case and of step 4's lab caption.
 */
export const OVERSUPPLY_TO_TRIPLE = flowFactorForPower(3, RD109.systemExponent.value) - 1;

/** What the canvas notes say is to scale in the rack drawing. */
export const SCALE_NOTE = `En el dibujo del rack, el largo de cada barra es proporcional al caudal de su servidor, y la línea discontinua marca el mínimo. Las alturas no están a escala: en el manifold MGX, los puertos están a ${formatNumber(MGX_MANIFOLD.portPitch.value * MM_PER_M, { precision: 2, unit: 'mm' })}.`;

/** «Cómo se usa», the lab's own line: the pump chart's cursor. */
export const CURSOR_HINT =
  'Arrastra el cursor de la gráfica de la bomba, o enfócalo y muévelo con las flechas (1 % del eje; con Mayús, 10 %): cambia el caudal de la bomba, como su deslizador.';
