import { describe, expect, it } from 'vitest';
import {
  applyCalculated, buildReportData, executionOrder, presetRange, resolveParams, resolveRelativeDate, runQuery, sqlDependencies, sqlParams, validateExpr, validateSql,
} from '../src/lib/sqlEngine.js';
import * as ops from '../src/lib/modelOps.js';
import { autoBind, newCell } from '../src/lib/catalog.js';
import { autoLayout } from '../src/lib/autoLayout.js';
import { diffVersions, lineDiff } from '../src/lib/diff.js';
import { TEMPLATES, salesTemplate } from '../src/lib/templates.js';

globalThis.window ??= { location: { href: 'http://localhost/' } };
const { generateHtml, injectData } = await import('../src/lib/htmlGenerator.js');

describe('sqlEngine', () => {
  it('solo admite una sentencia SELECT', () => {
    expect(() => validateSql('DELETE FROM clientes')).toThrow(/SELECT/);
    expect(() => validateSql('SELECT 1; SELECT 2')).toThrow(/una sentencia/);
    expect(() => validateSql('SELECT * FROM clientes')).not.toThrow();
  });
  it('detecta parámetros y dependencias ignorando literales', () => {
    expect(sqlParams("SELECT * FROM t WHERE a = :anio AND b = ':no' AND c = :region")).toEqual(['anio', 'region']);
    expect(sqlDependencies('SELECT * FROM origen.pedidos p JOIN origen.clientes c')).toEqual(['pedidos', 'clientes']);
  });
  it('resuelve fechas relativas y rangos', () => {
    const today = new Date(2026, 10, 7);
    expect(resolveRelativeDate('@inicio_año', today)).toBe('2026-01-01');
    expect(resolveRelativeDate('@inicio_mes', today)).toBe('2026-11-01');
    expect(presetRange('año_pasado', today)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
    const p = resolveParams([{ name: 'periodo', type: 'daterange', default: 'personalizado' }], { periodo: { preset: 'personalizado', from: '2025-02-01', to: '2025-03-01' } });
    expect(p).toEqual({ periodo_desde: '2025-02-01', periodo_hasta: '2025-03-01' });
    expect(resolveParams([{ name: 'r', type: 'list', default: '' }])).toEqual({ r: null });
  });
  it('aplica campos calculados y rechaza expresiones peligrosas', () => {
    const rows = applyCalculated([{ a: 10, b: 4 }], [{ name: 'c', expr: 'a / b' }, { name: 't', expr: "CASE WHEN a > 5 THEN 'alto' ELSE 'bajo' END" }]);
    expect(rows[0]).toMatchObject({ c: 2.5, t: 'alto' });
    expect(() => validateExpr('1; DROP TABLE x')).toThrow();
    expect(() => validateExpr('(SELECT 1)')).toThrow();
  });
  it('ejecuta orígenes derivados en orden y detecta ciclos', () => {
    const ds = [
      { id: 'b', sql: 'SELECT region, COUNT(*) AS n FROM origen.a GROUP BY region' },
      { id: 'a', sql: 'SELECT * FROM clientes' },
    ];
    expect(executionOrder(ds).order).toEqual(['a', 'b']);
    const { data, errors } = buildReportData(ds);
    expect(errors).toEqual({});
    expect(data.sources.b.rows).toHaveLength(5);
    const cyc = executionOrder([{ id: 'x', sql: 'SELECT * FROM origen.y' }, { id: 'y', sql: 'SELECT * FROM origen.x' }]);
    expect(Object.values(cyc.errors).join(' ')).toMatch(/circular/);
  });
  it('parámetros opcionales con IS NULL', () => {
    const sql = 'SELECT COUNT(*) AS n FROM clientes WHERE (:region IS NULL OR region = :region)';
    expect(runQuery(sql, { region: null }).rows[0].n).toBe(60);
    expect(runQuery(sql, { region: 'Sur' }).rows[0].n).toBeLessThan(60);
  });
});

describe('plantillas', () => {
  for (const t of TEMPLATES) {
    it(`«${t.name}» ejecuta todos sus orígenes y no tiene vínculos rotos`, () => {
      const tpl = t.build();
      const { data, errors } = buildReportData(tpl.dataSources, tpl.params);
      expect(errors).toEqual({});
      for (const d of tpl.dataSources) expect(data.sources[d.id].rows.length).toBeGreaterThan(0);
      const withFields = tpl.dataSources.map((d) => ({ ...d, fields: data.sources[d.id].fields }));
      expect(ops.validateModel(tpl.model, withFields, tpl.semantic)).toEqual([]);
    });
  }
});

describe('modelOps', () => {
  const base = () => ops.pageModel(salesTemplate().model, 0);
  it('mueve, duplica y elimina celdas', () => {
    let m = base();
    const id = m.rows[1].cells[0].id;
    m = ops.moveCell(m, id, { newRow: 0 });
    expect(m.rows[0].cells[0].id).toBe(id);
    const d = ops.duplicateCell(m, id);
    expect(ops.findCell(d.model, d.id).type).toBe('tile');
    expect(ops.findCell(ops.removeCell(d.model, d.id), d.id)).toBeNull();
  });
  it('coloca varias celdas en una fila con el mismo ancho', () => {
    const m = base();
    const ids = [m.rows[1].cells[0].id, m.rows[2].cells[1].id, m.rows[3].cells[0].id];
    const r = ops.arrangeInRow(m, ids);
    const row = r.rows.find((x) => x.cells.some((c) => c.id === ids[0]));
    expect(row.cells.map((c) => c.id)).toEqual(ids);
    expect(row.cells.every((c) => c.span === 4)).toBe(true);
  });
  it('pega copias con ids nuevos y propaga el renombrado de orígenes', () => {
    const m = base();
    const cells = [m.rows[1].cells[0]];
    const r = ops.pasteCells(m, cells, cells[0].id);
    expect(r.ids[0]).not.toBe(cells[0].id);
    const renamed = ops.renameSource(m, 'pedidos', 'ventas');
    expect(ops.sourceUsage(renamed)).toMatchObject({ ventas: expect.any(Number) });
    expect(ops.sourceUsage(renamed).pedidos).toBeUndefined();
  });
  it('autoBind limpia campos inexistentes y rellena los nuevos', () => {
    const c = { ...newCell('chart', 'x'), props: { category: 'antiguo', values: ['viejo'] } };
    const ds = { fields: [{ name: 'region', type: 'string' }, { name: 'importe', type: 'number' }] };
    expect(autoBind(c, ds).props).toMatchObject({ category: 'region', values: ['importe'] });
  });
});

describe('autoLayout', () => {
  it('genera filtros, losetas, gráficos y tabla desde los datos', () => {
    const t = salesTemplate();
    const { data } = buildReportData(t.dataSources, t.params);
    const m = autoLayout(t.dataSources, data, { title: 'X' });
    const types = m.rows.flatMap((r) => r.cells.map((c) => c.type));
    expect(types).toContain('filter');
    expect(types).toContain('tile');
    expect(types).toContain('chart');
    expect(types).toContain('grid');
    for (const r of m.rows) expect(r.cells.reduce((a, c) => a + c.span, 0)).toBeLessThanOrEqual(12);
  });
});

describe('htmlGenerator', () => {
  it('genera HTML ligero sin SQL y con el modelo reabrible', () => {
    const t = salesTemplate();
    t.model.theme = { brand: '#8764b8', palette: 'ocean', density: 'compact', mode: 'dark', logo: '' };
    const html = generateHtml({ name: 'Ventas', ...t });
    expect(html).not.toMatch(/SELECT\s[\s\S]*\sFROM\s/);
    expect(html).toContain('lib/rptlib/1.2.0/rptlib.js');
    expect(html).toContain('class="rpt-page" data-page="analisis"');
    expect(html).toContain('data-rpt-filters=');
    expect(html).toContain('@page { size: A4 landscape');
    expect(html).toContain('counter(pages)');
    expect(html).toContain('id="rpt-semantic"');
    expect(html).toContain('data-rpt-theme="dark"');
    expect(html).toContain('--rpt-brand:#8764b8');
    const embedded = JSON.parse(/<script type="application\/json" id="rpt-model">([\s\S]*?)<\/script>/.exec(html)[1]);
    expect(embedded.pages).toHaveLength(3);
    expect(embedded.theme.palette).toBe('ocean');
    expect(new TextEncoder().encode(html).length).toBeLessThan(20000);
  });
  it('escapa los datos inyectados para no romper el <script>', () => {
    const out = injectData('<html><head></head></html>', { x: '</script><b>' });
    expect(out).not.toContain('</script><b>');
  });
});

describe('diff', () => {
  it('compara versiones: componentes, SQL y parámetros', () => {
    const a = { ...salesTemplate(), mode: 'designer' };
    const b = structuredClone(a);
    b.model.pages[0].rows[1].cells.pop();
    b.model.pages[0].rows[0].cells[0].props.label = 'Zona';
    b.semantic.measures.push({ name: 'nueva', expr: 'MAX(importe)' });
    b.dataSources[0].sql += '\nLIMIT 10';
    b.params[0].default = 2026;
    const d = diffVersions(a, b);
    expect(d.components.removed).toHaveLength(1);
    expect(d.components.changed[0].changes.join(' ')).toMatch(/label/);
    expect(d.sources.changed[0].sql.some((l) => l.type === 'add' && l.text === 'LIMIT 10')).toBe(true);
    expect(d.params.changed[0]).toMatch(/2026/);
    expect(d.semantic.join(' ')).toMatch(/\+ medida nueva/);
    expect(diffVersions(a, a).empty).toBe(true);
    expect(lineDiff('a\nb', 'a\nc').map((x) => x.type)).toEqual(['same', 'del', 'add']);
  });
});
