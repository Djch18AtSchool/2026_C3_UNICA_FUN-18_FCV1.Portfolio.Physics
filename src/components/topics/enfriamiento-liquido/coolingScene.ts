/**
 * Tema 13's laboratory, the model: the four parameters (the pump's flow into each rack, the
 * server hose, the servers on the manifold and the return layout) on top of a base preset (its
 * cold plate, racks and inlet pressure), and what they give: the split among the servers (13.4),
 * the server that gets least against its minimum (OCP's 1,5 L/min per kW), the drop to the
 * farthest server, the pumping power P = Δp·Q and the operating point on Deschutes' published
 * curves. Pure. A split that does not converge, or any reading that is not finite, gives no scene,
 * and the lab keeps its last valid one (Review Focus 3). Research
 * docs/superpowers/research/2026-11-17-enfriamiento-liquido.md, §7 and §8.
 */
import {
  DESCHUTES_PUMP,
  FLOW_PER_KW_LPM,
  MGX_MANIFOLD,
  MGX_RACK,
  PG25_40C,
  pumpPressure,
  SERVER_HOSES,
  UQD04,
  type PumpCurve,
  type ServerHoseId,
} from '../../../lib/data/liquidCooling';
import {
  PRESETS,
  rackPath,
  rackSplit,
  serverFlow,
  type CoolingPreset,
  type RackConfig,
} from '../../../lib/data/liquidCoolingCircuit';
import {
  hydraulicPower,
  M3S_PER_LPM,
  operatingPoint,
  seriesLoss,
  type BranchFlowsResult,
  type ReturnLayout,
} from '../../../lib/physics/hydraulics';
import { W_PER_KW } from './coolingUnits';

export type BaseId = CoolingPreset['id'];

/** What the reader sets, on top of the base preset whose hardware the edits start from. */
export interface CoolingLabState {
  base: BaseId;
  /** Flow the CDU's pump sends into each rack (L/min). */
  pumpFlow: number;
  hose: ServerHoseId;
  servers: number;
  layout: ReturnLayout;
}

/** The pump-flow slider (L/min per rack): above 0, so the path always has a flow. */
export const PUMP_FLOW = { min: 10, max: 300, step: 0.5 } as const;
/** One server up to the 44 ports of the MGX manifold. */
export const SERVER_COUNT = { min: 1, max: MGX_MANIFOLD.ports.value, step: 1 } as const;

/** Each server's share of the rack's heat to the liquid (W), at OCP's design target of 1,5 L/min per kW. */
const RACK_LIQUID_HEAT = MGX_RACK.power.value * MGX_RACK.liquidCapture.value;
const MINIMUM_PER_WATT = (FLOW_PER_KW_LPM * M3S_PER_LPM) / W_PER_KW;

const hoseOf = (id: ServerHoseId) => {
  const hose = SERVER_HOSES.find((candidate) => candidate.id === id);
  if (!hose) throw new RangeError(`coolingScene: unknown hose "${id}"`);
  return hose;
};

/** The hose whose diameter is `diameter`, or GF's 3/8″. */
const hoseIdOf = (diameter: number): ServerHoseId =>
  SERVER_HOSES.find((hose) => hose.diameter.value === diameter)?.id ?? '3/8';

/** A preset's values as the lab's state, the flow in L/min on the slider's grid. */
export function presetState(id: BaseId): CoolingLabState {
  const preset = PRESETS[id];
  const pumpFlow = Math.round(preset.rackFlow / M3S_PER_LPM / PUMP_FLOW.step) * PUMP_FLOW.step;
  return {
    base: id,
    pumpFlow,
    hose: hoseIdOf(preset.serverHoseDiameter),
    servers: preset.servers,
    layout: preset.layout,
  };
}

export const INITIAL_COOLING_STATE: Readonly<CoolingLabState> = presetState('referencia24');

/** The rack the state describes, before the pump sets its supply pressure. */
function rackOf(state: CoolingLabState, inletPressure: number): RackConfig {
  const { racks, plateDesignFlow } = PRESETS[state.base];
  return {
    racks,
    plateDesignFlow,
    inletPressure,
    servers: state.servers,
    rackFlow: state.pumpFlow * M3S_PER_LPM,
    serverHoseDiameter: hoseOf(state.hose).diameter.value,
    layout: state.layout,
  };
}

