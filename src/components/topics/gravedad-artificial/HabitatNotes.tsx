/**
 * What reads the habitat laboratory's drawing without being a control, in the lab's canvas notes
 * (LabShell): the legend of the vectors and of the turn, and what the apparent gravity is.
 */
import type { JSX } from 'react';
import InlineMath from '../../lab/InlineMath';
import { LEGEND_LIST, LegendItem } from '../../lab/LegendKey';
import { AC_COLOR, GAP_COLOR, OMEGA_COLOR } from './habitatColors';

export interface HabitatNotesProps {
  showVectors: boolean;
}

/** The legend and the note, under the drawing; the vectors' entries go with the vectors. */
export default function HabitatNotes({ showVectors }: HabitatNotesProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <ul aria-label="Leyenda del hábitat" className={LEGEND_LIST}>
        {showVectors ? (
          <>
            <LegendItem color={AC_COLOR}>
              <InlineMath text="Aceleración centrípeta $a_c$, hacia el eje" />
            </LegendItem>
            <LegendItem color={GAP_COLOR} dashed>
              <InlineMath text="Gravedad aparente $g_\text{ap} = -a_c$, hacia afuera" />
            </LegendItem>
          </>
        ) : null}
        <LegendItem color={OMEGA_COLOR}>
          <InlineMath text="Sentido de giro $\omega$" />
        </LegendItem>
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
