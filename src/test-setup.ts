import '@testing-library/jest-dom/vitest';
import { beforeAll } from 'vitest';
import { loadTexRenderer } from './components/lab/texRenderer';

// In the browser KaTeX loads on demand; tests render on the client, so load it once up front and
// every InlineMath typesets synchronously, as on the server. InlineMath.test.tsx resets it to
// test the lazy path.
beforeAll(async () => {
  await loadTexRenderer();
});
