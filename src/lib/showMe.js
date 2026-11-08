// «Show Me»: sugiere los visuales más adecuados para los campos elegidos (al estilo de Tableau).
const TIME_RE = /(^|_)(mes|fecha|dia|año|anio|periodo|semana|trimestre)(_|$)/i;
const GEO_RE = /(comunidad|provincia|pais|país)/i;
const STAGE_RE = /(estado|etapa|fase|stage)/i;

function classify(field, rows) {
  const isMeasure = field.measure || (field.type === 'number' && !/^id$|_id$/.test(field.name));
  const distinct = new Set(rows.map((r) => r[field.name])).size;
  return {
    name: field.name, label: field.label || field.name, measure: !!isMeasure,
    time: !isMeasure && (field.type === 'date' || TIME_RE.test(field.name)), date: field.type === 'date',
    geo: !isMeasure && GEO_RE.test(field.name), stage: !isMeasure && STAGE_RE.test(field.name), distinct,
  };
}

/**
 * @param fields campos elegidos ({ name, label, type, measure? })
 * @param rows   filas del origen (para cardinalidades; las medidas se ignoran)
 * @returns lista ordenada de { type, props, span, score, reason }
 */
export function suggestVisuals(fields, rows = []) {
  const f = fields.map((x) => classify(x, rows));
  const ms = f.filter((x) => x.measure);
  const ds = f.filter((x) => !x.measure);
  const m0 = ms[0];
  const out = [];
  const add = (score, type, props, span, reason) => out.push({ score, type, props, span, reason });
  const vals = ms.map((m) => m.name);
  const title = (m, d) => `${m ? m.label : 'Registros'}${d ? ` por ${d.label.toLowerCase()}` : ''}`;

  if (!ds.length && ms.length === 1) {
    add(90, 'tile', { title: m0.label, field: m0.name, agg: 'sum', icon: 'chart', color: 'brand' }, 3, 'Una sola medida: un valor destacado.');
    add(70, 'gauge', { title: m0.label, field: m0.name, agg: 'sum' }, 4, 'Para compararla con un objetivo.');
    add(60, 'kpi', { label: m0.label, field: m0.name, agg: 'sum' }, 4, 'Indicador con objetivo y comparación temporal.');
  }
  if (!ds.length && ms.length >= 2) {
    add(90, 'scatter', { title: `${ms[0].label} vs ${ms[1].label}`, x: ms[0].name, y: ms[1].name, size: ms[2]?.name }, 6, 'Dos medidas: su relación.');
  }
  if (ds.length === 1) {
    const d = ds[0];
    const base = { category: d.name, values: vals.length ? vals : [d.name], agg: vals.length ? 'sum' : 'count' };
    if (d.time) {
      add(95, 'chart', { ...base, title: title(m0, d), type: 'line', sort: 'label' }, 8, 'Evolución en el tiempo: líneas.');
      add(75, 'chart', { ...base, title: title(m0, d), type: 'column', sort: 'label', compare: 'yoy' }, 8, 'Columnas comparadas con el año anterior.');
      if (d.date && m0) add(70, 'calendar', { title: title(m0, d), dateField: d.name, value: m0.name, agg: 'sum' }, 12, 'Detalle diario en un calendario.');
      if (m0) add(55, 'narrative', { title: 'Resumen', field: m0.name, timeField: d.name, grain: d.date ? 'month' : '' }, 12, 'Explicación automática de la evolución.');
    }
    if (d.geo && m0) add(92, 'map', { title: title(m0, d), field: d.name, value: m0.name, agg: 'sum', geo: /provincia/i.test(d.name) ? 'es-provincias' : 'es-comunidades' }, 6, 'Campo geográfico: mapa.');
    if (d.stage) add(80, 'funnel', { ...base, title: title(m0, d) }, 6, 'Etapas: embudo con conversión.');
    if (!d.time) {
      if (d.distinct <= 6) add(85, 'chart', { ...base, title: title(m0, d), type: 'donut' }, 4, 'Pocas categorías: reparto en donut.');
      add(d.distinct <= 6 ? 75 : 88, 'chart', { ...base, title: title(m0, d), type: d.distinct > 12 ? 'bar' : 'column', sort: 'desc', ...(d.distinct > 12 ? { limit: 10 } : {}) }, d.distinct > 12 ? 6 : 6, d.distinct > 12 ? 'Muchas categorías: ranking en barras.' : 'Comparar categorías: columnas.');
      if (m0) add(60, 'treemap', { title: title(m0, d), category: d.name, value: m0.name, agg: 'sum' }, 6, 'Proporciones con muchas categorías.');
      if (m0) add(50, 'waterfall', { title: `Contribución por ${d.label.toLowerCase()}`, category: d.name, values: [m0.name], agg: 'sum' }, 6, 'Cómo suma cada categoría al total.');
      add(45, 'filter', { field: d.name, label: d.label, mode: d.distinct <= 8 ? 'multi' : 'select' }, 3, 'Usarlo como filtro del informe.');
    }
  }
  if (ds.length === 2) {
    const [a, b] = ds.some((x) => x.time) ? [ds.find((x) => x.time), ds.find((x) => !x.time) || ds[1]] : ds;
    if (m0 && a.time) add(90, 'chart', { title: `${m0.label} por ${a.label.toLowerCase()} y ${b.label.toLowerCase()}`, category: a.name, values: [m0.name], agg: 'sum', type: 'line', sort: 'label', splitBy: b.name }, 12, 'Tiempo × categoría: múltiplos pequeños.');
    if (m0) add(85, 'pivot', { title: `${m0.label} por ${a.label.toLowerCase()} y ${b.label.toLowerCase()}`, rows: a.name, cols: b.name, value: m0.name, agg: 'sum', heatmap: true }, 6, 'Dos dimensiones: tabla dinámica con mapa de calor.');
    if (m0 && !a.time) add(80, 'treemap', { title: `${m0.label} por ${b.label.toLowerCase()}`, category: b.name, group: a.name, value: m0.name, agg: 'sum' }, 6, 'Jerarquía de dos niveles: treemap.');
    if (m0 && !a.time && !b.time) add(70, 'sankey', { title: `Flujos ${a.label.toLowerCase()} → ${b.label.toLowerCase()}`, levels: [a.name, b.name], value: m0.name, agg: 'sum' }, 12, 'Flujos entre dos categorías: Sankey.');
    if (m0) add(60, 'chart', { title: `${m0.label} por ${a.label.toLowerCase()}`, category: a.name, values: [m0.name], agg: 'sum', type: 'column', splitBy: b.name }, 12, 'Comparar la misma serie por categoría.');
  }
  if (ds.length >= 3) {
    if (m0) add(70, 'sankey', { title: 'Flujos', levels: ds.slice(0, 3).map((x) => x.name), value: m0.name, agg: 'sum' }, 12, 'Tres categorías: flujo de Sankey.');
  }
  if (f.length >= 3 || (ds.length && !ms.length && ds.length > 1)) {
    add(ms.length ? 50 : 80, 'grid', { title: 'Detalle', columns: f.filter((x) => !x.name.startsWith('m:')).map((x) => x.name), groupBy: ds.length >= 2 && ms.length ? [ds[0].name] : [], totals: !!ms.length, pageSize: 10 }, 12, 'Detalle en tabla' + (ds.length >= 2 && ms.length ? ' agrupada con subtotales.' : '.'));
  }
  if (!out.length && f.length) add(40, 'grid', { title: 'Detalle', columns: f.map((x) => x.name), pageSize: 10 }, 12, 'Tabla con los campos elegidos.');
  return out.sort((x, y) => y.score - x.score).slice(0, 6);
}
