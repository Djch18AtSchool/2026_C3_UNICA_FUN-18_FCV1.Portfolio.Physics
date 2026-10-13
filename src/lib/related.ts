import { topicBySlug, type ConsignaTopic } from '../consigna';

/** A related topic as "Conexiones" lists it: a link when published, its name only otherwise. */
export interface RelatedTopic extends ConsignaTopic {
  isPublished: boolean;
}

/**
 * The frontmatter's related slugs, in order, resolved against the consigna. Throws on an unknown
 * slug so a typo fails the build instead of printing a broken entry.
 */
export function resolveRelated(
  slugs: readonly string[],
  published: ReadonlySet<string>,
): RelatedTopic[] {
  return slugs.map((slug) => {
    const topic = topicBySlug(slug);
    if (!topic) throw new Error(`Connections: el tema "${slug}" no existe en la consigna`);
    return { ...topic, isPublished: published.has(slug) };
  });
}
