// Operaciones puras sobre el modelo de diseño { title, subtitle, rows: [{ id, cells: [cell] }] }.
import { uid } from './catalog.js';
import { allRows, modelPages } from './htmlGenerator.js';

const clone = (m) => structuredClone(m);
const rowSpan = (row) => row.cells.reduce((a, c) => a + (c.span || 12), 0);

export function locate(model, cellId) {
  for (let r = 0; r < model.rows.length; r++) {
    const c = model.rows[r].cells.findIndex((x) => x.id === cellId);
    if (c >= 0) return { r, c };
  }
  return null;
}

export function findCell(model, cellId) {
  const p = locate(model, cellId);
  return p ? model.rows[p.r].cells[p.c] : null;
}

const prune = (m) => ({ ...m, rows: m.rows.filter((r) => r.cells.length) });

/** target: { row, at } inserta en fila existente; { newRow } crea fila en esa posición. */
export function insertCell(model, cell, target) {
  const m = clone(model);
  if (target && target.row != null && m.rows[target.row]) {
    const cells = m.rows[target.row].cells;
    cells.splice(target.at == null ? cells.length : target.at, 0, cell);
  } else {
    const at = target?.newRow ?? m.rows.length;
    m.rows.splice(at, 0, { id: uid('r'), cells: [cell] });
  }
  return prune(m);
}

/** Sitio razonable para añadir sin arrastrar: junto a la selección si cabe; si no, fila nueva debajo. */
export function smartTarget(model, selectedId, span) {
  const p = selectedId ? locate(model, selectedId) : null;
  if (!p) {
    const last = model.rows[model.rows.length - 1];
    if (last && rowSpan(last) + span <= 12) return { row: model.rows.length - 1 };
    return { newRow: model.rows.length };
  }
  if (rowSpan(model.rows[p.r]) + span <= 12) return { row: p.r, at: p.c + 1 };
  return { newRow: p.r + 1 };
}

export function moveCell(model, cellId, target) {
  const p = locate(model, cellId);
  if (!p) return model;
  const m = clone(model);
  const [cell] = m.rows[p.r].cells.splice(p.c, 1);
  let t = { ...target };
  // Ajusta índices si la extracción afecta a la posición destino.
  if (t.row === p.r && t.at != null && t.at > p.c) t.at -= 1;
  const emptied = m.rows[p.r].cells.length === 0;
  if (emptied) {
    m.rows.splice(p.r, 1);
    if (t.row != null && t.row > p.r) t.row -= 1;
    else if (t.row === p.r) t = { newRow: p.r };
    if (t.newRow != null && t.newRow > p.r) t.newRow -= 1;
  }
  return insertCell(m, cell, t);
}

export function nudgeCell(model, cellId, dir) {
  const p = locate(model, cellId);
  if (!p) return model;
  if (dir === 'left' || dir === 'right') {
    const at = p.c + (dir === 'left' ? -1 : 2);
    if (at < 0 || at > model.rows[p.r].cells.length) return model;
    return moveCell(model, cellId, { row: p.r, at });
  }
  if (dir === 'up') return p.r === 0 && model.rows[0].cells.length === 1 ? model : p.r === 0 ? moveCell(model, cellId, { newRow: 0 }) : moveCell(model, cellId, { row: p.r - 1 });
  if (dir === 'down') {
    if (p.r === model.rows.length - 1) return model.rows[p.r].cells.length === 1 ? model : moveCell(model, cellId, { newRow: model.rows.length });
    return moveCell(model, cellId, { row: p.r + 1, at: 0 });
  }
  return model;
}

export function updateCell(model, cellId, patch) {
  const m = clone(model);
  const p = locate(m, cellId);
  if (!p) return model;
  m.rows[p.r].cells[p.c] = { ...m.rows[p.r].cells[p.c], ...patch };
  return m;
}

export function removeCell(model, cellId) {
  const m = clone(model);
  const p = locate(m, cellId);
  if (!p) return model;
  m.rows[p.r].cells.splice(p.c, 1);
  return prune(m);
}

