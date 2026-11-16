// Run against a local Vite development server. Uses an isolated browser context;
// simulation records never touch the user's browser or an existing crew profile.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const baseURL = process.argv[2] ?? 'http://127.0.0.1:4190';
const target = new URL('../public/landing/evidence/', import.meta.url);
await mkdir(target, { recursive: true });
// CHROME_PATH lets the script use an installed Chrome or Chromium instead of Playwright's own.
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('vt-tour-seen', 'seen');
    // The tour and the X-ray hint open once per session.
    sessionStorage.setItem('vt-tour-seen', 'seen');
    sessionStorage.setItem('vt-xray-hint', 'seen');
    localStorage.setItem('vt-first-check-welcome:JL–02', 'seen');
    // The day's check-in card shows once per mission day; mark today's as seen too.
    localStorage.setItem(`vt-first-check-welcome:JL–02:${new Date().toISOString().slice(0, 10)}`, 'seen');
    localStorage.setItem('vt-habitat-motion', 'paused');
  });
  // Crop the page to the element's box: the habitat keeps rendering behind a dialog, so
  // Playwright's element screenshot never sees it as stable.
  const shot = async (locator, name) => {
    await locator.waitFor();
    await page.waitForTimeout(600);
    const box = await locator.boundingBox();
    await page.screenshot({ path: fileURLToPath(new URL(name, target)), clip: box, animations: 'disabled' });
  };
  // Panels close through the store: a dialog's own Close can be covered by the next one's
  // opening transition.
  const closePanel = async () => {
    await page.evaluate(async () => { const path = '/src/store/mission.ts'; const { useMission } = await import(path); useMission.setState({ panel: null }); });
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  };
  await page.goto(`${baseURL}/lab`);
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 });
  await page.evaluate(async () => {
    const path = '/src/store/mission.ts';
    const { useMission } = await import(path);
    await useMission.getState().loadSimulation();
    useMission.setState({ selected: 'bones', focus: null, environment: 'rover' });
    useMission.getState().open('system');
  });
  await shot(page.getByRole('dialog'), 'hrp.png');
  await closePanel();
  await page.evaluate(async () => { const path = '/src/store/mission.ts'; const { useMission } = await import(path); useMission.getState().open('trends'); });
  await page.locator('.history-controls select').first().selectOption('glucose');
  await shot(page.getByRole('dialog'), 'osd575.png');
  await closePanel();
  await page.evaluate(async () => { const path = '/src/store/mission.ts'; const { useMission } = await import(path); useMission.getState().open('guides', { guide: 'systolic' }); });
  await page.getByText('Equipment & sources', { exact: true }).click();
  await page.getByText('Medical Diagnostic Pack', { exact: false }).waitFor();
  await page.locator('.inline-guide-art svg').waitFor();
  await page.waitForTimeout(1000);
  await shot(page.getByRole('dialog'), 'iss-kit.png');
  await closePanel();
  await page.evaluate(async () => { const path = '/src/store/mission.ts'; const { useMission } = await import(path); useMission.getState().open('mission'); });
  await shot(page.locator('.radiation-meter'), 'radiation.png');
  // DONKI: the labelled replay of the May 2024 storm, so the card shows an alert and its actions.
  await page.getByRole('button', { name: /Replay May 2024 storm/ }).click();
  await page.locator('.sw-card.is-alert').waitFor();
  await shot(page.locator('.sw-card'), 'donki.png');
  console.log('Captured five unaltered lab views. OSD-575 chart uses clearly labelled simulation readings.');
} finally { await browser.close(); }
