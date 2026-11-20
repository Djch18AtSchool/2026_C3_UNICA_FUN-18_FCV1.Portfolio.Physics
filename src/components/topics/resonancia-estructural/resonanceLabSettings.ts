/** The resonance lab's choices: its modes, the troop's step and what the canvas draws. */
import { clockSettings } from '../../lab/clockSettings';
import type { SettingOption } from '../../lab/SettingsDrawer';
import type { SimClock } from '../../lab/useSimClock';
import type { ResonanceMode, StepChoice } from './resonanceScene';

export const MODE_OPTIONS: readonly { value: ResonanceMode; label: string }[] = [
  { value: 'barrido', label: 'Barrido' },
  { value: 'tropa', label: 'Tropa' },
  { value: 'filtro-zv', label: 'Filtro ZV' },
];

export const STEP_OPTIONS: readonly { value: StepChoice; label: string }[] = [
  { value: 'al-paso', label: 'Al paso' },
  { value: 'rompiendo', label: 'Rompiendo el paso' },
];

/** The transport's speeds: a long sweep already plays on a time scale; up to 8× on top. */
export const RESONANCE_SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;

/** What the canvas draws besides the decks. */
export interface ResonanceDisplay {
  showEnvelope: boolean;
  showPlot: boolean;
}

export const DEFAULT_DISPLAY: ResonanceDisplay = { showEnvelope: true, showPlot: true };

export interface ResonanceLocalSettingsInput {
  display: ResonanceDisplay;
  onDisplayChange(next: ResonanceDisplay): void;
  clock: SimClock;
}

/** «Banda de la envolvente», «Gráfica de apoyo» and «Repetir» (the speed is the transport's). */
export function resonanceLocalSettings({
  display,
  onDisplayChange,
  clock,
}: ResonanceLocalSettingsInput): SettingOption[] {
  const toggle = (key: keyof ResonanceDisplay, label: string): SettingOption => ({
    key,
    label,
    kind: 'toggle',
    value: display[key],
    onChange: (value) => onDisplayChange({ ...display, [key]: value }),
  });
  return [
    toggle('showEnvelope', 'Banda de la envolvente'),
    toggle('showPlot', 'Gráfica de apoyo'),
    ...clockSettings(clock),
  ];
}
