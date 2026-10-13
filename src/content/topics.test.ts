import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, test } from 'vitest';
import { TOPICS, topicBySlug } from '../consigna';
import { topicSchema } from './topicSchema';

const TOPICS_DIR = join(process.cwd(), 'src', 'content', 'topics');
/** Rubric sections every topic must keep: use case, figure, connections, sources. */
const BODY_MARKERS = ['<UseCase', '<Figure', '<Connections', '<Sources'] as const;
/** Every topic is written in steps (spec §7.2): at least this many, no manual closings. */
const MIN_STEPS = 3;
const MANUAL_CLOSING_HEADINGS = /^## (Conexiones|Fuentes)\s*$/m;

/** Opening tag of a Step (a ">" inside a quoted attribute does not end it); self-closing ends in "/". */
const STEP_OPENING = /<Step\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const STEP_CLOSING = '</Step>';
/** A Why opening tag (`<Why>`, `<Why />`, `<Why …>`), not a longer name such as `<WhyNot`. */
const WHY_OPENING = /<Why\b/g;
/** Opening tag of a Figure, over any lines; quoted attributes and `{…}` values may hold ">". */
const FIGURE_OPENING = /<Figure\b((?:[^>"'{]|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})*)>/g;
const HIDDEN_BADGE = /\bshowBadge=\{false\}/;
const FIGURE_TYPE = /\btype="([^"]+)"/;

/**
 * The resource types of the Figures that show their badge (no `showBadge={false}`). Spec §6 and
 * the final ruling: only the topic's prescribed resource carries its type badge.
 */
function badgedFigureTypes(body: string): string[] {
  return [...body.matchAll(FIGURE_OPENING)]
    .filter(([, attributes]) => !HIDDEN_BADGE.test(attributes))
    .map(([, attributes]) => FIGURE_TYPE.exec(attributes)?.[1] ?? '');
}

/**
 * The opening tags of the Steps in an MDX body that do not contain exactly one `<Why` (spec §7.1:
 * every step justifies itself once, twice over). A self-closing or unclosed Step has no Why.
 */
function stepsWithoutOneWhy(body: string): string[] {
  return [...body.matchAll(STEP_OPENING)].flatMap((match) => {
    const [tag, attributes] = match;
    if (attributes.trimEnd().endsWith('/')) return [tag];
    const start = match.index + tag.length;
    const end = body.indexOf(STEP_CLOSING, start);
    const whys = end === -1 ? 0 : (body.slice(start, end).match(WHY_OPENING) ?? []).length;
    return whys === 1 ? [] : [tag];
  });
}

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
  updated: '2026-10-08',
  concept: 'Caída libre y tiro parabólico.',
  resourceType: 'simulacion',
  useCase: { product: 'Un juego de plataformas', industry: 'Videojuegos' },
  sources: [{ id: 'giancoli-2008', title: 'Physics for Scientists and Engineers' }],
  related: ['dron-reparto', 'gravedad-artificial'],
  classRefs: [{ module: 'Módulo 2', topic: 'Caída libre' }],
} as const;

