import { useEffect, useRef, useState } from 'react';
import { copyText } from '../../lib/clipboard';
import { readScriptText } from '../../lib/scriptText';

export interface TopicToolsProps {
  /** The topic's public address. */
  url: string;
  /** The topic's MDX file in the repository. */
  githubUrl: string;
  /** Id of the `<script type="text/plain">` that holds the topic's Markdown. */
  markdownElementId: string;
}

type Tool = 'url' | 'markdown';
type Outcome = { tool: Tool; isCopied: boolean };

/** How long a copy button says "Copiado" (spec §6). */
const CONFIRM_MS = 1000;
const COPIED_LABEL = 'Copiado';
const FAILED_MESSAGE = 'No se pudo copiar; selecciona el texto y cópialo a mano.';
const TOOL_LABELS: Record<Tool, string> = { url: 'Copiar URL', markdown: 'Copiar Markdown' };
/** The v1 bordered button, as the cover's "Ver repositorio". */
const BUTTON =
  'inline-flex h-9 items-center gap-2 rounded-base border border-border px-3 text-sm text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';

/**
 * Both labels share one grid cell, so the button keeps its width while it says "Copiado"; the
 * hidden one is also aria-hidden, so the button's name is only the visible label.
 */
function CopyLabel({ label, isCopied }: { label: string; isCopied: boolean }) {
  return (
    <span className="grid justify-items-center">
      <span
        aria-hidden={isCopied}
        className={`col-start-1 row-start-1 ${isCopied ? 'invisible' : ''}`}
      >
        {label}
      </span>
      <span
        aria-hidden={!isCopied}
        className={`col-start-1 row-start-1 ${isCopied ? '' : 'invisible'}`}
      >
        {COPIED_LABEL}
      </span>
    </span>
  );
}

export default function TopicTools({ url, githubUrl, markdownElementId }: TopicToolsProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function readMarkdown(): string | null {
    const embed = document.getElementById(markdownElementId);
    return embed?.textContent ? readScriptText(embed.textContent) : null;
  }

  async function copy(tool: Tool): Promise<void> {
    clearTimeout(timer.current);
    const text = tool === 'url' ? url : readMarkdown();
    const isCopied = text !== null && (await copyText(text));
    setOutcome({ tool, isCopied });
    // A failure stays on screen until the next attempt, long enough to read it.
    if (isCopied) timer.current = setTimeout(() => setOutcome(null), CONFIRM_MS);
  }

  const status = outcome ? (outcome.isCopied ? COPIED_LABEL : FAILED_MESSAGE) : '';

  return (
    <div data-testid="topic-tools" className="flex flex-wrap items-center gap-3">
      {(Object.keys(TOOL_LABELS) as Tool[]).map((tool) => (
        <button key={tool} type="button" className={BUTTON} onClick={() => void copy(tool)}>
          <CopyLabel
            label={TOOL_LABELS[tool]}
            isCopied={outcome?.tool === tool && outcome.isCopied}
          />
        </button>
      ))}
      {/* A link styled as its neighbours: no underline, so the row reads as one set of buttons. */}
      <a href={githubUrl} className={`${BUTTON} no-underline`}>
        Abrir en GitHub
      </a>
      {/* The button already shows "Copiado"; only a failure needs visible text. */}
      <p role="status" aria-live="polite" className="text-sm text-fg-muted">
        <span className={outcome?.isCopied ? 'sr-only' : ''}>{status}</span>
      </p>
    </div>
  );
}
