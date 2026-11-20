/**
 * The voice's two timing rules (Review Focus 2):
 * - a change of level starts from the level the gain has now. The engine keeps the ramp it
 *   scheduled and reads the level from it: AudioParam.value read after cancelScheduledValues has
 *   already lost a ramp under way, and the hold would step;
 * - what needs a ramp to be over (a new wave, a suspend, a close) waits for the audio clock, which
 *   may run behind the page's timers (a rendering quantum, a busy thread).
 */
export const GAIN_RAMP_S = 0.03;
const MS_PER_S = 1000;
/** What a timer waiting for the audio clock adds to the time left: main thread against renderer. */
const CLOCK_MARGIN_MS = 10;

/** A linear ramp of the gain from `from` at `start` to `to` at `end` (s on the audio clock). */
export interface GainRamp {
  from: number;
  to: number;
  start: number;
  end: number;
}

export function levelAt({ from, to, start, end }: GainRamp, t: number): number {
  if (t >= end) return to;
  if (t <= start) return from;
  return from + ((to - from) * (t - start)) / (end - start);
}

/** The param from its level at `now` (by `ramp`) to `target` in GAIN_RAMP_S: the new ramp. */
export function rampGain(param: AudioParam, ramp: GainRamp, target: number, now: number): GainRamp {
  const held = levelAt(ramp, now);
  param.cancelScheduledValues(now);
  param.setValueAtTime(held, now);
  param.linearRampToValueAtTime(target, now + GAIN_RAMP_S);
  return { from: held, to: target, start: now, end: now + GAIN_RAMP_S };
}

/**
 * Runs `action` once the context's clock has reached `time` (s), checking again while it has not.
 * A context that is not running has a stopped clock and nothing sounding: it acts at once. `arm`
 * receives each timer, so the caller can clear the wait.
 */
export function whenAudioReaches(
  context: BaseAudioContext,
  time: number,
  action: () => void,
  arm: (timer: ReturnType<typeof setTimeout>) => void = () => undefined,
): void {
  const remaining = time - context.currentTime;
  if (remaining <= 0 || context.state !== 'running') {
    action();
    return;
  }
  arm(
    setTimeout(
      () => whenAudioReaches(context, time, action, arm),
      Math.ceil(remaining * MS_PER_S) + CLOCK_MARGIN_MS,
    ),
  );
}
