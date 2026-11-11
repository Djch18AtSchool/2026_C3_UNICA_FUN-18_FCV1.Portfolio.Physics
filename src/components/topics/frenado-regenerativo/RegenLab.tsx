import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { DRIVE_CYCLES, type CycleId } from '../../../lib/data/driveCycles';
import { cycleBalance } from '../../../lib/physics/energy';
import ChoiceField from '../../lab/ChoiceField';
import InlineMath from '../../lab/InlineMath';
import LabPresets from '../../lab/LabPresets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import ParamField from '../../lab/ParamField';
import TimeScaleBadge from '../../lab/TimeScaleBadge';
import type { TransportMarker } from '../../lab/transportMarkers';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { useSimClock } from '../../lab/useSimClock';
import CycleMinimap from './CycleMinimap';
import EnergyBars from './EnergyBars';
import { regenLocalSettings } from './regenLabSettings';
import RegenEnergyPlot from './RegenEnergyPlot';
import RegenNotes from './RegenNotes';
import {
  DEFAULT_P_MAX_KW,
  ETA_RANGE,
  INITIAL_REGEN_STATE,
  P_MAX_RANGE,
  presetIdFor,
  REGEN_PRESETS,
  regenParams,
  VEHICLES,
  type RegenLabState,
} from './regenPresets';
import RegenScene from './RegenScene';
import type { RoadRange } from './RoadStrip';
import {
  balanceAt,
  cumulativeDistance,
  energyAxisMax,
  J_PER_KWH,
  KMH_PER_MS,
  W_PER_KW,
  type BalanceAt,
} from './regenScene';
import {
  brakingStretch,
  cycleStops,
  markersInStretch,
  stopMarkers,
  viewSwitchTime,
  viewTiming,
  type RegenView,
  type Stretch,
} from './regenStretch';
import { BRAKING_PAD_S } from './regenFigures';

const ENERGY_PRECISION = 3;
const SHARE_PRECISION = 1;
const PERCENT = 100;

function balanceFor(state: RegenLabState) {
  return cycleBalance(
    DRIVE_CYCLES[state.cycle].samples,
    VEHICLES[state.vehicle],
    regenParams(state),
  );
}

const CYCLE_IDS = Object.keys(DRIVE_CYCLES) as CycleId[];
const perCycle = <T,>(value: (id: CycleId) => T) =>
  Object.fromEntries(CYCLE_IDS.map((id) => [id, value(id)])) as Readonly<Record<CycleId, T>>;

/** Each cycle's stops, derived from its samples (17 in the UDDS), and their transport markers. */
const STOPS = perCycle((id) => cycleStops(DRIVE_CYCLES[id].samples));
const CYCLE_MARKERS = perCycle((id) => stopMarkers(STOPS[id]));
/** The stretch «Tramo» plays in each cycle (figure 6.3's in the UDDS) and the stops it holds. */
const STRETCHES = perCycle((id) => brakingStretch(DRIVE_CYCLES[id].samples));
const STRETCH_MARKERS = perCycle((id) => markersInStretch(CYCLE_MARKERS[id], STRETCHES[id]));

/** The road's ticks: every kilometre of the whole cycle, every 50 m of a stretch. */
const CYCLE_TICK_M = 1000;
const STRETCH_TICK_M = 50;

const VIEW_OPTIONS: readonly { value: RegenView; label: string }[] = [
  { value: 'tramo', label: 'Tramo: una frenada' },
  { value: 'ciclo', label: 'Ciclo completo' },
];

/** Why nothing reaches the battery, when a parameter switches regeneration off. */
function zeroRegenNote({ eta, pMaxKw }: RegenLabState): string | null {
  if (pMaxKw === 0) {
    return 'Con $P_\\text{máx}$ = 0 el motor no regenera: toda la energía de frenado se va en calor en los frenos de fricción.';
  }
  if (eta === 0) {
    return 'Con $\\eta$ = 0 el motor frena, pero nada llega a la batería: todo lo que recoge se pierde en el motor y la transmisión.';
  }
  return null;
}

/** «Cómo se usa»: the two views and the events, the energy cursor, then what f(v) does. */
const VIEW_HINT = `«Tramo» reproduce la frenada del ciclo que más energía quita en las ruedas, con ${BRAKING_PAD_S} s antes y después (en el UDDS, la de la figura 6.3); el mapa de arriba la sitúa en el ciclo. «Evento anterior» y «Evento siguiente» saltan entre las detenciones.`;
const CURSOR_HINT =
  'En «Ciclo», arrastra el cursor de la gráfica de energía, o enfócalo y muévelo con las flechas (1 % del ciclo; con Mayús, 10 %).';
