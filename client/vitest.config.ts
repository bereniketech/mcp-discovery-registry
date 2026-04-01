import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/components/AuthButton.tsx',
        'src/components/SearchBar.tsx',
        'src/components/ServerCard.tsx',
        'src/components/ConfigGenerator.tsx',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
});
