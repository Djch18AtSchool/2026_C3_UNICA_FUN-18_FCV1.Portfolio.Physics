import { describe, expect, test } from 'vitest';
import { markdownSource, readingMinutes } from './readingTime';

const IMPORTS = `import Figure from '../../components/ui/Figure.astro';
import UseCase from '../../components/ui/UseCase.astro';
`;

function words(count: number): string {
  return Array.from({ length: count }, (_, i) => `palabra${i}`).join(' ');
}

describe('readingMinutes', () => {
  test('400 palabras y 2 figuras se leen en 3 minutos', () => {
    // Arrange: each Figure tag is 3 tokens, so the prose has 394 words (400 in all).
    const body = `${IMPORTS}\n${words(394)}\n\n<Figure n={1} />\n\n<Figure n={2} />\n`;

    // Act
    const minutes = readingMinutes(body);

    // Assert: round(400 / 200 + 2 · 0,5) = 3
    expect(minutes).toBe(3);
  });

  test('las líneas de import no cuentan como palabras', () => {
    const imports = Array.from({ length: 60 }, (_, i) => `import C${i} from './c${i}.astro';`);

    expect(readingMinutes(`${imports.join('\n')}\n${words(300)}`)).toBe(2);
  });

  test('el frontmatter no cuenta como palabras', () => {
    const frontmatter = `---\ntitle: ${words(500)}\n---\n`;

    expect(readingMinutes(`${frontmatter}${words(300)}`)).toBe(2);
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
});
