/**
 * The help a tiered laboratory keeps out of the main flow (auditoría §12.1): «Cómo se usa»
 * (dragging, keys, how to read the playback) and «Qué deja fuera el modelo» (its assumptions), two
 * native disclosures, closed. Each string is one paragraph, with KaTeX inline between `$…$`.
 */
import type { JSX } from 'react';
import InlineMath from './InlineMath';

export const USAGE_TITLE = 'Cómo se usa';
export const LEFT_OUT_TITLE = 'Qué deja fuera el modelo';

export interface LabNotesContent {
  /** «Cómo se usa»: one paragraph per string, or per block between blank lines in one. */
  usage?: readonly string[];
  /** «Qué deja fuera el modelo»: one paragraph per string, or per block between blank lines. */
  leftOut?: readonly string[];
}

/** Hides the native marker (WebKit keeps it as a pseudo-element) for the drawn chevron. */
const SUMMARY =
  'flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden';

function Chevron(): JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5 shrink-0 text-fg-muted group-open:rotate-180 motion-safe:transition-transform"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function Disclosure({
  kind,
  title,
  paragraphs,
}: {
  kind: string;
  title: string;
  paragraphs: readonly string[];
}): JSX.Element {
  return (
    <details data-lab-note={kind} className="group border-t border-border">
      <summary className={SUMMARY}>
        {title}
        <Chevron />
      </summary>
      <div className="flex flex-col gap-2 pb-2 text-sm text-fg-muted">
        {paragraphs.map((text) => (
          <p key={text} className="m-0">
            <InlineMath text={text} />
          </p>
        ))}
      </div>
    </details>
  );
}

/** A blank line inside a string also ends a paragraph, so a long note can be written in one. */
const PARAGRAPH_BREAK = /\n\s*\n/;

const written = (paragraphs: readonly string[] = []) =>
  paragraphs
    .flatMap((text) => text.split(PARAGRAPH_BREAK))
    .map((text) => text.trim())
    .filter((text) => text !== '');

export default function LabNotes({ usage, leftOut }: LabNotesContent): JSX.Element | null {
  const usageText = written(usage);
  const leftOutText = written(leftOut);
  if (usageText.length === 0 && leftOutText.length === 0) return null;
  return (
    <div className="flex flex-col">
      {usageText.length > 0 ? (
        <Disclosure kind="usage" title={USAGE_TITLE} paragraphs={usageText} />
      ) : null}
      {leftOutText.length > 0 ? (
        <Disclosure kind="left-out" title={LEFT_OUT_TITLE} paragraphs={leftOutText} />
      ) : null}
    </div>
  );
}
