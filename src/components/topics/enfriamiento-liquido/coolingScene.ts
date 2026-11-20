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

const W_PER_KW = 1e3;
/** Each server's share of the rack's heat to the liquid (W) needs OCP's 1,5 L/min per kW. */
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

/** The rack the state describes: the base preset's plate, racks and inlet, and the four parameters. */
export function labConfig(state: CoolingLabState): RackConfig {
  const { racks, plateDesignFlow, inletPressure } = PRESETS[state.base];
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
  /** Each server's minimum (m³/s): OCP's rule on its share of the rack's heat to the liquid. */
  minimum: number;
  isShort: boolean;
  /** Factor the rack's flow must rise by for the worst server to reach its minimum; 1 if it does. */
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
  const cduFlow = config.racks * config.rackFlow;
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

/**
 * The scene of a state, or null when the split does not converge, a reading is not finite or the
 * state cannot build a circuit (a flow that is not positive, no server). Never NaN, never a throw.
 */
export function coolingScene(
  state: CoolingLabState,
  split: Split = rackSplit,
): CoolingScene | null {
  const isValid =
    Number.isFinite(state.pumpFlow) && state.pumpFlow > 0 && Number.isInteger(state.servers);
  if (!isValid || state.servers < SERVER_COUNT.min) return null;
  try {
    const config = labConfig(state);
    const { flows, converged } = split(config);
    if (!converged || !flows.every((q) => Number.isFinite(q) && q > 0)) return null;
    const scene = readings(config, flows);
    return numbersOf(scene).every(Number.isFinite) ? scene : null;
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

/** What the lab shows: the state as set, and the last scene that converged with its own state. */
export interface CoolingLabModel {
  state: CoolingLabState;
  scene: CoolingScene;
  /** The state `scene` was computed from: `state` itself unless its split did not converge. */
  sceneState: CoolingLabState;
  /** False while the state's own split does not converge (the scene is then the last valid one). */
  isConverged: boolean;
}

/** The lab as it opens: a valid scene by construction (the page validates it against GF). */
export function initialModel(state: CoolingLabState = INITIAL_COOLING_STATE): CoolingLabModel {
  const scene = coolingScene(state);
  if (!scene) throw new Error('coolingScene: the opening state has no valid scene');
  return { state, scene, sceneState: state, isConverged: true };
}

/** The model after a new state: its scene if it has one, else the last valid scene, flagged. */
export function withState(
  model: CoolingLabModel,
  state: CoolingLabState,
  compute: (state: CoolingLabState) => CoolingScene | null = coolingScene,
): CoolingLabModel {
  const scene = compute(state);
  return scene
    ? { state, scene, sceneState: state, isConverged: true }
    : { ...model, state, isConverged: false };
}

/** A pump flow (L/min per rack) from the pump chart's cursor, on the slider's grid and range. */
export function snapPumpFlow(value: number): number {
  if (!Number.isFinite(value)) return PUMP_FLOW.min;
  const snapped = Math.round(value / PUMP_FLOW.step) * PUMP_FLOW.step;
  return Math.min(PUMP_FLOW.max, Math.max(PUMP_FLOW.min, snapped));
}
