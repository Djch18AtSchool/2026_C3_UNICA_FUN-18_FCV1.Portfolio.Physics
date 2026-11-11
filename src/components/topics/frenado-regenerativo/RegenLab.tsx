import { useMemo, useState, type JSX } from 'react';
import { DRIVE_CYCLES, type CycleId } from '../../../lib/data/driveCycles';
import { cycleBalance } from '../../../lib/physics/energy';
import LabPresets from '../../lab/LabPresets';
import LabShell from '../../lab/LabShell';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import RegenCanvas from './RegenCanvas';
import { regenLocalSettings } from './regenLabSettings';
import RegenNotes from './RegenNotes';
import RegenParams from './RegenParams';
import {
  DEFAULT_P_MAX_KW,
  INITIAL_REGEN_STATE,
  presetIdFor,
  REGEN_PRESETS,
  regenParams,
  VEHICLES,
  type RegenLabState,
} from './regenPresets';
import { balanceAt, cumulativeDistance } from './regenScene';
import { BRAKING_PAD_S } from './regenFigures';
import { readoutsFor, shownBalance, viewMarkers } from './regenViews';
import { useRegenView } from './useRegenView';

function balanceFor(state: RegenLabState) {
  return cycleBalance(
    DRIVE_CYCLES[state.cycle].samples,
    VEHICLES[state.vehicle],
    regenParams(state),
  );
}

/**
 * «Cómo se usa»: where the view is chosen, what «Tramo» is and the events. How each view plays,
 * where t counts from and the scale are the MDX's `usage`, after these hints: not repeated here
 * (RegenLab.test.tsx ties the two: no sentence of one is in the other).
 */
const VIEW_HINT = `La vista se elige en los ajustes. «Tramo» es la frenada del ciclo que más energía quita en las ruedas, con ${BRAKING_PAD_S} s antes y después (en el UDDS, la de la figura 6.3); el mapa de arriba la sitúa en el ciclo, y sus energías y el porcentaje recuperado son los del tramo. «Evento anterior» y «Evento siguiente» saltan entre las detenciones.`;
const CURSOR_HINT =
  'Arrastra el cursor de la gráfica de energía, o enfócalo y muévelo con las flechas (1 % del ciclo; con Mayús, 10 %); en «Tramo» no sale del tramo.';
const FADE_HINT = `$f(v)$ apaga la regeneración cerca de detenerse; sin él, con el tope de ${DEFAULT_P_MAX_KW} kW, la fricción no haría falta en estos ciclos.`;
/** «Qué deja fuera el modelo»: where η comes from, before the MDX's own caveats. */
const ETA_SOURCE =
  '$\\eta$ es el rendimiento de la rueda a la batería: Boretti midió del 70 al 80 % en un Leaf 2012 y del 72 al 87 % en uno 2013.';

export interface RegenLabProps {
  /** «Cómo se usa», after the lab's own hints, from the topic's MDX. */
  usage?: string;
  /** «Qué deja fuera el modelo», after the source of η: the caveats, from the topic's MDX. */
  leftOut?: string;
}

/**
 * The lab's state: the car, cycle and regeneration model, their balance over the cycle, the view
 * and its clock, and the balance at the settled instant (in the cycle's time). Every edit pauses
 * playback like a timeline drag; a new cycle starts again from t = 0.
 */
function useRegenLab() {
  const [state, setState] = useState<RegenLabState>(INITIAL_REGEN_STATE);
  const cycle = DRIVE_CYCLES[state.cycle];
  const { steps } = useMemo(() => balanceFor(state), [state]);
  const distances = useMemo(() => cumulativeDistance(cycle.samples), [cycle]);
  const view = useRegenView(state.cycle, steps[steps.length - 1].t);
  const { clock } = view;
  const update = (next: RegenLabState) => {
    clock.pause();
    if (next.cycle !== state.cycle) clock.reset();
    setState(next);
  };
  const reset = () => {
    setState(INITIAL_REGEN_STATE);
    view.resetView();
  };
  const at = balanceAt(steps, distances, view.timing.offset + clock.state.t);
  return { ...view, state, cycle, steps, distances, at, update, reset };
}

type RegenLabModel = ReturnType<typeof useRegenLab>;

/** The panel's levels: η and P_máx, the five presets, and the drawer's view, cycle and f(v). */
function regenLevels({ state, view, clock, update, changeView }: RegenLabModel) {
  return {
    params: <RegenParams state={state} onChange={update} />,
    scenario: (
      <LabPresets
        id="regen-preset"
        presets={REGEN_PRESETS}
        activeId={presetIdFor(state)}
        onSelect={(preset) => update(preset.values)}
      />
    ),
    display: regenLocalSettings({
      view,
      onViewChange: changeView,
      cycle: state.cycle,
      lowSpeedFade: state.lowSpeedFade,
      onCycleChange: (next: CycleId) => update({ ...state, cycle: next }),
      onFadeChange: (lowSpeedFade) => update({ ...state, lowSpeedFade }),
      clock,
    }),
  };
}

/**
 * Tema 6's laboratory on LabShell, in two views: «Tramo», one braking at real time (figure 6.3's
 * in the UDDS) with the energies of that stretch, and «Ciclo completo», the whole EPA cycle 20
 * times faster with the cycle's; the scale on the canvas, the cycle's stops as transport events
 * (RegenCanvas). η and P_máx as parameters, five presets as the scenario, the view, the cycle and
 * f(v) (on by default, ruling R19) as local settings, and the readouts of readoutsFor.
 */
export default function RegenLab({ usage, leftOut }: RegenLabProps): JSX.Element {
  const { decimals } = useGlobalSettings();
  const lab = useRegenLab();
  const { view, state, steps, distances, stretch, at } = lab;
  return (
    <LabShell
      title="Laboratorio del frenado regenerativo"
      clock={lab.clock}
      markers={viewMarkers(view, state.cycle)}
      timeOrigin={lab.timing.offset}
      timeUnit="s"
      readouts={readoutsFor(shownBalance(at, view, stretch, steps, distances), view)}
      levels={regenLevels(lab)}
      canvasNotes={<RegenNotes />}
      notes={{
        usage: [VIEW_HINT, CURSOR_HINT, FADE_HINT, ...(usage ? [usage] : [])],
        leftOut: [ETA_SOURCE, ...(leftOut ? [leftOut] : [])],
      }}
      onReset={lab.reset}
      testId="regen-lab"
    >
      <RegenCanvas
        view={view}
        cycleId={state.cycle}
        cycle={lab.cycle}
        vehicleName={VEHICLES[state.vehicle].name}
        steps={steps}
        distances={distances}
        stretch={stretch}
        timing={lab.timing}
        clock={lab.clock}
        at={at}
        decimals={decimals}
      />
    </LabShell>
  );
}
