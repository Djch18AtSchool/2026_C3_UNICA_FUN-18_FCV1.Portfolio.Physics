import type { JSX } from 'react';
import { LINE_WIDTH } from '../../charts/chartTheme';
import InlineMath from '../../lab/InlineMath';
import { FLOW_COLORS } from './regenScene';

const KEY_WIDTH = 26;
const KEY_HEIGHT = 12;
/** The arrowhead's length along the key, and the margin that keeps it inside. */
const HEAD_LENGTH = 8;
const KEY_MARGIN = 1;

/** A flow's key: a thick line ending in an arrowhead, as the power flow draws it. */
function LegendKey({ color }: { color: string }): JSX.Element {
  const mid = KEY_HEIGHT / 2;
  return (
    <svg width={KEY_WIDTH} height={KEY_HEIGHT} aria-hidden="true" className="shrink-0">
      <line
        x1={KEY_MARGIN}
        y1={mid}
        x2={KEY_WIDTH - HEAD_LENGTH}
        y2={mid}
        stroke={color}
        strokeWidth={LINE_WIDTH + 2}
      />
      <polygon
        points={`${KEY_WIDTH - KEY_MARGIN},${mid} ${KEY_WIDTH - HEAD_LENGTH - 1},${KEY_MARGIN} ${KEY_WIDTH - HEAD_LENGTH - 1},${KEY_HEIGHT - KEY_MARGIN}`}
        fill={color}
      />
    </svg>
  );
}

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
 * colors, how its widths and rings read, and how the braking bar splits. Static: nothing here
 * changes with the cycle or the clock.
 */
export default function RegenNotes(): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <ul
        aria-label="Leyenda del flujo de potencia"
        className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm"
      >
        {LEGEND.map(({ color, text }) => (
          <li key={text} className="m-0 flex items-center gap-2">
            <LegendKey color={color} />
            {text}
          </li>
        ))}
      </ul>
      <p className="m-0 text-sm text-fg-muted">
        <InlineMath text={SCALE_NOTE} />
      </p>
      <p className="m-0 text-sm text-fg-muted">{BRAKE_BAR_NOTE}</p>
    </div>
  );
}
