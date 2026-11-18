import { requireFinite, requirePositive } from '../physics/validate';

/*
 * Period of a short oscillating record, ported from the research prototype period.py
 * (.superpowers/sdd/2026-11-17-entrega-final/prototypes/resonancia/): remove a straight-line trend,
 * take the autocorrelation, keep its highest peak inside [minS, maxS] and refine it between frames
 * with a parabola through the three samples around it.
 *
 * One deliberate change: each lag's correlation is normalised by its own overlap (the Pearson
 * coefficient of x[0 … n−k] and x[k … n]), not by the zero-lag energy as numpy's correlate/ac[0]
 * does. A shot of the film holds only two or three cycles, so the period is half the record; the
 * zero-lag normalisation then weighs each lag by (n − k)/n and pulls the peak ≈ 3 % short (−0,10 s
 * on a 3,44 s period in 7,3 s), while the overlap-normalised peak has no such bias.
 */

/** The longest lag must leave at least half of itself as overlap: record ≥ 1,5 × maxS. */
const MIN_RECORD_PER_MAX_LAG = 1.5;
/** Below this standard deviation (after detrending) the record does not oscillate. */
const FLAT_TOLERANCE = 1e-9;

/** Residuals of the least-squares straight line through (i, samples[i]). */
function detrend(samples: readonly number[]): number[] {
  const n = samples.length;
  const meanI = (n - 1) / 2;
  const meanY = samples.reduce((sum, y) => sum + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  samples.forEach((y, i) => {
    sxy += (i - meanI) * (y - meanY);
    sxx += (i - meanI) ** 2;
  });
  const slope = sxy / sxx;
  return samples.map((y, i) => y - meanY - slope * (i - meanI));
}

/** Pearson correlation between x[0 … n−lag) and x[lag … n). */
function overlapCorrelation(x: readonly number[], lag: number): number {
  const count = x.length - lag;
  let meanA = 0;
  let meanB = 0;
  for (let i = 0; i < count; i += 1) {
    meanA += x[i];
    meanB += x[i + lag];
  }
  meanA /= count;
  meanB /= count;
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < count; i += 1) {
    const a = x[i] - meanA;
    const b = x[i + lag] - meanB;
    ab += a * b;
    aa += a * a;
    bb += b * b;
  }
  const norm = Math.sqrt(aa * bb);
  return norm > 0 ? ab / norm : 0;
}

/** Vertex offset (in samples, within ±0,5 for a true peak) of the parabola through a, b, c. */
function parabolicOffset(a: number, b: number, c: number): number {
  const curvature = a - 2 * b + c;
  return curvature === 0 ? 0 : (0.5 * (a - c)) / curvature;
}

function requireInputs(samples: readonly number[], fps: number, minS: number, maxS: number): void {
  requirePositive('fps', fps);
  requirePositive('minS', minS);
  requirePositive('maxS', maxS);
  if (!(minS < maxS)) throw new RangeError(`minS (${minS}) must be below maxS (${maxS})`);
  samples.forEach((value, i) => requireFinite(`samples[${i}]`, value));
  if (samples.length < MIN_RECORD_PER_MAX_LAG * maxS * fps) {
    throw new RangeError(
      `a record of ${samples.length} samples is too short for lags up to ${maxS} s at ${fps} fps`,
    );
  }
}

/**
 * Period (s) of `samples` taken at `fps`, searched between minS and maxS: detrend, overlap-
 * normalised autocorrelation, highest local peak in range, parabolic refinement. Throws a
 * RangeError for bad inputs, a flat record or no peak inside the range.
 */
export function estimatePeriod(
  samples: readonly number[],
  fps: number,
  minS: number,
  maxS: number,
): number {
  requireInputs(samples, fps, minS, maxS);
  const x = detrend(samples);
  const spread = Math.sqrt(x.reduce((sum, v) => sum + v * v, 0) / x.length);
  if (!(spread > FLAT_TOLERANCE)) throw new RangeError('the record does not oscillate');

  const first = Math.ceil(minS * fps);
  const last = Math.floor(maxS * fps);
  if (last < first) throw new RangeError(`no whole lag between ${minS} s and ${maxS} s`);

  // Correlations from lag first − 1 to last + 1, so every lag in range has both neighbours.
  const r = Array.from({ length: last - first + 3 }, (_, i) =>
    overlapCorrelation(x, first - 1 + i),
  );
  let best = 1;
  for (let i = 2; i < r.length - 1; i += 1) if (r[i] > r[best]) best = i;
  const [before, peak, after] = [r[best - 1], r[best], r[best + 1]];
  if (!(peak >= before && peak >= after)) {
    throw new RangeError(`no autocorrelation peak between ${minS} s and ${maxS} s`);
  }
  return (first - 1 + best + parabolicOffset(before, peak, after)) / fps;
}
