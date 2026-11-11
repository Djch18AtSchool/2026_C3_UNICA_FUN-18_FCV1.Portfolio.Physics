import type { JSX } from 'react';
import { mathAriaLabel } from '../../lib/inlineMath';
import InlineMath from './InlineMath';
import { withStableCallbacks } from './withStableCallbacks';

/** Visible focus for a control whose native input is visually hidden behind a styled sibling. */
const PEER_FOCUS =
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent';

/**
 * A 24 × 40 track and a square 16 px thumb 4 px from the track's outer edge on every side it
 * touches, off and on (it travels 16 px). The thumb sits inside the 1 px border, so its offset is
 * that gap less the border; square, as the track's 4 px radius less the 4 px gap leaves none.
 */
const SWITCH_TRACK = `relative h-6 w-10 shrink-0 rounded-base border border-border bg-bg transition-colors after:absolute after:top-[calc(var(--space-1)-var(--border-thin))] after:left-[calc(var(--space-1)-var(--border-thin))] after:size-4 after:rounded-none after:bg-fg-muted after:transition-transform peer-checked:border-accent peer-checked:bg-accent peer-checked:after:translate-x-4 peer-checked:after:bg-accent-fg ${PEER_FOCUS}`;

const SELECT =
  'min-h-10 max-w-full min-w-0 appearance-none rounded-base border border-border bg-bg-elevated pr-8 pl-3 text-sm text-fg';

/**
 * Sits 12 px from the right edge (as the text from the left), vertically centred; the select
 * reserves it and 4 px before it with pr-8.
 */
const SELECT_CHEVRON =
  'pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted';

export interface SwitchFieldProps {
  id: string;
  /** Plain text, with KaTeX inline between `$…$` (InlineMath). */
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
}

/** A checkbox exposed as role="switch", drawn as a track with a square thumb. */
function SwitchFieldBase({ id, label, checked, onChange }: SwitchFieldProps): JSX.Element {
  return (
    <label htmlFor={id} className="flex min-h-10 cursor-pointer items-center justify-between gap-3">
      <span className="text-sm font-medium">
        <InlineMath text={label} />
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-label={mathAriaLabel(label)}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span aria-hidden="true" className={SWITCH_TRACK} />
    </label>
  );
}

/** SwitchFieldBase memoized with stable callbacks: a playing lab's 10 Hz renders never reach it. */
export const SwitchField = withStableCallbacks(SwitchFieldBase);

export interface SelectOption {
  value: string;
  label: string;
  /** A disabled option shows a state that cannot be chosen (LabPresets' «Personalizado»). */
  disabled?: boolean;
}

/** Options under a heading of their own: a native <optgroup>. */
export interface SelectOptionGroup {
  label: string;
  options: readonly SelectOption[];
}

export interface SelectFieldProps {
  id: string;
  /** Plain text, with KaTeX inline between `$…$`. The option labels are plain text: a native <option> takes no markup. */
  label: string;
  value: string;
  /** Options and groups of options, in the order the list shows them. */
  options: readonly (SelectOption | SelectOptionGroup)[];
  onChange(value: string): void;
  /**
   * The label above the select, as every choice of a lab's levels shows it (ChoiceField); by
   * default beside it, as in the settings drawer, wrapping under it when there is no room.
   */
  stacked?: boolean;
}

const SELECT_ROW = 'flex flex-wrap items-center justify-between gap-x-3 gap-y-2';
const SELECT_STACK = 'flex flex-col items-start gap-2';

const isGroup = (entry: SelectOption | SelectOptionGroup): entry is SelectOptionGroup =>
  'options' in entry;

const renderOption = (option: SelectOption) => (
  <option key={option.value} value={option.value} disabled={option.disabled}>
    {option.label}
  </option>
);

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  stacked = false,
}: SelectFieldProps): JSX.Element {
  return (
    <div className={stacked ? SELECT_STACK : SELECT_ROW}>
      <label htmlFor={id} className="text-sm font-medium">
        <InlineMath text={label} />
      </label>
      <div className="relative max-w-full min-w-0">
        <select
          id={id}
          value={value}
          aria-label={mathAriaLabel(label)}
          onChange={(event) => onChange(event.target.value)}
          className={SELECT}
        >
          {options.map((entry) =>
            isGroup(entry) ? (
              <optgroup key={`group:${entry.label}`} label={entry.label}>
                {entry.options.map(renderOption)}
              </optgroup>
            ) : (
              renderOption(entry)
            ),
          )}
        </select>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={SELECT_CHEVRON}
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </div>
    </div>
  );
}

export interface SegmentedFieldProps<T extends string | number> {
  id: string;
  label: string;
  value: T;
  options: readonly T[];
  onChange(value: T): void;
}

/** Native radios sharing a name (arrow keys move the choice), drawn as one segmented control. */
function SegmentedFieldBase<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
}: SegmentedFieldProps<T>): JSX.Element {
  const labelId = `${id}-label`;
  const spokenLabel = mathAriaLabel(label);
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={labelId} className="text-sm font-medium">
        <InlineMath text={label} />
      </span>
      <div
        role="radiogroup"
        aria-labelledby={spokenLabel ? undefined : labelId}
        aria-label={spokenLabel}
        className="flex gap-1 rounded-base border border-border p-1"
      >
        {options.map((option) => (
          <label key={option} className="flex">
            <input
              type="radio"
              name={id}
              value={option}
              checked={option === value}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <span
              className={`flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-base border border-transparent px-2 font-mono text-sm tabular-nums text-fg-muted transition-colors hover:text-fg peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-fg ${PEER_FOCUS}`}
            >
              {option}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** SegmentedFieldBase memoized with stable callbacks; the cast keeps its generic option type. */
export const SegmentedField = withStableCallbacks(SegmentedFieldBase) as typeof SegmentedFieldBase;
