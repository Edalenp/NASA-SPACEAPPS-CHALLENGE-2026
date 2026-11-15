import { expect, test, type Locator, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.describe.configure({ timeout: 120_000 })

const runtimeErrors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.message))
})
test.afterEach(async ({ page }) => { expect(runtimeErrors.get(page)).toEqual([]) })

declare global {
  interface Window {
    __liveFigure?: { render(value: string): void }
  }
}

const DB_NAME = 'vitruvio'
const fastingVenous = { timing: 'fasting', specimen: 'venousPlasma', fastingHours: 8 } as const

interface LegacyGlucose {
  indicator: 'glucose'
  value: number
  timestamp: string
  ctx?: { timing: string; specimen: string }
}

async function seedLegacyRows(page: Page, rows: LegacyGlucose[]) {
  await page.evaluate(async (values) => {
    const open = () => new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('vitruvio')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const db = await open()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('entries', 'readwrite')
      const store = tx.objectStore('entries')
      for (const row of values) store.add(row)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  }, rows)
}

async function seedLegacyGlucose(page: Page, timestamp: string) {
  await seedLegacyRows(page, [{ indicator: 'glucose', value: 130, timestamp }])
}

async function readMeasurements(page: Page) {
  return page.evaluate(async () => {
    const open = () => new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('vitruvio')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const db = await open()
    const rows = await new Promise<unknown[]>((resolve, reject) => {
      const tx = db.transaction('measurements', 'readonly')
      const request = tx.objectStore('measurements').getAll()
      request.onsuccess = () => resolve(request.result as unknown[])
      request.onerror = () => reject(request.error)
    })
    db.close()
    return rows as Array<{ id: string; type: string; glucoseContext?: unknown }>
  })
}

function glucoseRows(count: number, offset = 0): LegacyGlucose[] {
  const base = Date.now() - 10 * 60_000
  return Array.from({ length: count }, (_, i) => ({
    indicator: 'glucose',
    value: 100,
    timestamp: new Date(base + (offset + i) * 60_000).toISOString(),
    ctx: fastingVenous,
  }))
}

async function arrive(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('vt-tour-seen', 'seen')
    localStorage.setItem('vt-first-check-welcome:JL–02', 'seen')
  })
  await page.goto('/lab')
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 })
}

async function openRecord(page: Page) {
  await page.locator('.inspector-actions .btn-solid').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

async function pick(dialog: Locator, name: string) {
  await dialog.getByRole('button', { name, exact: true }).click()
}

async function fillGlucose(dialog: Locator, value: number) {
  await pick(dialog, 'Glucose')
  await dialog.locator('input#value').fill(String(value))
}

async function chooseContext(dialog: Locator, timing: string, specimen: string) {
  await dialog.locator('.record-context select').nth(0).selectOption(timing)
  await dialog.locator('.record-context select').nth(1).selectOption(specimen)
  await expect(dialog.locator('.record-context select').nth(0)).toHaveValue(timing)
  await expect(dialog.locator('.record-context select').nth(1)).toHaveValue(specimen)
  if (timing === 'fasting') await dialog.locator('#glucose-fasting-hours').fill('8')
}

async function save(dialog: Locator) {
  await dialog.getByRole('button', { name: /save reading/i }).click()
  await expect(dialog).toBeHidden()
}

async function immune(page: Page, state: string) {
  await page.getByRole('button', { name: new RegExp(`Immune & metabolism: ${state === 'missing' ? 'no data' : state}`) }).click()
  const glucose = page.getByRole('button', { name: 'Glucose', exact: true })
  if (await glucose.count()) await glucose.first().click()
}

test('empty profile: glucose 40 and DBP 130 alert, unknown 130 needs context', async ({ page }) => {
  await arrive(page)
  const dialog = await openRecord(page)
  await fillGlucose(dialog, 40)
  await expect(dialog.locator('.draft-preview')).toHaveClass(/is-alert/)
  await expect(dialog.locator('.draft-preview-value')).toHaveText('Alert')
  await expect(dialog.locator('.draft-preview-explanation')).toContainText(/level 2 hypoglycemia/i)
  await expect(dialog.locator('.zone-actions')).toContainText(/Draft for medical review/i)
  await expect(dialog.locator('.engine-plan')).toContainText(/Crew Medical Officer/i)
  await expect(dialog.locator('.draft-preview-scoring')).toContainText(/NEWS2 incomplete/i)

  await dialog.locator('input#value').fill('130')
  await expect(dialog.locator('.draft-preview')).toHaveClass(/is-missing/)
  await expect(dialog.locator('.draft-preview-value')).toHaveText('Context needed')
  await expect(dialog.locator('.draft-preview-explanation')).toContainText(/glucose timing and specimen/i)

  await chooseContext(dialog, 'fasting', 'venousPlasma')
  await expect(dialog.locator('.draft-preview')).toHaveClass(/is-watch/)
  await expect(dialog.locator('.draft-preview-explanation')).toContainText(/fasting-plasma laboratory criterion/i)

  await pick(dialog, 'Diastolic pressure')
  await dialog.locator('input#value').fill('130')
  await expect(dialog.locator('.draft-preview')).toHaveClass(/is-alert/)
  await expect(dialog.locator('.form-error')).not.toContainText(/lower than systolic/i)
})

test('glucose 200 with fasting venous context survives save, reload, report and readout', async ({ page }) => {
  await arrive(page)
  const dialog = await openRecord(page)
  await fillGlucose(dialog, 200)
  await chooseContext(dialog, 'fasting', 'venousPlasma')
  await expect(dialog.locator('.draft-preview')).toHaveClass(/is-watch/)
  await expect(dialog.locator('.draft-preview-explanation')).toContainText(/fasting-plasma laboratory criterion/i)
  await save(dialog)

  await immune(page, 'watch')
  await expect(page.locator('.measurement-time')).toContainText('glucose context fasting/venousPlasma')
  await expect(page.locator('.readout-figure .live-figure')).toHaveText('200')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download mission brief' }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  const report = await readFile(path!, 'utf8')
  expect(report).toContain('glucose context: fasting / venousPlasma')
  expect(report).toContain('This is not a diagnosis')

  await page.reload()
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 })
  await immune(page, 'watch')
  await expect(page.locator('.measurement-time')).toContainText('glucose context fasting/venousPlasma')
})

