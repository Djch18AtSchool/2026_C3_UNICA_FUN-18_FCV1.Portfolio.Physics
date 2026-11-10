/**
 * The key of a legend in a lab's canvas notes: a swatch drawn like the mark it names (an arrow, a
 * line, a dot), and a legend item that puts it before its text. Usage:
 *
 *   <ul aria-label="Leyenda del mapa" className={LEGEND_LIST}>
 *     <LegendItem color={VELOCITY_COLOR}><InlineMath text="Velocidad $\vec v$" /></LegendItem>
 *     <LegendItem color={ROUTE_COLOR} shape="line">Ruta</LegendItem>
 *   </ul>
 */
import type { JSX, ReactNode } from 'react';
import { LINE_WIDTH } from '../charts/chartTheme';

/** The list around the items: wraps, 16 px between items, 4 px between lines. */
export const LEGEND_LIST = 'm-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm';

const KEY_WIDTH = 24;
const KEY_HEIGHT = 12;
/** Room at both ends, so the round caps and the tip stay inside the swatch. */
const KEY_INSET = 1;
const HEAD_LENGTH = 8;
const DOT_RADIUS = 4;
/** A power flow is drawn thicker than a vector (Tema 6): its key too, with a wider head. */
const WEIGHT = {
  normal: { stroke: LINE_WIDTH, headHalf: 4 },
  thick: { stroke: LINE_WIDTH + 2, headHalf: 5 },
} as const;
const KEY_DASH = '6 3';

export interface LegendKeyProps {
  color: string;
  /** An arrow (a vector, default), a line without head (a path) or a dot (a body). */
  shape?: 'arrow' | 'line' | 'dot';
  dashed?: boolean;
  weight?: keyof typeof WEIGHT;
}

export function LegendKey({
  color,
  shape = 'arrow',
  dashed = false,
  weight = 'normal',
}: LegendKeyProps): JSX.Element {
  const mid = KEY_HEIGHT / 2;
  const tip = KEY_WIDTH - KEY_INSET;
  const base = tip - HEAD_LENGTH;
  const { stroke, headHalf } = WEIGHT[weight];
  return (
    <svg width={KEY_WIDTH} height={KEY_HEIGHT} aria-hidden="true" className="shrink-0">
      {shape === 'dot' ? (
        <circle cx={KEY_WIDTH / 2} cy={mid} r={DOT_RADIUS} fill={color} />
      ) : (
        <line
          x1={KEY_INSET}
          y1={mid}
          x2={shape === 'arrow' ? base : tip}
          y2={mid}
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={dashed ? KEY_DASH : undefined}
        />
      )}
      {shape === 'arrow' ? (
        <polygon
          points={`${tip},${mid} ${base},${mid - headHalf} ${base},${mid + headHalf}`}
          fill={color}
        />
      ) : null}
    </svg>
  );
}

export interface LegendItemProps extends LegendKeyProps {
  children: ReactNode;
}

/** One entry of a legend: its key, then its text. */
export function LegendItem({ children, ...key }: LegendItemProps): JSX.Element {
  return (
    <li className="m-0 flex items-center gap-2">
      <LegendKey {...key} />
      <span>{children}</span>
    </li>
  );
}