export function duplicateCell(model, cellId) {
  const p = locate(model, cellId);
  if (!p) return { model, id: null };
  const copy = { ...clone(model.rows[p.r].cells[p.c]), id: uid('c') };
  const t = rowSpan(model.rows[p.r]) + copy.span <= 12 ? { row: p.r, at: p.c + 1 } : { newRow: p.r + 1 };
  return { model: insertCell(model, copy, t), id: copy.id };
}

export function moveRow(model, index, delta) {
  const to = index + delta;
  if (to < 0 || to >= model.rows.length) return model;
  const m = clone(model);
  const [row] = m.rows.splice(index, 1);
  m.rows.splice(to, 0, row);
  return m;
}

export function removeRow(model, index) {
  const m = clone(model);
  m.rows.splice(index, 1);
  return m;
}

/** Cuenta cuántos componentes usan cada origen de datos. */
export function sourceUsage(model) {
  const u = {};
  for (const r of allRows(model)) for (const c of r.cells) if (c.source) u[c.source] = (u[c.source] || 0) + 1;
  for (const f of model?.reportFilters || []) if (f.source) u[f.source] = (u[f.source] || 0) + 1;
  return u;
}

/** Problemas de vinculación (para avisar antes de guardar). */
export function validateModel(model, dataSources, semantic = {}) {
  const issues = [];
  const ids = new Set(dataSources.map((d) => d.id));
  const measures = new Map((semantic?.measures || []).map((m) => [`m:${m.name}`, m]));
  const hierarchies = new Map((semantic?.hierarchies || []).map((h) => [`h:${h.name}`, h]));
  const name = (c) => c.props.title || c.props.label || c.props.text || c.type;
  for (const r of allRows(model)) {
    for (const c of r.cells) {
      if (c.source && !ids.has(c.source)) issues.push({ cellId: c.id, msg: `«${name(c)}» usa el origen inexistente «${c.source}»` });
      const ds = dataSources.find((d) => d.id === c.source);
      if (!ds) continue;
      const names = new Set((ds.fields || []).map((f) => f.name));
      const pr = c.props;
      const used = [pr.field, pr.category, pr.targetField, pr.sortBy, pr.trendField, pr.dateField, pr.timeField, pr.splitBy, pr.group, pr.x, pr.y, pr.size, c.type === 'scatter' ? pr.color : null, c.type === 'scatter' ? pr.label : null, pr.rows, pr.cols, pr.value, pr.filterField,
        ...(pr.values || []), ...(pr.columns || []), ...(pr.databars || []), ...(pr.levels || []), ...(pr.groupBy || []), ...(pr.rules || []).map((x) => x.field),
        ...(pr.sparklines || []).flatMap((x) => (x.source ? [x.key] : [x.key, x.time, x.value]))].filter(Boolean);
      for (const sp of (pr.sparklines || []).filter((x) => x.source)) {
        const other = dataSources.find((d) => d.id === sp.source);
        if (!other) { issues.push({ cellId: c.id, msg: `«${name(c)}» toma la tendencia del origen inexistente «${sp.source}»` }); continue; }
        for (const f of [sp.key, sp.time, sp.value]) if (f && !(other.fields || []).some((x) => x.name === f)) issues.push({ cellId: c.id, msg: `«${name(c)}»: la tendencia usa «${f}», que no existe en «${other.id}»` });
      }
      for (const f of used) {
        if (names.has(f)) continue;
        const m = measures.get(f);
        if (m && (!m.source || m.source === ds.id)) continue;
        const h = hierarchies.get(f);
        if (h && (!h.source || h.source === ds.id)) continue;
        issues.push({ cellId: c.id, msg: `«${name(c)}» usa ${f.startsWith('m:') ? 'la medida' : f.startsWith('h:') ? 'la jerarquía' : 'el campo'} «${f.replace(/^[mh]:/, '')}», que no existe en «${ds.id}»` });
      }
    }
  }
  return issues;
}

