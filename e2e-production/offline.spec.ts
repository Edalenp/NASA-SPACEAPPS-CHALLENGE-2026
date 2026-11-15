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
  await expect(story.locator('.nasa-source a')).toHaveCount(6);
  await expect(story).toContainText('not a personal per-event exposure limit');
  await expect(story).toContainText('The kit list is the 2015 checklist');
  await expect(story.getByRole('link', { name: 'CSA radiation guidance' })).toHaveAttribute('href', 'https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/radiation.asp');
  await expect(story).toContainText('NASA DONKI');
  await expect(story).toContainText('not clinical limits or a personal baseline');
  await story.screenshot({ path: testInfo.outputPath('nasa-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await story.screenshot({ path: testInfo.outputPath('nasa-mobile.png') });
  expect(await story.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.locator('.lab-intro').screenshot({ path: testInfo.outputPath('install-mobile.png') });
  await page.locator('.closing').screenshot({ path: testInfo.outputPath('closing-mobile.png') });
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
  // Space weather still answers offline, from the list kept on the device or the built-in DONKI copy.
  await expect(page.locator('.sw-tag')).toContainText('Space weather');
  await page.locator('.sw-tag').click();
  await expect(page.locator('.sw-card')).toContainText('NASA DONKI');
  await page.getByRole('button', { name: /Replay May 2024 storm/ }).click();
  await expect(page.locator('.sw-card')).toContainText('Solar particle event in progress.');
  await page.getByRole('button', { name: /Back to live/ }).click();
  await page.keyboard.press('Escape');
  const cached = await page.evaluate(async () => {
    const paths = ['/models/anatomy-male.glb', '/models/anatomy-female.glb', '/models/female-muscles-fit.glb', '/landing/lab-twin.jpg', '/landing/evidence/hrp.png', '/landing/evidence/osd575.png', '/landing/evidence/iss-kit.png', '/landing/evidence/radiation.png'];
    return Promise.all(paths.map(async path => { const response = await fetch(path); return { path, ok: response.ok, bytes: (await response.arrayBuffer()).byteLength }; }));
  });
  expect(cached.every(resource => resource.ok && resource.bytes > 1000)).toBe(true);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'NASA research, working on board.' })).toBeVisible();
  await page.locator('.lab').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('.lab-shot img').first().evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('evidence viewer switches, expands and opens the matching lab view without adding demo data', async ({ page }, testInfo) => {
  await page.goto('/');
  const story = page.locator('.nasa-story');
  await expect(story.locator('.evidence-desktop img')).toHaveAttribute('src', '/landing/evidence/osd575.png');
  await story.getByRole('button', { name: /View lab evidence.*ISS medical kit/ }).click();
  await expect(story.locator('.evidence-desktop img')).toHaveAttribute('src', '/landing/evidence/iss-kit.png');
  await story.getByRole('button', { name: /Enlarge ISS checklist/ }).click();
  await expect(page.getByRole('dialog', { name: /enlarged capture/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.locator('.evidence-desktop').screenshot({ path: testInfo.outputPath('evidence-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(story.locator('.evidence-inline img')).toBeVisible();
  await story.locator('.evidence-inline').screenshot({ path: testInfo.outputPath('evidence-mobile.png') });
  await story.locator('.evidence-inline').getByRole('link', { name: 'See it in the lab' }).click();
  await expect(page.getByRole('dialog', { name: 'Measure with confidence.' })).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('.inline-guide-heading')).toContainText('Systolic pressure');
  await page.goto('/lab?evidence=osd575');
  await expect(page.getByRole('dialog', { name: 'A view across the mission.' })).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('.history-controls select').first()).toHaveValue('glucose');
  await expect(page.getByRole('dialog')).toContainText('No readings in this window.');
  await page.goto('/lab?evidence=hrp');
  await expect(page.getByRole('dialog')).toContainText('HRP risk records', { timeout: 120_000 });
  await page.goto('/lab?evidence=radiation');
  await expect(page.getByRole('dialog')).toContainText('Radiation dose', { timeout: 120_000 });
});

test('offers install help, invokes an available installer and recognises installation', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    // A deterministic fallback check, independent of the browser's install-promotion heuristics.
    window.addEventListener('beforeinstallprompt', event => {
      if (!(event as Event & { testPrompt?: boolean }).testPrompt) event.stopImmediatePropagation();
    }, true);
  });
  await page.goto('/');
  const access = page.locator('.lab-intro .pwa-access');
  await access.scrollIntoViewIfNeeded();
  const headingTop = await page.locator('#lab-title').evaluate(node => node.getBoundingClientRect().top + window.scrollY);
  const statusTop = await access.locator('.pwa-state').evaluate(node => node.getBoundingClientRect().top + window.scrollY);
  await access.getByText('How to install', { exact: true }).click();
  const help = page.getByRole('dialog', { name: 'Install VITRUVIO' });
  await expect(help).toContainText('Add to Home Screen');
  expect(Math.abs(await page.locator('#lab-title').evaluate(node => node.getBoundingClientRect().top + window.scrollY) - headingTop)).toBeLessThan(1);
  expect(Math.abs(await access.locator('.pwa-state').evaluate(node => node.getBoundingClientRect().top + window.scrollY) - statusTop)).toBeLessThan(1);
  await help.screenshot({ path: testInfo.outputPath('install-desktop.png') });
  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
  await expect(access.getByRole('button', { name: 'How to install' })).toBeFocused();
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
  const help = page.getByRole('dialog', { name: 'Install VITRUVIO' });
  const bounds = await help.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await help.screenshot({ path: testInfo.outputPath('connection-mobile.png') });
});

test('evidence parallax moves with scroll and stops when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const row = page.locator('.nasa-contributions > li').first();
  await row.scrollIntoViewIfNeeded();
  const drift = page.locator('.evidence-drift');
  const before = await drift.evaluate(node => getComputedStyle(node).transform);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => drift.evaluate(node => getComputedStyle(node).transform), { timeout: 15_000 }).not.toBe(before);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => drift.evaluate(node => getComputedStyle(node).transform)).toBe('none');
  await expect.poll(() => row.evaluate(node => getComputedStyle(node).opacity)).toBe('1');
});
