import type { JSX } from 'react';
import {
  DASH_PATTERN,
  LINE_WIDTH,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
} from '../../charts/chartTheme';
import MathText from '../../lab/MathText';
import { formatNumber } from '../../../lib/format';
import type { PipeKind } from '../../../lib/physics/pipes';
import { EVEN_COLOR, ODD_COLOR, pipeDrawing, type ModeCurve } from './soundPlots';

/** A phone's column: the labels are 12 and 13 px there, and grow with the drawing up to 448 px. */
const VIEW_WIDTH = 328;
const TEXT_SIZE = 13;
const SMALL_SIZE = 12;
const LEFT = 8;
/** Pixels per metre, the same for both pipes: the open one is 0,548 m = 186 px long. */
const PX_PER_M = 340;
const LABEL_X = 206;
const ROW = 40;
const TUBE_HALF = 14;
/** Half the drawn swing of the air inside the tube, px. */
const SWING = 11;
const CLOSED_END_WIDTH = 4;
const PANEL_GAP = 28;
const TITLE_DROP = 18;
const FIRST_ROW_DROP = 28;
const SCALE_BAR_M = 0.1;
const CM_PER_M = 100;
const LEGEND_KEY = 20;
const LEGEND_GAP = 6;
const LEGEND_SECOND = 112;

const PANELS: readonly { kind: PipeKind; title: string }[] = [
  { kind: 'abierto', title: 'Abierto-abierto (flauta)' },
  { kind: 'cerrado', title: 'Cerrado-abierto (clarinete)' },
];

const metres = (value: number) => formatNumber(value, { precision: 2, unit: 'm' });
const hertz = (value: number) => formatNumber(value, { precision: 0, unit: 'Hz' });