/** Propaga el renombrado de un origen a todos los componentes que lo usan. */
export function renameSource(model, from, to) {
  if (!model) return model;
  const fix = (rows) => rows.map((r) => ({ ...r, cells: r.cells.map((c) => (c.source === from ? { ...c, source: to } : c)) }));
  const next = { ...model };
  if (model.pages) next.pages = model.pages.map((p) => ({ ...p, rows: fix(p.rows) }));
  if (model.rows) next.rows = fix(model.rows);
  if (model.reportFilters) next.reportFilters = model.reportFilters.map((f) => (f.source === from ? { ...f, source: to } : f));
  return next;
}

/** Propaga el renombrado de un origen al modelo semántico. */
export function renameSourceInSemantic(sem, from, to) {
  if (!sem) return sem;
  const r = (s) => (s === from ? to : s);
  return {
    ...sem,
    relations: (sem.relations || []).map((x) => ({ ...x, from: { ...x.from, source: r(x.from.source) }, to: { ...x.to, source: r(x.to.source) } })),
    measures: (sem.measures || []).map((m) => ({ ...m, source: m.source ? r(m.source) : m.source })),
    hierarchies: (sem.hierarchies || []).map((h) => ({ ...h, source: h.source ? r(h.source) : h.source })),
  };
}

/** Modelo de una página concreta para reutilizar las operaciones de filas. */
export function pageModel(model, pageIndex) {
  const pages = modelPages(model);
  return { ...model, rows: pages[Math.min(pageIndex, pages.length - 1)].rows };
}
/** Escribe las filas editadas de una página en el modelo (convierte a multipágina si hace falta). */
export function withPageRows(model, pageIndex, rows) {
  const pages = modelPages(model).map((p, i) => (i === pageIndex ? { ...p, rows } : p));
  const { rows: _r, ...rest } = model;
  return { ...rest, pages };
}

export function removeCells(model, ids) {
  const set = new Set(ids);
  return prune({ ...clone(model), rows: model.rows.map((r) => ({ ...r, cells: r.cells.filter((c) => !set.has(c.id)) })) });
}

export function updateCells(model, ids, patch) {
  const set = new Set(ids);
  return { ...model, rows: model.rows.map((r) => ({ ...r, cells: r.cells.map((c) => (set.has(c.id) ? { ...c, ...patch } : c)) })) };
}

/** Coloca las celdas seleccionadas juntas en una fila, con el mismo ancho. */
export function arrangeInRow(model, ids) {
  if (ids.length < 2) return model;
  const order = [];
  for (const r of model.rows) for (const c of r.cells) if (ids.includes(c.id)) order.push(c);
  const span = Math.max(2, Math.floor(12 / order.length));
  const first = locate(model, order[0].id).r;
  let m = removeCells(model, ids);
  const at = Math.min(first, m.rows.length);
  m = clone(m);
  m.rows.splice(at, 0, { id: uid('r'), cells: order.map((c) => ({ ...c, span })) });
  return m;
}

/** Inserta copias de celdas (con ids nuevos) tras la celda indicada o al final. */
export function pasteCells(model, cells, afterId) {
  const copies = cells.map((c) => ({ ...structuredClone(c), id: uid('c') }));
  let m = model;
  let prev = afterId && locate(model, afterId) ? afterId : null;
  for (const c of copies) {
    m = insertCell(m, c, smartTarget(m, prev, c.span));
    prev = c.id;
  }
  return { model: m, ids: copies.map((c) => c.id) };
}

/** Inserta una fila completa (bloque reutilizable) con ids nuevos. */
export function insertRow(model, row, index) {
  const m = clone(model);
  const copy = { id: uid('r'), cells: row.cells.map((c) => ({ ...structuredClone(c), id: uid('c') })) };
  m.rows.splice(index ?? m.rows.length, 0, copy);
  return { model: m, ids: copy.cells.map((c) => c.id) };
}
