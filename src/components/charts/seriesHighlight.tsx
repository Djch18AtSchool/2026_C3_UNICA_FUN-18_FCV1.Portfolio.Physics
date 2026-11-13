/**
 * Highlighting a chart's series from its legend (auditoría §8). The legend is a toolbar,
 * «Leyenda: realzar una serie», with one button per entry and one Tab stop (a roving tabindex,
 * decision R32: the pinned entry, else the last focused, else the first): the arrows along it (←/→
 * in a row, ↑/↓ in a column), Home and End move the focus between entries and preview each series.
 * The mouse over an entry, or a keyboard focus on it, highlights its series while it lasts; a click,
 * a tap, Enter or Space pins the highlight (aria-pressed) until the entry is pressed again, another
 * one is, the pointer goes down outside the legend or Escape is pressed on it. The highlighted
 * series is drawn wider and the others fade, so the change never rests on color alone; names do
 * not change and nothing is announced (the series are drawn in an image; the highlight is only
 * visual). Usage:
 *
 *   const highlight = useSeriesHighlight(series.map(({ id }) => id));
 *   <SeriesHighlightContext value={highlight.highlighted}>
 *     <SeriesLegend entries={…} highlight={highlight} />
 *     …<path data-series={id} {...emphasisProps(useSeriesEmphasis(id), width)} />…
 *   </SeriesHighlightContext>
 *
 * global.css eases the change (--motion-fast), and drops the easing under reduced motion.
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { hasInlineMath, inlineMathToSpeech } from '../../lib/inlineMath';
import InlineMath from '../lab/InlineMath';
import { LINE_WIDTH } from './chartTheme';

/** The other series fade to this opacity while one is highlighted. */
export const SERIES_DIM_OPACITY = 0.25;
/** A highlighted series' stroke grows by this much (px) over its own width. */
export const SERIES_HIGHLIGHT_EXTRA = 1.5;
/** The stroke of a highlighted series drawn at the charts' LINE_WIDTH. */
export const SERIES_HIGHLIGHT_WIDTH = LINE_WIDTH + SERIES_HIGHLIGHT_EXTRA;

/** The class of every element an emphasis draws on: global.css eases its opacity and width. */
export const SERIES_EMPHASIS_CLASS = 'series-emphasis';

/** How a series is drawn: as always, highlighted, or faded behind the highlighted one. */
export type SeriesEmphasis = 'none' | 'focus' | 'dim';

export function seriesEmphasis(id: string, highlighted: string | undefined): SeriesEmphasis {
  if (highlighted === undefined) return 'none';
  return id === highlighted ? 'focus' : 'dim';
}

/** The attributes that draw an emphasis on a series of stroke `width` (none: as before). */
export interface EmphasisProps {
  className: string;
  'data-emphasis'?: SeriesEmphasis;
  strokeWidth?: number;
  opacity?: number;
}

/**
 * The attributes that draw an emphasis on a series of stroke `width` (none: as before), with the
 * class that eases the change.
 */
export function emphasisProps(emphasis: SeriesEmphasis, width: number = LINE_WIDTH): EmphasisProps {
  const className = SERIES_EMPHASIS_CLASS;
  if (emphasis === 'focus') {
    return { className, 'data-emphasis': emphasis, strokeWidth: width + SERIES_HIGHLIGHT_EXTRA };
  }
  if (emphasis === 'dim')
    return { className, 'data-emphasis': emphasis, opacity: SERIES_DIM_OPACITY };
  return { className };
}

/** The id of the highlighted series of the chart around, if any. */
export const SeriesHighlightContext = createContext<string | undefined>(undefined);

/** The emphasis of series `id` in the chart around (none outside one). */
export function useSeriesEmphasis(id: string): SeriesEmphasis {
  return seriesEmphasis(id, useContext(SeriesHighlightContext));
}

/** The toolbar's name: says once what its entries do, apart from a lab's presets. */
export const LEGEND_LABEL = 'Leyenda: realzar una serie';

/** A row of entries (←/→ move between them) or a column (↑/↓). */
export type LegendOrientation = 'horizontal' | 'vertical';

/** The keys that move the focus along a legend, by orientation: to the previous, to the next. */
const STEP_KEYS: Readonly<Record<LegendOrientation, { back: string; forth: string }>> = {
  horizontal: { back: 'ArrowLeft', forth: 'ArrowRight' },
  vertical: { back: 'ArrowUp', forth: 'ArrowDown' },
};

/** The entry a key moves to from `index` among `count`, wrapping at the ends; none for others. */
export function legendKeyTarget(
  key: string,
  index: number,
  count: number,
  orientation: LegendOrientation,
): number | undefined {
  const { back, forth } = STEP_KEYS[orientation];
  if (key === forth) return (index + 1) % count;
  if (key === back) return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return undefined;
}

/** What a legend entry spreads on its button. */
export interface LegendEntryProps {
  'aria-pressed': boolean;
  tabIndex: 0 | -1;
  onPointerEnter(event: PointerEvent<HTMLButtonElement>): void;
  onPointerLeave(): void;
  onPointerDown(): void;
  onFocus(): void;
  onBlur(): void;
  onClick(): void;
  onKeyDown(event: KeyboardEvent<HTMLButtonElement>): void;
}

