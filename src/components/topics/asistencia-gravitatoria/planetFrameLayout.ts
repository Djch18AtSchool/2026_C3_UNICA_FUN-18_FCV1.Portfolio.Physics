/**
 * Where the planet frame puts its texts and labels on screen, clear of the drawing at whatever
 * zoom: the corner texts (the V⃗_p key, the r_p value, the time badge, «planeta agrandado»), the
 * scale bar's boxes, the knob's label and the v∞ labels. A label whose arrow has left the panel
 * is not placed at all. Pure, in the frame's pixels.
 */
import type { ScaleBarLength } from '../../lab/scaleBarMath';
import {
  segmentsOf,
  spotsAround,
  spotsBeside,
  textBox,
  type Box,
  type Point,
  type Segment,
} from '../../lab/labelClearance';
import { LABEL_SIZE } from '../../lab/OverlayMarks';
import { LABEL_BASELINE_DROP, LABEL_GAP, placeLabels, type PlacedLabel } from './flybyLabels';
import { scaleBadgeSpot, type ScaleBadgeSpot } from './flybyScaleBadge';
import { tipLabel, type TipLabelPlacement } from './flybyScene';
import type { FrameWorld, ScreenFrame } from './planetGeometry';
import { isOnPanel, scaleBarObstacles } from './planetZoom';

export const CORNER = 12;
export const NOTE_SIZE = 12;
export const VP_ARROW = 36;
/** The key beside the V_p arrow, in the MathText notation. */
export const VP_KEY = 'vec V_p';
/** The corner texts' baseline below the corner, and the V_p key's gap to its text. */
const CORNER_BASELINE = 10;
const VP_TEXT_GAP = 6;
/** The knob's label clears its focus ring (11 px) and the knob's halo. */
const KNOB_LABEL_GAP = 22;
/** The knob's focus ring (11 px) that a label keeps clear of. */
const KNOB_CLEARANCE = 11;
/** The widest r_p value the frame prints (100 radii): the badge keeps clear of it. */
const WIDEST_RP_VALUE = 'r_p = 100,00 R_J';
/** The scale bar's baseline is this far above the panel's bottom edge. */
export const BAR_INSET = 8;
/**
 * «planeta agrandado» sits on the line of the scale bar's text, at the right, raised 2 px more
 * (8 for the ticks, 4 for the gap above the baseline, 6): the ticks, which are on the line below,
 * never reach the descenders of its letters, however long the bar is.
 */
const NOTE_LIFT = BAR_INSET + 8 + 6;
export const NOTE_TEXT = 'planeta agrandado';
const KNOB_LABEL_TEXT = 'r_p';
const LABEL_OUT = 'vec v_∞,out';
const LABEL_IN = 'vec v_∞,in';

export interface Panel {
  width: number;
  /** The panel's height: the square the drawing is in (the zoom's strip is not part of it). */
  height: number;
}

const squareAround = (p: Point, half: number): Box => ({
  left: p.x - half,
  right: p.x + half,
  top: p.y - half,
  bottom: p.y + half,
});

export interface CornerTexts {
  vpText: Point;
  vpBox: Box;
  /** The time badge between the key and the r_p value. */
  badge: ScaleBadgeSpot;
  rpAt: Point;
  rpBox: Box;
  /** «planeta agrandado»: where it is written and its box. */
  noteAt: Point;
  noteBox: Box;
}

/** The texts of the panel's corners; they do not move with the zoom or with r_p. */
export function cornerTexts(panel: Panel, rpValue: string, clockRate: number): CornerTexts {
  const cornerY = CORNER + CORNER_BASELINE;
  const vpText = { x: CORNER + VP_ARROW + VP_TEXT_GAP, y: cornerY };
  const vpBox = { ...textBox(vpText, VP_KEY, NOTE_SIZE, 'start'), left: CORNER };
  const rpAt = { x: panel.width - CORNER, y: cornerY };
  // The badge centres between the key and the widest r_p value, so it stays put while r_p is dragged.
  const widestRp = textBox(rpAt, WIDEST_RP_VALUE, NOTE_SIZE, 'end');
  const noteAt = { x: panel.width - CORNER, y: panel.height - NOTE_LIFT };
  return {
    vpText,
    vpBox,
    badge: scaleBadgeSpot(vpBox.right, widestRp.left, clockRate),
    rpAt,
    rpBox: textBox(rpAt, rpValue, NOTE_SIZE, 'end'),
    noteAt,
    noteBox: textBox(noteAt, NOTE_TEXT, NOTE_SIZE, 'end'),
  };
}

