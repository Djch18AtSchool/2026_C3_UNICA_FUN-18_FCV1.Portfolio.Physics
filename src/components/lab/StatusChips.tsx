/**
 * A row of read-only status chips under a labelled lead-in, for a state the lab reports rather
 * than a setting the reader changes (Tema 7's engine: «Motor: Δt = 1/60 s · 4 subpasos · …»).
 * Settings that the reader changes get chips next to the gear instead (settingChips.ts). Usage:
 *
 *   <StatusChips label="Motor" items={[{ id: 'dt', text: '$\\Delta t$ = 1/60 s' }, …]} />
 */
import type { JSX } from 'react';
import { inlineMathToSpeech } from '../../lib/inlineMath';
import InlineMath from './InlineMath';

export interface StatusChip {
  /** Stable React key. */
  id: string;
  /** Plain text, with KaTeX inline between `$…$`. */
  text: string;
}

export interface StatusChipsProps {
  /** Shown before the chips and naming the list (in words when it holds `$…$`). */
  label: string;
  items: readonly StatusChip[];
  testId?: string;
}

const CHIP =
  'inline-flex min-h-8 items-center rounded-base border border-border bg-bg px-2 font-mono text-xs tabular-nums';

export default function StatusChips({
  label,
  items,
  testId,
}: StatusChipsProps): JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <div data-testid={testId} className="flex flex-wrap items-center gap-2">
      <span aria-hidden="true" className="text-xs font-medium text-fg-muted">
        <InlineMath text={label} />
      </span>
      <ul aria-label={inlineMathToSpeech(label)} className="m-0 flex list-none flex-wrap gap-2 p-0">
        {items.map((item) => (
          <li key={item.id} className={CHIP}>
            <InlineMath text={item.text} />
          </li>
        ))}
      </ul>
    </div>
  );
}
