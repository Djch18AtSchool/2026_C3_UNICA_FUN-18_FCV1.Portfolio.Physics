/**
 * The height SvgPlot's drawing box reserves before React measures its container. The server (and
 * the first render while hydrating) draws at 720 px, but a lab's stage or a phone is narrower, so
 * the box would change height when the plot measures itself. Until then, CSS gives the box the
 * height the measured drawing will have, by a query on the plot's own container (`@container/plot`):
 *
 * - an aspect (one number, or a compact/wide pair switching at COMPACT_WIDTH): `aspect-ratio`;
 * - equal units on both axes: the height is the margins plus k times the plot width, k fixed by the
 *   data (the domains' span ratio, clamped), so `calc(top + bottom + k · (100cqw − left − right))`.
 *
 * ResizeObserver widths are rounded (useElementWidth), so the drawing turns wide from 479,5 px: the
 * class literals below say COMPACT_WIDTH − 0,5 (SvgPlot.reserve.test.tsx checks both sides).
 */
import type { CSSProperties } from 'react';

/** viewBox width over height below COMPACT_WIDTH (phones, a lab's stage) and from it up. */
export interface PlotAspect {
  compact: number;
  wide: number;
}

/** A layout's margins around the plot area, in viewBox px (= CSS px once measured). */
export interface PlotMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HeightReserve {
  className: string;
  style?: CSSProperties;
}

const ASPECT_CLASS =
  'h-auto aspect-(--plot-aspect-compact) @min-[479.5px]/plot:aspect-(--plot-aspect-wide)';
const HEIGHT_CLASS = 'h-(--plot-height-compact) @min-[479.5px]/plot:h-(--plot-height-wide)';
const PRECISION = 4;

/** The reserve of a plot drawn at an aspect: one number is both layouts' aspect. */
export function aspectReserve(aspect: number | PlotAspect): HeightReserve {
  const pair = typeof aspect === 'number' ? { compact: aspect, wide: aspect } : aspect;
  return {
    className: ASPECT_CLASS,
    style: {
      '--plot-aspect-compact': pair.compact,
      '--plot-aspect-wide': pair.wide,
    } as CSSProperties,
  };
}

const heightAt = (margins: PlotMargins, slope: number) =>
  `calc(${margins.top + margins.bottom}px + ${Number(slope.toFixed(PRECISION))} * ` +
  `(100cqw - ${margins.left + margins.right}px))`;

/**
 * The reserve of an equal-units plot: plot height = `slope` × plot width in both layouts, with
 * each layout's margins (the compact left one is fitted to the y tick labels at a typical width).
 */
export function equalAspectReserve(
  slope: number,
  margins: { compact: PlotMargins; wide: PlotMargins },
): HeightReserve {
  return {
    className: HEIGHT_CLASS,
    style: {
      '--plot-height-compact': heightAt(margins.compact, slope),
      '--plot-height-wide': heightAt(margins.wide, slope),
    } as CSSProperties,
  };
}
