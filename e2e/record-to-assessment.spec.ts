import { expect, test } from '@playwright/test'

/**
 * Record -> assessment flow: record a measurement, see the twin/system
 * assessment change, and see the recommendation. Exercises the real
 * store -> engine -> UI path.
 */
test('records a reading, updates the assessment and shows the recommendation', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByRole('button', { name: /record measurement/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await dialog.locator('#indicator').selectOption('pulse')
  await dialog.locator('input#value').fill('150')
  await dialog.getByRole('button', { name: /save reading/i }).click()
  await expect(dialog).toBeHidden()

  // The heart system leaves "missing"/"normal" after the high pulse is assessed.
  await expect(
    page.getByRole('button', { name: 'Heart & circulation: alert' }),
  ).toBeVisible()
  await expect(page.getByText(/Incomplete: 1 of 7 observations/i)).toBeVisible()

  // The recommendation is reachable from the affected system.
  await page.getByRole('button', { name: 'Heart & circulation: alert' }).click()
  await page
    .getByRole('button', { name: /review assessment and contact plan/i })
    .click()
  await expect(
    page.getByText(/Complete the missing observations/i),
  ).toBeVisible()
})
