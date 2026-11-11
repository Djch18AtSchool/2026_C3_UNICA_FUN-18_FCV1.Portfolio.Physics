import { useMemo, useState, type JSX } from 'react';
import type { SimClock } from '../../lab/useSimClock';
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
import DriveCanvas from './DriveCanvas';
import { DRIVE_LEFT_OUT, DRIVE_USAGE } from './driveText';
import { DRIVE_CARS, DRIVE_COURSES, driveBalance, driveReadouts, referenceAt } from './driveViews';
import { useDriveSession } from './useDriveSession';
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
  const drive = useRegenDrive(state, view.view === 'conducir', clock);
  // In «Conducir» the transport and the settings get the drive's clock (seeks clamped).
  const shownClock = drive.session.clock;
  return { ...view, state, cycle, steps, distances, at, update, reset, drive, shownClock };
}

/** «Conducir»: the course of the cycle on show, the car and model of the lab, and its session. */
function useRegenDrive(state: RegenLabState, isActive: boolean, clock: SimClock) {
  const { vehicle, eta, pMaxKw, lowSpeedFade } = state;
  // Only the car and the model: a new object recomputes the run from its pedals.
  const model = useMemo(
    () => ({ car: DRIVE_CARS[vehicle], regen: regenParams({ eta, pMaxKw, lowSpeedFade }) }),
    [vehicle, eta, pMaxKw, lowSpeedFade],
  );
  const course = DRIVE_COURSES[state.cycle];
  const session = useDriveSession({ isActive, course, model, clock });
  return { course, model, session };
}

type RegenLabModel = ReturnType<typeof useRegenLab>;

/** The panel's levels: η and P_máx, the five presets, and the drawer's view, cycle and f(v). */
function regenLevels({ state, view, shownClock: clock, update, changeView }: RegenLabModel) {
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

/** The readouts of the view: the cycle's or the stretch's balance, or your run against the cycle's car. */
function labReadouts(lab: RegenLabModel) {
  const { view, state, steps, distances, stretch, at, cycle, clock } = lab;
  if (view !== 'conducir') {
    return readoutsFor(shownBalance(at, view, stretch, steps, distances), view);
  }
  const { course, session } = lab.drive;
  const own = driveBalance(session.settled, course);
  const reference = referenceAt(steps, distances, course, clock.state.t);
  return driveReadouts(own, reference, course, cycle.name);
}

/** The canvas of the view: the cycle played («Tramo», «Ciclo») or driven («Conducir»). */
function LabCanvas({ lab, decimals }: { lab: RegenLabModel; decimals: number }): JSX.Element {
  const { view, state, steps, distances, stretch } = lab;
  const shared = {
    cycleId: state.cycle,
    cycle: lab.cycle,
    vehicleName: VEHICLES[state.vehicle].name,
    steps,
    distances,
    stretch,
    decimals,
  };
  if (view === 'conducir') {
    const { course, model, session } = lab.drive;
    return (
      <DriveCanvas
        {...shared}
        course={course}
        regen={model.regen}
        clock={lab.shownClock}
        session={session}
      />
    );
  }
  return <RegenCanvas {...shared} view={view} timing={lab.timing} clock={lab.clock} at={lab.at} />;
}

/**
 * Tema 6's laboratory on LabShell, in three views: «Tramo», one braking at real time (figure 6.3's
 * in the UDDS) with the energies of that stretch; «Ciclo completo», the whole EPA cycle 20 times
 * faster with the cycle's (RegenCanvas); and «Conducir», the same stretch driven with the reader's
 * pedals against the cycle's own car (DriveCanvas). The scale on the canvas, the cycle's stops as
 * transport events. η and P_máx as parameters, five presets as the scenario, the view, the cycle
 * and f(v) (on by default, ruling R19) as local settings, and the readouts of the view.
 */
export default function RegenLab({ usage, leftOut }: RegenLabProps): JSX.Element {
  const { decimals } = useGlobalSettings();
  const lab = useRegenLab();
  return (
    <LabShell
      title="Laboratorio del frenado regenerativo"
      clock={lab.shownClock}
      markers={viewMarkers(lab.view, lab.state.cycle)}
      timeOrigin={lab.timing.offset}
      timeUnit="s"
      readouts={labReadouts(lab)}
      levels={regenLevels(lab)}
      canvasNotes={<RegenNotes view={lab.view} />}
      notes={{
        usage: [VIEW_HINT, CURSOR_HINT, FADE_HINT, DRIVE_USAGE, ...(usage ? [usage] : [])],
        leftOut: [ETA_SOURCE, ...(leftOut ? [leftOut] : []), DRIVE_LEFT_OUT],
      }}
      onReset={lab.reset}
      testId="regen-lab"
    >
      <LabCanvas lab={lab} decimals={decimals} />
    </LabShell>
  );
}
