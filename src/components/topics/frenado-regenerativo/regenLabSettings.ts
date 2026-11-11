/** The regenerative-braking lab's local settings ("Este simulador" in the drawer). */
import type { CycleId } from '../../../lib/data/driveCycles';
import { clockSettings } from '../../lab/clockSettings';
import type { SettingOption } from '../../lab/SettingsDrawer';
import type { SimClock } from '../../lab/useSimClock';
import type { RegenView } from './regenStretch';

/** The two views, named by what they show (never by a factor: the badge on the canvas says it). */
export const VIEW_OPTIONS: readonly { value: RegenView; label: string; chip: string }[] = [
  { value: 'tramo', label: 'Tramo: una frenada', chip: 'Tramo' },
  { value: 'ciclo', label: 'Ciclo completo', chip: 'Ciclo' },
];

/** The three EPA schedules, named by the driving they stand for. */
export const CYCLE_OPTIONS: readonly { value: CycleId; label: string }[] = [
  { value: 'udds', label: 'UDDS · ciudad' },
  { value: 'hwfet', label: 'HWFET · carretera' },
  { value: 'us06', label: 'US06 · agresivo' },
];

/**
 * Playback speeds offered, times the view's own scale: in «Ciclo» (20 times real time) the UDDS
 * lasts 68,5 s at 1× and about 17 s at 4×; in «Tramo» (real time) 0,25× slows the braking down.
 */
const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

const isCycleId = (value: string): value is CycleId =>
  CYCLE_OPTIONS.some((option) => option.value === value);
const isView = (value: string): value is RegenView =>
  VIEW_OPTIONS.some((option) => option.value === value);

export interface RegenLocalSettingsInput {
  view: RegenView;
  onViewChange(view: RegenView): void;
  cycle: CycleId;
  lowSpeedFade: boolean;
  onCycleChange(cycle: CycleId): void;
  onFadeChange(lowSpeedFade: boolean): void;
  clock: SimClock;
}

/**
 * Vista, ciclo, f(v), velocidad and repetir, in that order; the view, the cycle and f(v) show as
 * chips beside the gear.
 */
export function regenLocalSettings({
  view,
  onViewChange,
  cycle,
  lowSpeedFade,
  onCycleChange,
  onFadeChange,
  clock,
}: RegenLocalSettingsInput): SettingOption[] {
  return [
    {
      key: 'view',
      label: 'Vista',
      chip: 'Vista',
      kind: 'select',
      value: view,
      options: VIEW_OPTIONS.map((option) => ({ ...option })),
      onChange: (value) => {
        if (isView(value)) onViewChange(value);
      },
    },
    {
      key: 'cycle',
      label: 'Ciclo de manejo (EPA)',
      chip: 'Ciclo',
      kind: 'select',
      value: cycle,
      options: CYCLE_OPTIONS.map((option) => ({ ...option })),
      onChange: (value) => {
        if (isCycleId(value)) onCycleChange(value);
      },
    },
    {
      key: 'lowSpeedFade',
      label: 'Desvanecimiento a baja velocidad $f(v)$',
      chip: '$f(v)$',
      kind: 'toggle',
      value: lowSpeedFade,
      onChange: onFadeChange,
    },
    ...clockSettings(clock, SPEEDS),
  ];
}
