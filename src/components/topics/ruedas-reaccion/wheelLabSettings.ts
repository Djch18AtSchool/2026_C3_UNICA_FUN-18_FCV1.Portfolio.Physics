/** The reaction-wheel laboratory's local settings ("Este simulador" in the drawer). */
import { clockSettings } from '../../lab/clockSettings';
import type { SettingOption } from '../../lab/SettingsDrawer';
import type { SimClock } from '../../lab/useSimClock';

/** What the canvas draws. */
export interface WheelDisplay {
  showArrows: boolean;
  showPlot: boolean;
}

export const DEFAULT_DISPLAY: WheelDisplay = { showArrows: true, showPlot: true };

/**
 * Playback speeds offered. A maneuver lasts from 5 s to 300 s in real time, so the range reaches
 * 8× (five minutes in under 40 s); the disturbance's days are time-lapsed on top of it.
 */
const SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;

export interface WheelLocalSettingsInput {
  display: WheelDisplay;
  onDisplayChange(next: WheelDisplay): void;
  clock: SimClock;
}

/** Flechas de giro, gráfica, velocidad and repetir, in that order. */
export function wheelLocalSettings({
  display,
  onDisplayChange,
  clock,
}: WheelLocalSettingsInput): SettingOption[] {
  const toggle = (key: keyof WheelDisplay, label: string): SettingOption => ({
    key,
    label,
    kind: 'toggle',
    value: display[key],
    onChange: (value) => onDisplayChange({ ...display, [key]: value }),
  });
  return [
    toggle('showArrows', 'Flechas de giro ω_s y ω_w'),
    toggle('showPlot', 'Gráfica de L_w(t)'),
    ...clockSettings(clock, SPEEDS),
  ];
}