const FADE_HINT = `$f(v)$ apaga la regeneración cerca de detenerse; sin él, con el tope de ${DEFAULT_P_MAX_KW} kW, la fricción no haría falta en estos ciclos.`;
/** «Qué deja fuera el modelo»: where η comes from, before the MDX's own caveats. */
const ETA_SOURCE =
  '$\\eta$ es el rendimiento de la rueda a la batería: Boretti midió del 70 al 80 % en un Leaf 2012 y del 72 al 87 % en uno 2013.';

export interface RegenLabProps {
  /** «Cómo se usa», after the lab's own hints: how the views play, from the topic's MDX. */
  usage?: string;
  /** «Qué deja fuera el modelo», after the source of η: the caveats, from the topic's MDX. */
  leftOut?: string;
}

/** The readouts at an instant: v, P, E_batería, the conversion loss, E_fricción, the share recovered. */
function readoutsFor(at: BalanceAt): LabReadout[] {
  return [
    { id: 'v', label: 'Velocidad v', value: at.v * KMH_PER_MS, unit: 'km/h' },
    { id: 'p', label: 'Potencia en las ruedas P', value: at.pWheel / W_PER_KW, unit: 'kW' },
    {
      id: 'battery',
      label: 'Energía a la batería $E_\\text{batería}$',
      value: at.eBattery / J_PER_KWH,
      unit: 'kWh',
      precision: ENERGY_PRECISION,
    },
    {
      id: 'loss',
      label: 'Pérdidas de conversión $E_\\text{conversión}$',
      value: at.eConversionLoss / J_PER_KWH,
      unit: 'kWh',
      precision: ENERGY_PRECISION,
    },
    {
      id: 'friction',
      label: 'Calor de fricción $E_\\text{fricción}$',
      value: at.eFriction / J_PER_KWH,
      unit: 'kWh',
      precision: ENERGY_PRECISION,
    },
    {
      id: 'recovered',
      label: 'Recuperado, % de la tracción',
      value: at.recoveredShare * PERCENT,
      unit: '%',
      precision: SHARE_PRECISION,
    },
  ];
}

/**
 * The view on show and its clock: «Tramo» plays the cycle's stretch at real time on a clock of
 * its own (t = 0 at the stretch's start), «Ciclo» the whole cycle CYCLE_TIME_LAPSE times faster.
 * Switching keeps the instant of the cycle when the new view holds it (else the stretch's start)
 * and pauses. The seek waits for the clock's new duration, which useSimClock sets in an effect
 * declared before this hook's own.
 */
function useRegenView(cycle: CycleId, cycleDuration: number) {
  const [view, setView] = useState<RegenView>('tramo');
  const stretch = STRETCHES[cycle];
  const timing = viewTiming(view, stretch, cycleDuration);
  const clock = useSimClock(timing.duration, { timeScale: timing.timeScale });
  const pendingSeek = useRef<number | undefined>(undefined);
  const { seek } = clock;
  useEffect(() => {
    if (pendingSeek.current === undefined) return;
    seek(pendingSeek.current);
    pendingSeek.current = undefined;
  }, [view, seek]);

  const changeView = (next: RegenView) => {
    if (next === view) return;
    const cycleT = timing.offset + clock.frame.get();
    pendingSeek.current = viewSwitchTime(viewTiming(next, stretch, cycleDuration), cycleT);
    clock.pause();
    setView(next);
  };
  /** Restablecer: back to «Tramo», at its start. */
  const resetView = () => {
    clock.reset();
    setView('tramo');
  };
  return { view, stretch, timing, clock, changeView, resetView };
}

/** What the road stands for in a view: the whole cycle by kilometres, or the stretch by 50 m. */
function roadRange(
  view: RegenView,
  stretch: Stretch,
  distanceAt: (t: number) => number,
): RoadRange {
  return view === 'tramo'
    ? { from: distanceAt(stretch.start), to: distanceAt(stretch.end), tickEvery: STRETCH_TICK_M }
    : { from: distanceAt(0), to: distanceAt(Number.POSITIVE_INFINITY), tickEvery: CYCLE_TICK_M };
}

/**
 * Tema 6's laboratory on LabShell, in two views: «Tramo», one braking at real time (figure 6.3's
 * in the UDDS), and «Ciclo», the whole EPA cycle 20 times faster, the scale declared on the canvas
 * (TimeScaleBadge) and the cycle's stops as transport events. A minimap of v(t) situates the
 * stretch; the car on the road, the live power flow battery ↔ motor ↔ wheels → friction brakes,
 * the cumulative energies as bars and as a plot (whose cursor seeks the clock in «Ciclo»); η and
 * P_máx as parameters, the view and five presets as the scenario, the cycle and f(v) (on by
 * default, ruling R19) as local settings, and the readouts of readoutsFor.
 */
