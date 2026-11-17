/**
 * The transport's playback speed: a compact native select («1×▾») after «Reiniciar», as a video
 * player has it. Native, so the keyboard and the phone's own picker come for free; the clock owns
 * the speed (clock.setSpeed), so nothing else holds a copy of it.
 */
import type { JSX } from 'react';
import { SelectChevron } from './SettingsFields';
import { DEFAULT_SPEEDS, speedLabel } from './transportSpeed';
import type { SimClock } from './useSimClock';

export const SPEED_LABEL = 'Velocidad de reproducción';

/**
 * As tall as the row's 44 px icon buttons (not the 40 px of a form control: it sits among them),
 * as wide as its widest option (a native select's own width), the chevron in its right padding.
 */
const SPEED_SELECT =
  'h-11 appearance-none rounded-base border border-border bg-bg-elevated pr-8 pl-3 text-sm tabular-nums text-fg transition-colors hover:border-fg-muted';

export interface TransportSpeedProps {
  clock: SimClock;
  /** The speeds offered, in order; DEFAULT_SPEEDS (0,25× to 2×) when omitted. */
  speeds?: readonly number[];
}

export default function TransportSpeed({
  clock,
  speeds = DEFAULT_SPEEDS,
}: TransportSpeedProps): JSX.Element {
  return (
    <div className="relative shrink-0">
      <select
        aria-label={SPEED_LABEL}
        value={String(clock.state.speed)}
        onChange={(event) => clock.setSpeed(Number(event.target.value))}
        className={SPEED_SELECT}
      >
        {speeds.map((speed) => (
          <option key={speed} value={String(speed)}>
            {speedLabel(speed)}
          </option>
        ))}
      </select>
      <SelectChevron />
    </div>
  );
}
