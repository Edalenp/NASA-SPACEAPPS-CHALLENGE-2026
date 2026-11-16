import { defineConfig } from '@playwright/test';

/** Production only: service workers are deliberately disabled in the development server. */
export default defineConfig({
  testDir: './e2e-production',
  outputDir: './test-results/pwa',
  workers: 1,
  timeout: 180_000,
  use: {
    baseURL: 'http://127.0.0.1:4180',
    viewport: { width: 1440, height: 1000 },
    launchOptions: { args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4180 --strictPort',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: false,
  },
});