describe('topic files', () => {
  test('hay exactamente un archivo por tema de la consigna, y ninguno más', () => {
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

  const files = fileNames.map((fileName) => ({
    fileName,
    file: matter(readFileSync(join(TOPICS_DIR, fileName), 'utf8')),
  }));

  test('hay al menos cinco temas', () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  test('ningún frontmatter declara un estado: todo tema con archivo está publicado', () => {
    for (const { fileName, file } of files) {
      expect(file.data, fileName).not.toHaveProperty('status');
    }
  });

  test('cada tema conserva las secciones de la rúbrica en su cuerpo', () => {
    for (const { fileName, file } of files) {
      for (const marker of BODY_MARKERS) {
        expect(file.content.includes(marker), `${fileName} sin ${marker}`).toBe(true);
      }
      expect(file.content, fileName).not.toMatch(MANUAL_CLOSING_HEADINGS);
    }
  });

  test('cada tema está escrito en al menos tres pasos', () => {
    for (const { fileName, file } of files) {
      const steps = [...file.content.matchAll(STEP_OPENING)].length;
      expect(steps, `${fileName}: pasos`).toBeGreaterThanOrEqual(MIN_STEPS);
    }
  });

  test('cada Step de un tema contiene exactamente un Why', () => {
    for (const fileName of fileNames) {
      const { content } = matter(readFileSync(join(TOPICS_DIR, fileName), 'utf8'));
      expect(stepsWithoutOneWhy(content), fileName).toEqual([]);
    }
  });

  test('solo la figura del recurso prescrito lleva la insignia, con el tipo del frontmatter', () => {
    for (const { fileName, file } of files) {
      expect(badgedFigureTypes(file.content), fileName).toEqual([file.data.resourceType]);
    }
  });
});

describe('stepsWithoutOneWhy', () => {
  test('acepta pasos que contienen un Why', () => {
    const body = `Intro.

<Step n={1} title="Uno">

<Figure n={1} />

<Why>
<Fragment slot="fenomeno">…</Fragment>
<Fragment slot="ecuacion">…</Fragment>
</Why>

</Step>

<Step title="Dos > tres" n={2}>
<Why />
</Step>`;

    expect(stepsWithoutOneWhy(body)).toEqual([]);
    expect(stepsWithoutOneWhy('<Step title="Dos > tres" n={2}>\nTexto\n</Step>')).toEqual([
      '<Step title="Dos > tres" n={2}>',
    ]);
  });

  test('señala el paso sin Why aunque el siguiente tenga uno', () => {
    const body = `<Step n={1} title="Uno">
Sin justificar.
</Step>

<Step n={2} title="Dos">
<Why />
</Step>`;

    expect(stepsWithoutOneWhy(body)).toEqual(['<Step n={1} title="Uno">']);
  });

  test('un paso que se cierra solo o nunca se cierra no tiene Why', () => {
    expect(stepsWithoutOneWhy('<Step n={1} title="Uno" />')).toEqual([
      '<Step n={1} title="Uno" />',
    ]);
    expect(stepsWithoutOneWhy('<Step n={2} title="Dos">\n<Why />')).toEqual([
      '<Step n={2} title="Dos">',
    ]);
    expect(stepsWithoutOneWhy('<Step n={3} title="Tres">\nTexto')).toEqual([
      '<Step n={3} title="Tres">',
    ]);
  });

  test('señala el paso con dos Why', () => {
    const body = `<Step n={1} title="Uno">
<Why />
<Why />
</Step>`;

    expect(stepsWithoutOneWhy(body)).toEqual(['<Step n={1} title="Uno">']);
    expect(stepsWithoutOneWhy('<Step n={2} title="Dos">\n<WhyNot />\n<Why />\n</Step>')).toEqual(
      [],
    );
  });

  test('un cuerpo sin pasos no tiene nada que señalar', () => {
    expect(stepsWithoutOneWhy('Texto con <Steps> y <UseCase>.')).toEqual([]);
  });
});

describe('badgedFigureTypes', () => {
  test('lista el tipo de cada Figure que no oculta su insignia', () => {
    const body = `<Figure
  type="visualizacion"
  showBadge={false}
  caption="a > b"
  source={{ text: 'x > y' }}
>
  <Lab />
</Figure>

<Figure type="diagrama" caption="Uno" source={{ text: 'Dos' }}>
  <Diagram />
</Figure>

<Figure caption="Sin tipo" source={{ text: 'Tres' }} />`;

    expect(badgedFigureTypes(body)).toEqual(['diagrama', '']);
  });

  test('un cuerpo sin figuras no tiene insignias', () => {
    expect(badgedFigureTypes('Texto con <FigureCaption> y <Figures>.')).toEqual([]);
  });
});

describe('topicSchema rules', () => {
  test('acepta un tema completo', () => {
    expect(() => topicSchema.parse(valid)).not.toThrow();
  });

  test('un tema sin fuentes es rechazado', () => {
    expect(() => topicSchema.parse({ ...valid, sources: [] })).toThrow(/fuente/);
  });

  test('un tema sin tipo de recurso o caso de uso es rechazado', () => {
    expect(() => topicSchema.parse({ ...valid, resourceType: undefined })).toThrow(
      /tipo de recurso/,
    );
    expect(() => topicSchema.parse({ ...valid, useCase: undefined })).toThrow(/caso de uso/);
  });

  test('un tema sin concept es rechazado', () => {
    const { concept: _concept, ...withoutConcept } = valid;

    expect(() => topicSchema.parse(withoutConcept)).toThrow(/concepto/);
  });

  test('un título distinto al de la consigna es rechazado', () => {
    expect(() => topicSchema.parse({ ...valid, title: 'Otro' })).toThrow(/consigna/);
  });

  test('una fase distinta a la de la consigna es rechazada', () => {
    expect(() => topicSchema.parse({ ...valid, phase: 2 })).toThrow(/consigna/);
  });

  test('un número que la consigna no lista es rechazado', () => {
    expect(() => topicSchema.parse({ ...valid, number: 6, phase: 2 })).toThrow(/consigna/);
  });

  test('un tema necesita dos temas relacionados y una referencia a clase', () => {
    expect(() => topicSchema.parse({ ...valid, related: ['dron-reparto'] })).toThrow(
      /relacionados/,
    );
    expect(() => topicSchema.parse({ ...valid, classRefs: [] })).toThrow(/clase/);
  });

  test('un estado en el frontmatter es rechazado: no hay temas a medias', () => {
    expect(() => topicSchema.parse({ ...valid, status: 'proximamente' })).toThrow();
  });
});
