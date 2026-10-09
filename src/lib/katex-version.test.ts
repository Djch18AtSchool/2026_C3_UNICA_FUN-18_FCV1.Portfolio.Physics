// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const projectRequire = createRequire(import.meta.url);

describe('katex version', () => {
  test('rehype-katex resolves the same katex version as the project stylesheet', () => {
    // Arrange
    const projectVersion = projectRequire('katex/package.json').version;
    const rehypeRequire = createRequire(projectRequire.resolve('rehype-katex'));

    // Act
    const rehypeVersion = rehypeRequire('katex/package.json').version;

    // Assert
    expect(rehypeVersion).toBe(projectVersion);
  });
});
