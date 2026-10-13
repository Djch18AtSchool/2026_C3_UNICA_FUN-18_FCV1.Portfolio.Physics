import { PHASE_LABELS, PHASES, topicsByPhase, type Phase } from '../consigna';
import type { TopicSummary } from './topics';

type PhaseTopic = Pick<TopicSummary, 'number' | 'phase'>;

/** One delivery as the cover and the sidebar show it. */
export interface PhaseGroup<T> {
  phase: Phase;
  label: string;
  /** Topics of the phase, by number; empty for a future phase. */
  topics: T[];
  /** The phase has no topics yet (its consigna has not arrived): it is shown by name only. */
  isFuture: boolean;
}

const TOPIC_NUMBER_DIGITS = 2;

/** Every phase in order with its topics; a phase without topics is a future one. */
export function groupByPhase<T extends PhaseTopic>(topics: readonly T[]): PhaseGroup<T>[] {
  return PHASES.map((phase) => {
    const phaseTopics = topicsByPhase(phase, topics);
    return {
      phase,
      label: PHASE_LABELS[phase],
      topics: phaseTopics,
      isFuture: phaseTopics.length === 0,
    };
  });
}

/** A topic number as the lists print it: 01, 02, … */
export function topicNumberLabel(number: number): string {
  return String(number).padStart(TOPIC_NUMBER_DIGITS, '0');
}