export default function RegenLab({ usage, leftOut }: RegenLabProps): JSX.Element {
  const [state, setState] = useState<RegenLabState>(INITIAL_REGEN_STATE);
  const { decimals } = useGlobalSettings();
  const cycle = DRIVE_CYCLES[state.cycle];
  const vehicle = VEHICLES[state.vehicle];
  const { steps } = useMemo(() => balanceFor(state), [state]);
  const distances = useMemo(() => cumulativeDistance(cycle.samples), [cycle]);
  const duration = steps[steps.length - 1].t;
  const axisMax = useMemo(() => energyAxisMax(steps), [steps]);

  const { view, stretch, timing, clock, changeView, resetView } = useRegenView(
    state.cycle,
    duration,
  );
  const { offset } = timing;
  const { pause, reset } = clock;
  const toCycle = useCallback((t: number) => offset + t, [offset]);
  const atTime = useCallback(
    (t: number) => balanceAt(steps, distances, offset + t),
    [steps, distances, offset],
  );
  const at = atTime(clock.state.t);
  const live = useMemo(() => ({ frame: clock.frame, atTime }), [clock.frame, atTime]);
  const minimapLive = useMemo(() => ({ frame: clock.frame, toCycle }), [clock.frame, toCycle]);
  const isStretch = view === 'tramo';

  /** Every edit pauses playback like a timeline drag; a new cycle starts again from t = 0. */
  const update = (next: RegenLabState) => {
    pause();
    if (next.cycle !== state.cycle) reset();
    setState(next);
  };

  const onReset = () => {
    setState(INITIAL_REGEN_STATE);
    resetView();
  };

  const note = zeroRegenNote(state);
  const params = (
    <>
      <ParamField
        id="regen-eta"
        label="Rendimiento rueda $\to$ batería $\eta$"
        unit=""
        {...ETA_RANGE}
        value={state.eta}
        onChange={(eta) => update({ ...state, eta })}
      />
      <ParamField
        id="regen-pmax"
        label="Potencia máxima de regeneración $P_\text{máx}$"
        unit="kW"
        {...P_MAX_RANGE}
        value={state.pMaxKw}
        onChange={(pMaxKw) => update({ ...state, pMaxKw })}
      />
      {note ? (
        <p role="note" className="m-0 border-l-2 border-accent pl-3 text-sm">
          <InlineMath text={note} />
        </p>
      ) : null}
    </>
  );

  const scenario = (
    <>
      <ChoiceField
        id="regen-view"
        label="Vista"
        value={view}
        options={VIEW_OPTIONS}
        onChange={changeView}
      />
      <LabPresets
        id="regen-preset"
        presets={REGEN_PRESETS}
        activeId={presetIdFor(state)}
        onSelect={(preset) => update(preset.values)}
      />
    </>
  );

  const display = regenLocalSettings({
    cycle: state.cycle,
    lowSpeedFade: state.lowSpeedFade,
    onCycleChange: (next: CycleId) => update({ ...state, cycle: next }),
    onFadeChange: (lowSpeedFade) => update({ ...state, lowSpeedFade }),
    clock,
  });
  const markers: readonly TransportMarker[] = (isStretch ? STRETCH_MARKERS : CYCLE_MARKERS)[
    state.cycle
  ];

  return (
    <LabShell
      title="Laboratorio del frenado regenerativo"
      clock={clock}
      markers={markers}
      timeUnit="s"
      readouts={readoutsFor(at)}
      levels={{ params, scenario, display }}
      canvasNotes={<RegenNotes />}
      notes={{
        usage: [VIEW_HINT, CURSOR_HINT, FADE_HINT, ...(usage ? [usage] : [])],
        leftOut: [ETA_SOURCE, ...(leftOut ? [leftOut] : [])],
      }}
      onReset={onReset}
      testId="regen-lab"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <CycleMinimap
            samples={cycle.samples}
            stops={STOPS[state.cycle]}
            stretch={isStretch ? stretch : undefined}
            cycleName={cycle.name}
            live={minimapLive}
          />
          <RegenScene
            at={at}
            live={live}
            totalDistance={distances[distances.length - 1]}
            road={roadRange(view, stretch, (t) => balanceAt(steps, distances, t).distance)}
            vehicleName={vehicle.name}
            cycleName={cycle.name}
            decimals={decimals}
            timeScale={<TimeScaleBadge clock={clock} />}
          />
        </div>
        <EnergyBars at={at} axisMax={axisMax} />
        <RegenEnergyPlot
          steps={steps}
          duration={duration}
          axisMax={axisMax}
          t={toCycle(clock.state.t)}
          frame={clock.frame}
          toCycle={toCycle}
          onSeek={isStretch ? undefined : clock.seek}
          stretch={isStretch ? stretch : undefined}
        />
      </div>
    </LabShell>
  );
}
