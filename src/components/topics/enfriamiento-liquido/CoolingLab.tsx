/**
 * Tema 13's laboratory on LabShell, with no clock: size the circuit of a rack. Level 1, the four
 * parameters: the pump's flow into each rack, the servers on the manifold, their hose and the
 * return layout; level 2, the two presets (the RD109 reference that validates against GF, and
 * MGX's 44 ports). The canvas is the rack (RackDiagram), with its status chips; the readouts, the
 * server that gets least against its minimum, the drop to the farthest server and the pumping
 * power; the support plots, the split, the pump's chart (its cursor is the pump's flow) and the
 * profile of figure 13.2 for this rack; the canvas notes, the key, the scale, the margin and where
 * each value comes from. A split that does not converge keeps the last valid scene and says so.
 */
import { useCallback, useState, type JSX } from 'react';
import { PRESETS } from '../../../lib/data/liquidCoolingCircuit';
import { M3S_PER_LPM } from '../../../lib/physics/hydraulics';
import ChoiceField from '../../lab/ChoiceField';
import LabPresets from '../../lab/LabPresets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import { NO_LOCAL_SETTINGS } from '../../lab/labShellTypes';
import ParamField from '../../lab/ParamField';
import CoolingLabCharts from './CoolingLabCharts';
import CoolingNotes from './CoolingNotes';
import {
  COOLING_PRESETS,
  CURSOR_HINT,
  HOSE_OPTIONS,
  LAYOUT_OPTIONS,
  presetIdFor,
  readoutLabels,
} from './coolingLabText';
import {
  INITIAL_COOLING_STATE,
  initialModel,
  PUMP_FLOW,
  SERVER_COUNT,
  snapPumpFlow,
  withState,
  type CoolingLabModel,
  type CoolingLabState,
  type CoolingScene,
} from './coolingScene';
import RackDiagram from './RackDiagram';

const PA_PER_KPA = 1e3;
const W_PER_KW = 1e3;
const FLOW_PRECISION = 2;
const DROP_PRECISION = 1;
const POWER_PRECISION = 2;

function readoutsOf(scene: CoolingScene): LabReadout[] {
  const labels = readoutLabels(scene);
  const lpm = (flow: number) => flow / M3S_PER_LPM;
  return [
    {
      id: 'worst',
      label: labels.worst,
      value: lpm(scene.worst.flow),
      unit: 'L/min',
      precision: FLOW_PRECISION,
    },
    {
      id: 'minimum',
      label: labels.minimum,
      value: lpm(scene.minimum),
      unit: 'L/min',
      precision: FLOW_PRECISION,
    },
    {
      id: 'drop',
      label: labels.drop,
      value: scene.drop / PA_PER_KPA,
      unit: 'kPa',
      precision: DROP_PRECISION,
    },
    {
      id: 'power',
      label: labels.power,
      value: scene.power / W_PER_KW,
      unit: 'kW',
      precision: POWER_PRECISION,
    },
  ];
}

/** The lab's state and its last valid scene; every change goes through withState. */
function useCoolingLab() {
  const [model, setModel] = useState<CoolingLabModel>(initialModel);
  const setState = useCallback(
    (state: CoolingLabState) => setModel((previous) => withState(previous, state)),
    [],
  );
  const update = useCallback(
    (patch: Partial<CoolingLabState>) =>
      setModel((previous) => withState(previous, { ...previous.state, ...patch })),
    [],
  );
  /** The pump chart's cursor gives the CDU's flow; the pump's flow is its share per rack. */
  const onCduFlow = useCallback(
    (Q: number) =>
      setModel((previous) => {
        const perRack = Q / PRESETS[previous.state.base].racks / M3S_PER_LPM;
        return withState(previous, { ...previous.state, pumpFlow: snapPumpFlow(perRack) });
      }),
    [],
  );
  return { model, setState, update, onCduFlow };
}

export interface CoolingLabProps {
  /** «Cómo se usa», after the cursor's line: from the topic's MDX. */
  usage?: string;
  /** «Qué deja fuera el modelo», from the topic's MDX. */
  leftOut?: string;
}

/** Level 1: the pump's flow and the servers (two to a row), then the hose and the return. */
function CoolingParams({
  state,
  update,
}: {
  state: CoolingLabState;
  update(patch: Partial<CoolingLabState>): void;
}): JSX.Element {
  return (
    <>
      <ParamField
        id="cooling-pump-flow"
        label="Caudal de la bomba por rack $Q_\text{rack}$"
        unit="L/min"
        min={PUMP_FLOW.min}
        max={PUMP_FLOW.max}
        step={PUMP_FLOW.step}
        value={state.pumpFlow}
        onChange={(pumpFlow) => update({ pumpFlow })}
      />
      <ParamField
        id="cooling-servers"
        label="Servidores en el rack $N$"
        unit=""
        min={SERVER_COUNT.min}
        max={SERVER_COUNT.max}
        step={SERVER_COUNT.step}
        value={state.servers}
        onChange={(servers) => update({ servers })}
      />
      <ChoiceField
        id="cooling-hose"
        label="Manguera de cada servidor"
        value={state.hose}
        options={HOSE_OPTIONS}
        onChange={(hose) => update({ hose })}
      />
      <ChoiceField
        id="cooling-layout"
        label="Retorno"
        value={state.layout}
        options={LAYOUT_OPTIONS}
        onChange={(layout) => update({ layout })}
      />
    </>
  );
}

export default function CoolingLab({ usage, leftOut }: CoolingLabProps): JSX.Element {
  const { model, setState, update, onCduFlow } = useCoolingLab();
  const { state, scene, isConverged } = model;

  const scenario = (
    <LabPresets
      id="cooling-preset"
      presets={COOLING_PRESETS}
      activeId={presetIdFor(state)}
      onSelect={(preset) => setState(preset.values)}
    />
  );

  return (
    <LabShell
      title="Laboratorio del circuito de un rack"
      testId="cooling-lab"
      readouts={readoutsOf(scene)}
      levels={{
        params: <CoolingParams state={state} update={update} />,
        scenario,
        display: NO_LOCAL_SETTINGS,
      }}
      charts={<CoolingLabCharts scene={scene} onCduFlow={onCduFlow} />}
      canvasNotes={<CoolingNotes state={model.sceneState} scene={scene} />}
      notes={{ usage: [CURSOR_HINT, ...(usage ? [usage] : [])], leftOut: leftOut ? [leftOut] : [] }}
      onReset={() => setState(INITIAL_COOLING_STATE)}
    >
      <RackDiagram scene={scene} isConverged={isConverged} />
    </LabShell>
  );
}
