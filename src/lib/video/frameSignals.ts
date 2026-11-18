/*
 * Frame-by-frame signals from raw 8-bit grey video (`ffmpeg … -f rawvideo -pix_fmt gray`), ported
 * from the research prototypes edge.py and tilt.py (.superpowers/sdd/2026-11-17-entrega-final/
 * prototypes/resonancia/): in a band of columns, average each row, smooth over three rows and take
 * the strongest bright-above, dark-below step (sky → deck or tree line).
 *
 * One deliberate change: the 3-row smoothing keeps only the rows it can fully average. The
 * prototypes used numpy's 'same' mode, which pads with zeros and so invents a step at the bottom of
 * the search window; whenever the real horizon was fainter, the detected row jumped there (the
 * square-wave tilt series of the research run).
 */

/** Frames back to back, `width × height` bytes each, one byte of luminance per pixel. */
export interface GrayFrames {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Columns x0 … x1 − 1 and rows y0 … y1 − 1 of a frame. */
export interface Band {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Fewest rows a band can have: 3 to smooth, then two smoothed values to difference, plus one. */
const MIN_BAND_ROWS = 5;
const SMOOTH_ROWS = 3;

/** Number of whole frames in the stream. */
export function frameCount(frames: GrayFrames): number {
  const size = frames.width * frames.height;
  if (!(size > 0) || frames.data.length % size !== 0) {
    throw new RangeError(
      `${frames.data.length} bytes is not a whole number of ${size}-byte frames`,
    );
  }
  return frames.data.length / size;
}

function requireBand(frames: GrayFrames, band: Band): void {
  const { x0, x1, y0, y1 } = band;
  const inside =
    [x0, x1, y0, y1].every(Number.isInteger) &&
    x0 >= 0 &&
    x1 <= frames.width &&
    x0 < x1 &&
    y0 >= 0 &&
    y1 <= frames.height;
  if (!inside || y1 - y0 < MIN_BAND_ROWS) {
    throw new RangeError(
      `band ${JSON.stringify(band)} is not inside a ${frames.width}×${frames.height} frame or is too short`,
    );
  }
}

/** Mean luminance of each row of the band in one frame. */
function rowMeans(frames: GrayFrames, index: number, band: Band): number[] {
  const { width, height, data } = frames;
  const offset = index * width * height;
  const columns = band.x1 - band.x0;
  return Array.from({ length: band.y1 - band.y0 }, (_, j) => {
    const start = offset + (band.y0 + j) * width + band.x0;
    let sum = 0;
    for (let x = 0; x < columns; x += 1) sum += data[start + x];
    return sum / columns;
  });
}

/**
 * Row coordinate of the strongest bright-to-dark step going down the band in frame `index`, half
 * way between the two rows it separates (so a step between rows 20 and 21 reads 20.5).
 */
export function edgeRow(frames: GrayFrames, index: number, band: Band): number {
  requireBand(frames, band);
  if (!(Number.isInteger(index) && index >= 0 && index < frameCount(frames))) {
    throw new RangeError(`frame ${index} is not in the stream`);
  }
  const rows = rowMeans(frames, index, band);
  // Smoothed value k averages rows k … k + 2 and is centred on row y0 + k + 1.
  const smooth = rows
    .slice(0, rows.length - SMOOTH_ROWS + 1)
    .map((_, k) => (rows[k] + rows[k + 1] + rows[k + 2]) / SMOOTH_ROWS);
  let best = 0;
  for (let k = 1; k < smooth.length - 1; k += 1) {
    if (smooth[k + 1] - smooth[k] < smooth[best + 1] - smooth[best]) best = k;
  }
  // The step between smoothed values best and best + 1 sits between rows y0 + best + 1 and + 2.
  return band.y0 + best + 1.5;
}

/**
 * Centred moving average over an odd `width` of samples, keeping only full windows: the result is
 * width − 1 samples shorter, and sample i stands for input i + (width − 1)/2. The prototypes
 * smoothed the edge series over 7 frames and the tilt over 9 before reading the period.
 */
export function movingAverage(values: readonly number[], width: number): number[] {
  if (!(Number.isInteger(width) && width >= 1 && width % 2 === 1 && width <= values.length)) {
    throw new RangeError(
      `width must be an odd whole number from 1 to ${values.length}, got ${width}`,
    );
  }
  return values
    .slice(0, values.length - width + 1)
    .map((_, i) => values.slice(i, i + width).reduce((sum, v) => sum + v, 0) / width);
}

/** edgeRow of every frame (image rows grow downwards). */
export function edgeSeries(frames: GrayFrames, band: Band): number[] {
  return Array.from({ length: frameCount(frames) }, (_, i) => edgeRow(frames, i, band));
}

/** Horizon tilt per frame: the edge row in the left band minus the one in the right band (px). */
export function tiltSeries(frames: GrayFrames, left: Band, right: Band): number[] {
  return Array.from(
    { length: frameCount(frames) },
    (_, i) => edgeRow(frames, i, left) - edgeRow(frames, i, right),
  );
}
