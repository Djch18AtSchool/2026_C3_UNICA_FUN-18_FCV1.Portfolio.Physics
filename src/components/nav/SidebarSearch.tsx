import { useEffect, useId, useState } from 'react';
import { filterIndex, type SearchEntry } from '../../lib/searchIndex';
import { topicUrl } from '../../lib/url';

interface SidebarSearchProps {
  /** Build-time index of every topic and the sections of the published ones. */
  index: SearchEntry[];
  /** Id of the normal topic list, hidden while a query shows results in its place. */
  listId: string;
}

const RESULT_LINK =
  'grid grid-cols-[1.5rem_minmax(0,1fr)] items-baseline gap-x-1 border-l-2 border-transparent py-1.5 pr-2 pl-1.5 leading-snug no-underline hover:bg-bg hover:text-fg';

/** Announced as the results change; visible only when nothing matches. */
function statusText(count: number): string {
  if (count === 0) return 'Sin resultados';
  return count === 1 ? '1 tema encontrado' : `${count} temas encontrados`;
}

/** Client-side filter over the index (spec §5): topic and section matches with their links. */
export default function SidebarSearch({ index, listId }: SidebarSearchProps) {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const hasQuery = query.trim() !== '';
  const results = hasQuery ? filterIndex(index, query) : [];

  useEffect(() => {
    document.getElementById(listId)?.toggleAttribute('hidden', hasQuery);
  }, [hasQuery, listId]);

  return (
    <div className="flex flex-col gap-2">
      <div role="search">
        <label htmlFor={inputId} className="sr-only">
          Buscar en el portafolio
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          placeholder="Buscar temas y secciones"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-base border border-border bg-bg px-3 py-1.5 text-sm text-fg placeholder:text-fg-muted"
        />
      </div>
      <p
        role="status"
        className={hasQuery && results.length === 0 ? 'px-2 text-fg-muted' : 'sr-only'}
      >
        {hasQuery && statusText(results.length)}
      </p>
      {results.length > 0 && (
        <ul aria-label="Resultados de la búsqueda" className="flex flex-col">
          {results.map(({ entry, headings }) => (
            <li key={entry.slug}>
              <a
                href={topicUrl(entry.slug)}
                className={`${RESULT_LINK} ${entry.status === 'publicado' ? 'text-fg' : 'text-fg-muted'}`}
              >
                <span className="text-right font-mono text-xs">{entry.number}</span>
                <span className="pl-1.5">
                  {entry.shortTitle}
                  {entry.status !== 'publicado' && <span className="sr-only"> (próximamente)</span>}
                </span>
              </a>
              {headings.length > 0 && (
                <ul className="mb-1 ml-[2.125rem] flex flex-col border-l border-border">
                  {headings.map((heading) => (
                    <li key={heading.anchor}>
                      <a
                        href={`${topicUrl(entry.slug)}#${heading.anchor}`}
                        className="-ml-px block border-l border-transparent py-1 pr-2 pl-3 leading-snug text-fg-muted no-underline hover:border-fg-muted hover:text-fg"
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
