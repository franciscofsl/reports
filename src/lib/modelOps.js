// Operaciones puras sobre el modelo de diseño { title, subtitle, rows: [{ id, cells: [cell] }] }.
import { uid } from './catalog.js';

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
  for (const r of model?.rows || []) for (const c of r.cells) if (c.source) u[c.source] = (u[c.source] || 0) + 1;
  return u;
}

/** Problemas de vinculación (para avisar antes de guardar). */
export function validateModel(model, dataSources) {
  const issues = [];
  const ids = new Set(dataSources.map((d) => d.id));
  for (const r of model?.rows || []) {
    for (const c of r.cells) {
      if (c.source && !ids.has(c.source)) issues.push({ cellId: c.id, msg: `«${c.props.title || c.props.label || c.type}» usa el origen inexistente «${c.source}»` });
      const ds = dataSources.find((d) => d.id === c.source);
      if (!ds) continue;
      const names = new Set((ds.fields || []).map((f) => f.name));
      const used = [c.props.field, c.props.category, c.props.targetField, c.props.sortBy, ...(c.props.values || []), ...(c.props.columns || [])].filter(Boolean);
      for (const f of used) if (!names.has(f)) issues.push({ cellId: c.id, msg: `«${c.props.title || c.props.label || c.type}» usa el campo «${f}», que no existe en «${ds.id}»` });
    }
  }
  return issues;
}
