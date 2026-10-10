import type { Phase } from '../consigna';
import { sortByNumber, type TopicSummary } from './topics';

/** A section of a published topic: its heading text and the id it links to. */
export interface SearchHeading {
  text: string;
  anchor: string;
}

/** One topic in the build-time search index (spec §9). */
export interface SearchEntry {
  slug: string;
  number: number;
  phase: Phase;
  title: string;
  shortTitle: string;
  status: 'publicado' | 'proximamente';
  headings: SearchHeading[];
}

/** The shape of `render(entry).headings` in astro:content. */
interface RawHeading {
  depth: number;
  text: string;
  slug: string;
}

const SECTION_DEPTH = 2;
const TRAILING_ANCHOR = /\s*#+\s*$/;

/** Lowercase without diacritics, so "Ápice" and "apice" compare equal. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function toSearchHeadings(headings: readonly RawHeading[]): SearchHeading[] {
  return headings
    .filter((heading) => heading.depth === SECTION_DEPTH)
    .map((heading) => ({ text: heading.text.replace(TRAILING_ANCHOR, ''), anchor: heading.slug }));
}

/** Every topic with its title; only published topics contribute their section headings. */
export function buildSearchIndex(
  topics: TopicSummary[],
  headingsBySlug: Record<string, RawHeading[]>,
): SearchEntry[] {
  return sortByNumber(topics).map(({ slug, number, phase, title, shortTitle, status }) => ({
    slug,
    number,
    phase,
    title,
    shortTitle,
    status,
    headings: status === 'publicado' ? toSearchHeadings(headingsBySlug[slug] ?? []) : [],
  }));
}

/**
 * Substring search over titles and headings, ignoring case and accents. A topic is returned when
 * its title or any heading matches, with only the matching headings. An empty query returns every
 * topic without headings. Results keep the index order (by number).
 */
export function filterIndex(
  index: SearchEntry[],
  query: string,
): { entry: SearchEntry; headings: SearchHeading[] }[] {
  const needle = normalize(query.trim());
  const ordered = sortByNumber(index);
  if (needle === '') return ordered.map((entry) => ({ entry, headings: [] }));

  const matches = (text: string) => normalize(text).includes(needle);
  return ordered.flatMap((entry) => {
    const headings = entry.headings.filter((heading) => matches(heading.text));
    const isTitleMatch = matches(entry.title) || matches(entry.shortTitle);
    return isTitleMatch || headings.length > 0 ? [{ entry, headings }] : [];
  });
}
