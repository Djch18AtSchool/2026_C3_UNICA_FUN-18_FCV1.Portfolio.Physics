import { PHASE_LABELS, PHASES, topicsByPhase, type Phase } from '../consigna';
import { isPublished, latestPublishedPhase, type TopicSummary } from './topics';

type PhaseTopic = Pick<TopicSummary, 'number' | 'phase' | 'status'>;

/** One delivery as the cover and the sidebar show it. */
export interface PhaseGroup<T> {
  phase: Phase;
  label: string;
  /** Published topics of the phase, by number; empty for a future phase. */
  topics: T[];
  /** Nothing of the phase is published yet: it is shown by name only, never its topics. */
  isFuture: boolean;
}

const TOPIC_NUMBER_DIGITS = 2;
/** "el Avance 2", "la Entrega Final": the article each delivery's label takes in a sentence. */
const PHASE_ARTICLES: Record<Phase, string> = { 1: 'el', 2: 'el', 3: 'la' };

/** Every phase in order with its published topics; future phases carry none. */
export function groupByPhase<T extends PhaseTopic>(topics: readonly T[]): PhaseGroup<T>[] {
  return PHASES.map((phase) => {
    const published = topicsByPhase(phase, topics).filter(isPublished);
    return {
      phase,
      label: PHASE_LABELS[phase],
      topics: published,
      isFuture: published.length === 0,
    };
  });
}

/** The phase open by default: the current one, or the delivery in progress when it is future. */
export function defaultOpenPhase(topics: readonly PhaseTopic[], currentPhase: Phase): Phase {
  const hasPublished = topics.some((topic) => topic.phase === currentPhase && isPublished(topic));
  return hasPublished ? currentPhase : latestPublishedPhase(topics);
}

/** A topic number as the lists print it: 01, 02, … 13. */
export function topicNumberLabel(number: number): string {
  return String(number).padStart(TOPIC_NUMBER_DIGITS, '0');
}

/** A delivery's label with its article, for "se publica en el Avance 2" (spec §4.2). */
export function phaseWithArticle(phase: Phase): string {
  return `${PHASE_ARTICLES[phase]} ${PHASE_LABELS[phase]}`;
}
