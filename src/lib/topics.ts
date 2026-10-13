import { PHASES, type Phase, type ResourceType } from '../consigna';
import type { TopicData } from '../content/topicSchema';

/** What navigation needs from a topic entry. Pure: no astro:content import, so it unit-tests. */
export interface TopicSummary {
  slug: string;
  number: number;
  phase: Phase;
  title: string;
  shortTitle: string;
  resourceType: ResourceType;
}

export function sortByNumber<T extends { number: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.number - b.number);
}

/** The topics just before and after `number`; the first has no prev and the last no next. */
export function neighbors<T extends Pick<TopicSummary, 'number'>>(
  topics: readonly T[],
  number: number,
): { prev?: T; next?: T } {
  const sorted = sortByNumber(topics);
  const prev = sorted.findLast((topic) => topic.number < number);
  const next = sorted.find((topic) => topic.number > number);
  return { ...(prev && { prev }), ...(next && { next }) };
}

/** The delivery in progress: the phase of the highest-numbered topic (else the first). */
export function latestPhase(topics: readonly Pick<TopicSummary, 'number' | 'phase'>[]): Phase {
  return sortByNumber(topics).at(-1)?.phase ?? PHASES[0];
}

/** Narrow a collection entry ({ id, data }) to a summary; the entry id is the slug. */
export function toTopicSummary(entry: { id: string; data: TopicData }): TopicSummary {
  const { number, phase, title, shortTitle, resourceType } = entry.data;
  return { slug: entry.id, number, phase, title, shortTitle, resourceType };
}
