import type { ReactNode } from 'react';
import InlineMath from '../lab/InlineMath';

export interface ChartFrameProps {
  /** Plain text, with KaTeX inline between `$…$` (InlineMath). */
  title: string;
  children: ReactNode;
  /** Plain text, with KaTeX inline between `$…$`. */
  footnote?: string;
  testId?: string;
}

export default function ChartFrame({ title, children, footnote, testId }: ChartFrameProps) {
  return (
    <figure
      data-testid={testId}
      className="m-0 rounded-base border border-border bg-bg-elevated p-4"
    >
      <figcaption className="mb-3 text-sm font-semibold">
        <InlineMath text={title} />
      </figcaption>
      {children}
      {footnote ? (
        <p data-testid="chart-footnote" className="mt-3 text-xs text-fg-muted">
          <InlineMath text={footnote} />
        </p>
      ) : null}
    </figure>
  );
}
