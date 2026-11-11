import type { JSX } from 'react';
import { withStableCallbacks } from './withStableCallbacks';

export interface ChoiceFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange(value: T): void;
}

/**
 * Native radios sharing a name (arrow keys move the choice) drawn as segments that wrap on phones,
 * each with its own faint border so an option wrapped to a second row still reads as one,
 * the label above: every choice in words of a lab's levels (Tema 7's and Tema 8's mode, Tema 8's
 * dump actuator, Tema 9's side of the pass). The drawer's short values use SegmentedField.
 */
function ChoiceField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: ChoiceFieldProps<T>): JSX.Element {
  const labelId = `${id}-label`;
  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex flex-wrap gap-1 self-start rounded-base border border-border p-1"
      >
        {options.map((option) => (
          <label key={option.value} className="flex">
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="flex min-h-9 cursor-pointer items-center rounded-base border border-border px-3 text-sm text-fg-muted transition-colors peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-fg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-fg-muted hover:text-fg">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Memoized with stable callbacks (the cast keeps the generic): the 10 Hz renders skip its radios. */
export default withStableCallbacks(ChoiceField) as typeof ChoiceField;