const cduFlowOf = (config: RackConfig) => config.racks * config.rackFlow;

/**
 * Ruling R27: the CDU holds its return pressure, the reference that its expansion tank keeps in a
 * closed loop; I take the reference's, GF's 4 bar abs at the CDU outlet less the reference's drop
 * (220,1 kPa abs). The supply is then that plus the drop of the rack in use, so p(x) agrees with
 * the pump chart and never falls below absolute zero.
 */
export const RETURN_PRESSURE = (() => {
  const reference = PRESETS.referencia24;
  return reference.inletPressure - systemCurve(reference)(cduFlowOf(reference));
})();

/** The rack the state describes: the base preset's plate and racks, the four parameters, and the
 * supply pressure the pump gives it, the held return pressure plus its drop. */
export function labConfig(state: CoolingLabState): RackConfig {
  const rack = rackOf(state, RETURN_PRESSURE);
  return { ...rack, inletPressure: RETURN_PRESSURE + systemCurve(rack)(cduFlowOf(rack)) };
}

/** A flow (m³/s) and the pressure (Pa) at it. */
export interface FlowPoint {
  Q: number;
  dp: number;
}

export interface PumpReading {
  /** The CDU's flow for all its racks and the drop the circuit asks at it. */
  duty: FlowPoint;
  /** The lowest of Deschutes' published curves that gives the duty point; null when none does. */
  curve: PumpCurve | null;
  /** Where that curve meets the system curve; null beyond its measured range. */
  operating: FlowPoint | null;
}

export interface CoolingScene {
  config: RackConfig;
  /** Each server's flow (m³/s), from port 1 (bottom, by the inlet) to the top. */
  flows: readonly number[];
  /** The server that gets least; the farthest (the top one) in direct return. */
  worst: { port: number; flow: number; isFarthest: boolean };
  /**
   * Each server's flow at OCP's typical design target (m³/s), 1,5 L/min per kW of its share of the
   * rack's heat to the liquid; a target, not a minimum (ruling R28: OCP recommends 1,25 to 2,0).
   */
  minimum: number;
  isShort: boolean;
  /** Factor the rack's flow must rise by for the worst server to reach the target; 1 if it does. */
  needed: number;
  /** The pumping power's factor for that rise, on the circuit's own curve. */
  neededPower: number;
  /** Inlet minus outlet pressure on the path to the farthest server (Pa). */
  drop: number;
  /** The CDU's flow: every rack's (m³/s). */
  cduFlow: number;
  /** Hydraulic power P = Δp·Q of the pump for the whole CDU (W). */
  power: number;
  /** Each server's mean flow passes the UQD04's nominal flow. */
  isUqdOver: boolean;
  pump: PumpReading;
}

/** The circuit's curve for the whole CDU: the drop to the farthest server at a CDU flow Q (Pa). */
export function systemCurve(config: RackConfig): (Q: number) => number {
  const path = rackPath(config);
  const branches = config.racks * config.servers;
  return (Q) => seriesLoss(path, Q / branches, PG25_40C);
}

const CURVES_BY_PWM = [...DESCHUTES_PUMP.curves].sort((a, b) => a.pwm - b.pwm);
const CURVE_MAX_FLOW = DESCHUTES_PUMP.curveMaxFlow.value;

/** The duty point at the CDU flow Q, the lowest curve that reaches it and that curve's operating point. */
export function pumpReading(config: RackConfig, Q: number): PumpReading {
  const system = systemCurve(config);
  const duty = { Q, dp: system(Q) };
  const curve =
    Q > CURVE_MAX_FLOW
      ? undefined
      : CURVES_BY_PWM.find((candidate) => pumpPressure(candidate, Q) >= duty.dp);
  if (!curve) return { duty, curve: null, operating: null };
  return {
    duty,
    curve,
    operating: operatingPoint((q) => pumpPressure(curve, q), system, CURVE_MAX_FLOW),
  };
}

type Split = (config: RackConfig) => BranchFlowsResult;

function worstOf(flows: readonly number[]): CoolingScene['worst'] {
  const flow = Math.min(...flows);
  const port = flows.indexOf(flow) + 1;
  return { port, flow, isFarthest: port === flows.length };
}

