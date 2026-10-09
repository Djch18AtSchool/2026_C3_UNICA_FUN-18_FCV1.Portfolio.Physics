import { useEffect, useMemo, useState } from 'react';
import { G_EARTH } from '../../../lib/physics';
import { clampSettings } from '../../../lib/limits';
import { DEFAULT_JUMP_PRESET_ID, JUMP_PRESETS } from '../../../lib/data/jumpPresets';
import ControlPanel from '../../controls/ControlPanel';
import Presets, { type Preset } from '../../controls/Presets';
import Readout from '../../controls/Readout';
import Slider from '../../controls/Slider';
import JumpCanvas from './JumpCanvas';
import JumpDesigner from './JumpDesigner';
import { computeJump, JUMP_DEFAULTS, JUMP_LIMITS, type JumpSettings } from './jumpModel';

type JumpKey = keyof JumpSettings;

interface SliderSpec {
  key: JumpKey;
  label: string;
  unit: string;
  step: number;
}

const SLIDERS: SliderSpec[] = [
  { key: 'v0', label: 'Impulso de salto v₀', unit: 'm/s', step: 0.1 },
  { key: 'g', label: 'Gravedad g', unit: 'm/s²', step: 0.01 },
  { key: 'vx', label: 'Velocidad horizontal vₓ', unit: 'm/s', step: 0.05 },
  { key: 'fallMultiplier', label: 'Multiplicador de caída', unit: '×', step: 0.1 },
];

const FIELD_NAMES: Record<JumpKey, string> = {
  v0: 'impulso v₀',
  g: 'gravedad g',
  vx: 'velocidad horizontal vₓ',
  fallMultiplier: 'multiplicador de caída',
};

const READOUT_PRECISION = 2;

interface SimulatorState {
  settings: JumpSettings;
  presetId?: string;
  clamped: JumpKey[];
}

const INITIAL_STATE: SimulatorState = {
  settings: JUMP_DEFAULTS,
  presetId: DEFAULT_JUMP_PRESET_ID,
  clamped: [],
};

export default function JumpSimulator() {
  const [state, setState] = useState<SimulatorState>(INITIAL_STATE);
  const [isReady, setIsReady] = useState(false);
  const { settings, presetId, clamped } = state;

  useEffect(() => setIsReady(true), []);

  const live = useMemo(() => computeJump(settings), [settings]);
  const ghost = useMemo(
    () => computeJump({ v0: settings.v0, vx: settings.vx, g: G_EARTH, fallMultiplier: 1 }),
    [settings.v0, settings.vx],
  );

  const setField = (key: JumpKey, value: number) =>
    setState({ settings: { ...settings, [key]: value }, clamped: [] });

  // Presets and the designer may ask for values the sliders cannot show; clamp and say so.
  const applyValues = (values: JumpSettings, id?: string) => {
    const result = clampSettings<Record<JumpKey, number>>(values, JUMP_LIMITS);
    setState({ settings: result.values, presetId: id, clamped: result.clamped });
  };

  return (
    <div data-testid="jump-simulator" data-ready={isReady} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-base border border-border bg-bg-elevated p-4">
        <JumpCanvas live={live} ghost={ghost} g={settings.g} />
        <div data-testid="jump-readouts" className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <Readout label="Altura máxima" value={live.hMax} unit="m" precision={READOUT_PRECISION} />
          <Readout
            label="Tiempo al ápice"
            value={live.tApex}
            unit="s"
            precision={READOUT_PRECISION}
          />
          <Readout
            label="Tiempo en el aire"
            value={live.tAir}
            unit="s"
            precision={READOUT_PRECISION}
          />
          <Readout label="Alcance" value={live.range} unit="m" precision={READOUT_PRECISION} />
        </div>
      </div>
      <ControlPanel title="Controles" onReset={() => setState(INITIAL_STATE)}>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          {SLIDERS.map(({ key, label, unit, step }) => (
            <Slider
              key={key}
              id={`jump-${key}`}
              label={label}
              unit={unit}
              min={JUMP_LIMITS[key][0]}
              max={JUMP_LIMITS[key][1]}
              step={step}
              value={settings[key]}
              onChange={(value) => setField(key, value)}
            />
          ))}
        </div>
        <Presets
          presets={JUMP_PRESETS}
          activeId={presetId}
          onSelect={(preset: Preset<JumpSettings>) => applyValues(preset.values, preset.id)}
        />
        {clamped.length > 0 ? (
          <p data-testid="clamp-note" role="status" className="m-0 text-sm">
            {`Valores ajustados al rango de los controles: ${clamped.map((key) => FIELD_NAMES[key]).join(', ')}.`}
          </p>
        ) : null}
      </ControlPanel>
      <JumpDesigner current={settings} onApply={(values) => applyValues(values)} />
    </div>
  );
}
