/**
 * The time scale a laboratory declares on its canvas, beside what moves (auditoría §12.2):
 * «×20 cámara rápida», «×1 velocidad real», «×19 000 …». The factor is the clock's rate (time
 * scale times speed, or the reduced-motion pace: SimClock.rate) or an explicit `factor`; the word
 * is automatic unless the lab gives its own (`label`, words with $…$, the same in all three
 * pieces) or none (`label={null}`). Usage:
 *
 *   <div className="relative">                       // the scene's box, positioned
 *     <Scene … />
 *     <TimeScaleBadge clock={clock} />               // HTML overlay in a corner (top-right)
 *   </div>
 *
 *   <svg …>                                          // inside an SVG scene, next to the probe
 *     <TimeScaleBadgeSvg clock={clock} x={…} y={…} label="paso de $r_p$" />
 *   </svg>
 *   <TimeScaleStatus clock={clock} label="paso de $r_p$" />  // its words, in HTML
 *
 * The HTML badge carries its own words for screen readers; the SVG one is drawing only (a figure
 * with role="img" hides its children), so its scene adds TimeScaleStatus. Nothing animates.
 * Reduced motion is known only once mounted: the server and the first render show the nominal
 * rate («×20») and, under reduced motion, the badge then reads the stepped pace («×91»); that
 * first settling is not announced (useScaleAnnouncement).
 */
import { useEffect, useRef, useState, type JSX } from 'react';
import { SURFACE_COLOR, TEXT_COLOR, TICK_COLOR } from '../charts/chartTheme';
import InlineMath from './InlineMath';
import MathText, { type TextAnchor } from './MathText';
import {
  formatTimeScale,
  inlineMathToNotation,
  requireInlineMathLabel,
  timeScaleLabel,
  timeScaleSpoken,
} from './timeScaleFormat';
import type { SimClock } from './useSimClock';

/** Where the factor comes from: the clock's rate, or an explicit factor that wins over it. */
export type TimeScaleSource =
  { clock: SimClock; factor?: number } | { clock?: SimClock; factor: number };

export type TimeScaleProps = TimeScaleSource & {
  /**
   * The words after the factor. Omitted: «velocidad real», «cámara rápida» or «cámara lenta»,
   * from the factor. null: none. A string: the lab's own («1 s de simulación = 12 s reales»,
   * «paso de $r_p$»), formulas between $…$ in all three pieces (a raw «r_p» throws).
   */
  label?: string | null;
};

export type TimeScaleCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const CORNER: Readonly<Record<TimeScaleCorner, string>> = {
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-2 right-2',
};
const BADGE =
  'pointer-events-none absolute flex max-w-[calc(100%-1rem)] items-baseline gap-2 rounded-sm border border-border bg-bg/90 px-2 py-1';

/** SVG badge: the factor in 14 px, the words under it in 12 px, 16 px apart, with a halo. */
const FACTOR_SIZE = 14;
const LABEL_SIZE = 12;
const LINE_GAP = 16;
const HALO = { color: SURFACE_COLOR, width: 4 } as const;

/** The factor the badge declares: the explicit one, else the clock's rate. */
export function timeScaleFactor(source: TimeScaleSource): number {
  return source.factor ?? source.clock?.rate ?? Number.NaN;
}

/**
 * Quiet time before a new scale is said; the first value that holds this long after mount (the
 * nominal rate, or the reduced-motion pace that replaces it right after mount) is the baseline.
 */
export const SCALE_ANNOUNCE_DELAY_MS = 750;

/** The words after the factor: the lab's (checked: $…$ only), none (null) or the automatic ones. */
function badgeLabel(factor: number, label: string | null | undefined): string | undefined {
  if (label === null) return undefined;
  if (label !== undefined) requireInlineMathLabel(label);
  return label ?? timeScaleLabel(factor);
}

/**
 * What the live region says: nothing until the scale changes after it first settled, then the new
 * scale once it holds for SCALE_ANNOUNCE_DELAY_MS. So loading the page (and reduced motion
 * replacing the nominal rate right after mount) announces nothing; a change of speed does.
 */
function useScaleAnnouncement(spoken: string): string {
  const [announced, setAnnounced] = useState('');
  const baseline = useRef<string | undefined>(undefined);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (baseline.current !== undefined && spoken !== baseline.current) setAnnounced(spoken);
      baseline.current = spoken;
    }, SCALE_ANNOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [spoken]);
  return announced;
}

/**
 * The scale in words for screen readers: always in a hidden text (read when browsing), and in a
 * polite status region only when it changes (useScaleAnnouncement).
 */
export function TimeScaleStatus(props: TimeScaleProps): JSX.Element {
  const factor = timeScaleFactor(props);
  const spoken = timeScaleSpoken(factor, badgeLabel(factor, props.label));
  const announced = useScaleAnnouncement(spoken);
  return (
    <>
      <span data-time-scale-words="" className="sr-only">
        {spoken}
      </span>
      <p role="status" aria-live="polite" className="sr-only">
        {announced}
      </p>
    </>
  );
}

/**
 * The HTML badge, for a corner of the canvas (`corner`, default top-right): absolute in the
 * scene's positioned box, inert to the pointer, 8 px from the edges, the factor in 14 px mono and
 * the words in 12 px; hidden from screen readers, which hear TimeScaleStatus instead.
 */
export default function TimeScaleBadge({
  corner = 'top-right',
  ...props
}: TimeScaleProps & { corner?: TimeScaleCorner }): JSX.Element {
  const factor = timeScaleFactor(props);
  const label = badgeLabel(factor, props.label);
  return (
    <>
      <div data-time-scale-badge="" aria-hidden="true" className={`${BADGE} ${CORNER[corner]}`}>
        <span className="font-mono text-sm font-medium whitespace-nowrap text-fg tabular-nums">
          {formatTimeScale(factor)}
        </span>
        {label ? (
          <span className="min-w-0 text-xs text-fg-muted">
            <InlineMath text={label} />
          </span>
        ) : null}
      </div>
      <TimeScaleStatus {...props} />
    </>
  );
}

export type TimeScaleBadgeSvgProps = TimeScaleProps & {
  /** Baseline of the factor, in the scene's user units; the words go one line (16) below. */
  x: number;
  y: number;
  anchor?: Exclude<TextAnchor, 'middle'>;
};

/** The SVG badge, a <g> to place next to what moves: drawing only (see TimeScaleStatus). */
export function TimeScaleBadgeSvg({
  x,
  y,
  anchor = 'start',
  ...props
}: TimeScaleBadgeSvgProps): JSX.Element {
  const factor = timeScaleFactor(props);
  const label = badgeLabel(factor, props.label);
  return (
    <g data-time-scale-badge="" aria-hidden="true" pointerEvents="none">
      <MathText
        source={formatTimeScale(factor)}
        x={x}
        y={y}
        anchor={anchor}
        fontSize={FACTOR_SIZE}
        fontWeight={500}
        fill={TEXT_COLOR}
        halo={HALO}
      />
      {label ? (
        <MathText
          source={inlineMathToNotation(label)}
          x={x}
          y={y + LINE_GAP}
          anchor={anchor}
          family="sans"
          fontSize={LABEL_SIZE}
          fill={TICK_COLOR}
          halo={HALO}
        />
      ) : null}
    </g>
  );
}
