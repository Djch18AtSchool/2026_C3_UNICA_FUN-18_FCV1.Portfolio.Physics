/**
 * «Qué aprendí», the closing section of the cover (spec §5): its anchor, the three pairs of the
 * connection map and the map's layout. Pure, so it unit-tests: the Astro component only draws
 * what `connectionMap` returns.
 *
 * Layout: one column per delivery, nodes evenly spaced (shorter columns centred), each node a box
 * with the topic's number and short title. Edges are the topics' `related` (undirected, once) plus
 * the pairs, flagged and labelled with their principle; a pair is drawn even if no topic declares
 * it, and anything about an unregistered topic is skipped, so the map renders whatever exists.
 */
import { PHASE_LABELS, PHASES, topicBySlug, topicsByPhase, type Phase } from '../consigna';
import { PLEX_MONO_ADVANCE } from './glyphAdvances';
import { mathTextWidth } from './mathNotation';
import type { TopicSummary } from './topics';
import { withBase } from './url';

export const CLOSING_ANCHOR = 'que-aprendi';
export const CLOSING_TITLE = 'Qué aprendí';

/** «Qué aprendí» from any page: the cover's last section, under the deploy base. */
export function closingUrl(base: string = import.meta.env.BASE_URL): string {
  return `${withBase('', base)}#${CLOSING_ANCHOR}`;
}

/**
 * The map's width (px), drawn 1:1 so its text keeps the site's 14 and 12 px: it fits the figure
 * frame from a 1 024 px screen with a classic scrollbar (925 px inside) and scrolls below.
 */
export const MAP_WIDTH = 920;

export interface ConnectionPair {
  a: number;
  b: number;
  principle: string;
}

/** Dylan's pairs (spec §2.4): same principle, very different applications. */
export const CLOSING_PAIRS: readonly ConnectionPair[] = Object.freeze([
  { a: 7, b: 9, principle: 'Momento lineal' },
  { a: 6, b: 13, principle: 'Energía con disipación' },
  { a: 11, b: 12, principle: 'Frecuencia natural' },
]);

/** A topic on the map; x and y are the centre of its box. */
export interface MapNode {
  number: number;
  shortTitle: string;
  phase: Phase;
  x: number;
  y: number;
}

