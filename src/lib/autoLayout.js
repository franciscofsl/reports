// Diseño automático: propone un informe a partir de los orígenes de datos y sus campos.
import { uid } from './catalog.js';
import { LIB_VERSION } from './htmlGenerator.js';

const isId = (f) => /^id$|_id$/.test(f.name);
const TIME_RE = /(^|_)(mes|fecha|dia|año|anio|periodo|semana|trimestre)(_|$)/i;
const distinct = (rows, k) => new Set(rows.map((r) => r[k])).size;
const cell = (type, span, source, props) => ({ id: uid('c'), type, span, source, props });

/**
 * @param dataSources definiciones (con fields)
 * @param data resultado de buildReportData().data (para cardinalidades y número de filas)
 */
export function autoLayout(dataSources, data, { title = 'Informe', subtitle = '' } = {}) {
  const sources = dataSources.filter((d) => data.sources[d.id]?.rows?.length);
  if (!sources.length) return { libVersion: LIB_VERSION, title, subtitle, rows: [] };
  const rowsOf = (d) => data.sources[d.id].rows;
  const fieldsOf = (d) => data.sources[d.id].fields || d.fields || [];
  const main = [...sources].sort((a, b) => rowsOf(b).length - rowsOf(a).length)[0];
  const rows = [];

  // 1. Filtros: campos de texto con pocas categorías, mejor si están en varios orígenes.
  const cand = fieldsOf(main).filter((f) => f.type === 'string' && !isId(f)).map((f) => ({
    f, n: distinct(rowsOf(main), f.name), shared: sources.filter((d) => fieldsOf(d).some((x) => x.name === f.name)).length,
  })).filter((c) => c.n >= 2 && c.n <= 12).sort((a, b) => b.shared - a.shared || a.n - b.n).slice(0, 3);
  if (cand.length) rows.push({ id: uid('r'), cells: cand.map((c) => cell('filter', 12 / Math.max(cand.length, 3) | 0 || 4, main.id, { field: c.f.name, label: c.f.label, mode: c.n <= 6 ? 'multi' : 'select' })) });

  // 2. Losetas con los totales del origen principal.
  const nums = fieldsOf(main).filter((f) => f.type === 'number' && !isId(f));
  const tiles = [cell('tile', 3, main.id, { title: 'Registros', agg: 'count', format: 'integer', icon: 'box', color: 'teal', field: fieldsOf(main)[0]?.name })];
  const icons = ['money', 'chart', 'star'];
  const colors = ['brand', 'purple', 'orange'];
  const timeMain = fieldsOf(main).find((f) => TIME_RE.test(f.name) || f.type === 'date');
  nums.slice(0, 3).forEach((f, i) => tiles.unshift(cell('tile', 3, main.id, {
    title: f.label || f.name, field: f.name, agg: 'sum', icon: icons[i], color: colors[i],
    format: f.format === 'currency' ? 'compactCurrency' : 'compact',
    ...(timeMain && timeMain.type !== 'date' ? { trendField: timeMain.name } : {}),
  })));
  rows.push({ id: uid('r'), cells: tiles.slice(0, 4) });

  // 3. Un gráfico por origen agregado (categoría + medida).
  const charts = [];
  for (const d of sources) {
    const fs = fieldsOf(d);
    const measure = fs.filter((f) => f.type === 'number' && !isId(f)).pop();
    if (!measure) continue;
    const time = fs.find((f) => TIME_RE.test(f.name) && f.type !== 'number');
    const cat = time || fs.find((f) => f.type === 'string' && !isId(f));
    if (!cat) continue;
    const n = distinct(rowsOf(d), cat.name);
    if (d === main && n > 40 && !time) continue;
    let props;
    if (time) props = { type: n > 24 ? 'area' : 'line', sort: 'label' };
    else if (n <= 6) props = { type: 'donut' };
    else if (n <= 14) props = { type: 'column', sort: 'desc' };
    else props = { type: 'bar', sort: 'desc', limit: 10 };
    charts.push(cell('chart', props.type === 'donut' ? 4 : 8, d.id, { title: `${measure.label || measure.name} por ${(cat.label || cat.name).toLowerCase()}`, category: cat.name, values: [measure.name], agg: 'sum', ...props }));
  }
  // Empareja 8+4 cuando se puede para no dejar huecos.
  const big = charts.filter((c) => c.span === 8);
  const small = charts.filter((c) => c.span === 4);
  while (big.length || small.length) {
    const r = [];
    if (big.length) r.push(big.shift());
    if (small.length) r.push(small.shift());
    else if (big.length) { r[0].span = 6; const b2 = big.shift(); b2.span = 6; r.push(b2); }
    if (r.length === 1) r[0].span = 12;
    if (r.length === 1 && small.length) { r.push(small.shift()); r[0].span = 8; }
    rows.push({ id: uid('r'), cells: r });
  }

  // 4. Detalle del origen principal.
  if (fieldsOf(main).length >= 3) {
    const money = nums.find((f) => f.format === 'currency');
    rows.push({ id: uid('r'), cells: [cell('grid', 12, main.id, {
      title: main.name, pageSize: 10, search: true, totals: nums.length > 0, columns: [],
      ...(money ? { databars: [money.name] } : {}),
      ...(cand[0] ? { filterField: cand[0].f.name } : {}),
    })] });
  }
  return { libVersion: LIB_VERSION, title, subtitle, rows };
}
