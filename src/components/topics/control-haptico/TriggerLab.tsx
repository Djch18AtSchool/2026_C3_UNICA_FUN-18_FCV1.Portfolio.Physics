import { useState, type JSX } from 'react';
import { TRIGGER_LIMITS } from '../../../lib/data/triggerModel';
import { formatNumber } from '../../../lib/format';
import { motionReduced } from '../../../lib/settingsStore';
import LabPresets from '../../lab/LabPresets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import InlineMath from '../../lab/InlineMath';
import ParamField from '../../lab/ParamField';
import type { SettingOption } from '../../lab/SettingsDrawer';
import SvgPlot, { type PlotAspect } from '../../lab/SvgPlot';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { usePrefersReducedMotion } from '../../lab/useSimClock';
import { HOOKE_COLOR, labPlot } from './hapticPlots';
import TriggerLever from './TriggerLever';
import {
  DAMPING_OPTIONS,
  dampingRatio,
  releaseParams,
  SLOW_MOTION,
  TRIGGER_PRESETS,
  triggerPresetIdFor,
  triggerReadings,
  type Damping,
} from './triggerScene';
import { useTriggerRelease } from './useTriggerRelease';

interface TriggerLabState {
  /** Stiffness of the virtual spring, N/m. */
  k: number;
  /** Start of the resistance x₀, mm. */
  x0Mm: number;
  /** Travel of the trigger, mm. */
  xMm: number;
  damping: Damping;
  /** Where the last release started (mm), for "Repetir retorno"; none before the first one. */
  lastReleaseMm?: number;
}

/** The worked example of the text at rest: k = 400 N/m, resistance from x₀ = 0, critical damping. */
const INITIAL_STATE: Readonly<TriggerLabState> = { k: 400, x0Mm: 0, xMm: 0, damping: 'critica' };
const K_STEP = 10;
const X0_STEP = 0.5;
/** The travel reads to 0,1 mm, the keyboard grain; the rest follow the global decimals. */
const X_PRECISION = 1;
/** The plot's two ratios, squarer in a narrow stage (SvgPlot reserves the one it will draw). */
const PLOT_ASPECT: PlotAspect = { compact: 1.1, wide: 2 };
/** The ideal spring's point: a ring around the trigger's marker, so both read when they coincide. */
const HOOKE_RING = 8;
const ACTION_BUTTON =
  'min-h-10 rounded-base border border-border bg-bg px-3 text-sm font-medium text-fg hover:border-accent disabled:cursor-not-allowed disabled:opacity-50';

/** «Cómo se usa»: the lever and its keys, the two buttons under it and what a keyboard press does. */
const USAGE =
  'Arrastra la palanca y suéltala, o enfócala y muévela con las flechas (0,1 mm; con Mayús, 1 mm): con el teclado el gatillo queda apretado hasta «Soltar el gatillo». «Repetir retorno» vuelve a soltarlo desde el último punto.';

export interface TriggerLabProps {
  /** «Qué deja fuera el modelo», written in the topic's MDX so it travels with its text. */
  leftOut?: string;
}

/**
 * Tema 5's laboratory on LabShell, with no clock: a lever on a pivot pressed through 0–8 mm
 * (pointer, touch or keys), the F–x plot with the ideal spring and the trigger's piecewise
 * profile and a live marker, k and x₀ as main parameters, presets from the text's examples and the
 * readouts x, F, U and W. Let go, the lever returns with the kernel's damped spring (critical or
 * underdamped, a local setting); "Repetir retorno" replays the last release from its start.
 */
