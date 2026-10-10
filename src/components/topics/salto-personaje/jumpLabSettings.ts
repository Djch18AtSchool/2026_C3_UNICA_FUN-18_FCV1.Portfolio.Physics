/** The jump laboratory's local settings ("Este simulador" in the drawer), built from its state. */
import type { SettingOption } from '../../lab/SettingsDrawer';
import type { SimClock } from '../../lab/useSimClock';
import { JUMP_LIMITS } from './jumpModel';

export type Integrator = 'analytic' | 'euler';

/** What the canvas draws and how the trajectory is computed. */
export interface JumpDisplay {
  showGhost: boolean;
  showVelocity: boolean;
  showTrail: boolean;
  integrator: Integrator;
}

export const DEFAULT_DISPLAY: JumpDisplay = {
  showGhost: true,
  showVelocity: true,
  showTrail: true,
  integrator: 'analytic',
};

const INTEGRATOR_OPTIONS: { value: Integrator; label: string }[] = [
  { value: 'analytic', label: 'Analítico' },
  { value: 'euler', label: 'Euler semi-implícito' },
];

/** Playback speeds offered (spec §8.2: 0,25× to 2×). */
const SPEEDS = [0.25, 0.5, 1, 1.5, 2] as const;
const SPEED_OPTIONS = SPEEDS.map((speed) => ({
  value: String(speed),
  label: `${String(speed).replace('.', ',')}×`,
}));

const FALL_MULTIPLIER_STEP = 0.1;

function isIntegrator(value: string): value is Integrator {
  return INTEGRATOR_OPTIONS.some((option) => option.value === value);
}

export interface JumpLocalSettingsInput {
  display: JumpDisplay;
  onDisplayChange(next: JumpDisplay): void;
  fallMultiplier: number;
  onFallMultiplierChange(k: number): void;
  clock: SimClock;
}

/**
 * Referencia terrestre, vector velocidad, rastro, multiplicador de caída (1–4), integrador,
 * velocidad and repetir, in that order. Speed and repeat live on the clock itself.
 */
export function jumpLocalSettings({
  display,
  onDisplayChange,
  fallMultiplier,
  onFallMultiplierChange,
  clock,
}: JumpLocalSettingsInput): SettingOption[] {
  const toggle = (
    key: 'showGhost' | 'showVelocity' | 'showTrail',
    label: string,
  ): SettingOption => ({
    key,
    label,
    kind: 'toggle',
    value: display[key],
    onChange: (value) => onDisplayChange({ ...display, [key]: value }),
  });
  const [kMin, kMax] = JUMP_LIMITS.fallMultiplier;
  return [
    toggle('showGhost', 'Referencia terrestre'),
    toggle('showVelocity', 'Vector velocidad'),
    toggle('showTrail', 'Rastro'),
    {
      key: 'fallMultiplier',
      label: 'Multiplicador de caída',
      kind: 'range',
      value: fallMultiplier,
      min: kMin,
      max: kMax,
      step: FALL_MULTIPLIER_STEP,
      unit: '×',
      onChange: onFallMultiplierChange,
    },
    {
      key: 'integrator',
      label: 'Integrador',
      kind: 'select',
      value: display.integrator,
      options: INTEGRATOR_OPTIONS,
      onChange: (value) => {
        if (isIntegrator(value)) onDisplayChange({ ...display, integrator: value });
      },
    },
    {
      key: 'speed',
      label: 'Velocidad',
      kind: 'select',
      value: String(clock.state.speed),
      options: SPEED_OPTIONS,
      onChange: (value) => clock.setSpeed(Number(value)),
    },
    {
      key: 'loop',
      label: 'Repetir',
      kind: 'toggle',
      value: clock.state.loop,
      onChange: clock.setLoop,
    },
  ];
}
