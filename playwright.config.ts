import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Pixel 7'],
    locale: 'de-CH',
    timezoneId: 'Europe/Zurich',
    acceptDownloads: true,
  },
  projects: [{ name: 'mobile-chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