export interface SeriesHighlight {
  /** The series drawn highlighted: hovered, else focused from the keyboard, else pinned. */
  highlighted: string | undefined;
  /** The legend: a press outside it lets a pinned highlight go; the arrows move within it. */
  listRef: RefObject<HTMLUListElement | null>;
  orientation: LegendOrientation;
  entry(id: string): LegendEntryProps;
}

/** While a highlight is pinned, a press anywhere outside the legend lets it go. */
function useReleaseOutside(
  listRef: RefObject<HTMLUListElement | null>,
  pinned: string | undefined,
  release: () => void,
) {
  useEffect(() => {
    if (pinned === undefined) return undefined;
    const onPress = (event: Event) => {
      if (!listRef.current?.contains(event.target as Node)) release();
    };
    document.addEventListener('pointerdown', onPress, true);
    return () => document.removeEventListener('pointerdown', onPress, true);
  }, [listRef, pinned, release]);
}

/**
 * The legend's highlight over the series `ids` now drawn: an id that is not among them (a view
 * changed under a pinned entry) highlights nothing, rather than fading everything.
 */
export function useSeriesHighlight(
  ids: readonly string[],
  orientation: LegendOrientation = 'horizontal',
): SeriesHighlight {
  const [hovered, setHovered] = useState<string>();
  const [focused, setFocused] = useState<string>();
  const [pinned, setPinned] = useState<string>();
  /** The entry that last had the focus: the legend's Tab stop when none is pinned. */
  const [roving, setRoving] = useState<string>();
  const listRef = useRef<HTMLUListElement>(null);
  /** A focus that comes with a press is the pointer's, not the keyboard's. */
  const isPressingRef = useRef(false);
  const release = useRef(() => setPinned(undefined)).current;
  useReleaseOutside(listRef, pinned, release);

  const shown = hovered ?? focused ?? pinned;
  const tabStop = [pinned, roving].find((id) => id !== undefined && ids.includes(id)) ?? ids[0];
  /** Moves the focus to the entry a key names, if it names one. */
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const target = legendKeyTarget(event.key, ids.indexOf(id), ids.length, orientation);
    if (target === undefined) return;
    event.preventDefault();
    listRef.current?.querySelectorAll<HTMLButtonElement>('button')[target]?.focus();
  };
  const entry = (id: string): LegendEntryProps => ({
    'aria-pressed': pinned === id,
    tabIndex: id === tabStop ? 0 : -1,
    onPointerEnter: (event) => {
      if (event.pointerType !== 'touch') setHovered(id);
    },
    onPointerLeave: () => setHovered(undefined),
    onPointerDown: () => {
      isPressingRef.current = true;
    },
    onFocus: () => {
      setRoving(id);
      if (!isPressingRef.current) setFocused(id);
    },
    onBlur: () => {
      isPressingRef.current = false;
      setFocused(undefined);
    },
    onClick: () => {
      isPressingRef.current = false;
      setPinned((current) => (current === id ? undefined : id));
    },
    onKeyDown: (event) => {
      if (event.key === 'Escape') release();
      else moveFocus(event, id);
    },
  });
  return {
    highlighted: shown !== undefined && ids.includes(shown) ? shown : undefined,
    listRef,
    orientation,
    entry,
  };
}

export interface LegendEntry {
  id: string;
  /** Plain text, with KaTeX inline between `$…$`. */
  label: string;
  /** The key drawn before the text, like the series it names. */
  swatch: ReactNode;
}

/** The list's look, as every chart legend had it. */
export const LEGEND_ROW = 'flex-row flex-wrap gap-x-4 gap-y-1';
const LIST = 'mb-2 flex list-none p-0 text-sm';
/**
 * The entry keeps the text's height (the 20 px line, rows 24 px apart: WCAG 2.5.8 by spacing), so
 * the legend measures what it did; its focus shows as the site's outline, the highlighted one is
 * underlined.
 */
const ENTRY =
  'inline-flex cursor-pointer items-center gap-2 rounded-base text-left text-fg underline-offset-4 outline-accent focus-visible:outline-2 focus-visible:outline-offset-2 data-[highlighted]:underline';

/**
 * A chart's legend: a toolbar of one button per series, in rows (`layout` LEGEND_ROW) or a column
 * (with `useSeriesHighlight(ids, 'vertical')`). The entries keep their list's look; the `li`s are
 * presentational, so a screen reader hears the toolbar and its buttons only.
 */
export function SeriesLegend({
  entries,
  highlight,
  layout = LEGEND_ROW,
}: {
  entries: readonly LegendEntry[];
  highlight: SeriesHighlight;
  layout?: string;
}): JSX.Element {
  return (
    <ul
      ref={highlight.listRef}
      role="toolbar"
      aria-label={LEGEND_LABEL}
      aria-orientation={highlight.orientation}
      data-series-legend=""
      className={`${LIST} ${layout}`}
    >
      {entries.map(({ id, label, swatch }) => (
        <li key={id} role="none" className="flex items-center">
          <button
            type="button"
            aria-label={hasInlineMath(label) ? inlineMathToSpeech(label) : undefined}
            data-highlighted={highlight.highlighted === id ? '' : undefined}
            className={ENTRY}
            {...highlight.entry(id)}
          >
            {swatch}
            <span>
              <InlineMath text={label} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
