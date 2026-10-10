/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    passWithNoTests: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/components/**'],
      // Astro components render only at build time (checked by the build and e2e); test kits
      // are fixtures.
      exclude: ['src/**/*.test.*', 'src/**/*.astro', 'src/**/*TestKit.ts'],
      reporter: ['text', 'html'],
      thresholds: {
        'src/lib/**': { lines: 80, functions: 80, branches: 80, statements: 80 },
        'src/components/**': { lines: 80, statements: 80 },
      },
    },
  },
});