/** A pair's principle, drawn on its edge in a pill centred at (x, y). */
export interface MapLabel {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EdgeBase {
  /** The lower topic number; `b` the higher. */
  a: number;
  b: number;
  /** SVG path data, from box edge to box edge. */
  d: string;
}

/** A `related` connection, drawn faint. */
export interface FaintEdge extends EdgeBase {
  isPair: false;
}

/** One of the closing's pairs, drawn in colour with its principle on a pill. */
export interface PairEdge extends EdgeBase {
  isPair: true;
  principle: string;
  label: MapLabel;
}

export type MapEdge = FaintEdge | PairEdge;

export interface ConnectionMap {
  nodes: MapNode[];
  edges: MapEdge[];
  height: number;
  nodeWidth: number;
  nodeHeight: number;
  /** Each delivery's column, with its label, centred at x. */
  columns: { phase: Phase; label: string; x: number }[];
}

/** Type sizes (px) and the inside of a node: padding, two-digit number, gap, short title. */
export const MAP_TYPE = {
  title: 14,
  number: 12,
  label: 12,
  column: 12,
} as const;
export const NODE_PAD_X = 12;
export const NODE_NUMBER_GAP = 8;
const NUMBER_DIGITS = 2;
const PER_MILLE = 1000;
export const NODE_NUMBER_WIDTH = (NUMBER_DIGITS * PLEX_MONO_ADVANCE * MAP_TYPE.number) / PER_MILLE;
const NODE_HEIGHT = 40;
/** Node to node: 48 px between boxes, room for a pair's pill and a visible stroke on each side. */
const ROW_STEP = 88;
/** Column titles sit above the first row. */
const HEADER_HEIGHT = 32;
const BOTTOM_PAD = 8;
/** Room outside the first and last columns for the edges that bend around their nodes. */
const SIDE_MARGIN = 40;
/** Narrower gaps leave no room for the edges and pills between columns. */
const MIN_GAP = 96;
/** Widths snap up to the 8 px grid. */
const GRID = 8;
const LABEL_PAD_X = 8;
const LABEL_HEIGHT = 24;
/** The pill's text is semibold; the advances are the regular face's. */
const LABEL_WEIGHT_ALLOWANCE = 1.08;
/** Air between a pill and the box it passes. */
const LABEL_CLEARANCE = 8;
/** Where an edge that skips a column starts and ends its level run, off the boxes' sides. */
const CHANNEL_INSET = 8;
/** How far a faint edge bends out of its column, per row it spans, and at most (inside the margin). */
const FAINT_BULGE_PER_ROW = 12;
const MAX_FAINT_BULGE = SIDE_MARGIN - LABEL_CLEARANCE;

interface Placed extends MapNode {
  column: number;
  row: number;
}

const snap = (value: number, step: number) => Math.ceil(value / step) * step;
const edgeKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;

function nodeWidthFor(topics: readonly TopicSummary[]): number {
  const title = Math.max(
    0,
    ...topics.map((topic) => mathTextWidth(topic.shortTitle, MAP_TYPE.title)),
  );
  return snap(2 * NODE_PAD_X + NODE_NUMBER_WIDTH + NODE_NUMBER_GAP + title, GRID);
}

function labelFor(text: string): Omit<MapLabel, 'x' | 'y'> {
  const textWidth = mathTextWidth(text, MAP_TYPE.label) * LABEL_WEIGHT_ALLOWANCE;
  return { text, width: snap(textWidth + 2 * LABEL_PAD_X, 2), height: LABEL_HEIGHT };
}

/** x of each column's centre; throws when three columns and their gaps do not fit. */
function columnCentres(width: number, nodeWidth: number): number[] {
  const gap = (width - 2 * SIDE_MARGIN - PHASES.length * nodeWidth) / (PHASES.length - 1);
  if (!(gap >= MIN_GAP)) {
    throw new RangeError(
      `connectionMap: en ${width} px no caben ${PHASES.length} columnas de ${nodeWidth} px`,
    );
  }
  return PHASES.map((_, column) => SIDE_MARGIN + nodeWidth / 2 + column * (nodeWidth + gap));
}

function place(topics: readonly TopicSummary[], centres: readonly number[]): Placed[] {
  const columns = PHASES.map((phase) => topicsByPhase(phase, topics));
  const rows = Math.max(1, ...columns.map((column) => column.length));
  return columns.flatMap((column, index) =>
    column.map((topic, position) => {
      const row = position + (rows - column.length) / 2;
      return {
        number: topic.number,
        shortTitle: topic.shortTitle,
        phase: topic.phase,
        x: centres[index],
        y: HEADER_HEIGHT + NODE_HEIGHT / 2 + row * ROW_STEP,
        column: index,
        row,
      };
    }),
  );
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** What drawing an edge needs to know: the node width, every node and the pills to avoid. */
interface EdgeContext {
  nodeWidth: number;
  placed: readonly Placed[];
  pills: readonly Box[];
}

const pillBox = ({ x, y, width, height }: MapLabel): Box => ({
  left: x - width / 2,
  right: x + width / 2,
  top: y - height / 2,
  bottom: y + height / 2,
});

/** Levels at which an edge can cross a column without passing behind a box: the gaps. */
function channels(between: readonly Placed[]): number[] {
  const ys = [...new Set(between.map((node) => node.y))].sort((p, q) => p - q);
  const gaps = ys.slice(1).map((y, index) => (y + ys[index]) / 2);
  return [ys[0] - ROW_STEP / 2, ...gaps, ys[ys.length - 1] + ROW_STEP / 2];
}

/**
 * Box side to box side across columns: a curve that leaves and arrives level. An edge that skips
 * a column crosses it level through the gap between two of its boxes nearest the edge's middle
 * (one where the run does not start or end in a pill), so it never seems to enter a node.
 */
function acrossColumns(from: Placed, to: Placed, { nodeWidth, placed, pills }: EdgeContext) {
  const [left, right] = from.column < to.column ? [from, to] : [to, from];
  const x1 = left.x + nodeWidth / 2;
  const x2 = right.x - nodeWidth / 2;
  const between = placed.filter((node) => node.column > left.column && node.column < right.column);
  if (between.length === 0) {
    const reach = (x2 - x1) / 2;
    const d = `M ${x1} ${left.y} C ${x1 + reach} ${left.y} ${x2 - reach} ${right.y} ${x2} ${right.y}`;
    return { d, middle: { x: (x1 + x2) / 2, y: (left.y + right.y) / 2 } };
  }
  const xs = between.map((node) => node.x);
  const runStart = Math.min(...xs) - nodeWidth / 2 - CHANNEL_INSET;
  const runEnd = Math.max(...xs) + nodeWidth / 2 + CHANNEL_INSET;
  const target = (left.y + right.y) / 2;
  const isFree = (y: number) =>
    !pills.some((box) =>
      [runStart, runEnd].some(
        (x) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom,
      ),
    );
  const byCloseness = channels(between).sort(
    (p, q) => Math.abs(p - target) - Math.abs(q - target) || p - q,
  );
  const y = byCloseness.find(isFree) ?? byCloseness[0];
  const reachIn = (runStart - x1) / 2;
  const reachOut = (x2 - runEnd) / 2;
  const d = [
    `M ${x1} ${left.y} C ${x1 + reachIn} ${left.y} ${runStart - reachIn} ${y} ${runStart} ${y}`,
    `L ${runEnd} ${y}`,
    `C ${runEnd + reachOut} ${y} ${x2 - reachOut} ${right.y} ${x2} ${right.y}`,
  ].join(' ');
  return { d, middle: { x: (runStart + runEnd) / 2, y } };
}

/** Neighbours in a column: straight down, between the two boxes. */
function betweenNeighbours(from: Placed, to: Placed) {
  const [top, bottom] = from.row < to.row ? [from, to] : [to, from];
  const y1 = top.y + NODE_HEIGHT / 2;
  const y2 = bottom.y - NODE_HEIGHT / 2;
  return { d: `M ${top.x} ${y1} L ${top.x} ${y2}`, middle: { x: top.x, y: (y1 + y2) / 2 } };
}

/**
 * Two nodes of a column with others between them: a bend outside the column (the first and the
 * middle columns bend left, the last one right), wide enough for a pill on its apex.
 */
function aroundColumn(from: Placed, to: Placed, nodeWidth: number, pillWidth?: number) {
  const side = from.column === PHASES.length - 1 ? 1 : -1;
  const x = from.x + (side * nodeWidth) / 2;
  const bulge =
    pillWidth === undefined
      ? Math.min(FAINT_BULGE_PER_ROW * Math.abs(to.row - from.row), MAX_FAINT_BULGE)
      : pillWidth / 2 + LABEL_CLEARANCE;
  const middleY = (from.y + to.y) / 2;
  // A quadratic curve reaches half way to its control point: the apex sits `bulge` out.
  const d = `M ${x} ${from.y} Q ${x + 2 * side * bulge} ${middleY} ${x} ${to.y}`;
  return { d, middle: { x: x + side * bulge, y: middleY } };
}

function geometryFor(a: Placed, b: Placed, context: EdgeContext, pillWidth?: number) {
  if (a.column !== b.column) return acrossColumns(a, b, context);
  if (Math.abs(a.row - b.row) === 1) return betweenNeighbours(a, b);
  return aroundColumn(a, b, context.nodeWidth, pillWidth);
}

const ends = (a: Placed, b: Placed) => ({
  a: Math.min(a.number, b.number),
  b: Math.max(a.number, b.number),
});

function faintEdge(a: Placed, b: Placed, context: EdgeContext): FaintEdge {
  return { ...ends(a, b), isPair: false, d: geometryFor(a, b, context).d };
}

function pairEdge(a: Placed, b: Placed, context: EdgeContext, principle: string): PairEdge {
  const pill = labelFor(principle);
  const { d, middle } = geometryFor(a, b, context, pill.width);
  return { ...ends(a, b), isPair: true, principle, d, label: { ...pill, ...middle } };
}

/** The pairs first (their pills are what the faint edges avoid), then the faint edges. */
function mapEdges(
  placed: readonly Placed[],
  related: ReadonlyMap<number, readonly number[]>,
  pairs: readonly ConnectionPair[],
  nodeWidth: number,
): MapEdge[] {
  const nodes = new Map(placed.map((node) => [node.number, node]));
  const pairContext: EdgeContext = { nodeWidth, placed, pills: [] };
  const highlighted = pairs.flatMap((pair) => {
    const [a, b] = [nodes.get(pair.a), nodes.get(pair.b)];
    return a && b ? [pairEdge(a, b, pairContext, pair.principle)] : [];
  });
  const pairKeys = new Set(highlighted.map((edge) => edgeKey(edge.a, edge.b)));
  const context: EdgeContext = {
    ...pairContext,
    pills: highlighted.map((edge) => pillBox(edge.label)),
  };
  const faint = new Map<string, FaintEdge>();
  for (const [number, list] of related) {
    for (const other of list) {
      const [a, b] = [nodes.get(number), nodes.get(other)];
      if (!a || !b || a === b) continue;
      const key = edgeKey(a.number, b.number);
      if (!faint.has(key) && !pairKeys.has(key)) faint.set(key, faintEdge(a, b, context));
    }
  }
  const sorted = [...faint.values()].sort((p, q) => p.a - q.a || p.b - q.b);
  return [...sorted, ...highlighted];
}

/**
 * The map of `topics` (any subset of the course) at `width` px: nodes, edges (faint first, the
 * pairs last so they are drawn on top) and the height it needs.
 */
export function connectionMap(
  topics: readonly TopicSummary[],
  related: ReadonlyMap<number, readonly number[]>,
  pairs: readonly ConnectionPair[],
  width: number,
): ConnectionMap {
  const nodeWidth = nodeWidthFor(topics);
  const centres = columnCentres(width, nodeWidth);
  const placed = place(topics, centres);
  const rows = Math.max(1, ...placed.map((node) => node.row + 1));
  const edges = mapEdges(placed, related, pairs, nodeWidth);
  return {
    nodes: placed.map(({ number, shortTitle, phase, x, y }) => ({
      number,
      shortTitle,
      phase,
      x,
      y,
    })),
    edges,
    height: HEADER_HEIGHT + (rows - 1) * ROW_STEP + NODE_HEIGHT + BOTTOM_PAD,
    nodeWidth,
    nodeHeight: NODE_HEIGHT,
    columns: PHASES.map((phase, column) => ({
      phase,
      label: PHASE_LABELS[phase],
      x: centres[column],
    })),
  };
}

/** Each topic's `related` slugs as topic numbers; a slug not registered yet is skipped. */
export function relatedNumbers(
  entries: readonly { number: number; related: readonly string[] }[],
): Map<number, number[]> {
  return new Map(
    entries.map(({ number, related }) => [
      number,
      related.flatMap((slug) => topicBySlug(slug)?.number ?? []),
    ]),
  );
}
