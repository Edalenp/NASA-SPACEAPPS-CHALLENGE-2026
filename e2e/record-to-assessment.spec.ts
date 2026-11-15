import { expect, test } from '@playwright/test'

/**
 * Record -> assessment flow: record a measurement, see the twin/system
 * assessment change, and see the recommendation. Exercises the real
 * store -> engine -> UI path.
 */
test('records a reading, updates the assessment and shows the recommendation', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    localStorage.setItem('vt-habitat-motion', 'paused')
    localStorage.setItem('vt-tour-seen', 'seen')
    localStorage.setItem('vt-first-check-welcome:JL–02', 'seen')
  })
  await page.goto('/lab')
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 })

  await page.locator('.inspector-actions .btn-solid').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: 'Heart rate', exact: true }).click()
  for (const [value, status] of [['72', 'normal'], ['100', 'watch'], ['150', 'alert']]) {
    await dialog.locator('input#value').fill(value)
    await expect(dialog.locator('.draft-preview')).toHaveClass(new RegExp(`is-${status}`))
  }
  await expect(page.locator('.score-sentence')).toContainText('0 of 7')
  await dialog.locator('input#value').fill('150')
  await dialog.getByRole('button', { name: /save reading/i }).click()
  await expect(dialog).toBeHidden()

  // The heart system leaves "missing"/"normal" after the high pulse is assessed.
  await expect(
    page.getByRole('button', { name: /Heart & circulation: alert/ }),
  ).toBeVisible()
  await expect(page.getByText(/Incomplete: 1 of 7 observations/i)).toBeVisible()

  // The recommendation is reachable from the affected system.
  await page.getByRole('button', { name: /Heart & circulation: alert/ }).click()
  await page
    .getByRole('button', { name: /review assessment and contact plan/i })
    .click()
  await expect(
    page.getByText(/Complete the missing observations/i),
  ).toBeVisible()
})
