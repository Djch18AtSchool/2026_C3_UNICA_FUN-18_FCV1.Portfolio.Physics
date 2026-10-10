import { useState, type JSX } from 'react';
import { TRIGGER_LIMITS } from '../../../lib/data/triggerModel';
import { formatNumber } from '../../../lib/format';
import { motionReduced } from '../../../lib/settingsStore';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import ParamField from '../../lab/ParamField';
import type { SettingOption } from '../../lab/SettingsDrawer';
import SvgPlot from '../../lab/SvgPlot';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { usePrefersReducedMotion } from '../../lab/useSimClock';
import { HOOKE_COLOR, labPlot, usePlotAspect } from './hapticPlots';
import TriggerLever from './TriggerLever';
import {
  DAMPING_OPTIONS,
  dampingRatio,
  releaseParams,
  SLOW_MOTION,
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
}

/** The worked example of the text at rest: k = 400 N/m, resistance from x₀ = 0, critical damping. */
const INITIAL_STATE: Readonly<TriggerLabState> = { k: 400, x0Mm: 0, xMm: 0, damping: 'critica' };
const K_STEP = 10;
const X0_STEP = 0.5;
/** The travel reads to 0,1 mm, the keyboard grain; the rest follow the global decimals. */
const X_PRECISION = 1;
const WIDE_ASPECT = 2;
const COMPACT_ASPECT = 1.1;
/** The ideal spring's point: a ring around the trigger's marker, so both read when they coincide. */
const HOOKE_RING = 8;

export interface TriggerLabProps {
  /** The model's caveats, written in the topic's MDX so they travel with its text. */
  footnote?: string;
}

/**
 * Tema 5's laboratory on the v2 shell, with no clock: a lever on a pivot pressed through 0–8 mm
 * (pointer, touch or keys), the F–x plot with the ideal spring and the trigger's piecewise
 * profile and a live marker, k and x₀ as main parameters and the readouts x, F, U and W. Let go,
 * the lever returns with the kernel's damped spring (critical or underdamped, a local setting).
 */
export default function TriggerLab({ footnote }: TriggerLabProps): JSX.Element {
  const [state, setState] = useState<TriggerLabState>(INITIAL_STATE);
  const settings = useGlobalSettings();
  const isReduced = motionReduced(settings, usePrefersReducedMotion());
  const plotAspect = usePlotAspect(WIDE_ASPECT, COMPACT_ASPECT);
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
  /** The pointer let go at xMm: the lever starts its return from there, not from the last render. */
  const letGo = (xMm: number) => {
    press(xMm);
    release.start(xMm);
  };
  const onReset = () => {
    release.cancel();
    setState(INITIAL_STATE);
  };

  const readouts: LabReadout[] = [
    { label: 'Desplazamiento x', value: state.xMm, unit: 'mm', precision: X_PRECISION },
    { label: 'Fuerza del gatillo F', value: readings.force, unit: 'N' },
    { label: 'Energía elástica U, resorte ideal', value: readings.energy, unit: 'mJ' },
    { label: 'Trabajo del dedo W', value: readings.work, unit: 'mJ' },
  ];

  const localSettings: SettingOption[] = [
    {
      key: 'damping',
      label: 'Amortiguación al soltar',
      kind: 'select',
      value: state.damping,
      options: DAMPING_OPTIONS,
      onChange: (value) => setState((previous) => ({ ...previous, damping: value as Damping })),
    },
  ];

  const params = (
    <>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
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
          label="Inicio de la resistencia x₀"
          unit="mm"
          min={TRIGGER_LIMITS.start[0]}
          max={TRIGGER_LIMITS.start[1]}
          step={X0_STEP}
          value={state.x0Mm}
          onChange={(x0Mm) => setState((previous) => ({ ...previous, x0Mm }))}
        />
      </div>
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => release.start(state.xMm)}
          disabled={state.xMm === 0 || release.isReleasing}
          className="h-9 rounded-base border border-border bg-bg px-3 text-sm font-medium text-fg hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Soltar el gatillo
        </button>
        <p className="m-0 text-sm text-fg-muted">
          Arrastra la palanca y suéltala, o enfócala y muévela con las flechas (0,1 mm; con Mayús, 1
          mm): con el teclado el gatillo queda apretado hasta «Soltar el gatillo». La amortiguación
          se elige en los ajustes del engranaje.
        </p>
      </div>
    </>
  );

  return (
    <LabShell
      title="Laboratorio del gatillo"
      type="simulacion"
      readouts={readouts}
      params={params}
      localSettings={localSettings}
      onReset={onReset}
      footnote={footnote}
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
        <div ref={plotAspect.ref} data-testid="trigger-plot">
          <SvgPlot
            aspectRatio={plotAspect.aspectRatio}
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
        <p className="m-0 text-sm text-fg-muted">
          U = ½ k x² es la energía elástica del resorte ideal en el x actual; W = ½ k (x − x₀)², el
          área bajo el perfil, es el trabajo del dedo contra el gatillo, que el actuador absorbe en
          lugar de guardarlo. La flecha F es la fuerza del gatillo sobre el dedo, a escala; el aro
          marca el resorte ideal en el mismo x.{' '}
          {`Al soltarla, la palanca vuelve ${SLOW_MOTION} veces más lenta que el retorno calculado, para que se vea, y se detiene en el tope del reposo.`}
        </p>
      </div>
    </LabShell>
  );
}