test('a legacy glucose row without context is read as unknown and not rewritten as fasting', async ({ page }) => {
  await arrive(page)
  const names = await page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name))
  expect(names).toContain(DB_NAME)
  await seedLegacyGlucose(page, new Date().toISOString())
  await page.reload()
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 })

  const stored = await readMeasurements(page)
  const imported = stored.find((row) => row.type === 'glucose' && row.id.startsWith('console-'))
  expect(imported).toBeTruthy()
  expect(imported?.glucoseContext).toBeUndefined()

  await immune(page, 'missing')
  await expect(page.locator('.measurement-time')).toContainText('glucose context unknown/unknown')
})

test('ADA 2026 separates laboratory criteria, symptoms and sensor monitoring in the real form', async ({ page }, testInfo) => {
  await arrive(page)
  const dialog = await openRecord(page)
  await fillGlucose(dialog, 200)
  await expect(dialog.locator('.draft-preview')).toHaveClass(/is-missing/)
  await chooseContext(dialog, 'fasting', 'venousPlasma')
  await expect(dialog.locator('.draft-preview')).toHaveClass(/is-watch/)
  await dialog.locator('#glucose-fasting-hours').fill('7.9')
  await expect(dialog.locator('.glucose-review')).toContainText('Duration is missing or insufficient')
  await expect(dialog.locator('.draft-preview')).toHaveClass(/is-missing/)
  await chooseContext(dialog, 'random', 'venousPlasma')
  await dialog.getByLabel('Classic hyperglycemic symptoms', { exact: true }).selectOption('none')
  await expect(dialog.locator('.draft-preview')).toHaveClass(/is-missing/)
  await dialog.getByLabel('Classic hyperglycemic symptoms', { exact: true }).selectOption('classic')
  await expect(dialog.locator('.draft-preview')).toHaveClass(/is-watch/)
  await expect(dialog.locator('.glucose-review')).toContainText('random-plasma-with-symptoms')
  await chooseContext(dialog, 'random', 'interstitial')
  await dialog.getByLabel('Classic hyperglycemic symptoms', { exact: true }).selectOption('none')
  await expect(dialog.locator('.draft-preview')).toHaveClass(/is-missing/)
  await expect(dialog.locator('.glucose-review')).toContainText('CGM sensor readings are for monitoring')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true)
  await dialog.screenshot({ path: testInfo.outputPath('glucose-context-mobile.png') })
  await save(dialog)
  await page.reload()
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 })
  await immune(page, 'missing')
  await expect(page.locator('.glucose-review')).toContainText('classic symptoms: none')
  await expect(page.locator('.glucose-review')).toContainText('CGM sensor readings are for monitoring')
})

