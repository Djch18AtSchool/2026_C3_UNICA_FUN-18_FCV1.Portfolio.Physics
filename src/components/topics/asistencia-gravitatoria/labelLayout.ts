/**
 * Places the encounter labels of the Voyager chart in rows above the plot. Each label sits over
 * its marker (a vertical leader runs from the label down to the data), as centred as the room
 * allows; a label that cannot fit in a row moves up one. No label covers another label's leader,
 * so the leaders of upper rows pass between the labels below them. Pure.
 */
import type { Domain } from '../../lab/plotScales';

export interface LabelRequest {
  id: string;
  /** Marker (and leader) position, px. */
  x: number;
  width: number;
}

export interface PlacedLabel extends LabelRequest {
  /** Left edge of the label box, px. */
  left: number;
  /** 0 is the row next to the plot; higher rows sit above it. */
  row: number;
}

/** The leader stays at least this far (px) inside its own label box, when the bounds allow it. */
const LEADER_INSET = 8;
/** Rows tried before a label is placed regardless of its neighbours. */
const MAX_ROWS = 4;
/** Keeps a label off a boundary it was pushed to, against floating-point round-off. */
const EPSILON = 1e-6;

type Interval = { min: number; max: number };

/** The parts of `allowed` left after removing every open interval in `blocked`. */
function subtract(allowed: Interval, blocked: Interval[]): Interval[] {
  return blocked.reduce<Interval[]>(
    (parts, cut) =>
      parts.flatMap((part) => {
        if (cut.max <= part.min || cut.min >= part.max) return [part];
        const pieces: Interval[] = [];
        if (cut.min >= part.min) pieces.push({ min: part.min, max: cut.min - EPSILON });
        if (cut.max <= part.max) pieces.push({ min: cut.max + EPSILON, max: part.max });
        return pieces.filter((piece) => piece.max >= piece.min);
      }),
    [allowed],
  );
}

/** The value in `parts` closest to `target`, or undefined when there is none. */
function closest(parts: Interval[], target: number): number | undefined {
  return parts
    .map((part) => Math.min(Math.max(target, part.min), part.max))
    .reduce<number | undefined>(
      (best, value) =>
        best === undefined || Math.abs(value - target) < Math.abs(best - target) ? value : best,
      undefined,
    );
}

/** Left edges that keep the label's own leader inside its box and the box inside the bounds. */
function ownRange(label: LabelRequest, bounds: Domain): Interval {
  const within = (inset: number): Interval => ({
    min: Math.max(label.x - label.width + inset, bounds.min),
    max: Math.min(label.x - inset, bounds.max - label.width),
  });
  const inset = within(Math.min(LEADER_INSET, label.width / 2));
  if (inset.max >= inset.min) return inset;
  const loose = within(0);
  if (loose.max >= loose.min) return loose;
  const edge = Math.min(Math.max(label.x - label.width / 2, bounds.min), bounds.max - label.width);
  return { min: edge, max: edge };
}

/**
 * Left edges a label may take in `row`: inside its own range, clear (by `gap`) of the boxes
 * already in that row and of every other label's leader.
 */
function freeRange(
  label: LabelRequest,
  row: number,
  placed: PlacedLabel[],
  leaders: number[],
  bounds: Domain,
  gap: number,
): Interval[] {
  const boxes = placed
    .filter((other) => other.row === row)
    .map((other) => ({
      min: other.left - label.width - gap,
      max: other.left + other.width + gap,
    }));
  const others = leaders
    .filter((x) => x !== label.x)
    .map((x) => ({ min: x - label.width - gap, max: x + gap }));
  return subtract(ownRange(label, bounds), [...boxes, ...others]);
}

export function placeLabels(
  requests: readonly LabelRequest[],
  bounds: Domain,
  gap: number,
): PlacedLabel[] {
  const leaders = requests.map((request) => request.x);
  const byPosition = [...requests].sort((a, b) => a.x - b.x);
  const placed = byPosition.reduce<PlacedLabel[]>((done, label) => {
    const centred = label.x - label.width / 2;
    for (let row = 0; row < MAX_ROWS; row += 1) {
      const left = closest(freeRange(label, row, done, leaders, bounds, gap), centred);
      if (left !== undefined) return [...done, { ...label, left, row }];
    }
    const fallback = ownRange(label, bounds);
    return [...done, { ...label, left: fallback.min, row: MAX_ROWS }];
  }, []);
  return requests.map((request) => placed.find((label) => label.id === request.id) as PlacedLabel);
}
