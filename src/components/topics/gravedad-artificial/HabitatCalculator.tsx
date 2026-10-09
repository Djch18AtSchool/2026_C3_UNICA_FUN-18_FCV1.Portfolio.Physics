import { useEffect, useMemo, useState } from 'react';
import { solveHabitat } from '../../../lib/physics';
import { clampSettings } from '../../../lib/limits';
import {
  HABITAT_LIMITS,
  HABITAT_PRESETS,
  type HabitatSettings,
} from '../../../lib/data/habitatPresets';
import ControlPanel from '../../controls/ControlPanel';
import Presets, { type Preset } from '../../controls/Presets';
import Readout from '../../controls/Readout';
import Slider from '../../controls/Slider';
import {
  INITIAL_HABITAT_STATE,
  RADIUS_STEP,
  RPM_STEP,
  solveForRadius,
  solveForRpm,
  switchMode,
  type HabitatMode,
  type HabitatState,
} from './habitatModel';

const MODES: { id: HabitatMode; label: string }[] = [
  { id: 'radius', label: 'Fijar 1 g y despejar r' },
  { id: 'rpm', label: 'Fijar r y despejar RPM' },
];

const PERCENT = 100;

export default function HabitatCalculator() {
  const [state, setState] = useState<HabitatState>(INITIAL_HABITAT_STATE);
  const [isReady, setIsReady] = useState(false);
  const { mode, settings, presetId } = state;

  useEffect(() => setIsReady(true), []);

  const solution = useMemo(() => solveHabitat(settings), [settings]);
  const isPresetDesign = presetId !== undefined;

  // A preset is a published (r, rpm) pair: show it as is, with r on the slider (mode "rpm").
  const applyPreset = (preset: Preset<HabitatSettings>) => {
    const { values } = clampSettings<Record<keyof HabitatSettings, number>>(
      preset.values,
      HABITAT_LIMITS,
    );
    setState({ mode: 'rpm', settings: values, presetId: preset.id });
  };

  return (
    <div data-testid="habitat-calculator" data-ready={isReady} className="flex flex-col gap-4">
      <ControlPanel title="Calculadora del hábitat" onReset={() => setState(INITIAL_HABITAT_STATE)}>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-medium">Modo de cálculo</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {MODES.map(({ id, label }) => (
              <label key={id} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="habitat-mode"
                  value={id}
                  checked={mode === id}
                  onChange={() => setState(switchMode(state, id))}
                  className="size-4 accent-accent"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {mode === 'radius' ? (
          <Slider
            id="habitat-rpm"
            label="Velocidad de giro"
            unit="RPM"
            min={HABITAT_LIMITS.rpm[0]}
            max={HABITAT_LIMITS.rpm[1]}
            step={RPM_STEP}
            value={settings.rpm}
            onChange={(rpm) => setState({ mode, settings: solveForRadius(rpm) })}
          />
        ) : (
          <Slider
            id="habitat-r"
            label="Radio del hábitat"
            unit="m"
            min={HABITAT_LIMITS.r[0]}
            max={HABITAT_LIMITS.r[1]}
            step={RADIUS_STEP}
            value={settings.r}
            onChange={(r) => setState({ mode, settings: solveForRpm(r) })}
          />
        )}
        <Presets presets={HABITAT_PRESETS} activeId={presetId} onSelect={applyPreset} />
      </ControlPanel>
      <section
        aria-label="Resultados"
        className="flex flex-col gap-3 rounded-base border border-border bg-bg-elevated p-4"
      >
        <div data-testid="habitat-readouts" className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {mode === 'radius' ? (
            <Readout label="Radio necesario para 1 g" value={solution.r} unit="m" precision={1} />
          ) : (
            <Readout
              label={
                isPresetDesign
                  ? 'Velocidad de giro del diseño'
                  : 'Velocidad de giro necesaria para 1 g'
              }
              value={solution.rpm}
              unit="RPM"
              precision={2}
            />
          )}
          <Readout label="Velocidad angular ω" value={solution.omega} unit="rad/s" precision={3} />
          <Readout label="Velocidad tangencial v" value={solution.v} unit="m/s" precision={1} />
          <Readout label="Aceleración centrípeta" value={solution.aC} unit="m/s²" precision={2} />
          <Readout label="Gravedad aparente" value={solution.gRatio} unit="g" precision={2} />
          <Readout label="Período T" value={solution.period} unit="s" precision={1} />
          <Readout label="Frecuencia f" value={solution.frequency} unit="Hz" precision={4} />
          <Readout
            label="Diferencia cabeza–pies"
            value={solution.gradient * PERCENT}
            unit="%"
            precision={2}
          />
        </div>
        <p className="m-0 text-sm text-fg-muted">
          {isPresetDesign
            ? 'Preajuste: r y RPM son los de la fuente, así que la gravedad aparente puede no ser 1 g. Al mover el control se vuelve a fijar 1 g.'
            : 'Con g = 9,81 m/s². La diferencia cabeza–pies es Δa/a = h/r para una persona de h = 1,80 m.'}
        </p>
      </section>
    </div>
  );
}
