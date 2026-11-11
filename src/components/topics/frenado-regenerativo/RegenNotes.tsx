import type { JSX } from 'react';
import InlineMath from '../../lab/InlineMath';
import { LEGEND_LIST, LegendItem } from '../../lab/LegendKey';
import { DRIVE_CANVAS_NOTE } from './driveText';
import { FLOW_COLORS } from './regenScene';
import type { RegenView } from './regenStretch';

const LEGEND: readonly { color: string; text: string }[] = [
  { color: FLOW_COLORS.traction, text: 'Tracción: de la batería a las ruedas' },
  { color: FLOW_COLORS.regen, text: 'Regeneración: de las ruedas a la batería' },
  { color: FLOW_COLORS.friction, text: 'Calor de fricción en los frenos' },
];

const SCALE_NOTE =
  'El grosor es proporcional a |P|: 20 kW = 5 px. Al regenerar, la diferencia de grosor entre el enlace del motor y el de la batería son las pérdidas de conversión $(1 - \\eta)$. El aro verde en las ruedas indica que frena el motor y el naranja, que frenan las pastillas. Al traccionar, el modelo solo calcula la potencia en las ruedas: la batería entrega al menos eso $(\\ge)$.';
const BRAKE_BAR_NOTE =
  'La barra del frenado en las ruedas se reparte en lo que llega a la batería, las pérdidas de conversión y el calor de fricción: lo disipado es la suma de las dos últimas.';

/**
 * What reads the canvas, as the shell's canvas notes (no controls): the key to the power flow's
 * colors, how its widths and rings read, and how the braking bar splits; in «Conducir», which car
 * and which curve is whose. Nothing here changes with the cycle or the clock.
 */
export default function RegenNotes({ view = 'tramo' }: { view?: RegenView }): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <ul aria-label="Leyenda del flujo de potencia" className={LEGEND_LIST}>
        {LEGEND.map(({ color, text }) => (
          <LegendItem key={text} color={color} weight="thick">
            {text}
          </LegendItem>
        ))}
      </ul>
      <p className="m-0 text-sm text-fg-muted">
        <InlineMath text={SCALE_NOTE} />
      </p>
      <p className="m-0 text-sm text-fg-muted">{BRAKE_BAR_NOTE}</p>
      {view === 'conducir' ? (
        <p data-testid="drive-canvas-note" className="m-0 text-sm text-fg-muted">
          {DRIVE_CANVAS_NOTE}
        </p>
      ) : null}
    </div>
  );
}
