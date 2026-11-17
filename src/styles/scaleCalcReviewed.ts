/**
 * The CSS math on custom properties in `src`, each reviewed by hand (scaleCalc.ts): the scale
 * check reads only its literals, so the result is judged here. An entry is the expression as the
 * file writes it, without spaces, and why its result is right. Reviewed in C1 (2026-11-11).
 */
import type { ReviewedTokenMath } from './scaleCalc';

export const REVIEWED_TOKEN_MATH: ReviewedTokenMath = {
  'src/components/lab/SettingsFields.tsx': {
    'calc(var(--space-1)-var(--border-thin))':
      "3 px inside the switch's 1 px border puts the thumb 4 px from the track's outer edge",
  },
  'src/components/lab/TransportEvents.tsx': {
    'calc(8px+(100%-16px)*var(--mark-at))':
      "a mark's place on the timeline: where the native 16 px thumb's centre is at that time",
  },
  'src/components/topics/dron-reparto/DroneSkeleton.tsx': {
    'calc((100cqw-2rem)/var(--chart-compact)+8rem+var(--chart-extra))':
      "a chart's place: the plot at SvgPlot's compact aspect plus its frame, caption and legend",
    'calc((100cqw-2rem)/var(--chart-wide)+8rem)':
      "a chart's place: the plot at SvgPlot's wide aspect plus its frame, caption and legend",
  },
  'src/styles/global.css': {
    'calc(var(--topic-bar-height)+1rem)':
      'the topic bar (48 px) and 16 px under it: 64, on the scale',
    'calc(var(--grid-cell)*var(--grid-major-every))':
      "the grid paper's period between major lines (80 px: five 16 px cells), a pattern, not a gap",
  },
};
