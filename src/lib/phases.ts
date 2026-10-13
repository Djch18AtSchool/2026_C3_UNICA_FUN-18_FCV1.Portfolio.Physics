import { PHASE_LABELS, PHASES, topicsByPhase, type Phase } from '../consigna';
import { latestPublishedPhase, type TopicSummary } from './topics';

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

const isPublished = (topic: PhaseTopic) => topic.status === 'publicado';

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
