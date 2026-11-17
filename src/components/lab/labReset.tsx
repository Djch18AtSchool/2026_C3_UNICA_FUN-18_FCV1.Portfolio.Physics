/**
 * «Restablecer», at the end of the scenario's first row (Dylan 2026-11-16: the presets with
 * «Restablecer» and the preset's note under them). LabShell owns the action; when the scenario
 * holds LabPresets at its top, LabPresets carries the button at the end of its own row (before its
 * note, in the order of reading and of Tab), through this context; otherwise the shell puts it at
 * the end of the scenario (scenarioHasPresets).
 */
import { Children, createContext, Fragment, isValidElement, type JSX, type ReactNode } from 'react';

const RESET =
  'min-h-10 shrink-0 rounded-base border border-border px-3 text-sm text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';

/** The lab's reset, stable across renders, for LabPresets to carry; none outside a LabShell. */
export const LabResetContext = createContext<(() => void) | undefined>(undefined);

export function ResetButton({ onReset }: { onReset(): void }): JSX.Element {
  return (
    <button type="button" data-lab-reset="" onClick={onReset} className={RESET}>
      Restablecer
    </button>
  );
}

/**
 * Whether `component` stands at the top of the scenario (directly, or inside fragments): the
 * levels a lab writes as `<>…<LabPresets …/></>`. One wrapped in a component or an element of the
 * lab's own is not seen, and the shell keeps «Restablecer» at the scenario's end.
 */
export function scenarioHolds(scenario: ReactNode, component: unknown): boolean {
  return Children.toArray(scenario).some((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return false;
    if (child.type === component) return true;
    return child.type === Fragment && scenarioHolds(child.props.children, component);
  });
}
