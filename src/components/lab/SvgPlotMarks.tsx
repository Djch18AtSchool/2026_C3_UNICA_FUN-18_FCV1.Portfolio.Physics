/** The plotter's data marks drawn under the cursor layer: shaded bands and the point marker. */
import {
  SURFACE_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
  TICK_FONT_SIZE,
} from '../charts/chartTheme';
import { fitCentre, isFinitePoint, monoTextWidth, type Scale } from './plotScales';
import type { PlotBand, PlotMarker } from './SvgPlot';
import type { PlotArea } from './SvgPlotCursor';

/** Band and marker labels use the plotter's note size. */
const NOTE_SIZE = TICK_FONT_SIZE;
const BAND_OPACITY = 0.12;
const BAND_LABEL_OFFSET = 16;
/** A bottom band label's baseline above the x axis. */
const BAND_LABEL_BOTTOM_INSET = 8;
/** Gap between a label placed before its band and the band's left edge. */
const BAND_LABEL_GAP = 6;
const BAND_LABEL_LINE = 14;
const MARKER_RADIUS = 5;
const MARKER_LABEL_GAP = 10;
const HALO_WIDTH = 4;

const haloText = {
  fill: TEXT_COLOR,
  fontFamily: TICK_FONT_FAMILY,
  fontSize: NOTE_SIZE,
  stroke: SURFACE_COLOR,
  strokeWidth: HALO_WIDTH,
  paintOrder: 'stroke',
} as const;

/** Greedy word wrap to `maxWidth` px; undefined when some word alone is wider. */
export function wrapLabel(text: string, maxWidth: number, fontSize: number): string[] | undefined {
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    if (monoTextWidth(word, fontSize) > maxWidth) return undefined;
    const last = lines[lines.length - 1];
    const joined = last === undefined ? word : `${last} ${word}`;
    if (last !== undefined && monoTextWidth(joined, fontSize) <= maxWidth) {
      lines[lines.length - 1] = joined;
    } else {
      lines.push(word);
    }
  }
  return lines;
}

function BandLabel({
  band,
  from,
  to,
  area,
  width,
}: {
  band: PlotBand;
  from: number;
  to: number;
  area: PlotArea;
  width: number;
}) {
  const isBottom = band.labelAt === 'bottom';
  const lines = band.labelBefore
    ? wrapLabel(band.label, from - BAND_LABEL_GAP - area.left, NOTE_SIZE)
    : undefined;
  if (!lines) {
    return (
      <text
        x={fitCentre((from + to) / 2, monoTextWidth(band.label, NOTE_SIZE), 0, width)}
        y={isBottom ? area.bottom - BAND_LABEL_BOTTOM_INSET : area.top + BAND_LABEL_OFFSET}
        textAnchor="middle"
        {...haloText}
      >
        {band.label}
      </text>
    );
  }
  const x = from - BAND_LABEL_GAP;
  // Bottom labels grow upward from the bottom inset; top labels downward from the top offset.
  const firstY = isBottom
    ? area.bottom - BAND_LABEL_BOTTOM_INSET - (lines.length - 1) * BAND_LABEL_LINE
    : area.top + BAND_LABEL_OFFSET;
  return (
    <text x={x} y={firstY} textAnchor="end" {...haloText}>
      {lines.length === 1
        ? lines[0]
        : lines.map((line, index) => (
            // A trailing space keeps the words apart in the text's content (and its accessible text).
            <tspan key={line} x={x} dy={index === 0 ? 0 : BAND_LABEL_LINE}>
              {index < lines.length - 1 ? `${line} ` : line}
            </tspan>
          ))}
    </text>
  );
}

/**
 * Shaded x ranges, each labelled at its centre (top or bottom of the plot area), or just before
 * it with `labelBefore`; a centred label wider than the room toward an edge is shifted so it
 * stays inside the viewBox.
 */
export function Bands({
  bands,
  x,
  area,
  width,
}: {
  bands: PlotBand[];
  x: Scale;
  area: PlotArea;
  width: number;
}) {
  return (
    <g>
      {bands.map((band) => {
        const from = x.toPx(Math.max(Math.min(band.from, band.to), x.domain.min));
        const to = x.toPx(Math.min(Math.max(band.from, band.to), x.domain.max));
        if (to <= from) return null;
        return (
          <g key={`${band.from}-${band.to}-${band.label}`}>
            <rect
              data-band={band.label}
              x={from}
              y={area.top}
              width={to - from}
              height={area.bottom - area.top}
              fill={TICK_COLOR}
              fillOpacity={BAND_OPACITY}
            />
            <BandLabel band={band} from={from} to={to} area={area} width={width} />
          </g>
        );
      })}
    </g>
  );
}

export function Marker({ marker, x, y }: { marker: PlotMarker; x: Scale; y: Scale }) {
  if (!isFinitePoint(marker)) return null;
  const cx = x.toPx(marker.x);
  const cy = y.toPx(marker.y);
  return (
    <g>
      <circle
        data-marker=""
        cx={cx}
        cy={cy}
        r={MARKER_RADIUS}
        fill={TEXT_COLOR}
        stroke={SURFACE_COLOR}
        strokeWidth={2}
      />
      {marker.label ? (
        <text x={cx + MARKER_LABEL_GAP} y={cy - MARKER_LABEL_GAP} {...haloText}>
          {marker.label}
        </text>
      ) : null}
    </g>
  );
}
