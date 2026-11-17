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
 * 80 px wide (Dylan's width, E7): 8 px before the text, «0,25×» (36 px of Plex Sans 14) and the
 * form selects' pr-8 for the chevron, which leaves it 8 px from the «×». The 80 is a multiple of 8
 * that the width ladder (steps of 4 rem past the spacing scale) skips, so it is a named exception.
 */
const SPEED_SELECT =
  // scale-exempt: the speed select is 80 px wide (a multiple of 8) so «0,25×» and its chevron have room; the ladder's widths jump from 64 to 128
  'h-11 w-20 appearance-none rounded-base border border-border bg-bg-elevated pr-8 pl-2 text-sm tabular-nums text-fg transition-colors hover:border-fg-muted';

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
