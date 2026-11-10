/** The bounce laboratory's local settings ("Este simulador" in the drawer), built from its state. */
import type { CombineRule } from '../../../lib/physics';
import { clockSettings } from '../../lab/clockSettings';
import type { SettingOption } from '../../lab/SettingsDrawer';
import type { SimClock } from '../../lab/useSimClock';
import { BOUNCE_LIMITS, STEP_RATES, type BounceSettings, type StepRate } from './bouncePresets';

export type LabMode = 'bounce' | 'collision';

export const MODE_OPTIONS: readonly { value: LabMode; label: string }[] = [
  { value: 'bounce', label: 'Rebote contra el piso' },
  { value: 'collision', label: 'Choque de dos cuerpos' },
];

/** Each rule with the engines that use it by default (research §4). */
export const COMBINE_OPTIONS: readonly { value: CombineRule; label: string }[] = [
  { value: 'max', label: 'máx (Box2D, Jolt, Unity 2D)' },
  { value: 'average', label: 'promedio (Unity 3D, PhysX)' },
  { value: 'min', label: 'mín' },
  { value: 'multiply', label: 'producto (Bullet)' },
  { value: 'sumClamped', label: 'suma recortada (Godot)' },
];

/** The rule's short name, as the summary writes it. */
export function combineName(rule: CombineRule): string {
  const label = COMBINE_OPTIONS.find((option) => option.value === rule)?.label ?? rule;
  return label.replace(/ \(.*\)$/, '');
}

const THRESHOLD_STEP = 0.05;
const COEFFICIENT_STEP = 0.05;
const SUBSTEP_STEP = 1;

const isMode = (value: string): value is LabMode =>
  MODE_OPTIONS.some((option) => option.value === value);
const isRule = (value: string): value is CombineRule =>
  COMBINE_OPTIONS.some((option) => option.value === value);
const isRate = (value: number): value is StepRate => STEP_RATES.some((rate) => rate === value);

export interface BounceLocalSettingsInput {
  mode: LabMode;
  onModeChange(mode: LabMode): void;
  settings: BounceSettings;
  onSettingsChange(patch: Partial<BounceSettings>): void;
  clock: SimClock;
}

/** The engine's knobs, in the order a reader meets them in research §5 Paso 3. */
function engineOptions(
  settings: BounceSettings,
  onSettingsChange: BounceLocalSettingsInput['onSettingsChange'],
): SettingOption[] {
  const range = (
    key: 'substeps' | 'threshold' | 'floorE' | 'baumgarte',
    label: string,
    step: number,
    unit?: string,
  ): SettingOption => ({
    key,
    label,
    kind: 'range',
    value: settings[key],
    min: BOUNCE_LIMITS[key][0],
    max: BOUNCE_LIMITS[key][1],
    step,
    unit,
    onChange: (value) => onSettingsChange({ [key]: value }),
  });
  return [
    {
      key: 'rate',
      label: 'Paso del motor $\\Delta t$',
      kind: 'select',
      value: String(settings.rate),
      options: STEP_RATES.map((rate) => ({ value: String(rate), label: `1/${rate} s` })),
      onChange: (value) => {
        const rate = Number(value);
        if (isRate(rate)) onSettingsChange({ rate });
      },
    },
    range('substeps', 'Subpasos por paso', SUBSTEP_STEP),
    range('threshold', 'Umbral de restitución', THRESHOLD_STEP, 'm/s'),
    {
      key: 'combine',
      label: 'Regla de combinación',
      kind: 'select',
      value: settings.combine,
      options: [...COMBINE_OPTIONS],
      onChange: (value) => {
        if (isRule(value)) onSettingsChange({ combine: value });
      },
    },
    range('floorE', 'e del material del suelo', COEFFICIENT_STEP),
    range('baumgarte', 'Corrección de Baumgarte $\\beta$', COEFFICIENT_STEP),
    {
      key: 'speedDependent',
      label: 'e(v) = 0,79 − 0,009·|v| (ajuste ilustrativo)',
      chip: 'e(v)',
      kind: 'toggle',
      value: settings.speedDependent,
      onChange: (speedDependent) => onSettingsChange({ speedDependent }),
    },
  ];
}

/**
 * Modo; in the bounce mode the engine (Δt, subpasos, umbral, regla, e del suelo, β, e(v), the
 * last with its chip); then velocidad (0,25× is the slow motion) and repetir, which live on the
 * clock. The engine's state is read in the lab's «Motor» chips, not here.
 */
export function bounceLocalSettings({
  mode,
  onModeChange,
  settings,
  onSettingsChange,
  clock,
}: BounceLocalSettingsInput): SettingOption[] {
  const modeOption: SettingOption = {
    key: 'mode',
    label: 'Modo',
    kind: 'select',
    value: mode,
    options: [...MODE_OPTIONS],
    onChange: (value) => {
      if (isMode(value)) onModeChange(value);
    },
  };
  return [
    modeOption,
    ...(mode === 'bounce' ? engineOptions(settings, onSettingsChange) : []),
    ...clockSettings(clock),
  ];
}
