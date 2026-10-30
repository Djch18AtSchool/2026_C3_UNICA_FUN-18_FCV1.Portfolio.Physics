import { useEffect, useMemo, useState, type JSX } from 'react';
import { DRIVE_CYCLES, type CycleId } from '../../../lib/data/driveCycles';
import { cycleBalance } from '../../../lib/physics/energy';
import Presets from '../../controls/Presets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import ParamField from '../../lab/ParamField';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { useSimClock } from '../../lab/useSimClock';
import EnergyBars from './EnergyBars';
import { regenLocalSettings } from './regenLabSettings';
import RegenEnergyPlot from './RegenEnergyPlot';
import {
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
    return 'Con P_máx = 0 el motor no regenera: toda la energía de frenado se va en calor en los frenos de fricción.';
  }
  if (eta === 0) {
    return 'Con η = 0 el motor frena, pero nada llega a la batería: todo lo que recoge se pierde en el motor y la transmisión.';
  }
  return null;
}

export interface RegenLabProps {
  /** The model's caveats and the playback speed, written in the topic's MDX. */
  footnote?: string;
}

/**
 * Tema 6's laboratory on the v2 shell: an EPA cycle played 20 times faster with the car on the
 * road, the live power flow battery ↔ motor ↔ wheels → friction brakes, the cumulative energies
 * as bars and as a plot whose cursor seeks the clock; η and P_máx as parameters, the cycle and
 * f(v) as local settings, five presets and the readouts v, P, E_batería, E_fricción and the share
 * of the traction energy recovered.
 */
export default function RegenLab({ footnote }: RegenLabProps): JSX.Element {
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
  const at = balanceAt(steps, distances, clock.state.t);

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
      label: 'Energía a la batería E_batería',
      value: at.eBattery / J_PER_KWH,
      unit: 'kWh',
      precision: ENERGY_PRECISION,
    },
    {
      id: 'friction',
      label: 'Calor en los frenos E_fricción',
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
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <ParamField
          id="regen-eta"
          label="Rendimiento rueda → batería η"
          unit=""
          {...ETA_RANGE}
          value={state.eta}
          onChange={(eta) => update({ ...state, eta })}
        />
        <ParamField
          id="regen-pmax"
          label="Potencia máxima de regeneración P_máx"
          unit="kW"
          {...P_MAX_RANGE}
          value={state.pMaxKw}
          onChange={(pMaxKw) => update({ ...state, pMaxKw })}
        />
      </div>
      {note ? (
        <p role="note" className="m-0 border-l-2 border-accent pl-3 text-sm">
          {note}
        </p>
      ) : null}
      <Presets
        presets={REGEN_PRESETS}
        activeId={presetIdFor(state)}
        onSelect={(preset) => update(preset.values)}
      />
      <p className="m-0 text-sm text-fg-muted">
        η es el rendimiento de la rueda a la batería: Boretti midió de 0,70 a 0,87 en un LEAF.
        Arrastra el cursor de la gráfica de energía, o enfócalo y muévelo con las flechas (1 % del
        ciclo; con Mayús, 10 %). El ciclo y f(v) se eligen en los ajustes del engranaje.
      </p>
    </>
  );

  const localSettings = regenLocalSettings({
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
      readouts={readouts}
      params={params}
      localSettings={localSettings}
      onReset={onReset}
      footnote={footnote}
      testId="regen-lab"
    >
      <div className="flex flex-col gap-6">
        <RegenScene
          at={at}
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
          onSeek={seek}
        />
      </div>
    </LabShell>
  );
}
