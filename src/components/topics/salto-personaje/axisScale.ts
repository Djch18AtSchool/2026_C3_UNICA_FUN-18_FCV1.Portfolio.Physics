/** Step multipliers that read well on an axis: 1, 2, 2.5 and 5 times a power of ten. */
const NICE_STEPS = [1, 2, 2.5, 5, 10];
const FALLBACK_MAX = 1;
/** Rounding that removes binary noise such as 0.30000000000000004 from tick values. */
const TICK_DECIMALS = 10;

export interface NiceAxis {
  max: number;
  ticks: number[];
}

/** A [0, max] axis whose top is `dataMax` rounded up to a nice step, with about `count` intervals. */
export function niceAxis(dataMax: number, count: number): NiceAxis {
  const top = Number.isFinite(dataMax) && dataMax > 0 ? dataMax : FALLBACK_MAX;
  const raw = top / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const multiplier = NICE_STEPS.find((step) => step * magnitude >= raw) ?? 10;
  const step = multiplier * magnitude;
  const intervals = Math.ceil(top / step - 1e-9);
  const ticks = Array.from({ length: intervals + 1 }, (_, i) =>
    Number((i * step).toFixed(TICK_DECIMALS)),
  );
  return { max: ticks[ticks.length - 1], ticks };
}
