import { useMemo, useState, type JSX } from 'react';
import Presets from '../../controls/Presets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import ParamField from '../../lab/ParamField';
import { useSimClock } from '../../lab/useSimClock';
import ChoiceField from './ChoiceField';
import {
  disturbanceTimeline,
  firstDumpPlayback,
  orbitTimeAt,
  playbackTimeAt,
} from './disturbanceTimeline';
import MomentumGauge from './MomentumGauge';
import { DEFAULT_DISPLAY, wheelLocalSettings, type WheelDisplay } from './wheelLabSettings';
import {
  disturbanceReadings,
  DUMP_THRESHOLD,
  maneuverFeasibility,
  maneuverReadings,
  SECONDS_PER_HOUR,
  SPACECRAFT,
  type DisturbanceReadings,
  type DumpActuator,
  type ManeuverReadings,
  type WheelMode,
  type WheelSettings,
} from './wheelLabModel';
import WheelPlot from './WheelPlot';
import {
  DEFAULT_SETTINGS,
  presetIdFor,
  T_STEP,
  THETA_STEP,
  WHEEL_LIMITS,
  WHEEL_PRESETS,
} from './wheelPresets';
import WheelScene from './WheelScene';
import WheelStatus from './WheelStatus';

export { DAY_LAPSE } from './wheelLabModel';

const MODE_OPTIONS: readonly { value: WheelMode; label: string }[] = [
  { value: 'maniobra', label: 'Maniobra' },
  { value: 'perturbacion', label: 'Perturbación y descarga' },
];
const ACTUATOR_OPTIONS: readonly { value: DumpActuator; label: string }[] = [
  { value: 'magnetopar', label: 'Magnetopar' },
  { value: 'propulsor', label: 'Propulsor' },
];

/** Fixed decimals where the global setting would hide the value (0,0097 N·m·s, 2·10⁻⁴ mN·m). */
const PRECISION = { Lw: 4, maneuverTorque: 3, disturbanceTorque: 6, percent: 1, turns: 1 } as const;
const MILLI = 1000;
const PERCENT = 100;

export interface WheelLabProps {
  /** The model's caveats and the playback speeds, written in the topic's MDX. */
  footnote?: string;
}

function readoutsFor(
  t: number,
  live: ManeuverReadings | DisturbanceReadings,
  maneuver: ManeuverReadings | undefined,
): LabReadout[] {
  const isManeuver = maneuver !== undefined;
  const common: LabReadout[] = [
    { id: 'thetaS', label: 'Ángulo de la nave θ_s', value: live.thetaS, unit: '°' },
    { id: 'omegaS', label: 'Velocidad angular de la nave ω_s', value: live.omegaS, unit: '°/s' },
    { id: 'omegaW', label: 'Velocidad de la rueda ω_w', value: live.omegaW, unit: 'rpm' },
    {
      id: 'Lw',
      label: 'Momento angular de la rueda L_w',
      value: live.Lw,
      unit: 'N·m·s',
      precision: PRECISION.Lw,
    },
    {
      id: 'torque',
      label: 'Torque del motor sobre la rueda τ',
      value: live.torque * MILLI,
      unit: 'mN·m',
      precision: isManeuver ? PRECISION.maneuverTorque : PRECISION.disturbanceTorque,
    },
    {
      id: 'share',
      label: 'Porcentaje de L_max',
      value: live.share * PERCENT,
      unit: '%',
      precision: PRECISION.percent,
    },
  ];
  if (!isManeuver) {
    return [
      ...common,
      { id: 'hours', label: 'Tiempo en órbita', value: t / SECONDS_PER_HOUR, unit: 'h' },
    ];
  }
  return [
    ...common,
    { id: 'peak', label: 'ω_w máxima de la maniobra', value: maneuver.peakOmegaW, unit: 'rpm' },
    {
      id: 'turns',
      label: 'Vueltas de la rueda',
      value: maneuver.turns,
      unit: 'vueltas',
      precision: PRECISION.turns,
    },
  ];
}

/**
 * Tema 8's laboratory on the v2 shell: the 6U CubeSat with the RW400 seen along its slew axis.
 * "Maniobra" turns the body rest to rest by a dragged target θ in T seconds, in real time, with
 * the warning when T < T_min; "Perturbación y descarga" holds the body still for three days of
 * gravity-gradient torque, time-lapsed (DAY_LAPSE), dumping from 80 % of L_max (a design choice)
 * with the magnetorquer or the thruster. Readouts, the L_w/L_max gauge and the L_w(t) plot follow
 * the clock.
 */
