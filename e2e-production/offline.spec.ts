import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('vt-tour-seen', 'seen');
    localStorage.setItem('vt-first-check-welcome:JL–02', 'seen');
    localStorage.setItem('vt-habitat-motion', 'paused');
  });
});

test('first landing visit prepares an offline lab with persistent readings and images', async ({ page, context }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'Ready offline' })).toBeVisible({ timeout: 90_000 });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const story = page.getByRole('region', { name: 'NASA research, working on board.' });
  await story.scrollIntoViewIfNeeded();
  await expect(story.getByRole('link')).toHaveCount(3);
  await expect(story).toContainText('not clinical limits or a personal baseline');
  await story.screenshot({ path: testInfo.outputPath('nasa-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await story.screenshot({ path: testInfo.outputPath('nasa-mobile.png') });
  expect(await story.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.locator('.lab-intro').screenshot({ path: testInfo.outputPath('install-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });

  // Remove the ordinary HTTP cache so a successful offline visit proves service-worker caching.
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.clearBrowserCache');
  await context.setOffline(true);
  await page.goto('/lab');
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 });
  await page.locator('.connection > summary').click();
  await expect(page.locator('.connection-body')).toContainText('Ready offline');
  await page.locator('.connection > summary').click();
  await page.locator('.inspector-actions .btn-solid').click();
  const form = page.getByRole('dialog');
  await form.getByRole('button', { name: 'Heart rate', exact: true }).click();
  await form.locator('input#value').fill('72');
  await form.getByRole('button', { name: /save reading/i }).click();
  await expect(form).toBeHidden();
  await page.reload();
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 });
  await expect(page.locator('.readout')).toContainText('72');
  await expect(page.locator('#medical-viewport canvas')).toBeVisible();
  const cached = await page.evaluate(async () => {
    const paths = ['/models/anatomy-male.glb', '/models/anatomy-female.glb', '/models/female-muscles-fit.glb', '/landing/lab-twin.jpg'];
    return Promise.all(paths.map(async path => { const response = await fetch(path); return { path, ok: response.ok, bytes: (await response.arrayBuffer()).byteLength }; }));
  });
  expect(cached.every(resource => resource.ok && resource.bytes > 1000)).toBe(true);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'NASA research, working on board.' })).toBeVisible();
  await page.locator('.lab').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('.lab-shot img').first().evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('offers install help, invokes an available installer and recognises installation', async ({ page }) => {
  await page.addInitScript(() => {
    // A deterministic fallback check, independent of the browser's install-promotion heuristics.
    window.addEventListener('beforeinstallprompt', event => {
      if (!(event as Event & { testPrompt?: boolean }).testPrompt) event.stopImmediatePropagation();
    }, true);
  });
  await page.goto('/');
  const access = page.locator('.lab-intro .pwa-access');
  await access.getByText('How to install', { exact: true }).click();
  await expect(access).toContainText('Add to Home Screen');
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { testPrompt: true, prompt: async () => { window.dispatchEvent(new Event('appinstalled')); return { outcome: 'accepted' }; } });
    window.dispatchEvent(event);
  });
  await access.getByRole('button', { name: 'Install VITRUVIO' }).click();
  await expect(access.getByText('Installed', { exact: true })).toBeVisible();
  await expect(access.getByRole('button', { name: 'Install VITRUVIO' })).toHaveCount(0);
});

test('connection and install controls fit a narrow lab viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/lab');
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 });
  await page.locator('.connection > summary').click();
  const panel = page.locator('.connection-body');
  await panel.getByText('How to install', { exact: true }).click();
  const bounds = await panel.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await panel.screenshot({ path: testInfo.outputPath('connection-mobile.png') });
});
