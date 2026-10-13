import type { JSX } from 'react';

/** Visible focus for a control whose native input is visually hidden behind a styled sibling. */
const PEER_FOCUS =
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent';

const SWITCH_TRACK = `relative h-6 w-10 shrink-0 rounded-base border border-border bg-bg transition-colors after:absolute after:top-[3px] after:left-[3px] after:size-4 after:rounded-[1px] after:bg-fg-muted after:transition-transform peer-checked:border-accent peer-checked:bg-accent peer-checked:after:translate-x-4 peer-checked:after:bg-accent-fg ${PEER_FOCUS}`;

const SELECT =
  'min-h-11 max-w-full min-w-0 appearance-none rounded-base border border-border bg-bg-elevated pr-9 pl-3 text-sm text-fg';

/**
 * Longest option label (characters) a select can have and still sit beside its label in the
 * 22 rem drawer ("Euler semi-implícito" does); a longer one stacks under it at full width.
 */
const INLINE_OPTION_MAX_CHARS = 24;

/** Sits 13 px from the right edge, vertically centred; the select reserves it with pr-9. */
const SELECT_CHEVRON =
  'pointer-events-none absolute top-1/2 right-[13px] size-4 -translate-y-1/2 text-fg-muted';

export interface SwitchFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
}

/** A checkbox exposed as role="switch", drawn as a track with a square thumb. */
export function SwitchField({ id, label, checked, onChange }: SwitchFieldProps): JSX.Element {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span aria-hidden="true" className={SWITCH_TRACK} />
    </label>
  );
}

export interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange(value: string): void;
}

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: SelectFieldProps): JSX.Element {
  const isStacked = options.some((option) => option.label.length > INLINE_OPTION_MAX_CHARS);
  return (
    <div
      className={
        isStacked
          ? 'flex flex-col gap-1.5'
          : 'flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5'
      }
    >
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className={isStacked ? 'relative w-full min-w-0' : 'relative max-w-full min-w-0'}>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={isStacked ? `${SELECT} w-full` : SELECT}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
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
export function SegmentedField<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
}: SegmentedFieldProps<T>): JSX.Element {
  const labelId = `${id}-label`;
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
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
              className={`flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-base border border-transparent px-2 font-mono text-sm tabular-nums text-fg-muted transition-colors hover:text-fg peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-fg ${PEER_FOCUS}`}
            >
              {option}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
