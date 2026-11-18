/**
 * The strip under Tema 13's profile: every section of the path along the same x as the plots,
 * its length to scale and its height proportional to its inner diameter (the scale of the view:
 * the widest section in view fills the band), coloured by side, with its name and diameter under
 * it on a leader, or a number keyed under the figure when the names do not fit (a phone). The
 * cold plate's inside is not public: it is drawn without scale, in a dashed outline.
 */
import type { JSX } from 'react';
import { TEXT_COLOR, TICK_COLOR } from '../../charts/chartTheme';
import MathText from '../../lab/MathText';
import { textWidth, type Scale } from '../../lab/plotScales';
import InlineMath from '../../lab/InlineMath';
import { Unbroken } from './coolingPlotKit';
import { SIDE_COLORS } from './coolingPlots';
import {
  LABEL_FONT_SIZE,
  STRIP_LABEL_ROWS,
  type StripLabel,
  type StripPlacement,
  type StripSection,
} from './stripLayout';

/** The band (px) the widest section in view fills, and the rows of names under it. */
export const STRIP_HEIGHT = 48;
export const STRIP_TITLE_HEIGHT = 22;
const LABELS_GAP = 10;
const LINE_HEIGHT = 14;
/** A row holds a name and its diameter (two lines) or, on a phone, a number (one line). */
const ROW_HEIGHT = { named: 2 * LINE_HEIGHT + 4, numbered: LINE_HEIGHT + 4 } as const;
/** Total height of the strip: title, band and the rows of names. */
export const stripTotalHeight = (compact: boolean): number =>
  STRIP_TITLE_HEIGHT +
  STRIP_HEIGHT +
  LABELS_GAP +
  STRIP_LABEL_ROWS * (compact ? ROW_HEIGHT.numbered : ROW_HEIGHT.named);
const FILL_OPACITY = 0.3;
const PLATE_SHARE = 0.5;
const PLATE_DASH = '4 3';
const LEADER_GAP = 2;
const TITLE = 'Tramos: alto proporcional a su diámetro $D$';
/** On a phone the title starts at the drawing's edge, as SvgPlot's compact y title. */
const COMPACT_TITLE_X = 2;

/** The width a label takes: its widest line. */
export const labelWidth = (label: StripLabel): number =>
  Math.max(...label.lines.map((line) => textWidth(line, LABEL_FONT_SIZE)));

interface SectionStripProps {
  sections: readonly StripSection[];
  placement: StripPlacement;
  x: Scale;
  /** Top of the strip (viewBox px). */
  top: number;
  compact: boolean;
}

const visible = (section: StripSection, x: Scale) =>
  section.x1 > x.domain.min && section.x0 < x.domain.max;

export default function SectionStrip({
  sections,
  placement,
  x,
  top,
  compact,
}: SectionStripProps): JSX.Element {
  const shown = sections.filter((section) => visible(section, x));
  const widest = Math.max(
    ...shown.filter((section) => section.kind !== 'placa-fria').map((section) => section.diameter),
  );
  const middle = top + STRIP_TITLE_HEIGHT + STRIP_HEIGHT / 2;
  const heightOf = (section: StripSection) =>
    section.kind === 'placa-fria'
      ? STRIP_HEIGHT * PLATE_SHARE
      : (section.diameter / widest) * STRIP_HEIGHT;
  const labelsTop = top + STRIP_TITLE_HEIGHT + STRIP_HEIGHT + LABELS_GAP;
  const sectionAt = (px: number) =>
    shown.find((section) => x.toPx(section.x0) <= px && px <= x.toPx(section.x1));
  return (
    <g data-section-strip="">
      <MathText
        source={TITLE}
        x={compact ? COMPACT_TITLE_X : x.range[0]}
        y={top + LABEL_FONT_SIZE}
        fontSize={LABEL_FONT_SIZE}
        fill={TICK_COLOR}
      />
      {shown.map((section) => {
        const left = x.toPx(Math.max(section.x0, x.domain.min));
        const right = x.toPx(Math.min(section.x1, x.domain.max));
        const height = heightOf(section);
        const isPlate = section.kind === 'placa-fria';
        const color = isPlate ? TEXT_COLOR : SIDE_COLORS[section.side];
        return (
          <rect
            key={section.id}
            data-section={section.id}
            x={left}
            y={middle - height / 2}
            width={right - left}
            height={height}
            fill={isPlate ? 'none' : color}
            fillOpacity={isPlate ? undefined : FILL_OPACITY}
            stroke={color}
            strokeWidth={1}
            strokeDasharray={isPlate ? PLATE_DASH : undefined}
          />
        );
      })}
      {placement.placed.map((label) => {
        const under = sectionAt(label.anchor);
        const from = middle + (under ? heightOf(under) / 2 : 0) + LEADER_GAP;
        const rowHeight = placement.isNumbered ? ROW_HEIGHT.numbered : ROW_HEIGHT.named;
        const rowTop = labelsTop + label.row * rowHeight;
        return (
          <g key={label.id} data-strip-label={label.id}>
            <line
              x1={label.anchor}
              x2={label.anchor}
              y1={from}
              y2={rowTop}
              stroke={TICK_COLOR}
              strokeWidth={1}
            />
            {label.lines.map((line, i) => (
              <MathText
                key={line}
                source={line}
                x={label.centre}
                y={rowTop + LINE_HEIGHT * (i + 1) - 2}
                fontSize={LABEL_FONT_SIZE}
                fill={TEXT_COLOR}
                anchor="middle"
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/** Under the figure, when the strip draws numbers: each number with its section's name. */
export function StripKey({ placement }: { placement: StripPlacement }): JSX.Element | null {
  if (!placement.isNumbered) return null;
  return (
    <ol
      aria-label="Tramos de la franja"
      className="m-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm"
    >
      {placement.labels.map((label, i) => (
        <li key={label.id} className="m-0">
          <span className="font-medium tabular-nums">{i + 1}</span>{' '}
          <InlineMath text={label.lines[0]} />
          {label.lines[1] ? (
            <>
              , <Unbroken text={label.lines[1]} />
            </>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
