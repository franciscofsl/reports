// Comparación entre dos versiones de un informe.
import { byType } from './catalog.js';

/** Diff por líneas (LCS). Devuelve [{ type: 'same'|'add'|'del', text }]. */
export function lineDiff(a = '', b = '') {
  const x = String(a).split('\n');
  const y = String(b).split('\n');
  const n = x.length;
  const m = y.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ type: 'same', text: x[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ type: 'del', text: x[i++] });
    else out.push({ type: 'add', text: y[j++] });
  }
  while (i < n) out.push({ type: 'del', text: x[i++] });
  while (j < m) out.push({ type: 'add', text: y[j++] });
  return out;
}

const cellsOf = (model) => Object.fromEntries((model?.rows || []).flatMap((r, ri) => r.cells.map((c, ci) => [c.id, { ...c, pos: `${ri + 1}.${ci + 1}` }])));
const nameOf = (c) => `${byType[c.type]?.label || c.type}${c.props?.title || c.props?.label || c.props?.text ? ` «${c.props.title || c.props.label || c.props.text}»` : ''}`;
const eq = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function diffObj(a = {}, b = {}) {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return keys.filter((k) => !eq(a[k], b[k])).map((k) => ({ key: k, from: a[k], to: b[k] }));
}

/** Diferencias de `a` (anterior) a `b` (posterior). */
export function diffVersions(a, b) {
  const out = { general: [], components: { added: [], removed: [], changed: [] }, sources: { added: [], removed: [], changed: [] }, params: { added: [], removed: [], changed: [] } };
  if (a.mode !== b.mode) out.general.push(`Modo: ${a.mode === 'designer' ? 'diseñador' : 'HTML manual'} → ${b.mode === 'designer' ? 'diseñador' : 'HTML manual'}`);
  if (a.model?.title !== b.model?.title) out.general.push(`Título: «${a.model?.title || ''}» → «${b.model?.title || ''}»`);
  if (a.model?.subtitle !== b.model?.subtitle) out.general.push('Subtítulo modificado');
  if (!eq(a.model?.theme, b.model?.theme)) out.general.push(`Tema: ${diffObj(a.model?.theme, b.model?.theme).map((d) => `${d.key} ${d.from ?? '—'} → ${d.to ?? '—'}`).join(', ')}`);
  if (a.model?.libVersion !== b.model?.libVersion) out.general.push(`Librería: ${a.model?.libVersion || '—'} → ${b.model?.libVersion || '—'}`);
  if (a.mode === 'manual' || b.mode === 'manual') {
    if (a.html !== b.html) out.general.push('HTML modificado');
  }

  const ca = cellsOf(a.model);
  const cb = cellsOf(b.model);
  for (const id of Object.keys(cb)) if (!ca[id]) out.components.added.push({ name: nameOf(cb[id]), pos: cb[id].pos });
  for (const id of Object.keys(ca)) if (!cb[id]) out.components.removed.push({ name: nameOf(ca[id]), pos: ca[id].pos });
  for (const id of Object.keys(cb)) {
    if (!ca[id]) continue;
    const changes = [];
    if (ca[id].pos !== cb[id].pos) changes.push(`posición ${ca[id].pos} → ${cb[id].pos}`);
    if (ca[id].span !== cb[id].span) changes.push(`ancho ${ca[id].span} → ${cb[id].span}`);
    if (ca[id].source !== cb[id].source) changes.push(`origen ${ca[id].source || '—'} → ${cb[id].source || '—'}`);
    for (const d of diffObj(ca[id].props, cb[id].props)) changes.push(`${d.key}: ${JSON.stringify(d.from ?? null)} → ${JSON.stringify(d.to ?? null)}`);
    if (changes.length) out.components.changed.push({ name: nameOf(cb[id]), changes });
  }

  const sa = Object.fromEntries((a.dataSources || []).map((d) => [d.id, d]));
  const sb = Object.fromEntries((b.dataSources || []).map((d) => [d.id, d]));
  for (const id of Object.keys(sb)) if (!sa[id]) out.sources.added.push(id);
  for (const id of Object.keys(sa)) if (!sb[id]) out.sources.removed.push(id);
  for (const id of Object.keys(sb)) {
    if (!sa[id]) continue;
    const x = sa[id];
    const y = sb[id];
    const item = { id, sql: x.sql !== y.sql ? lineDiff(x.sql, y.sql) : null, fields: [], calculated: !eq(x.calculated, y.calculated) };
    const fa = Object.fromEntries((x.fields || []).map((f) => [f.name, f]));
    const fb = Object.fromEntries((y.fields || []).map((f) => [f.name, f]));
    for (const k of Object.keys(fb)) if (!fa[k]) item.fields.push(`+ ${k}`);
    for (const k of Object.keys(fa)) if (!fb[k]) item.fields.push(`− ${k}`);
    for (const k of Object.keys(fb)) if (fa[k] && !eq(fa[k], fb[k])) item.fields.push(`${k}: ${diffObj(fa[k], fb[k]).map((d) => `${d.key} ${d.from ?? '—'} → ${d.to ?? '—'}`).join(', ')}`);
    if (x.name !== y.name) item.fields.unshift(`nombre «${x.name}» → «${y.name}»`);
    if (item.sql || item.fields.length || item.calculated) out.sources.changed.push(item);
  }

  const pa = Object.fromEntries((a.params || []).map((p) => [p.name, p]));
  const pb = Object.fromEntries((b.params || []).map((p) => [p.name, p]));
  for (const k of Object.keys(pb)) if (!pa[k]) out.params.added.push(k);
  for (const k of Object.keys(pa)) if (!pb[k]) out.params.removed.push(k);
  for (const k of Object.keys(pb)) if (pa[k] && !eq(pa[k], pb[k])) out.params.changed.push(`${k}: ${diffObj(pa[k], pb[k]).map((d) => `${d.key} ${JSON.stringify(d.from ?? null)} → ${JSON.stringify(d.to ?? null)}`).join(', ')}`);

  out.empty = !out.general.length && !Object.values(out.components).some((l) => l.length) && !Object.values(out.sources).some((l) => l.length) && !Object.values(out.params).some((l) => l.length);
  return out;
}
