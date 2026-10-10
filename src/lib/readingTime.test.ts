import { describe, expect, test } from 'vitest';
import { markdownSource, readingMinutes } from './readingTime';

const IMPORTS = `import Figure from '../../components/ui/Figure.astro';
import UseCase from '../../components/ui/UseCase.astro';
`;
/** 299 words read in round(1.495) = 1 minute; one more word would make it 2. */
const JUST_UNDER_TWO_MINUTES = 299;

function words(count: number): string {
  return Array.from({ length: count }, (_, i) => `palabra${i}`).join(' ');
}

function tokens(count: number): string {
  return Array.from({ length: count }, (_, i) => `t${i}`).join(' ');
}

describe('readingMinutes', () => {
  test('400 palabras de prosa y 2 figuras se leen en 3 minutos', () => {
    // Arrange
    const body = `${IMPORTS}\n${words(400)}\n\n<Figure n={1} caption="Una figura con leyenda larga" />\n\n<Figure\n  n={2}\n  src="b.svg"\n/>\n`;

    // Act
    const minutes = readingMinutes(body);

    // Assert: round(400 / 200 + 2 · 0,5) = 3
    expect(minutes).toBe(3);
  });

  test('una Equation de 60 fragmentos y la matemática entre $ no suman palabras', () => {
    // Arrange: 60 tokens inside the tag, 20 in an inline Equation, 20 in $…$ and 40 in $$…$$.
    const equation = `<Equation\n  id="ec-larga"\n  latex="${tokens(30)}"\n  symbols={[{ symbol: 'g', meaning: '${tokens(30)}' }]}\n/>`;
    const math = `Con <Equation inline latex="v = ${tokens(20)}" /> y $${tokens(20)}$ y\n\n$$\n${tokens(40)}\n$$`;
    const withProse = (count: number) => `${words(count)}\n\n${equation}\n\n${math}\n`;

    // Act + Assert: "Con", "y", "y" are the only prose words besides the run of words.
    expect(readingMinutes(withProse(JUST_UNDER_TWO_MINUTES - 3))).toBe(1);
    expect(readingMinutes(withProse(JUST_UNDER_TWO_MINUTES - 2))).toBe(2);
  });

  test('la prosa dentro de las etiquetas sí cuenta, las etiquetas no', () => {
    const body = `<UseCase>\n\n<Fragment slot="caso">\n\n${words(JUST_UNDER_TWO_MINUTES + 1)}\n\n</Fragment>\n\n</UseCase>`;

    expect(readingMinutes(body)).toBe(2);
    expect(
      readingMinutes(
        body.replace(words(JUST_UNDER_TWO_MINUTES + 1), words(JUST_UNDER_TWO_MINUTES)),
      ),
    ).toBe(1);
  });

  test('un ">" entre comillas o llaves no cierra la etiqueta', () => {
    const tag = `<Callout title="a > b" data={{ f: (x) => x > 1 }}>`;

    expect(readingMinutes(`${tag}\n${words(JUST_UNDER_TWO_MINUTES)}\n</Callout>`)).toBe(1);
  });

  test('un "<" de la prosa no se toma por etiqueta', () => {
    const body = `${words(JUST_UNDER_TWO_MINUTES - 2)} x < 3`;

    expect(readingMinutes(body)).toBe(2);
  });

  test('una etiqueta sin cerrar se ignora hasta el final sin lanzar', () => {
    expect(readingMinutes(`${words(JUST_UNDER_TWO_MINUTES + 1)} <Callout title="sin cerrar`)).toBe(
      2,
    );
  });

  test('los bloques de código no cuentan, ni sus figuras', () => {
    const fence = `\`\`\`tsx\n${tokens(80)}\n<Figure n={9} />\n<Figure n={10} />\n\`\`\``;

    expect(readingMinutes(`${words(JUST_UNDER_TWO_MINUTES)}\n\n${fence}\n`)).toBe(1);
  });

  test('las líneas de import no cuentan como palabras', () => {
    const imports = Array.from({ length: 60 }, (_, i) => `import C${i} from './c${i}.astro';`);

    expect(readingMinutes(`${imports.join('\n')}\n${words(JUST_UNDER_TWO_MINUTES)}`)).toBe(1);
  });

  test('el frontmatter no cuenta como palabras', () => {
    const frontmatter = `---\ntitle: ${words(500)}\n---\n`;

    expect(readingMinutes(`${frontmatter}${words(JUST_UNDER_TWO_MINUTES)}`)).toBe(1);
  });

  test('un cuerpo vacío o muy corto dura al menos un minuto', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('Hola.')).toBe(1);
  });
});

describe('markdownSource', () => {
  test('quita las líneas de import y conserva el resto del cuerpo', () => {
    const body = `${IMPORTS}\nIntroducción del tema.\n\n<Figure n={1} />\n`;

    expect(markdownSource(body)).toBe('Introducción del tema.\n\n<Figure n={1} />');
  });

  test('conserva una línea que menciona import a mitad de frase', () => {
    const body = 'El motor import a la escena.\n  import indentado no es de MDX';

    expect(markdownSource(body)).toBe(body);
  });

  test('conserva los import dentro de un bloque de código', () => {
    const fence = '```python\nimport numpy as np\nprint(np.pi)\n```';
    const body = `${IMPORTS}\nUn ejemplo:\n\n${fence}\n\n~~~\nimport os\n~~~`;

    expect(markdownSource(body)).toBe(`Un ejemplo:\n\n${fence}\n\n~~~\nimport os\n~~~`);
  });
});
