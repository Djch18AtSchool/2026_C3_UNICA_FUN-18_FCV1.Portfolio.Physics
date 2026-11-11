import { formatNumber } from '../../lib/format';
import InlineMath from '../lab/InlineMath';
import { useGlobalSettings } from '../lab/useGlobalSettings';

/** A row (label and value side by side) or a cell of the tiered lab panel's two narrow columns. */
export type ReadoutLayout = 'row' | 'cell';

export interface ReadoutProps {
  /** Plain text, with KaTeX inline between `$…$` (InlineMath). */
  label: string;
  value: number;
  unit: string;
  precision?: number;
  /** 'row' by default; 'cell' stacks the label over the value. */
  layout?: ReadoutLayout;
}

const LAYOUT_CLASS: Readonly<Record<ReadoutLayout, string>> = {
  row: 'flex items-baseline justify-between gap-3 border-b border-border pb-2',
  // justify-between: in a row of the grid the values line up even when one label wraps.
  cell: 'flex min-w-0 flex-col justify-between gap-1 border-b border-border pb-2',
};

/** A labelled value: the label is always the first child and the value the last (test kits). */
export default function Readout({ label, value, unit, precision, layout = 'row' }: ReadoutProps) {
  const { decimals } = useGlobalSettings();
  const resolvedPrecision = precision ?? decimals;
  return (
    <div data-readout="" data-layout={layout} className={LAYOUT_CLASS[layout]}>
      <span className="text-sm text-fg-muted">
        <InlineMath text={label} />
      </span>
      <span className="font-mono text-base font-medium tabular-nums">
        {formatNumber(value, { precision: resolvedPrecision, unit })}
      </span>
    </div>
  );
}