test('LiveFigure reports the real value across frames and after a reduced-motion flip', async ({ page }) => {
  await page.goto('/e2e/fixtures/live-figure.html')
  const figure = page.locator('[data-live-figure]')
  await expect(figure).toHaveText('200')
  await expect(figure).not.toHaveAttribute('aria-hidden', 'true')

  const collect = () => page.evaluate(() => new Promise<string[]>((resolve) => {
    const visible = document.querySelector('[data-live-figure]')
    const expected = document.querySelector('[data-expected]')
    const frames: string[] = []
    const check = () => {
      const value = visible?.textContent ?? ''
      const target = expected?.textContent ?? ''
      if (value !== target) frames.push(`${value}|${target}`)
    }
    const observer = new MutationObserver(check)
    if (visible) observer.observe(visible, { childList: true, characterData: true, subtree: true })
    const end = performance.now() + 120
    const tick = () => {
      check()
      if (performance.now() < end) requestAnimationFrame(tick)
      else {
        observer.disconnect()
        resolve(frames)
      }
    }
    requestAnimationFrame(tick)
  }))

  expect(await collect()).toEqual([])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => window.__liveFigure?.render('200'))
  expect(await collect()).toEqual([])
  await page.evaluate(() => window.__liveFigure?.render('40'))
  await expect(figure).toHaveText('40')
  expect(await collect()).toEqual([])
})

test('fatigue model shows cumulative sleep, wake, workload and circadian factors without a fixed recovery', async ({ page }, testInfo) => {
  await arrive(page)
  await page.getByRole('button', { name: 'Routine', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Plan rest', exact: true }).click()
  await dialog.locator('#sleep-hours').fill('4')
  await dialog.locator('#sleep-48-hours').fill('8')
  await dialog.locator('#awake-hours').fill('20')
  await dialog.locator('#workload-hours').fill('12')
  await dialog.locator('#body-clock').fill('3')
  await dialog.locator('#circadian-alignment').selectOption('shifted')
  await dialog.locator('#next-task').fill('10')
  await dialog.locator('#activity').selectOption('work')
  await dialog.getByRole('button', { name: /review fatigue factors/i }).click()
  const result = dialog.locator('.rest-result')
  await expect(result).toHaveAttribute('data-reason', 'review')
  await expect(result).toContainText('48-hour cumulative')
  await expect(result).toContainText('Continuous wakefulness')
  await expect(result).toContainText('Workload')
  await expect(result).toContainText('biological night')
  await expect(result).toContainText('does not mean you are well rested')
  await expect(result).not.toContainText('Nap recommendation')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true)
  await dialog.screenshot({ path: testInfo.outputPath('fatigue-context-mobile.png') })
})

test('baseline shows 0/6/7 prior readings and only draws a band for a real baseline', async ({ page }) => {
  await arrive(page)
  let dialog = await openRecord(page)
  await fillGlucose(dialog, 130)
  await chooseContext(dialog, 'fasting', 'venousPlasma')
  await expect(dialog.locator('.draft-preview-baseline')).toContainText('Baseline · 0/7 prior readings')
  await expect(dialog.locator('.range-personal-band')).toHaveCount(0)
  await expect(dialog.locator('.range-reference-label')).toContainText('Fasting laboratory population reference')
  await page.keyboard.press('Escape')

  await seedLegacyRows(page, glucoseRows(6))
  await page.reload()
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 })
  await page.locator('.telemetry').getByRole('button', { name: /Immune.*Glucose 100/ }).waitFor({ timeout: 120_000 })
  dialog = await openRecord(page)
  await fillGlucose(dialog, 130)
  await chooseContext(dialog, 'fasting', 'venousPlasma')
  await expect(dialog.locator('.draft-preview-baseline')).toContainText('Baseline · 6/7 prior readings')
  await expect(dialog.locator('.range-personal-band')).toHaveCount(0)
  await page.keyboard.press('Escape')

  await seedLegacyRows(page, glucoseRows(1, 6))
  await page.reload()
  await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 })
  await page.locator('.telemetry').getByRole('button', { name: /Immune.*Glucose 100/ }).waitFor({ timeout: 120_000 })
  dialog = await openRecord(page)
  await fillGlucose(dialog, 130)
  await chooseContext(dialog, 'fasting', 'venousPlasma')
  await expect(dialog.locator('.draft-preview-baseline')).toContainText('Personal baseline · 7/7 prior readings')
  await expect(dialog.locator('.range-personal-band')).toHaveCount(1)
})
