/**
 * The regenerative-braking lab's scenario choices (the view and the drive cycle, under its
 * parameters) and its local settings ("Este simulador" in the drawer: f(v) and «Repetir»).
 */
import type { CycleId } from '../../../lib/data/driveCycles';
import { clockSettings } from '../../lab/clockSettings';
import type { SettingOption } from '../../lab/SettingsDrawer';
import type { SimClock } from '../../lab/useSimClock';
import type { RegenView } from './regenStretch';

/**
 * The three views, named by what they show (never by a factor: the badge on the canvas says it),
 * short enough for one row of segments on a phone. «Cómo se usa» says what each one plays.
 */
export const VIEW_OPTIONS: readonly { value: RegenView; label: string }[] = [
  { value: 'tramo', label: 'Tramo' },
  { value: 'ciclo', label: 'Ciclo' },
  { value: 'conducir', label: 'Conducir' },
];

/** The three EPA schedules, named by the driving they stand for. */
export const CYCLE_OPTIONS: readonly { value: CycleId; label: string }[] = [
  { value: 'udds', label: 'UDDS · ciudad' },
  { value: 'hwfet', label: 'HWFET · carretera' },
  { value: 'us06', label: 'US06 · agresivo' },
];

/**
 * The speeds of the transport (LabShell `speeds`), times the view's own scale: in «Ciclo» (20
 * times real time) the UDDS lasts 68,5 s at 1× and about 17 s at 4×; in «Tramo» (real time) 0,25×
 * slows the braking down.
 */
export const REGEN_SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

/** A select's value as a drive cycle, or undefined when it names none (it never should). */
export const asCycleId = (value: string): CycleId | undefined =>
  CYCLE_OPTIONS.find((option) => option.value === value)?.value;

export interface RegenLocalSettingsInput {
  lowSpeedFade: boolean;
  onFadeChange(lowSpeedFade: boolean): void;
  clock: SimClock;
}

/** f(v) and repetir, in that order (the view and the cycle are the scenario's; the speed, the transport's). */
export function regenLocalSettings({
  lowSpeedFade,
  onFadeChange,
  clock,
}: RegenLocalSettingsInput): SettingOption[] {
  return [
    {
      key: 'lowSpeedFade',
      label: 'Desvanecimiento a baja velocidad $f(v)$',
      kind: 'toggle',
      value: lowSpeedFade,
      onChange: onFadeChange,
    },
    ...clockSettings(clock),
  ];
}
