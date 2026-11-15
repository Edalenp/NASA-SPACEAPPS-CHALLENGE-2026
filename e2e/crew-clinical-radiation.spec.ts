import { expect, test } from '@playwright/test';

test('preserves legacy radiation for Jordan and isolates dose, glucose and emergency records by astronaut', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('vt-tour-seen', 'seen');
    localStorage.setItem('vt-first-check-welcome:JL–02', 'seen');
    localStorage.setItem('vt-habitat-motion', 'paused');
    if (!localStorage.getItem('vt-dose-log-v1')) localStorage.setItem('vt-dose-log-v1', JSON.stringify({
      priorCareerMsv: 100, activeEventId: 'legacy-event',
      entries: [{ id: 'legacy-dose', msv: 250, at: '2026-11-15T10:00:00.000Z', eventId: 'legacy-event' }],
    }));
  });
  const openRadiation = async () => {
    await page.goto('/lab?evidence=radiation');
    await expect(page.locator('.radiation-meter')).toBeVisible({ timeout: 120_000 });
    return page.locator('.radiation-meter');
  };
  let meter = await openRadiation();
  await expect(meter).toContainText('Jordan Lee');
  await expect(meter.getByRole('meter', { name: 'Career', exact: true })).toHaveAttribute('aria-valuenow', '350');
  const event = meter.locator('.dose-event');
  await expect(event).toContainText('Design reference reached or exceeded');
  await expect(event).not.toContainText('Limit reached');
  await expect(event.locator('.is-alert')).toHaveCount(0);
  await meter.getByLabel('Received during the open event').uncheck();
  await meter.getByLabel('Dosimeter reading').fill('1');
  await meter.getByRole('button', { name: 'Add reading' }).click();
  await expect(meter.getByRole('meter', { name: 'Career', exact: true })).toHaveAttribute('aria-valuenow', '351');
  await expect(meter.getByRole('meter', { name: 'Solar particle event · open' })).toHaveAttribute('aria-valuenow', '250');
  await page.getByRole('dialog').screenshot({ path: testInfo.outputPath('radiation-reference-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await meter.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await meter.screenshot({ path: testInfo.outputPath('radiation-reference-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Switch crew member: Jordan Lee' }).click();
  await page.getByRole('button', { name: 'Configure crew', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Crew size' }).fill('2');
  await page.getByRole('textbox', { name: 'Astronaut 2 name', exact: true }).fill('Valentina');
  await page.getByRole('combobox', { name: 'Astronaut 2 anatomy' }).selectOption('female');
  await page.getByRole('button', { name: 'Save crew', exact: true }).click();
  await page.getByRole('button', { name: /Valentina.*Female anatomy/ }).click();
  await expect(page.getByRole('button', { name: 'Switch crew member: Valentina' })).toBeEnabled();
  meter = await openRadiation();
  await expect(meter).toContainText('Valentina');
  await expect(meter.getByRole('meter', { name: 'Career', exact: true })).toHaveAttribute('aria-valuenow', '0');
  await expect(meter).toContainText('No solar particle event open');
  await meter.getByRole('button', { name: 'Start solar event' }).click();
  await meter.getByLabel('Dosimeter reading').fill('5');
  await meter.getByRole('button', { name: 'Add reading' }).click();
  await page.reload();
  meter = page.locator('.radiation-meter');
  await expect(meter.getByRole('meter', { name: 'Career', exact: true })).toHaveAttribute('aria-valuenow', '5', { timeout: 120_000 });
  await page.keyboard.press('Escape');

  await page.locator('.inspector-actions .btn-solid').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Glucose', exact: true }).click();
  await dialog.locator('#value').fill('40');
  await dialog.locator('.record-context select').nth(0).selectOption('random');
  await dialog.locator('.record-context select').nth(1).selectOption('capillary');
  await expect(dialog.locator('.draft-preview')).toHaveClass(/is-alert/);
  await dialog.getByRole('button', { name: /save reading/i }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: /Emergency/, exact: true }).click();
  await page.locator('.emg-protocols button').first().click();
  await page.getByRole('tab', { name: 'Readings', exact: true }).click();
  await page.getByRole('button', { name: /Link Valentina.*readings/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Linked readings: Valentina');
  await expect(page.getByRole('tabpanel')).toContainText('40 mg/dL');
  await expect(page.getByRole('tabpanel')).toContainText('random / capillary');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Keep record and exit' }).click();

  await page.getByRole('button', { name: 'Switch crew member: Valentina' }).click();
  await page.getByRole('button', { name: /Jordan Lee.*Male anatomy/ }).click();
  await expect(page.getByRole('button', { name: 'Switch crew member: Jordan Lee' })).toBeEnabled();
  meter = await openRadiation();
  await expect(meter.getByRole('meter', { name: 'Career', exact: true })).toHaveAttribute('aria-valuenow', '351');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Emergency/, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is happening?' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Case records/ })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vt-dose-log-v1')!).entries.length)).toBe(1);
  expect(errors).toEqual([]);
});
