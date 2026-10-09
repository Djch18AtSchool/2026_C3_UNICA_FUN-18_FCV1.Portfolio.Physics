import type { Source } from '../content/topicSchema';

const SENTENCE_END = /[.?!]$/;

/** 1-based position of a source in the topic's list, as cited with "[n]". */
export function sourceIndex(sources: readonly { id: string }[], id: string): number {
  const index = sources.findIndex((source) => source.id === id);
  if (index === -1) throw new RangeError(`La fuente "${id}" no está declarada`);
  return index + 1;
}

function sentence(text: string): string {
  return SENTENCE_END.test(text) ? text : `${text}.`;
}

/**
 * Reference line in the shape "Autores (año). Título. Editorial.", leaving out the empty parts.
 * Without authors the title takes their place: "Título (año). Editorial."
 */
export function formatSource(source: Source): string {
  const { authors, year, title, publisher } = source;
  const lead = authors || title;
  const head = year === undefined ? sentence(lead) : `${lead} (${year}).`;
  const rest = (authors ? [title, publisher] : [publisher]).filter((part): part is string =>
    Boolean(part),
  );
  return [head, ...rest.map(sentence)].join(' ');
}
