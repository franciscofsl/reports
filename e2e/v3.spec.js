import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { frame, openReport } from './helpers.js';

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'Mi página' : undefined));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.__errors = errors;
});
test.afterEach(async ({ page }) => { expect(page.__errors, 'errores de página').toEqual([]); });

test('páginas, profundizar, relaciones y filtros del informe en la vista previa', async ({ page }) => {
  await openReport(page, 'Ventas 2025');
  const f = frame(page);
  await expect(f.locator('.rpt-pages-nav button')).toHaveText(['Resumen', 'Análisis', 'Detalle']);
  await f.locator('.rpt-pages-nav button', { hasText: 'Análisis' }).click();
  const drill = f.locator('[data-rpt=chart]', { hasText: 'Profundiza' });
  await expect(drill.locator('.rpt-crumbs')).toContainText('Año');
  await drill.locator('rect.rpt-mark').nth(1).click();
  await expect(drill.locator('.rpt-crumbs')).toContainText('Trimestre');
  await drill.locator('rect.rpt-mark').first().click();
  await expect(drill.locator('.rpt-crumbs')).toContainText('Mes');
  await drill.getByRole('button', { name: 'Subir un nivel' }).click();
  await expect(drill.locator('.rpt-crumbs')).toContainText('Trimestre');
  // Mapa → filtra «pedidos» por la relación historico.id → pedidos.id
  const funnel = f.locator('[data-rpt=funnel]');
  const before = await funnel.locator('text').allTextContents();
  await f.locator('.rpt-map path.rpt-mark').first().click();
  await expect(f.locator('.rpt-filterbar .rpt-chip')).toContainText('Comunidad');
  await expect.poll(async () => JSON.stringify(await funnel.locator('text').allTextContents())).not.toBe(JSON.stringify(before));
  // Panel de filtros del informe
  await f.locator('.rpt-filterpane-btn').click();
  await f.locator('.rpt-filterpane .rpt-chip').first().click();
  await expect(f.locator('.rpt-filterpane-btn .rpt-count')).toHaveText('2');
  // Narrativa, previsión y comparación
  await expect(f.locator('.rpt-narrative')).toContainText('El total de');
  await expect(f.locator('.rpt-forecast')).toHaveCount(1);
});

test('vistas guardadas y enlace compartido reproducen el estado', async ({ page }) => {
  await openReport(page, 'Ventas 2025');
  const f = frame(page);
  await f.locator('[data-rpt=filter] .rpt-chip', { hasText: 'Sur' }).click();
  await expect(page.getByRole('button', { name: /Quitar 1 filtro/ })).toBeVisible();
  await page.getByRole('button', { name: 'Vistas' }).click();
  await page.getByPlaceholder('p. ej. Zona Sur – T3').fill('Zona Sur');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await page.getByRole('button', { name: 'Copiar enlace de la vista actual' }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/#\/view\/.+\?v=/);
  await page.getByRole('button', { name: /Quitar 1 filtro/ }).click();
  await expect(f.locator('.rpt-filterbar .rpt-chip')).toHaveCount(0);
  await page.getByRole('button', { name: 'Vistas' }).click();
  await page.locator('.views-list').getByRole('button', { name: 'Zona Sur', exact: true }).click();
  await expect(f.locator('.rpt-filterbar .rpt-chip')).toContainText('Sur');
  // El enlace abre el visor con el mismo estado
  await page.goto(link);
  await expect(frame(page).locator('.rpt-filterbar .rpt-chip')).toContainText('Sur');
});

test('exporta a Word y Excel con contenido real', async ({ page }) => {
  await openReport(page, 'Ventas 2025');
  await frame(page).locator('.rpt-tile').first().waitFor();
  await page.getByRole('button', { name: 'Exportar' }).click();
  let dl = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Word/ }).click();
  const docx = await dl;
  expect(docx.suggestedFilename()).toMatch(/\.docx$/);
  const dbuf = readFileSync(await docx.path());
  expect(dbuf.length).toBeGreaterThan(20000);
  expect(dbuf.subarray(0, 2).toString()).toBe('PK');
  await page.getByRole('button', { name: 'Exportar' }).click();
  dl = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Excel/ }).click();
  const xlsx = await dl;
  expect(xlsx.suggestedFilename()).toMatch(/\.xlsx$/);
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(await xlsx.path());
  const names = wb.worksheets.map((w) => w.name);
  expect(names[0]).toBe('Resumen');
  const grouped = wb.worksheets.find((w) => /región y comer/.test(w.name));
  expect(grouped).toBeTruthy();
  expect(grouped.getRow(1).font.bold).toBe(true);
  expect(grouped.rowCount).toBeGreaterThan(50);
});

