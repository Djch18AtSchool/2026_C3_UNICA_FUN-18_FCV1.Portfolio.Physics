/**
 * What Tema 13's lab says that does not read a scene: the choices, the two presets with their
 * computed notes, where every value comes from (model vs product: the professor's rule), the
 * plate in use, and the lab's own lines of «Cómo se usa» and «Qué deja fuera el modelo». The
 * sentences that read a scene are in coolingLabReadings.ts. Every number is computed from the
 * model or the data modules, never copied.
 */
import {
  DESCHUTES_PUMP,
  FLOW_PER_KW_LPM,
  FLOW_PER_KW_RANGE,
  GF_PUBLISHED,
  MGX_MANIFOLD,
  MGX_RACK,
  RD109,
  SERVER_HOSES,
  UQD04,
  type Provenance,
} from '../../../lib/data/liquidCooling';
import type { ValueOrigin } from '../../../lib/data/origin';
import { PRESETS } from '../../../lib/data/liquidCoolingCircuit';
import { formatNumber } from '../../../lib/format';
import {
  flowFactorForPower,
  M3S_PER_GPM,
  type ReturnLayout,
} from '../../../lib/physics/hydraulics';
import type { Preset } from '../../../lib/presets';
import {
  coolingScene,
  presetState,
  RETURN_PRESSURE,
  type BaseId,
  type CoolingLabState,
  type CoolingScene,
} from './coolingScene';
import { kpa, lpm, MM_PER_M, number, PERCENT, toBar, W_PER_KW } from './coolingUnits';

const BASES: readonly BaseId[] = ['referencia24', 'mgx44'];

/** OCP's rule as the lab prints it: «1,5 L/min por kW». */
export const RULE = `${number(FLOW_PER_KW_LPM, 1)} L/min por kW`;
/** Ruling R28: a typical design target, not a minimum. */
export const OCP_TARGET = `objetivo de diseño de OCP (${RULE})`;
const PWMS = DESCHUTES_PUMP.curves.map((curve) => curve.pwm);
/** «de 33 a 100 % PWM», from the published curves. */
export const PWM_RANGE = `de ${Math.min(...PWMS)} a ${Math.max(...PWMS)} % PWM`;
/** «650 GPM»: where Deschutes' measured curves end. */
export const CURVE_END = `${number(DESCHUTES_PUMP.curveMaxFlow.value / M3S_PER_GPM, 0)} GPM`;

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
const bar = (pa: number) => number(toBar(pa), 2);
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

function targetSource(scene: CoolingScene): string {
  const perServer = number(HEAT_KW / scene.config.servers, 2);
  const range = `${number(FLOW_PER_KW_RANGE.min.value, 2)} a ${number(FLOW_PER_KW_RANGE.max.value, 1)}`;
  return `Cálculo propio: el objetivo típico de OCP, ${RULE} (recomienda de ${range}), por los ${perServer} kW de cada servidor, su parte de los ${number(HEAT_KW, 0)} kW que el líquido saca de un rack MGX de ${number(MGX_RACK.power.value / W_PER_KW, 0)} kW (${number(MGX_RACK.liquidCapture.value * PERCENT, 0)} %), repartidos por igual`;
}

const REFERENCE_DROP = PRESETS.referencia24.inletPressure - RETURN_PRESSURE;
const RETURN_SOURCE = `Supuesto: el CDU sostiene su presión de retorno, como lo haría su tanque de expansión; tomo la de la referencia, los ${kpa(RD109.inletPressure.value)} abs de entrada de GF menos su caída de ${kpa(REFERENCE_DROP)} (cálculo propio), y la impulsión es esa más la caída del circuito`;

const PUMP_SOURCE = `${DESCHUTES_PUMP.curves[0].source}; el eje de caudal acaba en ${CURVE_END}, lectura aproximada`;

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
      id: 'presiones',
      text: `Presión de retorno al CDU, ${kpa(RETURN_PRESSURE)} abs; la de impulsión, ${kpa(scene.config.inletPressure)} abs`,
      origin: 'ilustrativo',
      source: RETURN_SOURCE,
    },
    {
      id: 'placa',
      text: `Placa fría: ${number(toBar(RD109.plateDrop.value), 1)} bar a ${lpm(base.plateDesignFlow)}`,
      ...provenanceOf(base.provenance.plateDesignFlow),
    },
    { id: 'racks', text: `${base.racks} racks por CDU`, ...provenanceOf(base.provenance.racks) },
    {
      id: 'objetivo',
      text: `Objetivo de diseño por servidor, ${lpm(scene.minimum)}`,
      origin: 'calculo',
      source: targetSource(scene),
    },
    {
      id: 'bomba',
      text: `Curvas de la bomba de Deschutes, ${PWM_RANGE}`,
      origin: 'producto' as ValueOrigin,
      source: PUMP_SOURCE,
    },
  ];
}

/**
 * With Δp ∝ Q^1,9 (the OAI loop, RD109.systemExponent), the rise in flow that triples the pumping
 * power P = Δp·Q ∝ Q^2,9: the «46 %» of the use case and of step 4's lab caption.
 */
export const OVERSUPPLY_TO_TRIPLE = flowFactorForPower(3, RD109.systemExponent.value) - 1;

/** What the canvas notes say is to scale in the rack drawing. */
export const SCALE_NOTE = `En el dibujo del rack, el largo de cada barra es proporcional al caudal de su servidor, y la línea discontinua marca el ${OCP_TARGET}. Las alturas no están a escala: en el manifold MGX, los puertos están a ${formatNumber(MGX_MANIFOLD.portPitch.value * MM_PER_M, { precision: 2, unit: 'mm' })}.`;

/** «Cómo se usa», the lab's own line: the pump chart's cursor. */
export const CURSOR_HINT =
  'Arrastra el cursor de la gráfica de la bomba, o enfócalo y muévelo con las flechas (1 % del eje; con Mayús, 10 %): cambia el caudal de la bomba, como su deslizador.';

/** The cold plate in use, under the parameters: it comes with the base preset. */
export function plateNote(state: CoolingLabState): string {
  const [base, other] = [state.base, BASES.find((id) => id !== state.base) ?? state.base].map(
    (id) => PRESETS[id],
  );
  return `Placa fría de «${base.label}»: ${number(toBar(RD109.plateDrop.value), 1)} bar a ${lpm(base.plateDesignFlow)}, un supuesto; «${other.label}» trae la suya, a ${lpm(other.plateDesignFlow)}.`;
}

/** «Qué deja fuera el modelo», the lab's own lines (ruling R27 and the published curves). */
export const RETURN_NOTE = `Supongo que el CDU sostiene su presión de retorno, como lo haría su tanque de expansión, en ${kpa(RETURN_PRESSURE)} abs: la de la referencia, los ${kpa(RD109.inletPressure.value)} abs de entrada de GF menos su caída. La impulsión es esa más la caída del circuito, así que el perfil y la gráfica de la bomba dan la misma $\\Delta p$; dentro del rack, la presión baja además $\\rho g y$ al subir.`;
export const CURVE_NOTE = `De las ${DESCHUTES_PUMP.curves.length} curvas publicadas de Deschutes, uso la más baja que alcanza el caudal; no interpolo entre curvas.`;
