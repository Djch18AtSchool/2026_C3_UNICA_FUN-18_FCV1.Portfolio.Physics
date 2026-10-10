import { describe, expect, test } from 'vitest';
import { markdownSource, readingMinutes, readingStats } from './readingTime';

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

  test('el LaTeX de una Equation y la matemática entre $ no suman palabras', () => {
    // Arrange: 30 tokens in latex, 20 in an inline Equation, 20 in $…$ and 40 in $$…$$.
    const equation = `<Equation\n  id="ec-larga"\n  latex="${tokens(30)}"\n  symbols={[{ symbol: '${tokens(5)}', unit: 'm/s' }]}\n/>`;
    const math = `Con <Equation inline latex="v = ${tokens(20)}" /> y $${tokens(20)}$ y\n\n$$\n${tokens(40)}\n$$`;
    const withProse = (count: number) => `${words(count)}\n\n${equation}\n\n${math}\n`;

    // Act + Assert: "Con", "y", "y" are the only prose words besides the run of words.
    expect(readingMinutes(withProse(JUST_UNDER_TWO_MINUTES - 3))).toBe(1);
    expect(readingMinutes(withProse(JUST_UNDER_TWO_MINUTES - 2))).toBe(2);
  });

  test('las leyendas, notas, fuentes y textos de las props que lee el lector suman palabras', () => {
    // Arrange: 100 prose words plus 200 words spread over reader-facing props; 1 figure.
    const figure = `<Figure\n  type="visualizacion"\n  caption="${words(60)}"\n  source={{\n    text: '${words(30)}',\n  }}\n>\n  <Lab client:visible footnote="${words(40)}" />\n</Figure>`;
    const video = `<Video\n  markers={[\n    { time: 5, title: '${words(5)}', analysis:\n      "${words(25)}" },\n  ]}\n  transcript="${words(20)}"\n/>`;
    const equation = `<Equation latex="x" symbols={[{ symbol: 'k', meaning: '${words(15)}' }]} />`;
    const callout = `<Callout variant="clase" title="${words(5)}">\n\n${words(100)}\n\n</Callout>`;
    const body = `${callout}\n\n${figure}\n\n${video}\n\n${equation}\n`;

    // Act
    const stats = readingStats(body);

    // Assert: round(300 / 200 + 0,5) = 2
    expect(stats).toEqual({ proseWords: 100, propWords: 200, figures: 1 });
    expect(readingMinutes(body)).toBe(2);
  });

  test('las props que no se leen (id, latex, src, variant, símbolos) no suman palabras', () => {
    const tag = `<HapticVideo id="${tokens(10)}" src="${tokens(10)}" variant="${tokens(10)}" poster='${tokens(10)}' symbols={[{ symbol: '${tokens(10)}', unit: '${tokens(10)}' }]} />`;

    expect(readingStats(`${words(10)}\n${tag}`)).toEqual({
      proseWords: 10,
      propWords: 0,
      figures: 0,
    });
  });

  test('una leyenda en plantilla cuenta sus palabras y cada constante como una', () => {
    const body = '<Lab footnote={`La reproducción va ${TIME_LAPSE} veces más rápida`} />';
    const twice = '<Lab footnote={`Va ${SCALE} veces: dura ${60 / SCALE} s`} />';

    expect(readingStats(body).propWords).toBe(7);
    // Each interpolation reads as one value, and its two "$" are not inline math.
    expect(readingStats(twice).propWords).toBe(6);
  });

  test('una comilla de otro tipo dentro de la leyenda no la corta', () => {
    const body = `<Figure caption="Astro's Playroom, ${words(8)}" source={{ text: "Video del autor en Astro's Playroom" }} />`;

    expect(readingStats(body).propWords).toBe(16);
  });

  test('un nombre de prop dentro de la prosa no se toma por prop', () => {
    expect(readingStats(`El caption="no" de la prosa ${words(3)}`)).toEqual({
      proseWords: 8,
      propWords: 0,
      figures: 0,
    });
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
    const tag = `<Callout variant="a > b" data={{ f: (x) => x > 1 }}>`;

    expect(readingMinutes(`${tag}\n${words(JUST_UNDER_TWO_MINUTES)}\n</Callout>`)).toBe(1);
  });

  test('un "<" de la prosa no se toma por etiqueta', () => {
    // "x" and "3" are words; a bare "<" has no letter or digit and is not one.
    const body = `${words(JUST_UNDER_TWO_MINUTES - 1)} x < 3`;

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

  test('solo cuentan como palabras los fragmentos con una letra o una cifra', () => {
    expect(readingStats(`${words(4)} → · = — 9,81 m/s²`).proseWords).toBe(6);
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
