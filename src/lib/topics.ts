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

/**
 * The published topics just before and after `number`. Only published topics are offered, so the
 * last published topic has no next and an upcoming topic only points back to the last published.
 */
export function publishedNeighbors<T extends Pick<TopicSummary, 'number' | 'status'>>(
  topics: readonly T[],
  number: number,
): { prev?: T; next?: T } {
  const published = sortByNumber(topics.filter(isPublished));
  const prev = published.findLast((topic) => topic.number < number);
  const next = published.find((topic) => topic.number > number);
  return { ...(prev && { prev }), ...(next && { next }) };
}

/** Whether a topic is published: only these show in the navigation and the search. */
export function isPublished(topic: Pick<TopicSummary, 'status'>): boolean {
  return topic.status === 'publicado';
}

/** Slugs of the published topics: the only ones another page may link to. */
export function publishedSlugs(
  topics: readonly Pick<TopicSummary, 'slug' | 'status'>[],
): Set<string> {
  return new Set(topics.filter(isPublished).map((topic) => topic.slug));
}

/** The delivery in progress: the phase of the highest-numbered published topic (else the first). */
export function latestPublishedPhase(
  topics: readonly Pick<TopicSummary, 'number' | 'phase' | 'status'>[],
): Phase {
  const published = sortByNumber(topics.filter(isPublished));
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
