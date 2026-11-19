import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'webkore.cases.mjs', fullyParallel: false, workers: 1,
  timeout: 60000, expect: { timeout: 10000 }, retries: 0,
  outputDir: `../../test-results/ct20/runs/${process.env.WEBKORE_CT20_DB_NAME || 'unprovisioned'}/browser`,
  reporter: [['list'], ['./report.mjs']],
  use: { baseURL: process.env.WEBKORE_CT20_ORIGIN, browserName: 'chromium',
    ...(process.env.WEBKORE_TEST_BROWSER_CHANNEL ? { channel: process.env.WEBKORE_TEST_BROWSER_CHANNEL } : {}),
    headless: true, viewport: { width: 1366, height: 900 },
    trace: 'retain-on-failure', screenshot: 'only-on-failure' }
});
