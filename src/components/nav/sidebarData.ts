import { getCollection, render } from 'astro:content';
import { buildSearchIndex, type SearchEntry, type SearchHeading } from '../../lib/searchIndex';
import { collectSectionHeadings } from '../../lib/sectionHeadings';
import { sortByNumber, toTopicSummary, type TopicSummary } from '../../lib/topics';

export interface SidebarData {
  /** All topics, sorted by number. */
  all: TopicSummary[];
  /** Search index over every topic (spec §9). */
  index: SearchEntry[];
  /** Section headings of each published topic, by slug. */
  outlines: Record<string, SearchHeading[]>;
}

/**
 * Build-time data for the sidebar: renders every published topic to collect its headings (plus
 * the sections its components render, see sectionHeadings.ts) for the outlines and the index.
 */
export async function loadSidebarData(): Promise<SidebarData> {
  const entries = await getCollection('topics');
  const all = sortByNumber(entries.map(toTopicSummary));
  const published = entries.filter((entry) => entry.data.status === 'publicado');
  const headingsBySlug = Object.fromEntries(
    await Promise.all(
      published.map(async (entry) => {
        const { headings } = await render(entry);
        const file = entry.filePath ?? `${entry.id}.mdx`;
        return [entry.id, collectSectionHeadings(entry.body ?? '', headings, file)] as const;
      }),
    ),
  );
  const index = buildSearchIndex(all, headingsBySlug);
  const outlines = Object.fromEntries(index.map((entry) => [entry.slug, entry.headings]));
  return { all, index, outlines };
}
