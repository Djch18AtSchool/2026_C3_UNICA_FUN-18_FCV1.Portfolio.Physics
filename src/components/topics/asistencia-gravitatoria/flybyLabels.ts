/**
 * Where the flyby laboratory puts its vector labels (v∞,in, v∞,out, v antes, v después, δ): the
 * first candidate spot whose box crosses no drawn line and covers no other text, placed in order
 * so each label also keeps clear of the ones before it. Pixels throughout. Pure.
 */
import {
  boxAround,
  clearSpot,
  type Box,
  type Point,
  type Segment,
  type Size,
} from '../../lab/labelClearance';
import { LABEL_SIZE } from '../../lab/OverlayMarks';
import { monoTextWidth } from '../../lab/plotScales';

/** Room around a label's glyphs, px: a stroke or an arrowhead never grazes them. */
const LABEL_PAD = 2;
/** Gap between a label's box and the point or line it names, px. */
export const LABEL_GAP = 3;
/** A Label's baseline below the centre of its box (0,8 em ascent, 0,25 em descent). */
export const LABEL_BASELINE_DROP = 4;
/** Labels keep this far inside the panel, px. */
const PANEL_INSET = 2;
/** Labels keep this far from other text, px, so two never read as one line. */
const TEXT_MARGIN = 8;

const grow = (box: Box, by: number): Box => ({
  left: box.left - by,
  right: box.right + by,
  top: box.top - by,
  bottom: box.bottom + by,
});

/** The padded box size of a Label's text. */
export function labelSize(text: string): Size {
  return {
    width: monoTextWidth(text, LABEL_SIZE) + 2 * LABEL_PAD,
    height: LABEL_SIZE + 2 * LABEL_PAD,
  };
}

export interface LabelRequest {
  text: string;
  /** Candidate centres for a box of `size`, best first. */
  spots(size: Size): Point[];
}

export interface PlacedLabel {
  text: string;
  /** Centre of the label's box: draw it there with anchor middle and LABEL_BASELINE_DROP. */
  at: Point;
  box: Box;
}

/**
 * Places the labels in order inside a width × height panel: each takes its first clear spot (or,
 * when none is clear, its first spot) and then blocks the ones after it. Clear means off every
 * line and at least TEXT_MARGIN from every other text.
 */
export function placeLabels(
  requests: readonly LabelRequest[],
  lines: readonly Segment[],
  texts: readonly Box[],
  panel: { width: number; height: number },
): PlacedLabel[] {
  const area = {
    left: PANEL_INSET,
    top: PANEL_INSET,
    right: panel.width - PANEL_INSET,
    bottom: panel.height - PANEL_INSET,
  };
  return requests.reduce<PlacedLabel[]>((placed, { text, spots }) => {
    const size = labelSize(text);
    const candidates = spots(size);
    const blocked = [...texts, ...placed.map((label) => label.box)].map((box) =>
      grow(box, TEXT_MARGIN),
    );
    const at = clearSpot(candidates, size, lines, area, blocked) ?? candidates[0];
    return [...placed, { text, at, box: boxAround(at, size.width, size.height) }];
  }, []);
}
