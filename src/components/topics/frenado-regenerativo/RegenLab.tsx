import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import { DRIVE_CYCLES, type CycleId } from '../../../lib/data/driveCycles';
import { cycleBalance } from '../../../lib/physics/energy';
import InlineMath from '../../lab/InlineMath';
import LabPresets from '../../lab/LabPresets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import ParamField from '../../lab/ParamField';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { useSimClock } from '../../lab/useSimClock';
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
import {
  balanceAt,
  cumulativeDistance,
  energyAxisMax,
  J_PER_KWH,
  KMH_PER_MS,
  peakBrakeTime,
  W_PER_KW,
} from './regenScene';

/** The cycles last minutes: playback compresses them 20 times (the 1369 s UDDS in 68,5 s at 1×). */
export const TIME_LAPSE = 20;
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

/** The lab opens, and Restablecer returns, at the default cycle's hardest braking (116 s of the UDDS). */
const OPENING_TIME = peakBrakeTime(balanceFor(INITIAL_REGEN_STATE).steps);

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

/** «Cómo se usa»: the energy cursor and its keys, then what the f(v) setting does. */
const CURSOR_HINT =
  'Arrastra el cursor de la gráfica de energía, o enfócalo y muévelo con las flechas (1 % del ciclo; con Mayús, 10 %).';
const FADE_HINT = `$f(v)$ apaga la regeneración cerca de detenerse; sin él, con el tope de ${DEFAULT_P_MAX_KW} kW, la fricción no haría falta en estos ciclos.`;
/** «Qué deja fuera el modelo»: where η comes from, before the MDX's own caveats. */
const ETA_SOURCE =
  '$\\eta$ es el rendimiento de la rueda a la batería: Boretti midió del 70 al 80 % en un Leaf 2012 y del 72 al 87 % en uno 2013.';

export interface RegenLabProps {
  /** «Cómo se usa», after the cursor and f(v) hints: the playback speed, from the topic's MDX. */
  usage?: string;
  /** «Qué deja fuera el modelo», after the source of η: the caveats, from the topic's MDX. */
  leftOut?: string;
}

/**
 * Tema 6's laboratory on LabShell: an EPA cycle played 20 times faster with the car on the
 * road, the live power flow battery ↔ motor ↔ wheels → friction brakes, the cumulative energies
 * as bars and as a plot whose cursor seeks the clock; η and P_máx as parameters, the cycle and
 * f(v) (on by default, ruling R19) as local settings, five presets and the readouts v, P,
 * E_batería, the conversion loss, E_fricción and the share of the traction energy recovered.
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

  const clock = useSimClock(duration, { timeScale: TIME_LAPSE });
  const { seek, pause, reset } = clock;
  useEffect(() => seek(OPENING_TIME), [seek]);
  const atTime = useCallback((t: number) => balanceAt(steps, distances, t), [steps, distances]);
  const at = atTime(clock.state.t);
  const live = useMemo(() => ({ frame: clock.frame, atTime }), [clock.frame, atTime]);

  /** Every edit pauses playback like a timeline drag; a new cycle starts again from t = 0. */
  const update = (next: RegenLabState) => {
    pause();
    if (next.cycle !== state.cycle) reset();
    setState(next);
  };

  const onReset = () => {
    setState(INITIAL_REGEN_STATE);
    seek(OPENING_TIME);
  };

  const readouts: LabReadout[] = [
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
    <LabPresets
      id="regen-preset"
      presets={REGEN_PRESETS}
      activeId={presetIdFor(state)}
      onSelect={(preset) => update(preset.values)}
    />
  );

  const display = regenLocalSettings({
    cycle: state.cycle,
    lowSpeedFade: state.lowSpeedFade,
    onCycleChange: (next: CycleId) => update({ ...state, cycle: next }),
    onFadeChange: (lowSpeedFade) => update({ ...state, lowSpeedFade }),
    clock,
  });

  return (
    <LabShell
      title="Laboratorio del frenado regenerativo"
      clock={clock}
      timeUnit="s"
      readouts={readouts}
      levels={{ params, scenario, display }}
      canvasNotes={<RegenNotes />}
      notes={{
        usage: [CURSOR_HINT, FADE_HINT, ...(usage ? [usage] : [])],
        leftOut: [ETA_SOURCE, ...(leftOut ? [leftOut] : [])],
      }}
      onReset={onReset}
      testId="regen-lab"
    >
      <div className="flex flex-col gap-6">
        <RegenScene
          at={at}
          live={live}
          totalDistance={distances[distances.length - 1]}
          vehicleName={vehicle.name}
          cycleName={cycle.name}
          decimals={decimals}
        />
        <EnergyBars at={at} axisMax={axisMax} />
        <RegenEnergyPlot
          steps={steps}
          duration={duration}
          axisMax={axisMax}
          t={clock.state.t}
          frame={clock.frame}
          onSeek={seek}
        />
      </div>
    </LabShell>
  );
}
