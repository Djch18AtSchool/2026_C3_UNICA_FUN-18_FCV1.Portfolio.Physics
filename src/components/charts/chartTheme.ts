/**
 * Chart colors as CSS custom properties (src/styles/tokens.css), so every mark and
 * label follows data-theme without re-rendering. Series wear CHART_COLORS in fixed
 * order, never cycled by rank; text wears text tokens, never the series color.
 */
export const CHART_COLORS: string[] = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
];

/** Hairline gridlines: one step off the surface. */
export const GRID_COLOR = 'var(--grid)';
/** Axis baseline and tick marks. */
export const AXIS_COLOR = 'var(--border)';
/** Tick values and secondary text. */
export const TICK_COLOR = 'var(--fg-muted)';
/** Axis titles and legend text. */
export const TEXT_COLOR = 'var(--fg)';
/** Surface behind chart marks; rings on active dots use it to separate overlaps. */
export const SURFACE_COLOR = 'var(--bg-elevated)';

export const TICK_FONT_FAMILY = 'var(--font-mono)';
export const TEXT_FONT_FAMILY = 'var(--font-sans)';
export const TICK_FONT_SIZE = 12;

/** Spec from the dataviz marks guide: 2px lines, markers of at least 8px (r = 4). */
export const LINE_WIDTH = 2;
export const ACTIVE_DOT_RADIUS = 4;
export const DASH_PATTERN = '6 4';

export const DEFAULT_ASPECT_RATIO = 1.6;
export const MAX_CHART_WIDTH = 720;