export interface ScaleBarSpot {
  /** Where the SVG bar starts: its baseline's left end. */
  at: Point;
  /** The bar and its text, which the labels keep off. */
  boxes: readonly Box[];
  /** The bar's baseline, a line the labels keep off. */
  line: Segment;
}

/** The scale bar at the panel's bottom-left corner. */
export function scaleBarSpot(bar: ScaleBarLength | undefined, panel: Panel): ScaleBarSpot {
  const at = { x: CORNER, y: panel.height - BAR_INSET };
  if (!bar) return { at, boxes: [], line: [at, at] };
  return {
    at,
    boxes: scaleBarObstacles(bar, at),
    line: [at, { x: at.x + bar.px, y: at.y }],
  };
}

export interface KnobLabel extends TipLabelPlacement {
  box: Box;
}

/** The knob's name beside it, or none once the knob has left the panel. */
export function knobLabel(screen: ScreenFrame, panel: Panel): KnobLabel | undefined {
  if (!isOnPanel(screen.periapsis, panel)) return undefined;
  const placed = tipLabel(
    screen.periapsis,
    screen.periDir,
    KNOB_LABEL_TEXT,
    panel.width,
    KNOB_LABEL_GAP,
  );
  const box = textBox(
    { x: placed.at.x, y: placed.at.y + LABEL_BASELINE_DROP },
    KNOB_LABEL_TEXT,
    LABEL_SIZE,
    placed.anchor,
  );
  return { ...placed, box };
}

export interface VInfLabels {
  out?: PlacedLabel;
  in?: PlacedLabel;
}

interface VInfInput {
  screen: ScreenFrame;
  world: Pick<FrameWorld, 'inDir' | 'outDir'>;
  panel: Panel;
  /** Every text and mark the labels keep off: corners, bar, planet, knob and its label. */
  obstacles: readonly Box[];
  barLine: Segment;
}

/**
 * The v∞ labels keep off every line drawn still and off every text; the moving probe and v_rel
 * are left out, so a label does not jump while the pass plays. Out first, then in; an arrow whose
 * far end is off the panel has no label (the legend names it).
 */
export function placeVInfLabels({
  screen,
  world,
  panel,
  obstacles,
  barLine,
}: VInfInput): VInfLabels {
  const { first, last, inTail, outTip } = screen;
  const { inDir, outDir } = world;
  const requests = [
    {
      key: 'out' as const,
      isShown: isOnPanel(outTip, panel),
      text: LABEL_OUT,
      spots: (size: { width: number; height: number }) => [
        ...spotsBeside(last, outTip, size, LABEL_GAP),
        ...spotsAround(outTip, outDir, size, LABEL_GAP),
      ],
    },
    {
      key: 'in' as const,
      isShown: isOnPanel(inTail, panel),
      text: LABEL_IN,
      spots: (size: { width: number; height: number }) => [
        ...spotsBeside(inTail, first, size, LABEL_GAP),
        ...spotsAround(inTail, { x: -inDir.x, y: -inDir.y }, size, LABEL_GAP),
      ],
    },
  ].filter((request) => request.isShown);
  const lines = [
    ...segmentsOf(screen.trackPx),
    [screen.centre, screen.periapsis] as Segment,
    [inTail, first] as Segment,
    [last, outTip] as Segment,
    barLine,
  ];
  const placed = placeLabels(requests, lines, obstacles, panel);
  return Object.fromEntries(requests.map(({ key }, index) => [key, placed[index]]));
}

/** The boxes the v∞ labels keep clear of, besides the labels themselves. */
export function labelObstacles(
  corners: CornerTexts,
  bar: ScaleBarSpot,
  screen: ScreenFrame,
  knob: KnobLabel | undefined,
  isNoteShown: boolean,
): Box[] {
  return [
    corners.vpBox,
    ...corners.badge.boxes,
    corners.rpBox,
    ...bar.boxes,
    ...(isNoteShown ? [corners.noteBox] : []),
    squareAround(screen.centre, screen.planet.radiusPx),
    squareAround(screen.periapsis, KNOB_CLEARANCE),
    ...(knob ? [knob.box] : []),
  ];
}
