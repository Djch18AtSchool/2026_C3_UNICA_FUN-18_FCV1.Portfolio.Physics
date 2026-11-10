/**
 * What reads the habitat laboratory's drawing without being a control, in the lab's canvas notes
 * (LabShell): the legend of the vectors and of the turn, and what the apparent gravity is.
 */
import type { JSX } from 'react';
import { LINE_WIDTH } from '../../charts/chartTheme';
import InlineMath from '../../lab/InlineMath';
import { AC_COLOR, GAP_COLOR, OMEGA_COLOR } from './HabitatScene';

const KEY_WIDTH = 26;
const KEY_HEIGHT = 12;

export interface HabitatNotesProps {
  showVectors: boolean;
}

function LegendKey({ color, dashed }: { color: string; dashed?: boolean }): JSX.Element {
  const mid = KEY_HEIGHT / 2;
  return (
    <svg width={KEY_WIDTH} height={KEY_HEIGHT} aria-hidden="true" className="shrink-0">
      <line
        x1="1"
        y1={mid}
        x2={KEY_WIDTH - 8}
        y2={mid}
        stroke={color}
        strokeWidth={LINE_WIDTH}
        strokeDasharray={dashed ? '6 3' : undefined}
      />
      <polygon
        points={`${KEY_WIDTH - 1},${mid} ${KEY_WIDTH - 9},2 ${KEY_WIDTH - 9},10`}
        fill={color}
      />
    </svg>
  );
}

/** The legend and the note, under the drawing; the vectors' entries go with the vectors. */
export default function HabitatNotes({ showVectors }: HabitatNotesProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <ul
        aria-label="Leyenda del hábitat"
        className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-sm"
      >
        {showVectors ? (
          <>
            <li className="m-0 flex items-center gap-2">
              <LegendKey color={AC_COLOR} />
              <span>
                <InlineMath text="Aceleración centrípeta $a_c$, hacia el eje" />
              </span>
            </li>
            <li className="m-0 flex items-center gap-2">
              <LegendKey color={GAP_COLOR} dashed />
              <span>
                <InlineMath text="Gravedad aparente $g_\text{ap} = -a_c$, hacia afuera" />
              </span>
            </li>
          </>
        ) : null}
        <li className="m-0 flex items-center gap-2">
          <LegendKey color={OMEGA_COLOR} />
          Sentido de giro ω
        </li>
      </ul>
      {showVectors ? (
        <p className="m-0 text-sm text-fg-muted">
          <InlineMath
            text={
              '$g_\\text{ap}$ es lo que la persona siente en el marco del anillo, que gira: ninguna fuerza tira de ella hacia afuera; es el piso el que la empuja hacia el eje. Flechas a escala hasta 1,5 g; con doble trazo, más largas que lo dibujado.'
            }
          />
        </p>
      ) : null}
    </div>
  );
}