test('modelo semántico: medidas con validación, relaciones sugeridas y jerarquía de fecha', async ({ page }) => {
  await openReport(page, 'Ventas 2025', 'Modelo');
  await expect(page.locator('.sem-rel')).toHaveCount(1);
  const add = page.locator('.ui-card', { hasText: 'Medidas reutilizables' }).getByRole('button', { name: 'Añadir' });
  await add.click();
  const expr = page.getByLabel('Expresión de la medida').last();
  await expr.fill('SUM(importe');
  await expect(page.locator('.ui-error', { hasText: 'Se esperaba' })).toBeVisible();
  await expr.fill('MAX(importe)');
  await expect(page.locator('.sem tbody tr').last()).toContainText(/\d/);
  await page.getByRole('button', { name: /Fecha: pedidos\.fecha/ }).click();
  await expect(page.locator('.sem-hier')).toHaveCount(2);
  // La medida aparece en el diseñador
  await page.locator('.tabs button', { hasText: 'Diseño' }).click();
  await page.locator('.dz-cell').first().waitFor();
  await page.locator('.dz-tool:has(b:text-is("Loseta"))').click();
  await expect(page.locator('.pp select', { has: page.locator('optgroup[label="Medidas"]') }).first()).toBeVisible();
});

test('diseñador: páginas, Show Me y tema importado de Power BI', async ({ page }) => {
  await openReport(page, 'Ventas 2025', 'Diseño');
  await expect(page.locator('.dz-page')).toHaveCount(3);
  await page.getByRole('button', { name: 'Página', exact: true }).click();
  await expect(page.locator('.dz-page')).toHaveCount(4);
  await expect(page.locator('.dz-empty')).toBeVisible();
  // Show Me
  await page.getByRole('button', { name: 'Sugerir visual (Show Me)' }).click();
  await page.locator('.showme select').selectOption('historico');
  await page.locator('.showme-fields label', { hasText: 'Comunidad' }).locator('input').check();
  await page.locator('.showme-fields label', { hasText: 'Importe' }).locator('input').check();
  await expect(page.locator('.showme-item').first()).toContainText('Mapa');
  await page.locator('.showme-item').first().getByRole('button', { name: 'Añadir al lienzo' }).click();
  await expect(page.locator('.dz-cell')).toHaveCount(1);
  // Tema de Power BI
  await page.locator('.dz-header').click();
  await page.locator('.pp input[type=file]').setInputFiles({ name: 'tema.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ name: 'Corporativo', dataColors: ['#E66C37', '#118DFF', '#12239E'], tableAccent: '#E66C37' })) });
  await expect(page.locator('.pp .ui-msg-ok')).toContainText('Corporativo');
  await expect(page.locator('.pp-palette.is-on')).toContainText('Personalizada');
  await page.locator('.tabs button', { hasText: 'HTML' }).click();
  await expect(page.locator('textarea.ui-html')).toHaveValue(/name="rpt-theme"/);
});

test('subinforme: incrusta otro informe con sus datos', async ({ page }) => {
  await openReport(page, 'Inventario', 'Diseño');
  await page.locator('.dz-cell').first().waitFor();
  await page.locator('.dz-tool:has(b:text-is("Subinforme"))').click();
  await page.locator('.pp select').filter({ has: page.locator('option', { hasText: 'Equipo comercial' }) }).selectOption({ label: 'Equipo comercial (ejemplo)' });
  await page.locator('.tabs button', { hasText: 'Vista previa' }).click();
  const sub = frame(page).locator('.rpt-subreport');
  await expect(sub).toContainText('Equipo comercial');
  await expect(sub.locator('[data-rpt=bullet] rect.rpt-mark').first()).toBeVisible();
});
