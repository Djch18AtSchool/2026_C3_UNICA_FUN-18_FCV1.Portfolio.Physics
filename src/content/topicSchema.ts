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

const MIN_PUBLISHED_RELATED = 2;

export const topicSchema = z
  .object({
    number: z.number().int().min(1).max(13),
    phase: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    title: z.string(),
    shortTitle: z.string().max(40),
    concept: z.string().optional(),
    status: z.enum(['publicado', 'proximamente']),
    resourceType: z.enum(['simulacion', 'visualizacion', 'diagrama', 'multimedia']).optional(),
    useCase: z.object({ product: z.string(), industry: z.string() }).optional(),
    sources: z.array(sourceSchema).default([]),
    related: z.array(z.string()).default([]),
    classRefs: z.array(classRefSchema).default([]),
    updated: z.coerce.date(),
  })
  .superRefine((data, ctx) => {
    const consigna = topicByNumber(data.number);
    if (consigna && (consigna.title !== data.title || consigna.phase !== data.phase)) {
      ctx.addIssue({
        code: 'custom',
        path: consigna.title !== data.title ? ['title'] : ['phase'],
        message: `El título no coincide con la consigna para el tema ${data.number}`,
      });
    }

    if (data.status !== 'publicado') return;

    if (!data.concept) {
      ctx.addIssue({
        code: 'custom',
        path: ['concept'],
        message: 'El tema publicado necesita un concepto',
      });
    }
    if (!data.resourceType) {
      ctx.addIssue({
        code: 'custom',
        path: ['resourceType'],
        message: 'El tema publicado necesita un tipo de recurso',
      });
    }
    if (!data.useCase) {
      ctx.addIssue({
        code: 'custom',
        path: ['useCase'],
        message: 'El tema publicado necesita un caso de uso',
      });
    }
    if (data.sources.length < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['sources'],
        message: 'El tema publicado necesita al menos una fuente',
      });
    }
    if (data.related.length < MIN_PUBLISHED_RELATED) {
      ctx.addIssue({
        code: 'custom',
        path: ['related'],
        message: 'El tema publicado necesita al menos dos temas relacionados',
      });
    }
    if (data.classRefs.length < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['classRefs'],
        message: 'El tema publicado necesita al menos una referencia a clase',
      });
    }
  });

export type TopicData = z.infer<typeof topicSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type ClassRef = z.infer<typeof classRefSchema>;
