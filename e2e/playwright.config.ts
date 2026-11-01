// E2E-1: una sola configuracion; el entorno lo fija e2e/run.mjs. Sin reintentos: una falla se ve como falla. Sin trazas ni video: llevarian claves.
import { defineConfig, devices } from '@playwright/test';
import { baseURL } from './lib/guard';

export default defineConfig({
  testDir: './flows',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 30_000 },
  outputDir: './.results',
  reporter: [['list'], ['html', { outputFolder: './.report', open: 'never' }], ['json', { outputFile: './.run/resultado.json' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: baseURL(),
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    serviceWorkers: 'block',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
});
