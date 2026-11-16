import { expect, test, type Locator } from '@playwright/test';
import { createServer } from 'vite';
import type { SourceCredit } from '../src/features/sources/catalog';
import { guides, ISS_KIT_SOURCE } from '../src/data/guides';
import { indicators, type IndicatorId } from '../src/data/indicators';

let inventory: SourceCredit[];
test.beforeAll(async () => {
  // Vite loads the same JSON-backed TS modules as the application, without altering Node's loaders.
  const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-source-tests', logLevel: 'error', server: { middlewareMode: true, hmr: false } });
  try {
    const { getProjectSources } = await server.ssrLoadModule('/src/features/sources/catalog.ts');
    inventory = getProjectSources();
  } finally { await server.close(); }
});

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('vt-tour-seen', 'seen');
    localStorage.setItem('vt-first-check-welcome:JL–02', 'seen');
    localStorage.setItem('vt-habitat-motion', 'paused');
  });
});

async function checkInventory(browser: Locator) {
  const entries = inventory;
  await expect(browser.locator('.shared-reference-list button')).toHaveCount(entries.length);
  for (const source of entries) {
    await browser.getByRole('button', { name: source.title, exact: true }).click();
    const detail = browser.locator('.shared-reference-entry');
    await expect(detail.getByRole('heading', { name: source.title, exact: true })).toBeVisible();
    const actual = await detail.getByRole('link').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')).sort());
    expect(actual).toEqual(source.links.map(link => link.url).sort());
    await expect(detail).toContainText(source.kind);
  }
}

test('landing and offline laboratory expose identical source inventories and local notices', async ({ page, context }, testInfo) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'Ready offline' })).toBeVisible({ timeout: 90_000 });
  await page.locator('.closing-source-link').click();
  const landing = page.locator('#resources');
  await expect(landing).toHaveAttribute('open', '');
  await checkInventory(landing);
  const closingLinks = page.locator('.closing-source-links a');
  for (const node of await closingLinks.all()) {
    expect(await node.getAttribute('href')).toMatch(/^https:\/\//);
    expect(await node.getAttribute('rel')).toContain('noopener');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await landing.getByRole('button', { name: /Interface assets/ }).click();
  expect(await landing.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await landing.screenshot({ path: testInfo.outputPath('sources-landing-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await landing.screenshot({ path: testInfo.outputPath('sources-landing-desktop.png') });

  // Require the SW cache rather than the ordinary HTTP cache for the unvisited lab and notices.
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.clearBrowserCache');
  await context.setOffline(true);
  await page.goto('/lab');
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 });
  await page.getByRole('button', { name: 'Sources and credits' }).click();
  const dialog = page.getByRole('dialog');
  await checkInventory(dialog);
  await dialog.getByRole('button', { name: /Interface assets/ }).click();
  await dialog.screenshot({ path: testInfo.outputPath('sources-lab-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(await dialog.locator('.shared-reference-sources').evaluate(node => node.getBoundingClientRect().width)).toBeGreaterThan(300);
  await dialog.screenshot({ path: testInfo.outputPath('sources-lab-mobile.png') });
  const localLinks = [...new Set(inventory.flatMap(source => source.links).filter(link => link.url.startsWith('/')).map(link => link.url))];
  const fetched = await page.evaluate(async paths => Promise.all(paths.map(async path => {
    const response = await fetch(path);
    return { path, status: response.status, text: await response.text() };
  })), localLinks);
  for (const result of fetched) {
    expect(result.status, result.path).toBe(200);
    expect(result.text.length, result.path).toBeGreaterThan(100);
    expect(result.text, result.path).not.toContain('<!doctype html>');
  }
  expect(errors).toEqual([]);
});

test('mission and equipment cards cite the sources of their own content', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await page.goto('/lab?evidence=radiation');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Radiation dose', { timeout: 120_000 });
  await dialog.getByText('Radiation sources and scope', { exact: true }).click();
  const radiation = dialog.locator('.dose-sources');
  await expect(radiation.getByRole('link', { name: /NASA-STD-3001/ })).toHaveAttribute('href', /nasa-std-3001-vol-1-rev-c-signature\.pdf$/);
  await expect(radiation.getByRole('link', { name: /OCHMO-TB-020/ })).toHaveAttribute('href', /ochmo-tb-020-radiation-protection\.pdf$/);
  await expect(radiation.getByRole('link', { name: /Canadian Space Agency/ })).toHaveAttribute('href', /space-medicine\/radiation\.asp$/);
  await expect(radiation).toContainText('not used as NASA effective-dose requirements');
  await dialog.screenshot({ path: testInfo.outputPath('mission-sources.png') });

  await page.goto('/lab?evidence=iss-kit');
  await expect(page.getByRole('dialog', { name: 'Measure with confidence.' })).toBeVisible({ timeout: 120_000 });
  for (const [id, guide] of Object.entries(guides)) {
    await page.getByRole('dialog').getByRole('button', { name: indicators[id as IndicatorId].name, exact: true }).click();
    const card = page.locator('.guides-active .inline-guide');
    await card.getByText('Equipment & sources', { exact: true }).click();
    const sources = card.locator('.inline-guide-sources');
    if (guide.source) await expect(sources.getByRole('link', { name: guide.source.title, exact: true })).toHaveAttribute('href', guide.source.url);
    else await expect(sources).toContainText('Self-report');
    if (guide.kit || guide.kitNote?.includes('2015')) {
      await expect(sources.getByRole('link', { name: /NASA · ISS equipment checklist/ })).toHaveAttribute('href', ISS_KIT_SOURCE.url);
    }
    if (guide.sourceScope) await expect(sources).toContainText(guide.sourceScope);
  }
  await page.getByRole('dialog').getByRole('button', { name: 'Systolic pressure', exact: true }).click();
  await page.locator('.inline-guide-sources > summary').click();
  await page.getByRole('dialog').screenshot({ path: testInfo.outputPath('equipment-sources.png') });
});