function readings(config: RackConfig, flows: readonly number[]): CoolingScene {
  const system = systemCurve(config);
  const cduFlow = cduFlowOf(config);
  const drop = system(cduFlow);
  const worst = worstOf(flows);
  const minimum = (RACK_LIQUID_HEAT / config.servers) * MINIMUM_PER_WATT;
  const isShort = worst.flow < minimum;
  const needed = isShort ? minimum / worst.flow : 1;
  const neededPower = isShort
    ? hydraulicPower(system(cduFlow * needed), cduFlow * needed) / hydraulicPower(drop, cduFlow)
    : 1;
  return {
    config,
    flows,
    worst,
    minimum,
    isShort,
    needed,
    neededPower,
    drop,
    cduFlow,
    power: hydraulicPower(drop, cduFlow),
    isUqdOver: serverFlow(config) > UQD04.nominalFlow.value,
    pump: pumpReading(config, cduFlow),
  };
}

const numbersOf = (scene: CoolingScene) => [
  ...scene.flows,
  scene.minimum,
  scene.needed,
  scene.neededPower,
  scene.drop,
  scene.power,
  scene.pump.duty.dp,
];

/** Why a state has no scene: its split did not converge, or its values are outside the model. */
export type SceneFailure = 'reparto' | 'valores';
export type SceneResult = { scene: CoolingScene } | { failure: SceneFailure };

const isValidState = (state: CoolingLabState) =>
  Number.isFinite(state.pumpFlow) &&
  state.pumpFlow > 0 &&
  Number.isInteger(state.servers) &&
  state.servers >= SERVER_COUNT.min;

/**
 * The scene of a state, or why there is none: «reparto» only when the split does not converge;
 * «valores» when the state cannot build a circuit (a flow that is not positive, no server), the
 * circuit throws a RangeError, or a reading is not finite. Never NaN; any other error surfaces.
 */
export function sceneResult(state: CoolingLabState, split: Split = rackSplit): SceneResult {
  if (!isValidState(state)) return { failure: 'valores' };
  try {
    const config = labConfig(state);
    const { flows, converged } = split(config);
    if (!converged) return { failure: 'reparto' };
    if (!flows.every((q) => Number.isFinite(q) && q > 0)) return { failure: 'valores' };
    const scene = readings(config, flows);
    return numbersOf(scene).every(Number.isFinite) ? { scene } : { failure: 'valores' };
  } catch (error) {
    if (error instanceof RangeError) return { failure: 'valores' };
    throw error;
  }
}

/** The scene of a state, or null when it has none (sceneResult says why). */
export function coolingScene(
  state: CoolingLabState,
  split: Split = rackSplit,
): CoolingScene | null {
  const result = sceneResult(state, split);
  return 'scene' in result ? result.scene : null;
}

/** What the lab shows: the state as set, and the last valid scene with its own state. */
export interface CoolingLabModel {
  state: CoolingLabState;
  scene: CoolingScene;
  /** The state `scene` was computed from: `state` itself unless it has no scene. */
  sceneState: CoolingLabState;
  /** Why `state` has no scene of its own (the scene is then the last valid one); null if it has. */
  failure: SceneFailure | null;
}

/** The lab as it opens: a valid scene by construction (the page validates it against GF). */
export function initialModel(state: CoolingLabState = INITIAL_COOLING_STATE): CoolingLabModel {
  const scene = coolingScene(state);
  if (!scene) throw new Error('coolingScene: the opening state has no valid scene');
  return { state, scene, sceneState: state, failure: null };
}

/** The model after a new state: its scene if it has one, else the last valid scene and why. */
export function withState(
  model: CoolingLabModel,
  state: CoolingLabState,
  compute: (state: CoolingLabState) => SceneResult = sceneResult,
): CoolingLabModel {
  const result = compute(state);
  return 'scene' in result
    ? { state, scene: result.scene, sceneState: state, failure: null }
    : { ...model, state, failure: result.failure };
}

/** A pump flow (L/min per rack) from the pump chart's cursor, on the slider's grid and range. */
export function snapPumpFlow(value: number): number {
  if (!Number.isFinite(value)) return PUMP_FLOW.min;
  const snapped = Math.round(value / PUMP_FLOW.step) * PUMP_FLOW.step;
  return Math.min(PUMP_FLOW.max, Math.max(PUMP_FLOW.min, snapped));
}