/** «1, 2 y 3»: a short list as Spanish says it. */
const spokenList = (items: readonly (number | string)[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;

/** What a screen reader hears: both pipes, their lengths and modes, read from pipeDrawing(). */
export function pipeModesDescription(): string {
  const open = pipeDrawing('abierto');
  const closed = pipeDrawing('cerrado');
  const modes = ({ modes: list }: ReturnType<typeof pipeDrawing>) =>
    `n = ${spokenList(list.map(({ n }) => n))}, a ${spokenList(list.map(({ frequency }) => formatNumber(frequency, { precision: 0 })))} Hz`;
  return `Tres primeros modos de dos tubos ideales con fundamental de ${hertz(open.modes[0].frequency)}, a la misma escala. Abierto en los dos extremos, de ${metres(open.length)}: ${modes(open)}, con vientres de desplazamiento en ambos extremos. Cerrado en un extremo, de ${metres(closed.length)}: solo ${modes(closed)}, con un nodo en el extremo cerrado y un vientre en el abierto.`;
}

/** The two mirrored curves ±(displacement amplitude) of one mode inside its tube. */
function ModeRow({ mode, centre }: { mode: ModeCurve; centre: number }): JSX.Element {
  const path = (sign: number) =>
    mode.points
      .map(
        ({ x, y }, i) =>
          `${i === 0 ? 'M' : 'L'}${(LEFT + x * PX_PER_M).toFixed(2)} ${(centre - sign * SWING * y).toFixed(2)}`,
      )
      .join(' ');
  const color = mode.isOdd ? ODD_COLOR : EVEN_COLOR;
  return (
    <g data-mode={mode.n} data-parity={mode.isOdd ? 'impar' : 'par'}>
      {[1, -1].map((sign) => (
        <path
          key={sign}
          d={path(sign)}
          fill="none"
          stroke={color}
          strokeWidth={LINE_WIDTH}
          strokeDasharray={mode.isOdd ? undefined : DASH_PATTERN}
        />
      ))}
      <MathText
        source={`$n$ = ${mode.n} · ${hertz(mode.frequency)}`}
        x={LABEL_X}
        y={centre + SMALL_SIZE / 3}
        fontSize={SMALL_SIZE}
        fill={TEXT_COLOR}
      />
    </g>
  );
}

/** One pipe drawn three times, once per mode, under its title; returns where it ends. */
function Panel({ kind, title, top }: { kind: PipeKind; title: string; top: number }) {
  const drawing = pipeDrawing(kind);
  const length = drawing.length * PX_PER_M;
  return (
    <g data-pipe={kind}>
      <MathText
        source={`${title}: $L$ = ${metres(drawing.length)}`}
        x={LEFT}
        y={top + TITLE_DROP}
        fontSize={TEXT_SIZE}
        fill={TEXT_COLOR}
        fontWeight={600}
      />
      {drawing.modes.map((mode, index) => {
        const centre = top + TITLE_DROP + FIRST_ROW_DROP + index * ROW;
        return (
          <g key={mode.n}>
            <rect
              x={LEFT}
              y={centre - TUBE_HALF}
              width={length}
              height={2 * TUBE_HALF}
              fill="none"
              stroke={TICK_COLOR}
            />
            {kind === 'cerrado' ? (
              <line
                data-closed-end=""
                x1={LEFT}
                x2={LEFT}
                y1={centre - TUBE_HALF}
                y2={centre + TUBE_HALF}
                stroke={TEXT_COLOR}
                strokeWidth={CLOSED_END_WIDTH}
              />
            ) : null}
            <ModeRow mode={mode} centre={centre} />
          </g>
        );
      })}
    </g>
  );
}

const panelHeight = TITLE_DROP + FIRST_ROW_DROP + 2 * ROW + TUBE_HALF;

/** A 10 cm bar, so the two lengths read to scale, and the key of the two line styles. */
function Footer({ top }: { top: number }): JSX.Element {
  const keyY = top + 2 * TEXT_SIZE;
  const key = (x: number, color: string, dashed: boolean, text: string) => (
    <g>
      <line
        x1={x}
        x2={x + LEGEND_KEY}
        y1={keyY - SMALL_SIZE / 3}
        y2={keyY - SMALL_SIZE / 3}
        stroke={color}
        strokeWidth={LINE_WIDTH}
        strokeDasharray={dashed ? DASH_PATTERN : undefined}
      />
      <text x={x + LEGEND_KEY + LEGEND_GAP} y={keyY} fontSize={SMALL_SIZE} fill={TEXT_COLOR}>
        {text}
      </text>
    </g>
  );
  return (
    <g fontFamily={TICK_FONT_FAMILY}>
      <g data-scale-bar="" stroke={TEXT_COLOR} strokeWidth={1}>
        <line x1={LEFT} x2={LEFT + SCALE_BAR_M * PX_PER_M} y1={top} y2={top} />
        <line x1={LEFT} x2={LEFT} y1={top - 3} y2={top + 3} />
        <line
          x1={LEFT + SCALE_BAR_M * PX_PER_M}
          x2={LEFT + SCALE_BAR_M * PX_PER_M}
          y1={top - 3}
          y2={top + 3}
        />
      </g>
      <text
        x={LEFT + SCALE_BAR_M * PX_PER_M + LEGEND_GAP}
        y={top + SMALL_SIZE / 3}
        fontSize={SMALL_SIZE}
        fill={TICK_COLOR}
      >
        {`${SCALE_BAR_M * CM_PER_M} cm`}
      </text>
      {key(LEFT, ODD_COLOR, false, 'Modo impar')}
      {key(LEFT + LEGEND_SECOND, EVEN_COLOR, true, 'Modo par')}
    </g>
  );
}

/**
 * Paso 2's diagram: the first three modes of an ideal pipe open at both ends and of one closed at
 * one end, both with a 310 Hz fundamental and drawn to the same scale (the closed one is half as
 * long). The curves are the air's displacement amplitude: antinodes at open ends, a node at the
 * closed one. Odd modes are solid in one color, even ones dashed in another (the spectra's).
 */
export default function PipeModes(): JSX.Element {
  const secondTop = panelHeight + PANEL_GAP;
  const footerTop = secondTop + panelHeight + PANEL_GAP;
  const height = footerTop + 3 * TEXT_SIZE;
  return (
    <svg
      data-testid="pipe-modes"
      role="img"
      aria-label={pipeModesDescription()}
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      width="100%"
      className="mx-auto block h-auto max-w-md"
    >
      {PANELS.map((panel, index) => (
        <Panel key={panel.kind} {...panel} top={index === 0 ? 0 : secondTop} />
      ))}
      <Footer top={footerTop} />
    </svg>
  );
}
