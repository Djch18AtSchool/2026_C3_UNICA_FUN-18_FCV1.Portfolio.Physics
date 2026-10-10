import type { ResourceType } from '../../consigna';

/**
 * Resource accents are marks only (swatch and tint); the label text stays in fg for contrast.
 * Full class names, so Tailwind's scanner sees every one.
 */
export const RESOURCE_MARKS: Record<ResourceType, { swatch: string; tint: string }> = {
  simulacion: { swatch: 'bg-sim', tint: 'bg-sim/10 border-sim/40' },
  visualizacion: { swatch: 'bg-viz', tint: 'bg-viz/10 border-viz/40' },
  diagrama: { swatch: 'bg-diag', tint: 'bg-diag/10 border-diag/50' },
  multimedia: { swatch: 'bg-media', tint: 'bg-media/10 border-media/50' },
};

/** The badge box every resource mark sits in (ResourceBadge and the laboratory header). */
export const RESOURCE_BADGE =
  'inline-flex items-center gap-2 rounded-base border px-2 py-0.5 text-sm text-fg';
export const RESOURCE_SWATCH = 'size-2.5 shrink-0 rounded-[1px]';
