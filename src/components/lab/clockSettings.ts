/**
 * The playback entry every clocked laboratory puts at the end of its local settings: «Repetir».
 * The speed is the transport's own select («1×▾», TransportSpeed), not a drawer entry.
 */
import type { SettingOption } from './SettingsDrawer';
import type { SimClock } from './useSimClock';

/** "Repetir", read from and written to the clock. */
export function clockSettings(clock: SimClock): SettingOption[] {
  return [
    {
      key: 'loop',
      label: 'Repetir',
      kind: 'toggle',
      value: clock.state.loop,
      onChange: clock.setLoop,
    },
  ];
}
