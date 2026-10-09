import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, test } from 'vitest';
import { TOPICS, topicBySlug } from '../consigna';
import { topicSchema } from './topicSchema';

const TOPICS_DIR = join(process.cwd(), 'src', 'content', 'topics');

const fileNames = readdirSync(TOPICS_DIR)
  .filter((name) => name.endsWith('.mdx'))
  .sort();

function readFrontmatter(fileName: string): Record<string, unknown> {
  return matter(readFileSync(join(TOPICS_DIR, fileName), 'utf8')).data;
}

const valid = {
  number: 2,
  phase: 1,
  title: 'El salto del personaje: cómo los motores de juego falsean la gravedad',
  shortTitle: 'El salto del personaje',
  concept: 'Caída libre y tiro parabólico.',
  status: 'proximamente',
  updated: '2026-10-08',
} as const;

const validPublished = {
  ...valid,
  status: 'publicado',
  resourceType: 'simulacion',
  useCase: { product: 'Un juego de plataformas', industry: 'Videojuegos' },
  sources: [{ id: 'giancoli-2008', title: 'Physics for Scientists and Engineers' }],
  related: ['dron-reparto', 'gravedad-artificial'],
  classRefs: [{ module: 'Módulo 2', topic: 'Caída libre' }],
} as const;

describe('topic files', () => {
  test('existen exactamente 13 archivos, uno por slug de la consigna', () => {
    const expected = TOPICS.map((topic) => `${topic.slug}.mdx`).sort();
    expect(fileNames).toEqual(expected);
  });

  test('cada frontmatter valida contra topicSchema', () => {
    for (const fileName of fileNames) {
      expect(() => topicSchema.parse(readFrontmatter(fileName)), fileName).not.toThrow();
    }
  });

  test('number, title y phase coinciden con la consigna', () => {
    for (const fileName of fileNames) {
      const slug = fileName.replace(/\.mdx$/, '');
      const expected = topicBySlug(slug);
      const data = topicSchema.parse(readFrontmatter(fileName));
      expect(expected, slug).toBeDefined();
      expect(data.number, slug).toBe(expected?.number);
      expect(data.title, slug).toBe(expected?.title);
      expect(data.phase, slug).toBe(expected?.phase);
    }
  });

  test('related solo apunta a slugs existentes', () => {
    const slugs = new Set(TOPICS.map((topic) => topic.slug));
    for (const fileName of fileNames) {
      const data = topicSchema.parse(readFrontmatter(fileName));
      for (const slug of data.related) {
        expect(slugs.has(slug), `${fileName} -> ${slug}`).toBe(true);
      }
    }
  });
});

describe('topicSchema rules', () => {
  test('acepta un tema publicado completo', () => {
    expect(() => topicSchema.parse(validPublished)).not.toThrow();
  });

  test('un tema publicado sin fuentes es rechazado', () => {
    expect(() => topicSchema.parse({ ...validPublished, sources: [] })).toThrow(/fuente/);
  });

  test('un tema publicado sin tipo de recurso o caso de uso es rechazado', () => {
    expect(() => topicSchema.parse({ ...validPublished, resourceType: undefined })).toThrow(
      /tipo de recurso/,
    );
    expect(() => topicSchema.parse({ ...validPublished, useCase: undefined })).toThrow(
      /caso de uso/,
    );
  });

  test('un título distinto al de la consigna es rechazado', () => {
    expect(() => topicSchema.parse({ ...valid, title: 'Otro' })).toThrow(/consigna/);
  });

  test('una fase distinta a la de la consigna es rechazada', () => {
    expect(() => topicSchema.parse({ ...valid, phase: 2 })).toThrow(/consigna/);
  });

  test('un tema publicado necesita dos temas relacionados y una referencia a clase', () => {
    expect(() => topicSchema.parse({ ...validPublished, related: ['salto-personaje'] })).toThrow(
      /relacionados/,
    );
    expect(() => topicSchema.parse({ ...validPublished, classRefs: [] })).toThrow(/clase/);
  });

  test('un tema próximamente no exige fuentes ni relaciones', () => {
    expect(() => topicSchema.parse(valid)).not.toThrow();
  });
});