export default function WheelLab({ footnote }: WheelLabProps): JSX.Element {
  const [settings, setSettings] = useState<WheelSettings>(DEFAULT_SETTINGS);
  const [display, setDisplay] = useState<WheelDisplay>(DEFAULT_DISPLAY);
  const isManeuver = settings.mode === 'maniobra';
  const feasibility = useMemo(() => maneuverFeasibility(settings), [settings]);

  const warp = useMemo(() => disturbanceTimeline(settings.actuator), [settings.actuator]);

  // The disturbance clock runs in playback seconds: DAY_LAPSE on the fills, dumps stretched.
  const clock = useSimClock(isManeuver ? settings.T : warp.duration);
  const t = isManeuver ? clock.state.t : orbitTimeAt(warp, clock.state.t);
  const seekOrbit = (orbitTime: number) =>
    clock.seek(isManeuver ? orbitTime : playbackTimeAt(warp, orbitTime));
  const maneuver = isManeuver ? maneuverReadings(settings, t) : undefined;
  const disturbance = isManeuver ? undefined : disturbanceReadings(settings.actuator, t);
  const live = maneuver ?? (disturbance as DisturbanceReadings);

  /** Every edit pauses playback; a new mode also rewinds, since its clock means other times. */
  const apply = (next: WheelSettings) => {
    clock.pause();
    if (next.mode !== settings.mode) clock.reset();
    setSettings(next);
  };
  const set = <K extends keyof WheelSettings>(key: K, value: WheelSettings[K]) =>
    apply({ ...settings, [key]: value });

  const onReset = () => {
    clock.reset();
    setSettings(DEFAULT_SETTINGS);
    setDisplay(DEFAULT_DISPLAY);
  };

  const params = (
    <>
      <ChoiceField
        id="wheel-mode"
        label="Modo"
        value={settings.mode}
        options={MODE_OPTIONS}
        onChange={(mode) => set('mode', mode)}
      />
      {isManeuver ? (
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <ParamField
            id="wheel-theta"
            label="Ángulo objetivo θ"
            unit="°"
            min={WHEEL_LIMITS.thetaDeg[0]}
            max={WHEEL_LIMITS.thetaDeg[1]}
            step={THETA_STEP}
            value={settings.thetaDeg}
            onChange={(thetaDeg) => set('thetaDeg', thetaDeg)}
          />
          <ParamField
            id="wheel-T"
            label="Duración de la maniobra T"
            unit="s"
            min={WHEEL_LIMITS.T[0]}
            max={WHEEL_LIMITS.T[1]}
            step={T_STEP}
            value={settings.T}
            onChange={(T) => set('T', T)}
          />
        </div>
      ) : (
        <ChoiceField
          id="wheel-actuator"
          label="Descarga con"
          value={settings.actuator}
          options={ACTUATOR_OPTIONS}
          onChange={(actuator) => set('actuator', actuator)}
        />
      )}
      <Presets
        presets={WHEEL_PRESETS}
        activeId={presetIdFor(settings)}
        onSelect={(preset) => apply(preset.values)}
      />
      <p className="m-0 text-sm text-fg-muted">
        {isManeuver
          ? 'Arrastra la perilla del dial, o enfócala y muévela con las flechas (1°; con Mayús, 10°). El signo positivo es antihorario visto desde arriba; la rueda parte de 0 rpm.'
          : 'La nave se mantiene quieta: la rueda absorbe el torque externo hasta el umbral y otro actuador, que sí intercambia momento con algo externo, la vacía.'}
      </p>
    </>
  );

  return (
    <LabShell
      title="Laboratorio de la rueda de reacción"
      clock={clock}
      timeUnit="s"
      readouts={readoutsFor(t, live, maneuver)}
      params={params}
      localSettings={wheelLocalSettings({ display, onDisplayChange: setDisplay, clock })}
      onReset={onReset}
      footnote={footnote}
      testId="wheel-lab"
    >
      <div className="flex flex-col gap-4">
        <WheelScene
          mode={settings.mode}
          thetaS={live.thetaS}
          omegaS={live.omegaS}
          omegaSReference={(2 * Math.abs(settings.thetaDeg)) / settings.T}
          thetaW={maneuver?.thetaW ?? 0}
          omegaW={live.omegaW}
          rpmMax={SPACECRAFT.rpmMax}
          targetDeg={settings.thetaDeg}
          actuator={settings.actuator}
          dumping={disturbance?.dumping ?? false}
          showArrows={display.showArrows}
          onTargetChange={(thetaDeg) => set('thetaDeg', thetaDeg)}
        />
        <MomentumGauge
          Lw={live.Lw}
          Lmax={SPACECRAFT.Lmax}
          threshold={isManeuver ? undefined : DUMP_THRESHOLD}
        />
        <WheelStatus
          settings={settings}
          feasibility={feasibility}
          dumping={disturbance?.dumping ?? false}
          speed={clock.state.speed}
          onGoToDump={() => clock.seek(firstDumpPlayback(warp))}
        />
        {display.showPlot ? <WheelPlot settings={settings} t={t} onSeek={seekOrbit} /> : null}
      </div>
    </LabShell>
  );
}
