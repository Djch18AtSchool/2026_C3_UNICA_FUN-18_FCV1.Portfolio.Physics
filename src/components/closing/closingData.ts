import { getCollection } from 'astro:content';
import { relatedNumbers } from '../../lib/closing';
import { sortByNumber, toTopicSummary, type TopicSummary } from '../../lib/topics';

/** Each pair's colour on the map and beside its paragraph, by the principle it names. */
const PAIR_COLORS: Readonly<Record<string, string>> = {
  'Momento lineal': 'var(--chart-1)',
  // The orange of «Calor de fricción» in Tema 6's balance (regenScene.ts): energy that does not
  // come back.
  'Energía con disipación': 'var(--chart-2)',
  'Frecuencia natural': 'var(--chart-3)',
};

/**
 * The colour of a pair. chart-1, chart-2 and chart-3 pass the dataviz validator together (all
 * pairs, CVD ΔE ≥ 9, normal vision ≥ 20, ≥ 3:1 on --bg and --bg-elevated, light and dark), and
 * every pair is also labelled in words, so the colour never carries it alone.
 */
export function pairColor(principle: string): string {
  const color = PAIR_COLORS[principle];
  if (!color) throw new Error(`«Qué aprendí»: el par «${principle}» no tiene color`);
  return color;
}

export interface ClosingTopics {
  /** The registered topics, by number. */
  topics: TopicSummary[];
  /** Each topic's `related`, as topic numbers. */
  related: Map<number, number[]>;
}

/** Build-time data for the closing section: whatever topics the collection has. */
export async function loadClosingTopics(): Promise<ClosingTopics> {
  const entries = await getCollection('topics');
  return {
    topics: sortByNumber(entries.map(toTopicSummary)),
    related: relatedNumbers(
      entries.map(({ data }) => ({ number: data.number, related: data.related })),
    ),
  };
}
