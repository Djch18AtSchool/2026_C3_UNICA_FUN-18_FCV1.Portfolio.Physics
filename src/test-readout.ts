/**
 * The readout rows of a LabShell, for the lab tests: a row is found by its label exactly as its
 * author wrote it (each KaTeX formula back to `$tex$`, via mathSourceText), so a label with
 * notation is matched whole, not by a fragment.
 */
import { mathSourceText } from './test-inline-math';

/** The value text of the readout row labelled `label`, with plain spaces. */
export function readout(label: string): string {
  const row = [...document.querySelectorAll<HTMLElement>('[data-readout]')].find(
    (candidate) => mathSourceText(candidate.firstElementChild) === label,
  );
  if (!row) throw new Error(`No readout labelled «${label}»`);
  return (row.lastElementChild?.textContent ?? '').replace(/\s/g, ' ');
}
