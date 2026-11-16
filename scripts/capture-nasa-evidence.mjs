// Run against a local Vite development server. Uses an isolated browser context;
// simulation records never touch the user's browser or an existing crew profile.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const baseURL = process.argv[2] ?? 'http://127.0.0.1:4190';
const target = new URL('../public/landing/evidence/', import.meta.url);
await mkdir(target, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('vt-tour-seen', 'seen');
    localStorage.setItem('vt-first-check-welcome:JL–02', 'seen');
    localStorage.setItem('vt-habitat-motion', 'paused');
  });
  await page.goto(`${baseURL}/lab`);
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 });
  await page.evaluate(async () => {
    const path = '/src/store/mission.ts';
    const { useMission } = await import(path);
    await useMission.getState().loadSimulation();
    useMission.setState({ selected: 'bones', focus: null, environment: 'rover' });
    useMission.getState().open('system');
  });
  await page.getByRole('dialog').screenshot({ path: fileURLToPath(new URL('hrp.png', target)) });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.evaluate(async () => { const path = '/src/store/mission.ts'; const { useMission } = await import(path); useMission.getState().open('trends'); });
  await page.locator('.history-controls select').first().selectOption('glucose');
  await page.getByRole('dialog').screenshot({ path: fileURLToPath(new URL('osd575.png', target)) });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.evaluate(async () => { const path = '/src/store/mission.ts'; const { useMission } = await import(path); useMission.getState().open('guides', { guide: 'systolic' }); });
  await page.getByText('Equipment & sources', { exact: true }).click();
  await page.getByText('Medical Diagnostic Pack', { exact: false }).waitFor();
  await page.locator('.inline-guide-art svg').waitFor();
  await page.waitForTimeout(1000);
  await page.getByRole('dialog').screenshot({ path: fileURLToPath(new URL('iss-kit.png', target)) });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.evaluate(async () => { const path = '/src/store/mission.ts'; const { useMission } = await import(path); useMission.getState().open('mission'); });
  await page.locator('.radiation-meter').screenshot({ path: fileURLToPath(new URL('radiation.png', target)) });
  // DONKI: the labelled replay of the May 2024 storm, so the card shows an alert and its actions.
  await page.getByRole('button', { name: /Replay May 2024 storm/ }).click();
  await page.locator('.sw-card.is-alert').waitFor();
  await page.locator('.sw-card').screenshot({ path: fileURLToPath(new URL('donki.png', target)) });
  console.log('Captured five unaltered lab views. OSD-575 chart uses clearly labelled simulation readings.');
} finally { await browser.close(); }
