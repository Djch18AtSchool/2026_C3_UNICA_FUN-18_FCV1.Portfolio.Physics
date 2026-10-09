import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { topicSchema } from './content/topicSchema';

const topics = defineCollection({
  loader: glob({ base: './src/content/topics', pattern: '*.mdx' }),
  schema: topicSchema,
});

export const collections = { topics };
