// Motor SQL simulado: ejecuta consultas SELECT con alasql sobre una BD de ejemplo en JSON.
// En producción esta capa sería un endpoint del servidor que ejecuta la consulta (parametrizada,
// con un usuario de solo lectura y timeout) contra la BD SQL real.
import alasql from 'alasql';
import sampleDb from '../data/sampledb.json';

let db = null;

function getDb() {
  if (db) return db;
  db = new alasql.Database('rpt_demo');
  for (const [table, rows] of Object.entries(sampleDb)) {
    db.exec(`CREATE TABLE ${table}`);
    db.tables[table].data = rows;
  }
  return db;
}

export const FIELD_TYPES = [
  { value: 'string', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'boolean', label: 'Booleano' },
];

export const FORMATS = [
  { value: '', label: 'Automático' },
  { value: 'text', label: 'Texto' },
  { value: 'integer', label: 'Entero' },
  { value: 'number', label: 'Decimal' },
  { value: 'currency', label: 'Moneda (€)' },
  { value: 'compact', label: 'Compacto (1,2 mil)' },
  { value: 'percent', label: 'Porcentaje' },
  { value: 'date', label: 'Fecha' },
  { value: 'boolean', label: 'Sí / No' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?/;

export function humanize(name) {
  const s = String(name).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Infiere el tipo de cada columna a partir de una muestra de filas. */
export function inferFields(rows) {
  const names = [];
  for (const r of rows.slice(0, 200)) for (const k of Object.keys(r)) if (!names.includes(k)) names.push(k);
  return names.map((name) => {
    const vals = rows.slice(0, 200).map((r) => r[name]).filter((v) => v !== null && v !== undefined && v !== '');
    let type = 'string';
    let format = '';
    if (vals.length && vals.every((v) => typeof v === 'boolean')) type = 'boolean';
    else if (vals.length && vals.every((v) => typeof v === 'number')) {
      type = 'number';
      format = vals.every((v) => Number.isInteger(v)) ? 'integer' : 'number';
    } else if (vals.length && vals.every((v) => typeof v === 'string' && DATE_RE.test(v) && v.length >= 10)) {
      type = 'date';
      format = 'date';
    }
    return { name, label: humanize(name), type, format };
  });
}

/** Mezcla campos inferidos con la configuración que ya tenía el usuario (conserva etiquetas/formatos). */
export function mergeFields(current = [], inferred = []) {
  return inferred.map((f) => {
    const prev = current.find((c) => c.name === f.name);
    return prev ? { ...f, ...prev } : f;
  });
}

export function getSchema() {
  return Object.entries(sampleDb).map(([name, rows]) => ({
    name,
    rowCount: rows.length,
    columns: inferFields(rows),
  }));
}

/** Solo se permite una sentencia SELECT (lectura). */
export function validateSql(sql) {
  if (!sql || !sql.trim()) throw new Error('La consulta está vacía.');
  let parsed;
  try {
    parsed = alasql.parse(sql);
  } catch (e) {
    throw new Error(`Error de sintaxis: ${e.message.split('\n').slice(0, 3).join(' ')}`);
  }
  if (parsed.statements.length !== 1) throw new Error('Solo se permite una sentencia por origen de datos.');
  const st = parsed.statements[0];
  if (!(st instanceof alasql.yy.Select)) throw new Error('Solo se permiten consultas SELECT (solo lectura).');
}

/** Extrae los parámetros :nombre usados en la consulta. */
export function sqlParams(sql) {
  const out = new Set();
  const re = /(?<![:\w]):([a-zA-Z_]\w*)/g;
  let m;
  const noStrings = String(sql || '').replace(/'(?:[^']|'')*'/g, "''");
  while ((m = re.exec(noStrings))) out.add(m[1]);
  return [...out];
}

export function coerceParam(value, type) {
  if (type === 'number') return value === '' || value == null ? null : Number(value);
  return value ?? null;
}

/** Ejecuta la consulta y devuelve filas + metadatos. */
export function runQuery(sql, params = {}, { maxRows = 10000 } = {}) {
  validateSql(sql);
  const t0 = performance.now();
  let rows;
  try {
    rows = getDb().exec(sql, params);
  } catch (e) {
    throw new Error(`Error al ejecutar: ${e.message}`);
  }
  if (!Array.isArray(rows)) rows = [];
  rows = rows.slice(0, maxRows).map((r) => {
    const o = {};
    for (const [k, v] of Object.entries(r)) o[k] = typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 10000) / 10000 : v;
    return o;
  });
  return { rows, ms: Math.round(performance.now() - t0), fields: inferFields(rows) };
}

/** Resuelve los valores de parámetros del informe (valores actuales o por defecto). */
export function resolveParams(defs = [], values = {}) {
  const out = {};
  for (const p of defs) out[p.name] = coerceParam(values[p.name] ?? p.default, p.type);
  return out;
}

/** Ejecuta todos los orígenes del informe y construye el objeto RPT_DATA que consume la librería. */
export function buildReportData(dataSources = [], paramDefs = [], paramValues = {}) {
  const params = resolveParams(paramDefs, paramValues);
  const sources = {};
  const errors = {};
  for (const ds of dataSources) {
    try {
      const r = runQuery(ds.sql, params);
      sources[ds.id] = { fields: mergeFields(ds.fields, r.fields), rows: r.rows };
    } catch (e) {
      errors[ds.id] = e.message;
    }
  }
  return { data: { sources, params, generatedAt: new Date().toISOString() }, errors };
}
