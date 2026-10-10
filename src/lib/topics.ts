import { PHASES, type Phase, type ResourceType } from '../consigna';
import type { TopicData } from '../content/topicSchema';

/** What navigation needs from a topic entry. Pure: no astro:content import, so it unit-tests. */
export interface TopicSummary {
  slug: string;
  number: number;
  phase: Phase;
  title: string;
  shortTitle: string;
  status: 'publicado' | 'proximamente';
  resourceType?: ResourceType;
}

export function sortByNumber<T extends { number: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.number - b.number);
}

/** Previous and next items around `number` in a list already sorted by number. */
export function neighbors<T extends { number: number }>(
  sorted: readonly T[],
  number: number,
): { prev?: T; next?: T } {
  const index = sorted.findIndex((item) => item.number === number);
  if (index === -1) return {};
  return {
    ...(index > 0 && { prev: sorted[index - 1] }),
    ...(index < sorted.length - 1 && { next: sorted[index + 1] }),
  };
}

/** The delivery in progress: the phase of the highest-numbered published topic (else the first). */
export function latestPublishedPhase(
  topics: readonly Pick<TopicSummary, 'number' | 'phase' | 'status'>[],
): Phase {
  const published = sortByNumber(topics.filter((topic) => topic.status === 'publicado'));
  return published.at(-1)?.phase ?? PHASES[0];
}

/** Narrow a collection entry ({ id, data }) to a summary; the entry id is the slug. */
export function toTopicSummary(entry: { id: string; data: TopicData }): TopicSummary {
  const { number, phase, title, shortTitle, status, resourceType } = entry.data;
  return {
    slug: entry.id,
    number,
    phase,
    title,
    shortTitle,
    status,
    ...(resourceType && { resourceType }),
  };
}
