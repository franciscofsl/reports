// Persistencia del prototipo en localStorage. En producción: API REST + BD.
import { uid } from './catalog.js';
import { generateHtml } from './htmlGenerator.js';
import { inventoryTemplate, salesTeamTemplate, salesTemplate } from './templates.js';

const K_REPORTS = 'rpt.reports.v1';
const K_VERSIONS = (id) => `rpt.versions.v1.${id}`;
const MAX_VERSIONS = 50;

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    throw new Error(`No se pudo guardar (almacenamiento local lleno o bloqueado): ${e.message}`);
  }
}

const listeners = new Set();
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach((fn) => fn());

export function listReports() {
  const list = read(K_REPORTS, null);
  if (list) return list;
  // Primera ejecución: semilla con informes de ejemplo creados a partir de las plantillas.
  const seeds = [
    ['Inventario (ejemplo)', 'Campos calculados, origen derivado y rango de fechas.', inventoryTemplate()],
    ['Equipo comercial (ejemplo)', 'Ventas frente a objetivo, combinado, dispersión y tabla dinámica.', salesTeamTemplate()],
    ['Ventas 2025 (ejemplo)', 'Filtros, filtro cruzado, gauge y tabla con formato condicional.', salesTemplate()],
  ];
  let all = [];
  for (const [name, description, t] of seeds) {
    const report = { id: uid('rpt'), name, description, mode: 'designer', ...t };
    report.html = generateHtml(report);
    const saved = persist(report, 'Versión inicial', all);
    const v = listVersions(saved.id)[0];
    saved.published = { versionId: v.id, n: v.n, date: v.date };
    all = [saved, ...all.filter((r) => r.id !== saved.id)];
    write(K_REPORTS, all);
  }
  return all;
}

export const getReport = (id) => listReports().find((r) => r.id === id) || null;
export const listVersions = (id) => read(K_VERSIONS(id), []);

function persist(report, note, list) {
  const now = new Date().toISOString();
  const versions = listVersions(report.id);
  const n = (versions[0]?.n || 0) + 1;
  const stored = list.find((r) => r.id === report.id);
  const saved = { ...report, published: stored ? stored.published ?? null : report.published ?? null, createdAt: report.createdAt || now, updatedAt: now, version: n };
  const snapshot = {
    id: uid('v'),
    n,
    date: now,
    note: note || '',
    mode: saved.mode,
    html: saved.html,
    model: saved.model,
    dataSources: saved.dataSources,
    params: saved.params,
  };
  write(K_VERSIONS(report.id), [snapshot, ...versions].slice(0, MAX_VERSIONS));
  const others = list.filter((r) => r.id !== report.id);
  write(K_REPORTS, [saved, ...others]);
  return saved;
}

/** Guarda el informe y crea una nueva versión en el historial. */
export function saveReport(report, note) {
  const saved = persist(report, note, read(K_REPORTS, []));
  emit();
  return saved;
}

export function createReport(data, note = 'Creado con el asistente') {
  return saveReport({ id: uid('rpt'), mode: 'designer', params: [], dataSources: [], ...data }, note);
}

export function deleteReport(id) {
  write(K_REPORTS, read(K_REPORTS, []).filter((r) => r.id !== id));
  try { localStorage.removeItem(K_VERSIONS(id)); } catch { /* noop */ }
  emit();
}

export function duplicateReport(id) {
  const r = getReport(id);
  if (!r) return null;
  const { id: _old, version: _v, createdAt: _c, published: _p, ...rest } = r;
  return createReport({ ...structuredClone(rest), name: `${r.name} (copia)` }, `Duplicado de «${r.name}» v${r.version}`);
}

