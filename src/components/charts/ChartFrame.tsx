import type { ReactNode } from 'react';

export interface ChartFrameProps {
  title: string;
  children: ReactNode;
  footnote?: string;
}

export default function ChartFrame({ title, children, footnote }: ChartFrameProps) {
  return (
    <figure className="m-0 rounded-base border border-border bg-bg-elevated p-4">
      <figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      {children}
      {footnote ? (
        <p data-testid="chart-footnote" className="mt-3 text-xs text-fg-muted">
          {footnote}
        </p>
      ) : null}
    </figure>
  );
}
