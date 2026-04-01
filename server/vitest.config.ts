import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/services/search.ts', 'src/services/vote.ts', 'src/services/trending.ts', 'src/services/github-fetcher.ts', 'src/services/tag.ts'],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 80,
        branches: 60,
        functions: 80,
        statements: 80,
      },
    },
  },
});
