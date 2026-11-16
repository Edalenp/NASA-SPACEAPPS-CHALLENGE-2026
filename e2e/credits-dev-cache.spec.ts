import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';

const run = promisify(execFile);

test('checking source credits keeps a running development app and its React modules available', async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const dependencies = new Set<string>();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (/\/node_modules\/\.vite\/deps\/react(?:-dom_client|_jsx-dev-runtime)?\.js\?/.test(response.url())) dependencies.add(response.url());
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.goto('/');
  await expect(page.locator('.landing')).toBeVisible({ timeout: 60_000 });
  expect(dependencies.size).toBeGreaterThanOrEqual(3);

  const checked = await run(process.execPath, ['scripts/sync-source-credits.mjs', '--check'], { timeout: 30_000 });
  expect(checked.stdout).toContain('source inventories match');
  for (const url of dependencies) {
    const response = await context.request.get(url);
    expect(response.status(), url).toBe(200);
  }

  await page.reload();
  await expect(page.locator('.landing')).toBeVisible({ timeout: 60_000 });
  expect(errors).toEqual([]);
});
