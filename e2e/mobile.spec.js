import { expect, test } from '@playwright/test';
import { frame, openReport } from './helpers.js';

test('móvil: sin scroll horizontal, diseñador por pestañas y filtro cruzado táctil', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.report-card')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  await openReport(page, 'Ventas 2025');
  await frame(page).locator('[data-rpt=chart] path.rpt-mark').first().tap();
  await expect(frame(page).locator('.rpt-filterbar .rpt-chip')).toHaveCount(1);
  await page.locator('.tabs button').nth(1).click();
  await page.getByRole('tab', { name: 'Componentes' }).click();
  await page.locator('.dz-tool', { hasText: 'Gauge' }).click();
  await expect(page.locator('.dz-cell.is-sel')).toBeVisible();
  await page.getByRole('tab', { name: /Propiedades/ }).click();
  await expect(page.locator('.pp-title')).toContainText('Gauge');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
});
