import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'npm run dev --workspace @mcp-registry/client -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      VITE_API_BASE_URL: 'http://127.0.0.1:4173/api/v1',
      VITE_E2E_ACCESS_TOKEN: 'e2e-access-token',
    },
  },
});
