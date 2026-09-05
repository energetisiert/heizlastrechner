import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      // engine.ts/dataset.ts importieren 'server-only' als Bundling-Schutz; im
      // Node-Testlauf gibt es keinen React-Server-Kontext, daher gestubbt.
      'server-only': path.resolve(__dirname, 'lib/test/server-only-stub.ts'),
      '@': __dirname,
    },
  },
});
