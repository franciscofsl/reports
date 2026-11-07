export async function openReport(page, name, tab = 'preview') {
  await page.goto('/');
  await page.locator('.report-card', { hasText: name }).locator('.report-card-main').click();
  await page.waitForSelector('.tabs');
  if (tab !== 'preview') await page.locator('.tabs button', { hasText: tab }).click();
}
export const frame = (page) => page.frameLocator('iframe.ui-iframe');
