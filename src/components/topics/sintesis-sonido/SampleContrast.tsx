import type { JSX } from 'react';
import InlineMath from '../../lab/InlineMath';
import { SAMPLE_CONTRAST } from './sampleTexts';

/**
 * The joint analysis under Tema 11's two recordings: what they share (the pitch), what changes
 * (which harmonics sound), where that shows (the half-wave symmetry) and what the spectrum leaves
 * out (the attack, and Wolfe's caveat). Static: it needs no hydration.
 */
export default function SampleContrast(): JSX.Element {
  return (
    <section
      data-testid="contraste-muestras"
      aria-labelledby="contraste-muestras-titulo"
      className="flex flex-col gap-3 rounded-base border border-border bg-bg-elevated p-4"
    >
      <h3 id="contraste-muestras-titulo" className="m-0 text-base font-semibold">
        Qué diferencia produce qué
      </h3>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {SAMPLE_CONTRAST.map(({ lead, text }) => (
          <li key={lead} className="m-0 text-sm">
            <span className="font-semibold">{lead}</span> <InlineMath text={text} />
          </li>
        ))}
      </ul>
    </section>
  );
}
