// Persistencia del prototipo en localStorage. En producción: API REST + BD.
import { uid } from './catalog.js';
import { generateHtml } from './htmlGenerator.js';
import { salesTemplate } from './templates.js';

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
  // Primera ejecución: semilla con un informe de ejemplo.
  const t = salesTemplate();
  const report = {
    id: uid('rpt'),
    name: 'Ventas 2025 (ejemplo)',
    description: 'Informe de ejemplo creado con el asistente.',
    mode: 'designer',
    ...t,
  };
  report.html = generateHtml(report);
  const saved = persist(report, 'Versión inicial', []);
  return [saved];
}

export const getReport = (id) => listReports().find((r) => r.id === id) || null;
export const listVersions = (id) => read(K_VERSIONS(id), []);

function persist(report, note, list) {
  const now = new Date().toISOString();
  const versions = listVersions(report.id);
  const n = (versions[0]?.n || 0) + 1;
  const saved = { ...report, createdAt: report.createdAt || now, updatedAt: now, version: n };
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
  const { id: _old, version: _v, createdAt: _c, ...rest } = r;
  return createReport({ ...structuredClone(rest), name: `${r.name} (copia)` }, `Duplicado de «${r.name}» v${r.version}`);
}

/** Restaura una copia: no borra el historial, crea una versión nueva con el contenido antiguo. */
export function restoreVersion(reportId, versionId) {
  const r = getReport(reportId);
  const v = listVersions(reportId).find((x) => x.id === versionId);
  if (!r || !v) throw new Error('Versión no encontrada');
  return saveReport(
    { ...r, mode: v.mode, html: v.html, model: v.model, dataSources: v.dataSources, params: v.params },
    `Restaurada la versión ${v.n}`,
  );
}

export function resetDemo() {
  for (const r of read(K_REPORTS, [])) localStorage.removeItem(K_VERSIONS(r.id));
  localStorage.removeItem(K_REPORTS);
  listReports();
  emit();
}
