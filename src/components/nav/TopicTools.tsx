import { useEffect, useRef, useState } from 'react';
import { copyText } from '../../lib/clipboard';
import { readScriptText } from '../../lib/scriptText';
import ToolIcon from './ToolIcon';

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
const COPY_VERB = 'Copiar';
const ICON = 'size-4';
/** The copy icon turns into an accent check mark while the button says "Copiado". */
const CHECK_ICON = 'size-4 text-accent';
/** What each copy button copies; the verb is shown on wide screens and always spoken. */
const TOOL_OBJECTS: Record<Tool, string> = { url: 'URL', markdown: 'Markdown' };
/** Ghost buttons: no frame, a soft fill on hover; taller where the pointer is a finger. */
const BUTTON =
  'inline-flex h-8 items-center gap-1.5 rounded-base px-2 text-sm text-fg-muted no-underline transition-colors hover:bg-bg-elevated hover:text-fg pointer-coarse:h-10';

/** Each state is an icon and a label; both states share one grid cell. */
const STATE = 'col-start-1 row-start-1 inline-flex items-center gap-1.5';

/**
 * The idle and "Copiado" states overlap in one grid cell, so the button keeps its width while it
 * confirms and the shown state stays centred (left-aligned on a phone, so the row's first icon
 * lines up with the facts above); the hidden one is also aria-hidden, so the button's
 * name is only the visible label. On a phone the verb is visually hidden (the copy icon carries
 * it) so the three tools fit on one row.
 */
function CopyFace({ object, isCopied }: { object: string; isCopied: boolean }) {
  return (
    <span className="grid justify-items-center max-sm:justify-items-start">
      <span
        data-visible={!isCopied}
        aria-hidden={isCopied}
        className={`${STATE} ${isCopied ? 'invisible' : ''}`}
      >
        <ToolIcon name="copy" className={ICON} />
        <span>
          <span className="max-sm:sr-only">{COPY_VERB}</span> {object}
        </span>
      </span>
      <span
        data-visible={isCopied}
        aria-hidden={!isCopied}
        className={`${STATE} ${isCopied ? '' : 'invisible'}`}
      >
        <ToolIcon name="check" className={CHECK_ICON} />
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
  const isFailureShown = outcome !== null && !outcome.isCopied;

  return (
    <div data-testid="topic-tools" className="flex flex-wrap items-center gap-1 max-sm:gap-3">
      {(Object.keys(TOOL_OBJECTS) as Tool[]).map((tool) => {
        const isCopied = outcome?.tool === tool && outcome.isCopied;
        return (
          <button key={tool} type="button" className={BUTTON} onClick={() => void copy(tool)}>
            <CopyFace object={TOOL_OBJECTS[tool]} isCopied={isCopied} />
          </button>
        );
      })}
      <a href={githubUrl} className={BUTTON}>
        <ToolIcon name="github" className={ICON} />
        <span>
          <span className="sr-only">Abrir en</span> GitHub
        </span>
        <ToolIcon name="external" className="size-3 opacity-70" />
      </a>
      {/*
        The button already shows "Copiado"; only a failure needs visible text, on its own line.
        Otherwise the status is sr-only: still announced, but out of the flex flow.
      */}
      <p
        role="status"
        aria-live="polite"
        className={isFailureShown ? 'basis-full px-2 text-sm text-fg-muted' : 'sr-only'}
      >
        {status}
      </p>
    </div>
  );
}
