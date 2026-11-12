import { useCallback, useMemo, useState, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { CANVAS_INSET } from '../../lab/canvasInset';
import ChoiceField from '../../lab/ChoiceField';
import LabPresets from '../../lab/LabPresets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import ParamField from '../../lab/ParamField';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { useSimClock } from '../../lab/useSimClock';
import {
  disturbanceTimeline,
  firstDumpPlayback,
  orbitTimeAt,
  playbackTimeAt,
} from './disturbanceTimeline';
import MomentumGauge from './MomentumGauge';
import { useWheelTimeScale } from './useWheelTimeScale';
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
import WheelScene, { type SpinState } from './WheelScene';
import WheelStatus, { WheelNotes } from './WheelStatus';

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

/** «Cómo se usa», by mode: how the maneuver is set, what the disturbance shows. */
const MANEUVER_HINT =
  'Arrastra la perilla del dial, o enfócala y muévela con las flechas (1°; con Mayús, 10°). El signo positivo es antihorario visto desde arriba; la rueda parte de 0 rpm.';
const DISTURBANCE_HINT =
  'La nave se mantiene quieta: la rueda absorbe el torque externo hasta el umbral y otro actuador, que sí intercambia momento con algo externo, la vacía.';

/** The scene's zoom, in «Cómo se usa»: the gestures, the keys, and what the scale bar measures. */
const ZOOM_HINT =
  'La escena se acerca con los botones, con Ctrl y la rueda o pellizcando, y se desplaza arrastrando el fondo; con el lienzo enfocado con el teclado, + y − acercan y alejan, 0 ajusta y las flechas desplazan (entonces también la rueda sola acerca). La barra de escala mide la nave, la única parte dibujada a escala, y se recalcula con el zoom; «Ajustar» y «Restablecer» vuelven al encuadre inicial.';

export interface WheelLabProps {
  /** «Cómo se usa», after the mode's hint: the time-lapse and the dump's stretch, from the topic's MDX. */
  usage?: string;
  /** «Qué deja fuera el modelo», written in the topic's MDX. */
  leftOut?: string;
}

function readoutsFor(
  t: number,
  live: ManeuverReadings | DisturbanceReadings,
  maneuver: ManeuverReadings | undefined,
): LabReadout[] {
  const isManeuver = maneuver !== undefined;
  const common: LabReadout[] = [
    {
      id: 'thetaS',
      label: String.raw`Ángulo de la nave $\theta_s$`,
      value: live.thetaS,
      unit: '°',
    },
    {
      id: 'omegaS',
      label: String.raw`Velocidad angular de la nave $\omega_s$`,
      value: live.omegaS,
      unit: '°/s',
    },
    {
      id: 'omegaW',
      label: String.raw`Velocidad de la rueda $\omega_w$`,
      value: live.omegaW,
      unit: 'rpm',
    },
    {
      id: 'Lw',
      label: 'Momento angular de la rueda $L_w$',
      value: live.Lw,
      unit: 'N·m·s',
      precision: PRECISION.Lw,
    },
    {
      id: 'torque',
      label: String.raw`Torque del motor sobre la rueda $\tau$`,
      value: live.torque * MILLI,
      unit: 'mN·m',
      precision: isManeuver ? PRECISION.maneuverTorque : PRECISION.disturbanceTorque,
    },
    {
      id: 'share',
      label: String.raw`Porcentaje de $L_\text{máx}$`,
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
    {
      id: 'peak',
      label: String.raw`$\omega_w$ máxima de la maniobra`,
      value: maneuver.peakOmegaW,
      unit: 'rpm',
    },
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
 * The disturbance's transport reading: hours of orbit at the global decimals, as «Tiempo en
 * órbita» says them, for a clock that counts playback seconds (stretched over the dumps).
 */
const orbitHoursText =
  (toOrbitTime: (playbackTime: number) => number, decimals: number) => (playbackTime: number) =>
    `t = ${formatNumber(toOrbitTime(playbackTime) / SECONDS_PER_HOUR, { precision: decimals, unit: 'h' })}`;

interface WheelParamsProps {
  settings: WheelSettings;
  set<K extends keyof WheelSettings>(key: K, value: WheelSettings[K]): void;
}

/** Level 1: θ and T in the maneuver; the dump actuator in the disturbance. */
function WheelParams({ settings, set }: WheelParamsProps): JSX.Element {
  if (settings.mode !== 'maniobra') {
    return (
      <ChoiceField
        id="wheel-actuator"
        label="Descarga con"
        value={settings.actuator}
        options={ACTUATOR_OPTIONS}
        onChange={(actuator) => set('actuator', actuator)}
      />
    );
  }
  return (
    <>
      <ParamField
        id="wheel-theta"
        label={String.raw`Ángulo objetivo $\theta$`}
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
    </>
  );
}

/**
 * Tema 8's laboratory on LabShell: the 6U CubeSat with the RW400 seen along its slew axis.
 * "Maniobra" turns the body rest to rest by a dragged target θ in T seconds, in real time, with
 * the warning when T < T_min; "Perturbación y descarga" holds the body still for three days of
 * gravity-gradient torque, time-lapsed (DAY_LAPSE), dumping from 80 % of L_max (a design choice)
 * with the magnetorquer or the thruster. Readouts, the L_w/L_max gauge and the L_w(t) plot follow
 * the clock.
 */
export default function WheelLab({ usage, leftOut }: WheelLabProps): JSX.Element {
  const [settings, setSettings] = useState<WheelSettings>(DEFAULT_SETTINGS);
  const [display, setDisplay] = useState<WheelDisplay>(DEFAULT_DISPLAY);
  /** Each reset frames the scene again, as the zoom's «Ajustar» does. */
  const [refit, setRefit] = useState(0);
  const isManeuver = settings.mode === 'maniobra';
  const feasibility = useMemo(() => maneuverFeasibility(settings), [settings]);

  const warp = useMemo(() => disturbanceTimeline(settings.actuator), [settings.actuator]);

  // The disturbance clock runs in playback seconds: DAY_LAPSE on the fills, dumps stretched.
  const clock = useSimClock(isManeuver ? settings.T : warp.duration);
  const toOrbitTime = useCallback(
    (playbackTime: number) => (isManeuver ? playbackTime : orbitTimeAt(warp, playbackTime)),
    [isManeuver, warp],
  );
  const t = toOrbitTime(clock.state.t);
  const { decimals } = useGlobalSettings();
  const timeScale = useWheelTimeScale(clock, isManeuver, warp);
  const seekOrbit = (orbitTime: number) =>
    clock.seek(isManeuver ? orbitTime : playbackTimeAt(warp, orbitTime));
  const maneuver = isManeuver ? maneuverReadings(settings, t) : undefined;
  const disturbance = isManeuver ? undefined : disturbanceReadings(settings.actuator, t);
  const live = maneuver ?? (disturbance as DisturbanceReadings);
  /** The body's and wheel's spin at any playback time, for the scene's moving layer. */
  const spinAt = useCallback(
    (playbackTime: number): SpinState => {
      const orbit = toOrbitTime(playbackTime);
      const readings = isManeuver
        ? maneuverReadings(settings, orbit)
        : disturbanceReadings(settings.actuator, orbit);
      return {
        thetaS: readings.thetaS,
        omegaS: readings.omegaS,
        thetaW: 'thetaW' in readings ? readings.thetaW : 0,
        omegaW: readings.omegaW,
      };
    },
    [isManeuver, settings, toOrbitTime],
  );
  const liveSpin = useMemo(() => ({ frame: clock.frame, spinAt }), [clock.frame, spinAt]);

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
    setRefit((count) => count + 1);
  };

  const params = <WheelParams settings={settings} set={set} />;

  const scenario = (
    <>
      <ChoiceField
        id="wheel-mode"
        label="Modo"
        value={settings.mode}
        options={MODE_OPTIONS}
        onChange={(mode) => set('mode', mode)}
      />
      <LabPresets
        id="wheel-preset"
        presets={WHEEL_PRESETS}
        activeId={presetIdFor(settings)}
        onSelect={(preset) => apply(preset.values)}
      />
    </>
  );

  return (
    <LabShell
      title="Laboratorio de la rueda de reacción"
      clock={clock}
      timeUnit="s"
      formatTime={isManeuver ? undefined : orbitHoursText(toOrbitTime, decimals)}
      readouts={readoutsFor(t, live, maneuver)}
      canvasNotes={
        <WheelNotes settings={settings} feasibility={feasibility} speed={clock.state.speed} />
      }
      levels={{
        params,
        scenario,
        display: wheelLocalSettings({ display, onDisplayChange: setDisplay, clock }),
      }}
      notes={{
        usage: [
          isManeuver ? MANEUVER_HINT : DISTURBANCE_HINT,
          ZOOM_HINT,
          ...(usage ? [usage] : []),
        ],
        leftOut: leftOut ? [leftOut] : [],
      }}
      onReset={onReset}
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
          live={liveSpin}
          rpmMax={SPACECRAFT.rpmMax}
          targetDeg={settings.thetaDeg}
          actuator={settings.actuator}
          dumping={disturbance?.dumping ?? false}
          showArrows={display.showArrows}
          timeScale={timeScale}
          refit={refit}
          onTargetChange={(thetaDeg) => set('thetaDeg', thetaDeg)}
        />
        <div className={CANVAS_INSET}>
          <MomentumGauge
            Lw={live.Lw}
            Lmax={SPACECRAFT.Lmax}
            threshold={isManeuver ? undefined : DUMP_THRESHOLD}
          />
          <WheelStatus
            settings={settings}
            feasibility={feasibility}
            dumping={disturbance?.dumping ?? false}
            onGoToDump={() => clock.seek(firstDumpPlayback(warp))}
          />
        </div>
        {display.showPlot ? (
          <WheelPlot
            settings={settings}
            t={t}
            frame={clock.frame}
            orbitTimeAt={toOrbitTime}
            onSeek={seekOrbit}
          />
        ) : null}
      </div>
    </LabShell>
  );
}
