import { expect, test } from '@playwright/test';

for (const time of ['2026-11-16T00:00:00.000Z', '2026-11-16T02:19:00.000Z']) {
  test(`loads a complete labelled simulation before morning at ${time}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install({ time: new Date(time) });
    await page.addInitScript(() => {
      localStorage.setItem('vt-mission-start', '2026-10-06T00:00:00.000Z');
      localStorage.setItem('vt-tour-seen', 'seen');
      sessionStorage.setItem('vt-tour-seen', 'seen');
      localStorage.setItem('vt-first-check-welcome:JL–02', 'seen');
      localStorage.setItem('vt-first-check-welcome:JL–02:2026-11-16', 'seen');
      localStorage.setItem('vt-habitat-motion', 'paused');
    });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/lab');
    await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 });
    await page.getByRole('button', { name: 'Trends', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Load mission simulation', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Load mission simulation', exact: true })).toBeEnabled({ timeout: 30_000 });
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Daily check-in: 7 of 7 NEWS2 observations, 7 simulated', exact: true })).toBeVisible();
    await page.reload();
    await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 });
    await expect(page.getByRole('button', { name: 'Daily check-in: 7 of 7 NEWS2 observations, 7 simulated', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Routine', exact: true }).click();
    await expect(dialog.locator('.check-score-summary')).toContainText('includes simulation');
    await expect(dialog.getByRole('button', { name: 'Air or oxygen, simulated reading', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Consciousness, simulated reading', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
