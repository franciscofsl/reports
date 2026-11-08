import { expect, test } from '@playwright/test';
import { frame, openReport } from './helpers.js';

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'Fila de KPI' : undefined));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.__errors = errors;
});
test.afterEach(async ({ page }) => {
  expect(page.__errors, 'errores de página').toEqual([]);
});

test('listado con ejemplos, buscador y filtros', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.report-card')).toHaveCount(3);
  await page.getByLabel('Buscar informes').fill('inventario');
  await expect(page.locator('.report-card')).toHaveCount(1);
  await page.getByLabel('Buscar informes').fill('');
  await page.getByLabel('Filtrar por estado').selectOption('draft');
  await expect(page.locator('.report-card')).toHaveCount(0);
});

test('vista previa: filtros y filtro cruzado entre componentes', async ({ page }) => {
  await openReport(page, 'Ventas 2025');
  const f = frame(page);
  const tile = f.locator('.rpt-tile-value').first();
  await expect(tile).toHaveText(/M\s*€/);
  const before = await tile.textContent();
  await f.locator('[data-rpt=chart] path.rpt-mark').first().click();
  await expect(f.locator('.rpt-filterbar .rpt-chip')).toHaveCount(1);
  await expect(tile).not.toHaveText(before);
  await expect(page.getByRole('button', { name: /Quitar 1 filtro/ })).toBeVisible();
  await f.locator('[data-rpt=filter] select').first().selectOption('Entregado');
  await expect(f.locator('.rpt-filterbar .rpt-chip')).toHaveCount(2);
  await page.getByRole('button', { name: /Quitar 2 filtros/ }).click();
  await expect(tile).toHaveText(before);
  // menú de tarjeta: ver datos y exportar CSV
  await f.locator('.rpt-pages-nav button', { hasText: 'Detalle' }).click();
  await f.locator('[data-rpt=grid] .rpt-menu-btn').first().click();
  const download = page.waitForEvent('download');
  await f.locator('.rpt-menu button[data-act=csv]').click();
  expect((await download).suggestedFilename()).toBe('pedidos-por-region-y-comercial.csv');
});

test('parámetro de rango de fechas y origen derivado', async ({ page }) => {
  await openReport(page, 'Inventario');
  const f = frame(page);
  await expect(f.locator('[data-rpt=grid] tbody tr').first()).toBeVisible();
  await page.locator('.ui-params select').selectOption('todo');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(f.locator('.rpt-tile-value').first()).not.toHaveText('—');
  await expect(page.locator('.ui-msg-error')).toHaveCount(0);
});

test('diseñador: arrastrar, multiselección, redimensionar, dispositivo y diseño automático', async ({ page }) => {
  await openReport(page, 'Ventas 2025', 'Diseño');
  const cells = page.locator('.dz-cell');
  await expect(cells.first()).toBeVisible();
  const n = await cells.count();
  // arrastrar desde la paleta a una fila visible
  await page.locator('.dz-tool', { hasText: 'Gauge' }).dragTo(page.locator('.dz-row').nth(1));
  await expect(cells).toHaveCount(n + 1);
  // multiselección y colocar en fila
  await cells.nth(0).click();
  await cells.nth(1).click({ modifiers: ['Shift'] });
  await expect(page.locator('.pp-title')).toContainText('2 componentes');
  await page.getByRole('button', { name: /Colocar en una fila/ }).click();
  // redimensionar arrastrando el borde derecho
  await cells.nth(4).click();
  const handle = page.locator('.dz-resize-x');
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + 4, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x - 260, box.y + 10, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.dz-cell.is-sel')).not.toHaveClass(/rpt-col-12\b/);
  // copiar / pegar
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await expect(cells).toHaveCount(n + 2);
  // vista móvil
  await page.getByRole('radio', { name: 'Móvil' }).click();
  await expect(page.locator('.dz-device')).toHaveCSS('max-width', '390px');
  // guardar fila como bloque
  await page.locator('.dz-row-wrap').first().hover();
  await page.locator('.dz-row-wrap').first().getByRole('button', { name: 'Guardar fila como bloque' }).click();
  await expect(page.locator('.dz-block')).toHaveCount(1);
  // diseño automático
  await page.locator('.dz-palette').getByRole('button', { name: 'Diseño automático' }).click();
  await expect(page.locator('.dz-cell [data-rpt], .dz-cell .rpt-c').first()).toBeVisible();
  expect(await cells.count()).toBeGreaterThan(4);
  await page.getByRole('button', { name: 'Deshacer' }).click();
});

test('editor visual de consultas genera SQL ejecutable y campos calculados', async ({ page }) => {
  await openReport(page, 'Ventas 2025', 'Orígenes de datos');
  await page.getByRole('button', { name: 'Visual', exact: true }).click();
  await page.getByRole('button', { name: 'Añadir tabla pedidos' }).click();
  await page.getByRole('button', { name: 'Añadir tabla clientes' }).click();
  await expect(page.locator('.qb-join')).toHaveCount(1);
  await page.locator('.qb-box:has(.qb-box-head b:text-is("clientes"))').getByLabel('segmento', { exact: true }).check();
  await page.locator('.qb-box:has(.qb-box-head b:text-is("pedidos"))').getByLabel('importe', { exact: true }).check();
  await page.locator('.qb-section tbody tr').nth(1).getByLabel('Agregación').selectOption('SUM');
  await page.getByRole('button', { name: 'Añadir filtro' }).click();
  await page.getByRole('button', { name: 'Ver SQL generado' }).click();
  await expect(page.locator('.cm-content').last()).toContainText('INNER JOIN clientes AS c ON p.cliente_id = c.id');
  await page.locator('.qb-filter').getByLabel('Columna').selectOption('p.estado');
  await page.locator('.qb-filter').getByLabel('Operador').selectOption('<>');
  await page.locator('.qb-filter').getByLabel('Valor').fill('Cancelado');
  await page.getByRole('button', { name: 'Ejecutar' }).first().click();
  await expect(page.locator('.ui-msg-ok')).toContainText('3 filas');
  // campo calculado
  await page.locator('.ds-sub').getByRole('button', { name: 'Añadir' }).click();
  await page.getByLabel('Expresión').fill('importe / 1000');
  await page.getByRole('button', { name: 'Ejecutar' }).first().click();
  await expect(page.locator('.ui-table code', { hasText: 'calc1' })).toBeVisible();
});

