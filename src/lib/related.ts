import { topicBySlug, type ConsignaTopic } from '../consigna';

/**
 * The frontmatter's related slugs, in order, resolved against the consigna. Throws on an unknown
 * slug so a typo fails the build instead of printing a broken entry.
 */
export function resolveRelated(slugs: readonly string[]): ConsignaTopic[] {
  return slugs.map((slug) => {
    const topic = topicBySlug(slug);
    if (!topic) throw new Error(`Connections: el tema "${slug}" no existe en la consigna`);
    return topic;
  });
}
