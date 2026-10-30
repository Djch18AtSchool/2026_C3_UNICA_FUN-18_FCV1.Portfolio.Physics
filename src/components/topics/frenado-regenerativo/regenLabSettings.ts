/** The regenerative-braking lab's local settings ("Este simulador" in the drawer). */
import type { CycleId } from '../../../lib/data/driveCycles';
import { clockSettings } from '../../lab/clockSettings';
import type { SettingOption } from '../../lab/SettingsDrawer';
import type { SimClock } from '../../lab/useSimClock';

/** The three EPA schedules, named by the driving they stand for. */
export const CYCLE_OPTIONS: readonly { value: CycleId; label: string }[] = [
  { value: 'udds', label: 'UDDS · ciudad' },
  { value: 'hwfet', label: 'HWFET · carretera' },
  { value: 'us06', label: 'US06 · agresivo' },
];

/**
 * Playback speeds offered. At 1× (already 20 times real time) the UDDS lasts 68,5 s; 4× brings it
 * to about 17 s, and 0,25× slows one braking enough to follow the flow.
 */
const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

const isCycleId = (value: string): value is CycleId =>
  CYCLE_OPTIONS.some((option) => option.value === value);

export interface RegenLocalSettingsInput {
  cycle: CycleId;
  lowSpeedFade: boolean;
  onCycleChange(cycle: CycleId): void;
  onFadeChange(lowSpeedFade: boolean): void;
  clock: SimClock;
}

/** Ciclo, f(v), velocidad and repetir, in that order. */
export function regenLocalSettings({
  cycle,
  lowSpeedFade,
  onCycleChange,
  onFadeChange,
  clock,
}: RegenLocalSettingsInput): SettingOption[] {
  return [
    {
      key: 'cycle',
      label: 'Ciclo de manejo (EPA)',
      kind: 'select',
      value: cycle,
      options: CYCLE_OPTIONS.map((option) => ({ ...option })),
      onChange: (value) => {
        if (isCycleId(value)) onCycleChange(value);
      },
    },
    {
      key: 'lowSpeedFade',
      label: 'Desvanecimiento a baja velocidad f(v)',
      kind: 'toggle',
      value: lowSpeedFade,
      onChange: onFadeChange,
    },
    ...clockSettings(clock, SPEEDS),
  ];
}