test('renombrar un origen actualiza los componentes que lo usan', async ({ page }) => {
  await openReport(page, 'Ventas 2025', 'Orígenes de datos');
  await page.getByLabel('Identificador (data-source)').fill('pedidos_2');
  await page.locator('.tabs button', { hasText: 'Diseño' }).click();
  await expect(page.locator('.dz-grip', { hasText: 'pedidos_2' }).first()).toBeVisible();
  await expect(page.locator('.dz-toolbar .ui-badge-warn')).toHaveCount(0);
});

test('historial: guardar, publicar, comparar y restaurar en parte', async ({ page }) => {
  await openReport(page, 'Ventas 2025', 'Diseño');
  await page.locator('.dz-tool:has(b:text-is("Texto"))').click();
  await page.getByRole('button', { name: 'Guardar versión' }).click();
  await expect(page.locator('.toast')).toContainText('versión 2');
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Publicada v2' })).toBeVisible();
  await page.locator('.tabs button', { hasText: 'Historial' }).click();
  await page.getByLabel('Comparar versión 2').check();
  await page.getByLabel('Comparar versión 1').check();
  await expect(page.locator('.diff')).toContainText('Componentes añadidos');
  await page.getByLabel('Etiqueta de la versión 1').fill('Aprobada');
  await page.getByLabel('Etiqueta de la versión 1').press('Enter');
  await page.locator('.hist-item', { hasText: 'v1' }).getByRole('button', { name: 'Restaurar' }).click();
  await page.locator('.hist-restore').getByLabel('Orígenes de datos').uncheck();
  await page.getByRole('button', { name: 'Restaurar como nueva versión' }).click();
  await expect(page.locator('.hist-item').first()).toContainText('Restaurada la versión 1 (diseño, parámetros)');
  // visor con la versión publicada
  await page.goto(page.url().replace(/#\/report\/([^/]+)\/.*/, '#/view/$1'));
  await expect(page.locator('.viewer-title')).toContainText('Versión publicada v2');
  await expect(frame(page).locator('.rpt-text')).toBeVisible();
});

test('asistente «desde los datos» genera el diseño automáticamente', async ({ page }) => {
  await page.goto('/#/new');
  await page.getByLabel('Nombre del informe *').fill('Auto');
  await page.getByRole('radio', { name: /Desde los datos/ }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.locator('.ds-list select').selectOption('pedidos');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.locator('.dz-cell').first()).toBeVisible();
  expect(await page.locator('.dz-cell').count()).toBeGreaterThan(5);
  await page.locator('.wizard-nav').getByRole('button', { name: 'Siguiente' }).click();
  await expect(frame(page).locator('.rpt-tile').first()).toBeVisible();
  await page.getByRole('button', { name: 'Crear informe' }).click();
  await expect(page.locator('.editor-name')).toHaveValue('Auto');
});

test('exportar e importar un informe', async ({ page }) => {
  await page.goto('/');
  const download = page.waitForEvent('download');
  await page.locator('.report-card', { hasText: 'Inventario' }).getByRole('button', { name: 'Exportar' }).click();
  const file = await (await download).path();
  await page.locator('input[type=file][accept*=json]').setInputFiles(file);
  await expect(page.locator('.report-card')).toHaveCount(4);
  await expect(page.locator('[role=status]')).toContainText('Importado');
});

test('pasar de SQL al editor visual representa la consulta cargada', async ({ page }) => {
  await openReport(page, 'Ventas 2025', 'Orígenes de datos');
  await page.locator('.ds-item', { hasText: 'Detalle de pedidos' }).click();
  await page.getByRole('tab', { name: /Editor visual/ }).click();
  await expect(page.locator('.ds-mode-msg')).toContainText('Consulta cargada en el editor visual');
  await expect(page.locator('.qb-box')).toHaveCount(3);
  await expect(page.locator('.qb-join')).toHaveCount(2);
  await expect(page.locator('.qb-section').first().locator('tbody tr')).toHaveCount(9);
  await expect(page.locator('.qb-filter').getByLabel('Función del filtro')).toHaveValue('YEAR');
  await expect(page.locator('.qb-filter').getByLabel('Parámetro')).toHaveValue('anio');
  await page.getByRole('button', { name: 'Ejecutar' }).first().click();
  await expect(page.locator('.ui-msg-ok', { hasText: 'filas en' })).toContainText('466 filas');
});

test('una consulta no representable se queda en SQL y explica el motivo', async ({ page }) => {
  await openReport(page, 'Equipo comercial', 'Orígenes de datos');
  await page.getByRole('tab', { name: /Editor visual/ }).click();
  await expect(page.locator('.ds-mode-msg')).toContainText('operaciones aritméticas');
  await expect(page.getByRole('tab', { name: /SQL/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Seguir en SQL' }).click();
  await expect(page.locator('.ds-mode-msg')).toHaveCount(0);
});
