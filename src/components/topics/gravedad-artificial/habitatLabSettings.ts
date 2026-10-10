/** The habitat laboratory's local settings ("Este simulador" in the drawer), built from its state. */
import type { SettingOption } from '../../lab/SettingsDrawer';
import type { SimClock } from '../../lab/useSimClock';

/** What the scene draws. */
export interface HabitatDisplay {
  showVectors: boolean;
}

export const DEFAULT_DISPLAY: HabitatDisplay = { showVectors: true };

/**
 * Playback speeds offered. A revolution lasts from 6 s (10 rpm) to 600 s (0,1 rpm), so the
 * range reaches 8× (spec §8.2 gives 0,25× to 2×; the task allows up to 8× for this lab).
 */
const SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;
const SPEED_OPTIONS = SPEEDS.map((speed) => ({
  value: String(speed),
  label: `${String(speed).replace('.', ',')}×`,
}));

export interface HabitatLocalSettingsInput {
  display: HabitatDisplay;
  onDisplayChange(next: HabitatDisplay): void;
  clock: SimClock;
}

/** Vectores, velocidad and repetir, in that order. */
export function habitatLocalSettings({
  display,
  onDisplayChange,
  clock,
}: HabitatLocalSettingsInput): SettingOption[] {
  return [
    {
      key: 'showVectors',
      label: 'Vectores a_c y gravedad aparente',
      kind: 'toggle',
      value: display.showVectors,
      onChange: (showVectors) => onDisplayChange({ ...display, showVectors }),
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
