// Pruebas de RptLib 1.2 en Node con un DOM mínimo (sin navegador).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';

let L;
beforeAll(() => {
  const noop = () => {};
  const document = {
    documentElement: { lang: 'es-ES', getAttribute: () => null, hasAttribute: () => true, style: { setProperty: noop } },
    readyState: 'complete', currentScript: null, body: { contains: () => false, appendChild: noop },
    querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, dispatchEvent: noop, createElement: () => ({ style: {} }),
  };
  const win = { document, addEventListener: noop, console, Intl, Math, JSON, Date, CustomEvent: class {}, ResizeObserver: undefined };
  win.window = win;
  win.parent = win;
  vm.createContext(win);
  vm.runInContext(readFileSync(new URL('../public/lib/rptlib/1.2.0/rptlib.js', import.meta.url), 'utf8'), win);
  L = win.RptLib;
});

const rows = [
  { id: 1, region: 'Sur', estado: 'A', importe: 100, fecha: '2025-01-10' },
  { id: 2, region: 'Sur', estado: 'B', importe: 300, fecha: '2025-04-02' },
  { id: 3, region: 'Norte', estado: 'A', importe: 600, fecha: '2024-04-20' },
];

describe('RptLib 1.2 · medidas', () => {
  it('evalúa agregaciones, condiciones, TOTAL y funciones', () => {
    const ev = (e, r = rows) => L.compileMeasure(e).fn(r, rows);
    expect(ev('SUM(importe)')).toBe(1000);
    expect(ev('SUM(importe) / COUNT(*)')).toBeCloseTo(333.33, 1);
    expect(ev("SUM(importe WHERE estado = 'A')")).toBe(700);
    expect(ev('COUNT(DISTINCT region)')).toBe(2);
    expect(ev('SUM(importe) / TOTAL(SUM(importe))', rows.slice(0, 1))).toBeCloseTo(0.1);
    expect(ev('DIVIDE(SUM(importe), 0, -1)')).toBe(-1);
    expect(ev('ROUND(AVG(importe), 1)')).toBeCloseTo(333.3);
  });
  it('explica los errores de sintaxis', () => {
    expect(() => L.compileMeasure('importe')).toThrow(/agregación/);
    expect(() => L.compileMeasure('SUM(importe')).toThrow(/\)/);
    expect(() => L.compileMeasure('FOO(x)')).toThrow(/Función desconocida/);
  });
});

describe('RptLib 1.2 · fechas y analítica', () => {
  it('calcula partes de fecha y formatea periodos', () => {
    expect(L.datePart('2025-08-14', 'quarter')).toBe('2025-T3');
    expect(L.datePart('2025-08-14', 'month')).toBe('2025-08');
    expect(L.formatKey('2025-T3', 'quarter')).toBe('T3 2025');
  });
  it('detecta anomalías y ajusta tendencias', () => {
    expect(L._internals.anomaliesOf([10, 11, 10, 12, 11, 40, 10, 11, 12]).map((a) => a.i)).toEqual([5]);
    const r = L._internals.linreg([1, 2, 3, 4]);
    expect(r.slope).toBeCloseTo(1);
  });
  it('treemap: el área de cada rectángulo es proporcional al valor', () => {
    const out = L._internals.squarify([{ v: 6 }, { v: 3 }, { v: 1 }], 0, 0, 100, 100);
    const areas = out.map((o) => o.w * o.h);
    expect(areas[0] / 10000).toBeCloseTo(0.6, 2);
    expect(areas[2] / 10000).toBeCloseTo(0.1, 2);
  });
});

describe('RptLib 1.2 · modelo semántico y filtros', () => {
  it('propaga un filtro por relaciones entre orígenes con campos distintos', () => {
    const st = L._internals.state;
    st.data = { sources: {
      historico: { fields: [{ name: 'id' }, { name: 'comunidad' }], rows: [{ id: 1, comunidad: 'Madrid' }, { id: 2, comunidad: 'Cataluña' }, { id: 3, comunidad: 'Madrid' }] },
      pedidos: { fields: [{ name: 'pid' }, { name: 'importe' }], rows: [{ pid: 1, importe: 10 }, { pid: 2, importe: 20 }, { pid: 3, importe: 30 }] },
    } };
    L.setSemantic({ relations: [{ from: { source: 'historico', field: 'id' }, to: { source: 'pedidos', field: 'pid' } }] });
    L.setFilter({ source: 'historico', field: 'comunidad', kind: 'in', values: ['Madrid'] });
    const out = L._internals.filterRows('pedidos', st.data.sources.pedidos, {});
    expect(out.map((r) => r.pid)).toEqual([1, 3]);
    L.clearFilters();
    expect(L._internals.filterRows('pedidos', st.data.sources.pedidos, {})).toHaveLength(3);
  });
  it('filtra por partes de fecha y respeta el ámbito de página', () => {
    const st = L._internals.state;
    const src = { fields: [{ name: 'fecha' }], rows };
    L.setSemantic({});
    L.setFilter({ source: 'x', field: 'fecha', part: 'year', kind: 'in', values: ['2025'], page: 'p1' });
    expect(L._internals.filterRows('x', src, { page: 'p1' })).toHaveLength(2);
    expect(L._internals.filterRows('x', src, { page: 'p2' })).toHaveLength(3);
    L.clearFilters();
    expect(st.filters).toEqual({});
  });
  it('profundiza por jerarquías: cada nivel agrupa por su parte de fecha', () => {
    L.setSemantic({ hierarchies: [{ name: 'cal', levels: [{ field: 'fecha', part: 'year' }, { field: 'fecha', part: 'quarter' }] }] });
    const src = { fields: [{ name: 'fecha' }, { name: 'importe', type: 'number' }], rows, allRows: rows };
    const ctx = { id: 'c1' };
    let sd = L._internals.chartData({ category: 'h:cal', values: ['importe'], agg: 'sum' }, src, ctx);
    expect(sd.data.map((d) => d.key)).toEqual(['2024', '2025']);
    L._internals.state.drill.c1 = ['2025'];
    sd = L._internals.chartData({ category: 'h:cal', values: ['importe'], agg: 'sum' }, src, ctx);
    expect(sd.data.map((d) => [d.key, d.values[0]])).toEqual([['2025-T1', 100], ['2025-T2', 300]]);
  });
  it('compara con el año anterior en categorías de fecha', () => {
    const src = { fields: [{ name: 'mes' }, { name: 'v', type: 'number' }], rows: [{ mes: '2024-04', v: 5 }, { mes: '2025-04', v: 8 }, { mes: '2025-05', v: 2 }] };
    const sd = L._internals.chartData({ category: 'mes', values: ['v'], agg: 'sum', compare: 'yoy' }, src, {});
    expect(sd.data.map((d) => [d.key, d.values[0], d.cmp ? d.cmp[0] : null])).toEqual([['2025-04', 8, 5], ['2025-05', 2, null]]);
  });
});
