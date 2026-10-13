import { z } from 'astro/zod';
import { topicByNumber } from '../consigna';

export const sourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  authors: z.string().optional(),
  year: z.number().int().optional(),
  publisher: z.string().optional(),
  url: z.url().optional(),
  accessed: z.string().optional(),
});

export const classRefSchema = z.object({
  module: z.string(),
  topic: z.string(),
  note: z.string().optional(),
});

const MIN_RELATED = 2;

/**
 * A topic's frontmatter. Every topic file is a published topic: the next delivery's topics get a
 * file only when their consigna arrives, so there is no draft state to declare.
 */
export const topicSchema = z
  .strictObject({
    number: z.number().int().min(1),
    phase: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    title: z.string(),
    shortTitle: z.string().max(40),
    concept: z.string({ error: 'El tema necesita un concepto' }),
    resourceType: z.enum(['simulacion', 'visualizacion', 'diagrama', 'multimedia'], {
      error: 'El tema necesita un tipo de recurso',
    }),
    useCase: z.object(
      { product: z.string(), industry: z.string() },
      { error: 'El tema necesita un caso de uso' },
    ),
    sources: z.array(sourceSchema).min(1, 'El tema necesita al menos una fuente'),
    related: z
      .array(z.string())
      .min(MIN_RELATED, 'El tema necesita al menos dos temas relacionados'),
    classRefs: z.array(classRefSchema).min(1, 'El tema necesita al menos una referencia a clase'),
    updated: z.coerce.date(),
  })
  .superRefine((data, ctx) => {
    const consigna = topicByNumber(data.number);
    if (!consigna) {
      ctx.addIssue({
        code: 'custom',
        path: ['number'],
        message: `La consigna no lista el tema ${data.number}`,
      });
      return;
    }
    if (consigna.title !== data.title || consigna.phase !== data.phase) {
      ctx.addIssue({
        code: 'custom',
        path: consigna.title !== data.title ? ['title'] : ['phase'],
        message: `El título no coincide con la consigna para el tema ${data.number}`,
      });
    }
  });

export type TopicData = z.infer<typeof topicSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type ClassRef = z.infer<typeof classRefSchema>;
