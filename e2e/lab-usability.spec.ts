import { expect, test } from '@playwright/test';

for (const width of [1850, 1366, 1024, 390]) {
  test(`mission access, independent rest planning and emergency support at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: width >= 1100 ? (width === 1366 ? 768 : 940) : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      localStorage.setItem('vt-habitat-motion', 'paused');
      localStorage.setItem('vt-tour-seen', 'seen');
      sessionStorage.setItem('vt-tour-seen', 'seen');
      localStorage.setItem('vt-first-check-welcome:JL–02', 'seen');
    });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/lab');
    await page.locator('.shell.is-arrived').waitFor({ timeout: 120_000 });
    const mission = page.getByRole('button', { name: /^Mission environment:/ });
    await expect(mission).toBeVisible();
    const withinViewport = await mission.evaluate(el => {
      const box = el.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth;
    });
    expect(withinViewport).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('header.png') });
    await mission.click();
    await expect(page.getByRole('heading', { name: 'Mission environment.' })).toBeVisible();
    await expect(page.getByText('Radiation dose · NASA effective dose', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    await page.getByRole('button', { name: 'Routine', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^Respiratory rate,/ }).click();
    await expect(dialog.getByRole('button', { name: 'Plan rest', exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: /I have my reading/ }).click();
    await dialog.locator('input#value').fill('18');
    await dialog.getByRole('button', { name: /Sleep & rest/ }).click();
    await expect(dialog.getByRole('heading', { name: 'Plan your next rest.' })).toBeVisible();
    await expect(dialog.locator('.guided-check')).toBeHidden();
    await dialog.locator('#sleep-hours').fill('7');
    await dialog.locator('#next-task').fill('90');
    await dialog.getByRole('button', { name: /Check rest window/ }).click();
    await expect(dialog.locator('.rest-result')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('rest.png') });
    await dialog.getByRole('button', { name: /Daily check-in/ }).click();
    await expect(dialog.locator('input#value')).toHaveValue('18');
    await page.screenshot({ path: testInfo.outputPath('routine.png') });
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();

    await page.getByRole('button', { name: /Emergency/ }).click();
    await page.getByRole('button', { name: /A crewmate collapsed/ }).click();
    await page.getByRole('tab', { name: 'How to measure', exact: true }).click();
    const panel = page.getByRole('tabpanel');
    await expect(panel.getByRole('heading', { name: 'Check your wrist pulse' })).toBeVisible();
    const expectDesktopToFit = async () => {
      if (width >= 1100) {
        expect(await page.locator('.emergency-flow').evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      }
    };
    await expectDesktopToFit();
    const supportBox = await page.locator('.emergency-support').boundingBox();
    const artBox = await page.locator('.emergency-care-art').boundingBox();
    for (const tab of ['Steps', 'Source', 'Readings', 'Contact plan', 'How to measure']) {
      await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
      await expectDesktopToFit();
      if (width >= 1100) {
        expect(await page.locator('.emergency-support').boundingBox()).toEqual(supportBox);
        expect(await page.locator('.emergency-care-art').boundingBox()).toEqual(artBox);
      }
    }
    for (const [choice, heading] of [['Temperature', 'Take an oral temperature'], ['Oximeter', 'Use a fingertip oximeter']]) {
      await panel.getByRole('button', { name: choice, exact: true }).click();
      await expect(panel.getByRole('heading', { name: heading })).toBeVisible();
      await panel.getByRole('button', { name: 'Next step', exact: true }).click();
      await expect(panel.getByText(/^Step 2 of/)).toBeVisible();
      await expectDesktopToFit();
      await panel.getByRole('button', { name: 'Next step', exact: true }).click();
      await expect(panel.getByText(/^Step 3 of/)).toBeVisible();
      await expectDesktopToFit();
    }
    const layout = await panel.evaluate(el => {
      const support = el.closest('.emergency-support')!.getBoundingClientRect();
      const timeline = document.querySelector('.emergency-care > .emg-timeline')!.getBoundingClientRect();
      return {
        belowTimeline: support.top >= timeline.bottom,
        fullWidth: Math.abs(support.width - timeline.width) < 2,
        noNestedScroll: el.scrollHeight <= el.clientHeight + 1 && getComputedStyle(el).overflowY === 'visible',
      };
    });
    expect(layout).toEqual({ belowTimeline: true, fullWidth: true, noNestedScroll: true });
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('emergency.png') });
    await page.getByRole('button', { name: 'Help requested', exact: true }).click();
    await expect(page.locator('.emg-timeline figcaption')).toContainText('1 of 2 steps confirmed');
    await page.getByRole('tab', { name: /^Steps/ }).click();
    await expect(panel.getByText('Step 2 of 2', { exact: true })).toBeVisible();
    await expectDesktopToFit();
    await panel.getByRole('button', { name: 'Previous step', exact: true }).click();
    await expect(panel.getByText('Step 1 of 2', { exact: true })).toBeVisible();
    await expect(panel.getByText('Confirmed: Help requested', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Readings', exact: true }).click();
    await panel.getByRole('button', { name: /Link .*readings to this patient/ }).click();
    await expect(panel.getByRole('group', { name: 'Reading pages', exact: true })).toBeVisible();
    await expectDesktopToFit();
    await page.getByRole('tab', { name: 'Contact plan', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Engine escalation plan' })).toBeVisible();
    await expectDesktopToFit();
    expect(await page.locator('.emergency-flow').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}
