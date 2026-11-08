import { beforeAll, describe, expect, it } from 'vitest';
import { suggestVisuals } from '../src/lib/showMe.js';
import { exportTheme, parseTheme } from '../src/lib/themes.js';

describe('Show Me', () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ mes: `2025-${String((i % 12) + 1).padStart(2, '0')}`, region: ['A', 'B', 'C'][i % 3], comunidad: 'Madrid', estado: ['x', 'y'][i % 2], importe: i * 10, unidades: i }));
  const F = (name, type = 'string') => ({ name, label: name, type });
  it('tiempo + medida → líneas', () => expect(suggestVisuals([F('mes'), F('importe', 'number')], rows)[0]).toMatchObject({ type: 'chart', props: { type: 'line' } }));
  it('lugar + medida → mapa', () => expect(suggestVisuals([F('comunidad'), F('importe', 'number')], rows)[0].type).toBe('map'));
  it('pocas categorías → donut', () => expect(suggestVisuals([F('region'), F('importe', 'number')], rows)[0].props.type).toBe('donut'));
  it('dos medidas → dispersión', () => expect(suggestVisuals([F('importe', 'number'), F('unidades', 'number')], rows)[0].type).toBe('scatter'));
  it('tiempo + categoría + medida → múltiplos pequeños', () => expect(suggestVisuals([F('mes'), F('region'), F('importe', 'number')], rows)[0].props.splitBy).toBe('region'));
  it('una medida → loseta', () => expect(suggestVisuals([F('importe', 'number')], rows)[0].type).toBe('tile'));
});

describe('Temas JSON', () => {
  it('importa un tema de Power BI', () => {
    const { theme } = parseTheme({ name: 'Corporativo', dataColors: ['#118DFF', '#12239E', '#E66C37'], tableAccent: '#118DFF', background: '#FFFFFF', textClasses: { label: { fontFace: 'Segoe UI' } } });
    expect(theme).toMatchObject({ name: 'Corporativo', palette: 'custom', brand: '#118dff', colors: ['#118dff', '#12239e', '#e66c37'], font: 'Segoe UI', background: '#ffffff' });
  });
  it('rechaza JSON sin colores reconocibles', () => {
    expect(() => parseTheme('{"foo":1}')).toThrow(/colores/);
    expect(() => parseTheme('no es json')).toThrow(/JSON/);
  });
  it('exportar e importar conserva el tema', () => {
    const t = { brand: '#8764b8', palette: 'custom', colors: ['#111111', '#222222'], density: 'compact', mode: 'dark', font: 'Arial' };
    const back = parseTheme(exportTheme(t)).theme;
    expect(back).toMatchObject({ brand: '#8764b8', palette: 'custom', colors: ['#111111', '#222222'], density: 'compact', mode: 'dark', font: 'Arial' });
  });
});

describe('Subinformes y datos completos', () => {
  let store, buildFullData;
  beforeAll(async () => {
    const mem = {};
    globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
    globalThis.window ??= { location: { href: 'http://localhost/' } };
    store = await import('../src/lib/store.js');
    ({ buildFullData } = await import('../src/lib/reportData.js'));
  });
  it('resuelve un subinforme con sus orígenes prefijados, medidas y parámetros heredados', () => {
    const team = store.listReports().find((r) => /Equipo/.test(r.name));
    const parent = { id: 'x', params: [{ name: 'anio', type: 'number', default: 2025 }], dataSources: [], semantic: { measures: [] }, model: { rows: [{ cells: [{ id: 's', type: 'subreport', props: { report: team.id } }] }] } };
    const { data, errors } = buildFullData(parent, { anio: 2024 });
    expect(errors).toEqual({});
    const sub = data.subreports[team.id];
    expect(sub.rows.length).toBeGreaterThan(2);
    const used = sub.rows.flatMap((r) => r.cells.map((c) => c.source)).filter(Boolean);
    expect(used.every((s) => s.startsWith('sub1_') && data.sources[s])).toBe(true);
  });
  it('guarda y borra vistas (marcadores) sin crear versiones', () => {
    const r = store.listReports()[0];
    const before = store.listVersions(r.id).length;
    const bm = store.saveBookmark(r.id, { name: 'Zona Sur', state: { filters: { a: 1 } }, params: { anio: 2024 } });
    expect(store.listBookmarks(r.id)[0]).toMatchObject({ name: 'Zona Sur', params: { anio: 2024 } });
    store.deleteBookmark(r.id, bm.id);
    expect(store.listBookmarks(r.id)).toHaveLength(0);
    expect(store.listVersions(r.id).length).toBe(before);
  });
});
