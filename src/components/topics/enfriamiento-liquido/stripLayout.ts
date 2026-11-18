/**
 * The strip under Tema 13's profile (SectionStrip): the path's sections end to end along x, each
 * drawn with a height proportional to its inner diameter and named under it. Pure layout: which
 * sections, which names for the view, and the rows the names go in so none touches another.
 */
import type { Segment } from '../../../lib/physics/hydraulics';
import { formatNumber } from '../../../lib/format';
import type { Domain, Scale } from '../../lab/plotScales';
import {
  plateIndex,
  sectionKind,
  segmentBounds,
  type CircuitSide,
  type LabelLevel,
  type SectionKind,
} from './coolingPlots';

/** The names' font size (px), the rows under the strip they may take and their least gap (px). */
export const LABEL_FONT_SIZE = 12;
export const STRIP_LABEL_ROWS = 2;
export const LABEL_GAP = 6;
const MM_PER_M = 1e3;

export interface StripSection {
  /** `<kind>-<side>`: each kind appears at most once on each side of the loop. */
  id: string;
  kind: SectionKind;
  side: CircuitSide;
  x0: number;
  x1: number;
  /** Inner diameter (m); the manifold's hydraulic one, the plate's its hose's (not to scale). */
  diameter: number;
}

/** The path's segments merged into sections: the manifold's pieces become one. */
export function stripSections(path: readonly Segment[]): StripSection[] {
  const bounds = segmentBounds(path);
  const plate = plateIndex(path);
  return path.reduce<StripSection[]>((sections, segment, i) => {
    const kind = sectionKind(segment);
    const side: CircuitSide = i < plate ? 'impulsion' : 'retorno';
    const last = sections[sections.length - 1];
    if (last && last.kind === kind && last.side === side) {
      return [...sections.slice(0, -1), { ...last, x1: bounds[i + 1] }];
    }
    const id = `${kind}-${side}`;
    return [
      ...sections,
      { id, kind, side, x0: bounds[i], x1: bounds[i + 1], diameter: segment.diameter },
    ];
  }, []);
}

export const SECTION_NAMES: Readonly<Record<SectionKind, string>> = {
  tuberia: 'Tubería principal',
  'manguera-rack': 'Manguera de rack',
  manifold: 'Manifold',
  'manguera-servidor': 'Manguera 3/8″',
  uqd: 'UQD04',
  'placa-fria': 'Placa fría',
};

/** The second line of a section's name: its diameter, or why the plate has none drawn. */
function sectionDetail({ kind, diameter }: StripSection): string {
  if (kind === 'placa-fria') return 'sin escala';
  const symbol = kind === 'manifold' ? '$D_h$' : '$D$';
  const precision = kind === 'uqd' ? 2 : 1;
  return `${symbol} = ${formatNumber(diameter * MM_PER_M, { precision, unit: 'mm' })}`;
}

/** Names of the groups that stand for several sections. */
const GROUP_NAMES: Readonly<Record<string, string>> = { rack: 'Rack', servidor: 'Servidor' };
const SERVER_KINDS: ReadonlySet<SectionKind> = new Set(['manguera-servidor', 'uqd', 'placa-fria']);

function groupKey(section: StripSection, level: LabelLevel): string {
  if (level === 'grupo') return section.kind === 'tuberia' ? section.id : 'rack';
  if (level === 'parte' && SERVER_KINDS.has(section.kind)) return 'servidor';
  return section.id;
}

export interface StripLabel {
  id: string;
  x0: number;
  x1: number;
  lines: readonly string[];
}

/**
 * The names of the view: consecutive sections of one group share a name, and a name shows only
 * when the middle of what it names is in view (a section cut by the view's edge is named in the
 * wider view that shows it whole).
 */
export function stripLabels(
  sections: readonly StripSection[],
  level: LabelLevel,
  domain: Domain,
): StripLabel[] {
  const groups = sections.reduce<{ key: string; members: StripSection[] }[]>((all, section) => {
    const key = groupKey(section, level);
    const last = all[all.length - 1];
    if (last && last.key === key)
      return [...all.slice(0, -1), { key, members: [...last.members, section] }];
    return [...all, { key, members: [section] }];
  }, []);
  return groups
    .map(({ key, members }) => {
      const [first] = members;
      const lines =
        members.length === 1
          ? [SECTION_NAMES[first.kind], sectionDetail(first)]
          : [GROUP_NAMES[key]];
      return { id: key, x0: first.x0, x1: members[members.length - 1].x1, lines };
    })
    .filter(({ x0, x1 }) => {
      const middle = (x0 + x1) / 2;
      return middle > domain.min && middle < domain.max;
    });
}

/**
 * The same labels as numbers, 1 to N in path order: where the names do not fit (a phone), the
 * strip draws these and the key under it pairs each number with its name.
 */
export function numberedLabels(labels: readonly StripLabel[]): StripLabel[] {
  return labels.map((label, i) => ({ ...label, lines: [String(i + 1)] }));
}

export interface PlacedLabel extends StripLabel {
  /** Where the label points (viewBox px): the middle of what it names that is in view. */
  anchor: number;
  /** Centre of the label (viewBox px), moved inside the plot if it would cross an edge. */
  centre: number;
  row: number;
}

/**
 * Each name centred under what it names (kept inside the scale's range), in the first row where
 * it stays `gap` px clear of the name before it. No name covers another one's anchor, so a leader
 * from the strip down to a lower row never crosses a name; a name with no free row is left out
 * (the strip then falls back to numbers, numberedLabels).
 */
export function placeLabels(
  labels: readonly StripLabel[],
  x: Scale,
  widthOf: (label: StripLabel) => number,
  gap: number,
): PlacedLabel[] {
  const [left, right] = x.range;
  const anchors = labels.map((label) =>
    x.toPx((Math.max(label.x0, x.domain.min) + Math.min(label.x1, x.domain.max)) / 2),
  );
  const rowEnds: number[] = Array.from({ length: STRIP_LABEL_ROWS }, () => -Infinity);
  return labels.flatMap((label, i) => {
    const anchor = anchors[i];
    const half = widthOf(label) / 2;
    const centre = Math.min(Math.max(anchor, left + half), right - half);
    const coversAnchor = anchors.some(
      (other, j) => j !== i && Math.abs(other - centre) < half + gap / 2,
    );
    const row = rowEnds.findIndex((end) => centre - half >= end + gap);
    if (coversAnchor || row < 0) return [];
    rowEnds[row] = centre + half;
    return [{ ...label, anchor, centre, row }];
  });
}

export interface StripPlacement {
  /** The view's labels, by name. */
  labels: StripLabel[];
  placed: PlacedLabel[];
  /** True when the names did not all fit and the strip draws numbers keyed under it. */
  isNumbered: boolean;
}

/**
 * The names of the view placed under the strip, or its numbers when some name would not fit or
 * when the drawing is a phone's (`numbersOnly`: its rows are one line tall).
 */
export function stripPlacement(
  sections: readonly StripSection[],
  level: LabelLevel,
  x: Scale,
  widthOf: (label: StripLabel) => number,
  numbersOnly = false,
): StripPlacement {
  const labels = stripLabels(sections, level, x.domain);
  const named = numbersOnly ? [] : placeLabels(labels, x, widthOf, LABEL_GAP);
  if (!numbersOnly && named.length === labels.length) {
    return { labels, placed: named, isNumbered: false };
  }
  return {
    labels,
    placed: placeLabels(numberedLabels(labels), x, widthOf, LABEL_GAP),
    isNumbered: true,
  };
}
