import { PHASES, TOPICS, topicsByPhase, type Phase } from '../../src/consigna';

/** The phases with at least one registered topic, in order. */
export const PUBLISHED_PHASES: readonly Phase[] = PHASES.filter(
  (phase) => topicsByPhase(phase, TOPICS).length > 0,
);

/** A phase is future iff no registered topic belongs to it. */
export const FUTURE_PHASES: readonly Phase[] = PHASES.filter(
  (phase) => !PUBLISHED_PHASES.includes(phase),
);

/** The phase the sidebar opens on a page that belongs to none: the latest published one. */
export const CURRENT_PHASE: Phase = PUBLISHED_PHASES[PUBLISHED_PHASES.length - 1];
