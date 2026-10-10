/**
 * `render(entry).headings` only sees Markdown headings (`## …`); the sections that components
 * render (each Step, the use case, connections and sources) are invisible to it. This module
 * restores them in source order, so the sidebar outline and the search index list every section.
 */
export interface RawHeading {
  depth: number;
  text: string;
  slug: string;
}

/** Heading text and id of each section component; the components read them from here. */
export const SECTION_HEADINGS = {
  UseCase: { text: 'Caso de uso en Ingeniería del Software', slug: 'caso-de-uso' },
  Connections: { text: 'Conexiones', slug: 'conexiones' },
  Sources: { text: 'Fuentes', slug: 'fuentes' },
} as const;

type SectionComponent = keyof typeof SECTION_HEADINGS;

const SECTION_DEPTH = 2;
const FENCE = /^\s*(```|~~~)/;
const MARKDOWN_SECTION = /^##\s/;
const COMPONENT_TAG = /^\s*<(Step|UseCase|Connections|Sources)\b([^>]*)/;
const STEP_NUMBER = /\bn=\{\s*(\d+)\s*\}/;
const STEP_TITLE = /\btitle=(?:"([^"]*)"|'([^']*)'|\{\s*["']([^"']*)["']\s*\})/;

/** A Step's heading: "Paso N · title", anchored to the step's section id. */
export function stepHeading(n: number, title: string): { text: string; slug: string } {
  return { text: `Paso ${n} · ${title}`, slug: `paso-${n}` };
}

function componentHeading(name: string, attributes: string): RawHeading | undefined {
  if (name !== 'Step')
    return { depth: SECTION_DEPTH, ...SECTION_HEADINGS[name as SectionComponent] };
  const n = STEP_NUMBER.exec(attributes)?.[1];
  const title = STEP_TITLE.exec(attributes)
    ?.slice(1)
    .find((group) => group !== undefined);
  return n && title !== undefined
    ? { depth: SECTION_DEPTH, ...stepHeading(Number(n), title) }
    : undefined;
}

/**
 * Walk the MDX body line by line, outside code fences. A `## ` line takes the next depth-2 heading
 * Astro rendered (keeping its text and slug), followed by any deeper ones before the next; a
 * section component tag adds its fixed heading. Rendered headings left unplaced go at the end.
 */
export function collectSectionHeadings(body: string, rendered: RawHeading[]): RawHeading[] {
  const queue = [...rendered];
  const takeSection = (): RawHeading[] => {
    const start = queue.findIndex((heading) => heading.depth === SECTION_DEPTH);
    if (start === -1) return [];
    const next = queue.findIndex((heading, i) => i > start && heading.depth <= SECTION_DEPTH);
    return queue.splice(start, (next === -1 ? queue.length : next) - start);
  };

  let isInFence = false;
  const collected = body.split('\n').flatMap((line): RawHeading[] => {
    if (FENCE.test(line)) {
      isInFence = !isInFence;
      return [];
    }
    if (isInFence) return [];
    if (MARKDOWN_SECTION.test(line)) return takeSection();
    const tag = COMPONENT_TAG.exec(line);
    const heading = tag ? componentHeading(tag[1], tag[2]) : undefined;
    return heading ? [heading] : [];
  });
  return [...collected, ...queue];
}
