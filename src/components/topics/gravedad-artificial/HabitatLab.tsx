import { useMemo, useState, type JSX } from 'react';
import { HABITAT_LIMITS, HABITAT_PRESETS } from '../../../lib/data/habitatPresets';
import { solveHabitat } from '../../../lib/physics';
import InlineMath from '../../lab/InlineMath';
import LabPresets from '../../lab/LabPresets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import ParamField from '../../lab/ParamField';
import { SwitchField } from '../../lab/SettingsFields';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { useSimClock } from '../../lab/useSimClock';
import { DEFAULT_DISPLAY, habitatLocalSettings, type HabitatDisplay } from './habitatLabSettings';
import {
  applyPreset,
  INITIAL_HABITAT_STATE,
  LOCKED_LIMITS,
  setLocked,
  setRadius,
  setRpm,
  type HabitatState,
} from './habitatModel';
import HabitatNotes from './HabitatNotes';
import HabitatScene from './HabitatScene';

/**
 * The clock runs in real seconds; playback compresses them 6 times, so one revolution at 1 rpm
 * (60 s) plays in 10 s at 1×. Faster habitats visibly turn faster; the speed setting reaches 8×.
 */
export const TIME_LAPSE = 6;
/** Slider grains: 0,01 rpm and 0,1 m, the precision a solved value keeps (or finer). */
const RPM_STEP = 0.01;
const RADIUS_STEP = 0.1;
const PERCENT = 100;

const comma = (value: number) => String(value).replace('.', ',');
const LOCKED_NOTE = `Con 1 g fijo, mover un parámetro despeja el otro: $r = g/\\omega^2$ o $\\omega = \\sqrt{g/r}$, con g = 9,81 m/s². Para que ambos quepan en sus controles, el giro no baja de ${comma(LOCKED_LIMITS.rpm[0])} RPM ni el radio de ${comma(LOCKED_LIMITS.r[0])} m.`;
const FREE_NOTE = 'Sin 1 g fijo, r y RPM son libres y la gravedad aparente es la que resulte.';

/** «Cómo se usa»: the drag and its keys, then what a preset does to the lock. */
const USAGE_HINT =
  'Arrastra el manejador sobre la barra logarítmica, o enfócalo y muévelo con las flechas (1 % de la barra; con Mayús, 10 %). Un preajuste muestra el par ($r$, RPM) de su fuente y apaga «Fijar 1 g».';

/** «Cómo se usa», after the drag hint: the ring's zoom, so the person can be seen close up. */
const ZOOM_HINT =
  'El anillo se acerca con los botones, con Ctrl y la rueda o pellizcando, y se desplaza arrastrando el fondo; con el lienzo enfocado con el teclado, + y − acercan y alejan, 0 ajusta y las flechas desplazan (entonces también la rueda sola acerca). Con la reproducción en pausa puedes acercarte a la persona; la barra de escala mide el radio $r$. «Ajustar» vuelve al anillo entero, igual que elegir un preajuste o «Restablecer».';

export interface HabitatLabProps {
  /** «Cómo se usa», after the drag hint: the time lapse and the t readout, from the topic's MDX. */
  usage?: string;
  /** «Qué deja fuera el modelo», written in the topic's MDX so it travels with its text. */
  leftOut?: string;
}

/**
 * Tema 3's laboratory on LabShell: the ring turning for one revolution (the clock lasts
 * T = 2π/ω), a person on the floor with live a_c and apparent-gravity vectors, the radius dragged
 * along a log bar, RPM and radius as main parameters, the "fijar 1 g" switch that solves one from
 * the other, the v1 presets and the readouts ω, v, a_c/g, T and the head-to-feet gradient.
 */
export default function HabitatLab({ usage, leftOut }: HabitatLabProps): JSX.Element {
  const [state, setState] = useState<HabitatState>(INITIAL_HABITAT_STATE);
  const [display, setDisplay] = useState<HabitatDisplay>(DEFAULT_DISPLAY);
  /** Each change frames the ring again: a preset and a reset start from «Ajustar». */
  const [refit, setRefit] = useState(0);
  const frameAgain = () => setRefit((count) => count + 1);
  const { decimals } = useGlobalSettings();
  const { settings, isLocked, presetId } = state;
  const solution = useMemo(() => solveHabitat(settings), [settings]);

  const clock = useSimClock(solution.period, { timeScale: TIME_LAPSE });

  /** Every edit, by slider, field, handle, key or preset, pauses playback like a timeline drag. */
  const update = (next: (previous: HabitatState) => HabitatState) => {
    clock.pause();
    setState(next);
  };

  const onReset = () => {
    clock.reset();
    setState(INITIAL_HABITAT_STATE);
    setDisplay(DEFAULT_DISPLAY);
    frameAgain();
  };

  const readouts: LabReadout[] = [
    { id: 'omega', label: 'Velocidad angular ω', value: solution.omega, unit: 'rad/s' },
    { id: 'v', label: 'Velocidad tangencial v', value: solution.v, unit: 'm/s' },
    { id: 'gRatio', label: 'Gravedad aparente $a_c/g$', value: solution.gRatio, unit: 'g' },
    { id: 'period', label: 'Período T', value: solution.period, unit: 's' },
    {
      id: 'gradient',
      label: 'Diferencia cabeza–pies h/r',
      value: solution.gradient * PERCENT,
      unit: '%',
    },
  ];

  const params = (
    <>
      <ParamField
        id="habitat-rpm"
        label="Velocidad de giro N"
        unit="RPM"
        min={HABITAT_LIMITS.rpm[0]}
        max={HABITAT_LIMITS.rpm[1]}
        step={RPM_STEP}
        value={settings.rpm}
        onChange={(rpm) => update((previous) => setRpm(previous, rpm))}
      />
      <ParamField
        id="habitat-r"
        label="Radio del piso r"
        unit="m"
        min={HABITAT_LIMITS.r[0]}
        max={HABITAT_LIMITS.r[1]}
        step={RADIUS_STEP}
        value={settings.r}
        onChange={(r) => update((previous) => setRadius(previous, r))}
      />
      <SwitchField
        id="habitat-lock"
        label="Fijar 1 g"
        checked={isLocked}
        onChange={(checked) => update((previous) => setLocked(previous, checked))}
      />
      <p className="m-0 text-sm text-fg-muted">
        <InlineMath text={isLocked ? LOCKED_NOTE : FREE_NOTE} />
      </p>
    </>
  );

  const scenario = (
    <LabPresets
      id="habitat-preset"
      presets={HABITAT_PRESETS}
      activeId={presetId}
      onSelect={(preset) => {
        update(() => applyPreset(preset));
        frameAgain();
      }}
    />
  );

  return (
    <LabShell
      title="Laboratorio del hábitat"
      clock={clock}
      timeUnit="s"
      readouts={readouts}
      canvasNotes={<HabitatNotes showVectors={display.showVectors} />}
      levels={{
        params,
        scenario,
        display: habitatLocalSettings({ display, onDisplayChange: setDisplay, clock }),
      }}
      notes={{
        usage: [USAGE_HINT, ZOOM_HINT, ...(usage ? [usage] : [])],
        leftOut: leftOut ? [leftOut] : [],
      }}
      onReset={onReset}
      testId="habitat-lab"
    >
      <HabitatScene
        r={settings.r}
        rpm={settings.rpm}
        omega={solution.omega}
        frame={clock.frame}
        gRatio={solution.gRatio}
        showVectors={display.showVectors}
        decimals={decimals}
        refit={refit}
        onRadiusChange={(r) => update((previous) => setRadius(previous, r))}
      />
    </LabShell>
  );
}
