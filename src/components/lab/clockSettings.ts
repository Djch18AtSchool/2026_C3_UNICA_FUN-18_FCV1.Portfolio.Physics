/** The playback entries every clocked laboratory puts at the end of its local settings. */
import type { SettingOption } from './SettingsDrawer';
import type { SimClock } from './useSimClock';

/** Playback speeds offered by default (spec §8.2: 0,25× to 2×). */
export const DEFAULT_SPEEDS: readonly number[] = [0.25, 0.5, 1, 1.5, 2];

/** "0,25×": the speed with the Spanish decimal comma. */
function speedLabel(speed: number): string {
  return `${String(speed).replace('.', ',')}×`;
}

/** "Velocidad" (a select over `speeds`) and "Repetir", both read from and written to the clock. */
export function clockSettings(
  clock: SimClock,
  speeds: readonly number[] = DEFAULT_SPEEDS,
): SettingOption[] {
  return [
    {
      key: 'speed',
      label: 'Velocidad',
      kind: 'select',
      value: String(clock.state.speed),
      options: speeds.map((speed) => ({ value: String(speed), label: speedLabel(speed) })),
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
