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
const COMPONENT_START = /^\s*<(Step|UseCase|Connections|Sources)\b/;
const STEP_NUMBER = /\bn=\{\s*(\d+)\s*\}/;
const STEP_TITLE = /\btitle=(?:"([^"]*)"|'([^']*)'|\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\})/;
const QUOTES = new Set(['"', "'", '`']);

/** A Step's heading: "Paso N · title", anchored to the step's section id. */
export function stepHeading(n: number, title: string): { text: string; slug: string } {
  return { text: `Paso ${n} · ${title}`, slug: `paso-${n}` };
}

/** Where a heading could not be read: the file and the 1-based line of the MDX body. */
interface Place {
  file: string;
  line: number;
}

function placeLabel({ file, line }: Place): string {
  return `"${file}", línea ${line} del cuerpo MDX`;
}

/**
 * The opening tag that starts at `lines[start]`, possibly wrapped over several lines: everything
 * up to the first `>` outside quotes and braces. Returns the tag text and its last line index.
 */
function readOpeningTag(
  lines: string[],
  start: number,
  place: Place,
): { tag: string; end: number } {
  let quote = '';
  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (quote) {
        if (char === quote) quote = '';
      } else if (QUOTES.has(char)) quote = char;
      else if (char === '{') depth++;
      else if (char === '}') depth--;
      else if (char === '>' && depth === 0) {
        const tag = [...lines.slice(start, i), lines[i].slice(0, j)].join('\n');
        return { tag, end: i };
      }
    }
  }
  throw new Error(`sectionHeadings: en ${placeLabel(place)}, la etiqueta no se cierra con ">".`);
}

function componentHeading(name: string, tag: string, place: Place): RawHeading {
  if (name !== 'Step')
    return { depth: SECTION_DEPTH, ...SECTION_HEADINGS[name as SectionComponent] };
  const n = STEP_NUMBER.exec(tag)?.[1];
  const title = STEP_TITLE.exec(tag)
    ?.slice(1)
    .find((group) => group !== undefined);
  if (!n || title === undefined) {
    throw new Error(
      `sectionHeadings: en ${placeLabel(place)}, el <Step> necesita n={número} y title="texto" literales para listarlo en la barra lateral.`,
    );
  }
  return { depth: SECTION_DEPTH, ...stepHeading(Number(n), title) };
}

/**
 * Walk the MDX body line by line, outside code fences. A `## ` line takes the next depth-2 heading
 * Astro rendered (keeping its text and slug), followed by any deeper ones before the next; a
 * section component's opening tag (even wrapped over lines) adds its fixed heading. Rendered
 * headings left unplaced go at the end. Throws, naming `file` and the line, on a Step it cannot
 * read, so the build fails instead of silently dropping the step.
 */
export function collectSectionHeadings(
  body: string,
  rendered: RawHeading[],
  file = 'MDX',
): RawHeading[] {
  const queue = [...rendered];
  const takeSection = (): RawHeading[] => {
    const start = queue.findIndex((heading) => heading.depth === SECTION_DEPTH);
    if (start === -1) return [];
    const next = queue.findIndex((heading, i) => i > start && heading.depth <= SECTION_DEPTH);
    return queue.splice(start, (next === -1 ? queue.length : next) - start);
  };

  const lines = body.split('\n');
  const collected: RawHeading[] = [];
  let isInFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FENCE.test(line)) isInFence = !isInFence;
    else if (isInFence) continue;
    else if (MARKDOWN_SECTION.test(line)) collected.push(...takeSection());
    else {
      const name = COMPONENT_START.exec(line)?.[1];
      if (!name) continue;
      const place = { file, line: i + 1 };
      const { tag, end } = readOpeningTag(lines, i, place);
      collected.push(componentHeading(name, tag, place));
      i = end;
    }
  }
  return [...collected, ...queue];
}
