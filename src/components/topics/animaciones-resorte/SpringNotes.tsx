import type { JSX } from 'react';
import InlineMath from '../../lab/InlineMath';
import { comparisonText, jumpText, settlingText } from './springLabText';
import type { SpringRun } from './springScene';

const SPRING_NOTE =
  'Las dos tarjetas recorren lo mismo, de 100 px a 1 000 px. Arriba, el resorte de la (10.6), con el color de su régimen, como en las figuras 10.1 a 10.4.';
const CURVE_NOTE =
  'Abajo, la curva ease-in-out de duración fija, que arranca otra vez desde el reposo en cada interrupción.';
const TARGET_NOTE = 'El contorno tenue marca el destino de ahora.';
const BAND_NOTE = 'La franja es la banda de ±2 % del recorrido en la que se mide $t_s$.';

function Row({ term, testId, children }: { term: string; testId: string; children: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border pb-2">
      <dt className="text-sm text-fg-muted">
        <InlineMath text={term} />
      </dt>
      <dd data-testid={testId} className="m-0 text-sm tabular-nums">
        <InlineMath text={children} />
      </dd>
    </div>
  );
}

export interface SpringNotesProps {
  run: SpringRun;
  showComparison: boolean;
  showBand: boolean;
}

/**
 * What reads Tema 10's canvas, with no controls: what each mark of the drawing is, then the run in
 * words, where a number cannot say it: when the spring settles («nunca» without damping), how long
 * the curve lasts and why, and the velocities at the last press.
 */
export default function SpringNotes({
  run,
  showComparison,
  showBand,
}: SpringNotesProps): JSX.Element {
  const drawing = [
    SPRING_NOTE,
    ...(showComparison ? [CURVE_NOTE] : []),
    TARGET_NOTE,
    ...(showBand ? [BAND_NOTE] : []),
  ].join(' ');
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-fg-muted">
        <InlineMath text={drawing} />
      </p>
      <dl data-testid="spring-summary" className="m-0 flex flex-col gap-2">
        <Row term="Asentamiento al 2 %, $t_s$" testId="summary-settling">
          {settlingText(run)}
        </Row>
        {showComparison ? (
          <Row term="Curva de duración fija" testId="summary-curve">
            {comparisonText(run)}
          </Row>
        ) : null}
        <Row term="Última interrupción" testId="summary-jump">
          {jumpText(run)}
        </Row>
      </dl>
    </div>
  );
}
