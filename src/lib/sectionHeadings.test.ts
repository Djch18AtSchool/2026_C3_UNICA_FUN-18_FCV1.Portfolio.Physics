import { describe, expect, test } from 'vitest';
import { collectSectionHeadings, SECTION_HEADINGS, stepHeading } from './sectionHeadings';

const BODY = `import Figure from '../../components/ui/Figure.astro';

Introducción.

<Step n={1} title="Qué se mide">

Texto del paso.

</Step>

<Step title='Qué falta: tiempo al ápice' n={3}>

</Step>

<UseCase>

<Fragment slot="caso">…</Fragment>

</UseCase>

## Recurso de apoyo

### Detalle

\`\`\`md
## No es un encabezado
<Sources />
\`\`\`

<Connections related={frontmatter.related} classRefs={frontmatter.classRefs}>

Texto.

</Connections>

<Sources sources={frontmatter.sources} />
`;

const RENDERED = [
  { depth: 2, text: 'Recurso de apoyo', slug: 'recurso-de-apoyo' },
  { depth: 3, text: 'Detalle', slug: 'detalle' },
];

describe('stepHeading', () => {
  test('names the step and anchors to its section', () => {
    expect(stepHeading(3, 'Qué falta: tiempo al ápice')).toEqual({
      text: 'Paso 3 · Qué falta: tiempo al ápice',
      slug: 'paso-3',
    });
  });
});

describe('collectSectionHeadings', () => {
  test('merges component sections with markdown headings in source order', () => {
    expect(collectSectionHeadings(BODY, RENDERED)).toEqual([
      { depth: 2, text: 'Paso 1 · Qué se mide', slug: 'paso-1' },
      { depth: 2, text: 'Paso 3 · Qué falta: tiempo al ápice', slug: 'paso-3' },
      { depth: 2, ...SECTION_HEADINGS.UseCase },
      { depth: 2, text: 'Recurso de apoyo', slug: 'recurso-de-apoyo' },
      { depth: 3, text: 'Detalle', slug: 'detalle' },
      { depth: 2, ...SECTION_HEADINGS.Connections },
      { depth: 2, ...SECTION_HEADINGS.Sources },
    ]);
  });

  test('keeps rendered headings it could not place, at the end', () => {
    const extra = { depth: 2, text: 'Desde un componente', slug: 'desde-un-componente' };
    expect(collectSectionHeadings('Sin encabezados.', [extra])).toEqual([extra]);
  });

  test('reads an opening tag wrapped over several lines, with ">" inside the title', () => {
    const body = [
      '<Step',
      '  n={3}',
      '  title="Cuando v > 0: tiempo al ápice"',
      '>',
      '',
      'Texto.',
      '',
      '</Step>',
    ].join('\n');

    expect(collectSectionHeadings(body, [])).toEqual([
      { depth: 2, text: 'Paso 3 · Cuando v > 0: tiempo al ápice', slug: 'paso-3' },
    ]);
  });

  test('reads a wrapped section component tag', () => {
    const body = [
      '<Connections',
      '  related={frontmatter.related}',
      '  classRefs={frontmatter.classRefs}',
      '>',
    ].join('\n');

    expect(collectSectionHeadings(body, [])).toEqual([
      { depth: 2, ...SECTION_HEADINGS.Connections },
    ]);
  });

  test('fails loudly, naming the file and line, when a Step lacks a readable n or title', () => {
    const body = ['Intro.', '', '<Step n={2}>', '</Step>'].join('\n');

    expect(() => collectSectionHeadings(body, [], 'salto-personaje.mdx')).toThrow(
      /salto-personaje\.mdx.*línea 3.*<Step>/,
    );
    expect(() => collectSectionHeadings('<Step title={titulo} n={1}>', [], 'x.mdx')).toThrow(Error);
  });

  test('fails loudly when a component tag is never closed', () => {
    expect(() => collectSectionHeadings('<Step n={1} title="Sin cierre"', [], 'x.mdx')).toThrow(
      /x\.mdx.*línea 1/,
    );
  });

  test('the section components carry their fixed anchors', () => {
    expect(SECTION_HEADINGS.UseCase.slug).toBe('caso-de-uso');
    expect(SECTION_HEADINGS.Connections.slug).toBe('conexiones');
    expect(SECTION_HEADINGS.Sources.slug).toBe('fuentes');
  });
});
