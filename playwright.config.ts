import { defineConfig, devices } from '@playwright/test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const root = dirname(fileURLToPath(import.meta.url))
const viteBin = resolve(root, 'node_modules', 'vite', 'bin', 'vite.js')
const port = Number(process.env.E2E_PORT ?? 4173)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('E2E_PORT must be a valid TCP port')
const baseURL = `http://127.0.0.1:${port}`
const serverCommand = `"${process.execPath}" "${viteBin}" --host 127.0.0.1 --port ${port} --strictPort`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=swiftshader'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Resolve the local Vite binary and the current Node executable directly: no global pnpm shim,
    // no manual dev server. The port must be free; reuse is disabled for a deterministic run.
    command: serverCommand,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