export default function TriggerLab({ leftOut }: TriggerLabProps): JSX.Element {
  const [state, setState] = useState<TriggerLabState>(INITIAL_STATE);
  const settings = useGlobalSettings();
  const isReduced = motionReduced(settings, usePrefersReducedMotion());
  const spring = { k: state.k, x0Mm: state.x0Mm };
  const readings = triggerReadings(spring, state.xMm);
  const release = useTriggerRelease({
    params: releaseParams(state.k, dampingRatio(state.damping)),
    isReduced,
    onPosition: (xMm) => setState((previous) => ({ ...previous, xMm })),
  });

  const press = (xMm: number) => {
    release.cancel();
    setState((previous) => ({ ...previous, xMm }));
  };
  /** Lets the lever go from xMm (mm) and remembers it, so the return can be replayed. */
  const releaseFrom = (xMm: number) => {
    setState((previous) => ({
      ...previous,
      lastReleaseMm: xMm > 0 ? xMm : previous.lastReleaseMm,
    }));
    release.start(xMm);
  };
  /** The pointer let go at xMm: the lever starts its return from there, not from the last render. */
  const letGo = (xMm: number) => {
    press(xMm);
    releaseFrom(xMm);
  };
  const onReset = () => {
    release.cancel();
    setState(INITIAL_STATE);
  };

  const readouts: LabReadout[] = [
    { id: 'x', label: 'Desplazamiento x', value: state.xMm, unit: 'mm', precision: X_PRECISION },
    { id: 'force', label: 'Fuerza del gatillo F', value: readings.force, unit: 'N' },
    {
      id: 'energy',
      label: 'Energía elástica U, resorte ideal',
      value: readings.energy,
      unit: 'mJ',
    },
    { id: 'work', label: 'Trabajo del dedo W', value: readings.work, unit: 'mJ' },
  ];

  const display: SettingOption[] = [
    {
      key: 'damping',
      label: 'Amortiguación al soltar',
      chip: 'Amortiguación',
      kind: 'select',
      value: state.damping,
      options: DAMPING_OPTIONS,
      onChange: (value) => setState((previous) => ({ ...previous, damping: value as Damping })),
    },
  ];

  const params = (
    <>
      <ParamField
        id="trigger-k"
        label="Rigidez k"
        unit="N/m"
        min={TRIGGER_LIMITS.k[0]}
        max={TRIGGER_LIMITS.k[1]}
        step={K_STEP}
        value={state.k}
        onChange={(k) => setState((previous) => ({ ...previous, k }))}
      />
      <ParamField
        id="trigger-x0"
        label="Inicio de la resistencia $x_0$"
        unit="mm"
        min={TRIGGER_LIMITS.start[0]}
        max={TRIGGER_LIMITS.start[1]}
        step={X0_STEP}
        value={state.x0Mm}
        onChange={(x0Mm) => setState((previous) => ({ ...previous, x0Mm }))}
      />
    </>
  );

  const scenario = (
    <LabPresets
      id="trigger-preset"
      presets={TRIGGER_PRESETS}
      activeId={triggerPresetIdFor(state)}
      onSelect={({ values }) => {
        release.cancel();
        setState((previous) => ({ ...previous, ...values }));
      }}
    />
  );

  /** What reads the drawing, with no controls: the energies, the arrow, the ring and the slow motion. */
  const canvasNotes = (
    <p className="m-0 text-sm text-fg-muted">
      <InlineMath
        text={`$U = \\tfrac12 k x^2$ es la energía elástica del resorte ideal en el x actual; $W = \\tfrac12 k (x - x_0)^2$, el área bajo el perfil, es el trabajo del dedo contra el gatillo, que el actuador absorbe en lugar de guardarlo. La flecha F es la fuerza del gatillo sobre el dedo, a escala; el aro marca el resorte ideal en el mismo x. Al soltarla, la palanca vuelve ${SLOW_MOTION} veces más lenta que el retorno calculado, para que se vea, y se detiene en el tope del reposo.`}
      />
    </p>
  );

  return (
    <LabShell
      title="Laboratorio del gatillo"
      readouts={readouts}
      levels={{ params, scenario, display }}
      canvasNotes={canvasNotes}
      notes={{ usage: [USAGE], leftOut: leftOut ? [leftOut] : [] }}
      onReset={onReset}
      testId="trigger-lab"
    >
      <div className="flex flex-col gap-4">
        <TriggerLever
          xMm={state.xMm}
          x0Mm={state.x0Mm}
          forceN={readings.force}
          onPress={press}
          onRelease={letGo}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => releaseFrom(state.xMm)}
            disabled={state.xMm === 0 || release.isReleasing}
            className={ACTION_BUTTON}
          >
            Soltar el gatillo
          </button>
          <button
            type="button"
            onClick={() => {
              if (state.lastReleaseMm !== undefined) letGo(state.lastReleaseMm);
            }}
            disabled={state.lastReleaseMm === undefined || release.isReleasing}
            className={ACTION_BUTTON}
          >
            Repetir retorno
          </button>
        </div>
        <div data-testid="trigger-plot">
          <SvgPlot
            aspectRatio={PLOT_ASPECT}
            title="Fuerza frente al desplazamiento del gatillo"
            {...labPlot(spring)}
            marker={{ x: state.xMm, y: readings.force }}
            overlay={(scales) => (
              <circle
                data-point="hooke"
                cx={scales.x.toPx(state.xMm)}
                cy={scales.y.toPx(readings.hooke)}
                r={HOOKE_RING}
                fill="none"
                stroke={HOOKE_COLOR}
                strokeWidth={2}
                className="pointer-events-none"
              />
            )}
            ariaLabel={`A ${formatNumber(state.xMm, { precision: X_PRECISION, unit: 'mm' })}, el gatillo empuja con ${formatNumber(readings.force, { precision: settings.decimals, unit: 'N' })} y el resorte ideal, con ${formatNumber(readings.hooke, { precision: settings.decimals, unit: 'N' })}.`}
          />
        </div>
      </div>
    </LabShell>
  );
}