/** Restaura una copia (completa o por partes). No borra el historial: crea una versión nueva. */
export function restoreVersion(reportId, versionId, parts = ['design', 'data', 'params']) {
  const r = getReport(reportId);
  const v = listVersions(reportId).find((x) => x.id === versionId);
  if (!r || !v) throw new Error('Versión no encontrada');
  const next = { ...r };
  if (parts.includes('design')) Object.assign(next, { mode: v.mode, html: v.html, model: v.model });
  if (parts.includes('data')) next.dataSources = v.dataSources;
  if (parts.includes('params')) next.params = v.params;
  const what = parts.length === 3 ? '' : ` (${parts.map((x) => ({ design: 'diseño', data: 'orígenes', params: 'parámetros' })[x]).join(', ')})`;
  return saveReport(next, `Restaurada la versión ${v.n}${what}`);
}

/** Actualiza datos del informe que no generan versión (p. ej. la versión publicada). */
function patchReport(id, patch) {
  const list = read(K_REPORTS, []);
  write(K_REPORTS, list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  emit();
  return getReport(id);
}

/** Publica una versión: es la que ve el lector en el visor compartido. */
export function publishVersion(reportId, versionId) {
  const v = listVersions(reportId).find((x) => x.id === versionId);
  if (!v) throw new Error('Versión no encontrada');
  return patchReport(reportId, { published: { versionId: v.id, n: v.n, date: new Date().toISOString() } });
}
export const unpublish = (reportId) => patchReport(reportId, { published: null });

export function getPublished(reportId) {
  const r = getReport(reportId);
  if (!r?.published) return null;
  const v = listVersions(reportId).find((x) => x.id === r.published.versionId);
  return v ? { report: r, version: v } : null;
}

export function setVersionLabel(reportId, versionId, label) {
  write(K_VERSIONS(reportId), listVersions(reportId).map((v) => (v.id === versionId ? { ...v, label } : v)));
  emit();
}

/* ---------- Exportar / importar ---------- */
export function exportReport(id, withHistory = false) {
  const r = getReport(id);
  if (!r) throw new Error('Informe no encontrado');
  const { id: _id, version: _v, published: _p, ...report } = r;
  return { format: 'rpt-report', formatVersion: 1, exportedAt: new Date().toISOString(), report, ...(withHistory ? { versions: listVersions(id) } : {}) };
}

export function importReport(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (data?.format !== 'rpt-report' || !data.report) throw new Error('El archivo no es un informe exportado.');
  const { report } = data;
  if (!Array.isArray(report.dataSources) || !report.name) throw new Error('El informe importado está incompleto.');
  const saved = createReport({ ...report, name: report.name, createdAt: undefined }, 'Importado desde archivo');
  if (Array.isArray(data.versions) && data.versions.length) {
    const prev = data.versions.map((v) => ({ ...v, id: uid('v'), note: `${v.note || ''} (importada)`.trim() }));
    write(K_VERSIONS(saved.id), [...listVersions(saved.id), ...prev].slice(0, MAX_VERSIONS));
  }
  emit();
  return saved;
}

export function resetDemo() {
  for (const r of read(K_REPORTS, [])) localStorage.removeItem(K_VERSIONS(r.id));
  localStorage.removeItem(K_REPORTS);
  listReports();
  emit();
}

/* ---------- Bloques reutilizables (filas guardadas) ---------- */
const K_BLOCKS = 'rpt.blocks.v1';
export const listBlocks = () => read(K_BLOCKS, []);
export function saveBlock(name, row, sources) {
  const blocks = [{ id: uid('b'), name, row: structuredClone(row), sources, date: new Date().toISOString() }, ...listBlocks()];
  write(K_BLOCKS, blocks);
  emit();
  return blocks;
}
export function deleteBlock(id) {
  write(K_BLOCKS, listBlocks().filter((b) => b.id !== id));
  emit();
}

/* ---------- Portapapeles del diseñador (sirve entre informes) ---------- */
const K_CLIP = 'rpt.clipboard.v1';
export const readClipboard = () => read(K_CLIP, null);
export const writeClipboard = (cells) => { try { write(K_CLIP, cells); } catch { /* noop */ } };
