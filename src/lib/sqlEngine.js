// Motor SQL simulado: ejecuta consultas SELECT con alasql sobre una BD de ejemplo en JSON.
// En producción esta capa sería un endpoint del servidor que ejecuta la consulta (parametrizada,
// con usuario de solo lectura y timeout) contra la BD SQL real.
import alasql from 'alasql';
import sampleDb from '../data/sampledb.json';

let db = null;
let derivedDb = null;

function getDb() {
  if (db) return db;
  db = new alasql.Database('rpt_demo');
  for (const [table, rows] of Object.entries(sampleDb)) {
    db.exec(`CREATE TABLE ${table}`);
    db.tables[table].data = rows;
  }
  // Base de datos virtual con los resultados de otros orígenes: SELECT ... FROM origen.<id>
  derivedDb = new alasql.Database('origen');
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

export const PARAM_TYPES = [
  { value: 'string', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'list', label: 'Lista de valores' },
  { value: 'daterange', label: 'Rango de fechas' },
];

export const RELATIVE_DATES = [
  { value: '@hoy', label: 'Hoy' },
  { value: '@inicio_mes', label: 'Inicio del mes actual' },
  { value: '@inicio_año', label: 'Inicio del año actual' },
  { value: '@hace_30_dias', label: 'Hace 30 días' },
  { value: '@hace_12_meses', label: 'Hace 12 meses' },
];

export const DATE_PRESETS = [
  { value: 'este_año', label: 'Este año' },
  { value: 'año_pasado', label: 'Año pasado' },
  { value: 'ultimos_12_meses', label: 'Últimos 12 meses' },
  { value: 'este_mes', label: 'Este mes' },
  { value: 'ultimos_30_dias', label: 'Últimos 30 días' },
  { value: 'todo', label: 'Todo' },
  { value: 'personalizado', label: 'Personalizado' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?/;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
    return prev ? { ...f, ...prev, name: f.name } : f;
  });
}

let schemaCache = null;
export function getSchema() {
  if (schemaCache) return schemaCache;
  schemaCache = Object.entries(sampleDb).map(([name, rows]) => ({ name, rowCount: rows.length, columns: inferFields(rows) }));
  return schemaCache;
}

/** Relaciones (claves foráneas) deducidas por convención: <tabla>_id → <tabla>.id */
export function getRelations() {
  const schema = getSchema();
  const out = [];
  for (const t of schema) {
    for (const c of t.columns) {
      const m = /^(\w+?)_id$/.exec(c.name);
      if (!m) continue;
      const target = schema.find((x) => x.name === m[1] || x.name === `${m[1]}s` || x.name === `${m[1]}es` || x.name.startsWith(m[1]));
      if (target && target.columns.some((x) => x.name === 'id')) out.push({ from: t.name, fromCol: c.name, to: target.name, toCol: 'id' });
    }
  }
  return out;
}

function parseSelect(sql) {
  let parsed;
  try {
    parsed = alasql.parse(sql);
  } catch (e) {
    throw new Error(`Error de sintaxis: ${e.message.split('\n').slice(0, 3).join(' ')}`);
  }
  if (parsed.statements.length !== 1) throw new Error('Solo se permite una sentencia por origen de datos.');
  if (!(parsed.statements[0] instanceof alasql.yy.Select)) throw new Error('Solo se permiten consultas SELECT (solo lectura).');
}

/** Solo se permite una sentencia SELECT (lectura). */
export function validateSql(sql) {
  if (!sql || !sql.trim()) throw new Error('La consulta está vacía.');
  parseSelect(sql);
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

/** Orígenes de los que depende una consulta (FROM origen.<id>). */
export function sqlDependencies(sql) {
  const out = new Set();
  const re = /\borigen\.([a-zA-Z_]\w*)/gi;
  let m;
  while ((m = re.exec(String(sql || '')))) out.add(m[1]);
  return [...out];
}

export function resolveRelativeDate(v, today = new Date()) {
  if (typeof v !== 'string' || !v.startsWith('@')) return v;
  const d = new Date(today);
  switch (v) {
    case '@hoy': return iso(d);
    case '@inicio_mes': return iso(new Date(d.getFullYear(), d.getMonth(), 1));
    case '@inicio_año': return iso(new Date(d.getFullYear(), 0, 1));
    case '@hace_30_dias': d.setDate(d.getDate() - 30); return iso(d);
    case '@hace_12_meses': d.setFullYear(d.getFullYear() - 1); return iso(d);
    default: return v;
  }
}

export function presetRange(preset, today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (preset) {
    case 'este_año': return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'año_pasado': return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case 'ultimos_12_meses': { const d = new Date(today); d.setFullYear(y - 1); return { from: iso(d), to: iso(today) }; }
    case 'este_mes': return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case 'ultimos_30_dias': { const d = new Date(today); d.setDate(d.getDate() - 30); return { from: iso(d), to: iso(today) }; }
    case 'todo': return { from: '1900-01-01', to: '2999-12-31' };
    default: return null;
  }
}

/** Valor inicial de un parámetro según su definición. */
export function defaultParamValue(p) {
  if (p.type === 'daterange') {
    const preset = p.default || 'este_año';
    return { preset, ...(presetRange(preset) || { from: p.from || '', to: p.to || '' }) };
  }
  if (p.type === 'date') return resolveRelativeDate(p.default ?? '');
  return p.default ?? '';
}

/** Convierte los valores de los parámetros del informe en el objeto que recibe la consulta. */
export function resolveParams(defs = [], values = {}) {
  const out = {};
  for (const p of defs) {
    const raw = values[p.name] ?? defaultParamValue(p);
    if (p.type === 'daterange') {
      const r = (raw && raw.preset && raw.preset !== 'personalizado' ? presetRange(raw.preset) : null) || raw || {};
      out[`${p.name}_desde`] = r.from || '1900-01-01';
      out[`${p.name}_hasta`] = r.to || '2999-12-31';
    } else if (p.type === 'number') out[p.name] = raw === '' || raw == null ? null : Number(raw);
    else if (p.type === 'date') out[p.name] = resolveRelativeDate(raw) || null;
    else out[p.name] = raw === '' ? null : raw;
  }
  return out;
}

/** Nombres de parámetro que una definición expone a las consultas. */
export function exposedParamNames(defs = []) {
  return defs.flatMap((p) => (p.type === 'daterange' ? [`${p.name}_desde`, `${p.name}_hasta`] : [p.name]));
}

/** Opciones de un parámetro de tipo lista (estáticas o desde una consulta). */
export function paramOptions(p) {
  if (p.type !== 'list') return [];
  if (p.optionsSql) {
    try {
      const r = runQuery(p.optionsSql, {});
      const k = r.rows[0] && Object.keys(r.rows[0])[0];
      return k ? r.rows.map((x) => x[k]).filter((v) => v != null) : [];
    } catch {
      return [];
    }
  }
  return String(p.options || '').split(',').map((s) => s.trim()).filter(Boolean);
}

const roundRows = (rows) => rows.map((r) => {
  const o = {};
  for (const [k, v] of Object.entries(r)) o[k] = typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 10000) / 10000 : v;
  return o;
});

/** Valida la expresión de un campo calculado. */
export function validateExpr(expr) {
  if (!expr || !String(expr).trim()) throw new Error('Expresión vacía');
  if (/;|\b(select|from|insert|update|delete|drop|create|alter)\b/i.test(expr)) throw new Error('Expresión no permitida');
  parseSelect(`SELECT (${expr}) AS x FROM ?`);
}

/** Añade las columnas calculadas a las filas: SELECT *, <expr> AS <nombre> FROM ? */
export function applyCalculated(rows, calculated = []) {
  const valid = calculated.filter((c) => c.name && c.expr);
  if (!valid.length || !rows.length) return rows;
  for (const c of valid) validateExpr(c.expr);
  const cols = valid.map((c) => `(${c.expr}) AS [${c.name}]`).join(', ');
  try {
    return roundRows(alasql(`SELECT *, ${cols} FROM ?`, [rows]));
  } catch (e) {
    throw new Error(`Campo calculado: ${e.message}`);
  }
}

/** Ejecuta la consulta y devuelve filas + metadatos. */
export function runQuery(sql, params = {}, { maxRows = 10000, calculated = [] } = {}) {
  validateSql(sql);
  const t0 = performance.now();
  let rows;
  try {
    rows = getDb().exec(sql, params);
  } catch (e) {
    throw new Error(`Error al ejecutar: ${e.message}`);
  }
  if (!Array.isArray(rows)) rows = [];
  rows = roundRows(rows.slice(0, maxRows));
  const base = inferFields(rows);
  rows = applyCalculated(rows, calculated);
  const calcFields = calculated.filter((c) => c.name && c.expr).map((c) => ({ name: c.name, label: c.label || humanize(c.name), type: c.type || 'number', format: c.format || '', calculated: true }));
  return { rows, ms: Math.round(performance.now() - t0), fields: [...base.filter((f) => !calcFields.some((c) => c.name === f.name)), ...calcFields] };
}

/** Orden de ejecución respetando dependencias entre orígenes derivados. */
export function executionOrder(dataSources) {
  const byId = Object.fromEntries(dataSources.map((d) => [d.id, d]));
  const order = [];
  const state = {};
  const errors = {};
  const visit = (id, stack) => {
    if (state[id] === 2) return;
    if (state[id] === 1) { errors[id] = `Dependencia circular: ${[...stack, id].join(' → ')}`; return; }
    state[id] = 1;
    for (const dep of sqlDependencies(byId[id].sql)) {
      if (!byId[dep]) errors[id] = `Depende del origen inexistente «${dep}»`;
      else visit(dep, [...stack, id]);
    }
    state[id] = 2;
    order.push(id);
  };
  for (const d of dataSources) visit(d.id, []);
  return { order, errors };
}

/** Ejecuta todos los orígenes del informe y construye el objeto RPT_DATA que consume la librería. */
export function buildReportData(dataSources = [], paramDefs = [], paramValues = {}) {
  const params = resolveParams(paramDefs, paramValues);
  const sources = {};
  const { order, errors } = executionOrder(dataSources);
  getDb();
  for (const id of order) {
    const ds = dataSources.find((d) => d.id === id);
    if (errors[id]) continue;
    const failedDep = sqlDependencies(ds.sql).find((d) => !sources[d]);
    if (failedDep) { errors[id] = `No se pudo ejecutar el origen del que depende («${failedDep}»)`; continue; }
    try {
      for (const dep of sqlDependencies(ds.sql)) {
        if (!derivedDb.tables[dep]) derivedDb.exec(`CREATE TABLE ${dep}`);
        derivedDb.tables[dep].data = sources[dep].rows;
      }
      const r = runQuery(ds.sql, params, { calculated: ds.calculated || [] });
      sources[ds.id] = { fields: mergeFields(ds.fields, r.fields), rows: r.rows };
    } catch (e) {
      errors[ds.id] = e.message;
    }
  }
  return { data: { sources, params, generatedAt: new Date().toISOString() }, errors };
}

/** Ejecuta un único origen resolviendo antes sus dependencias (para la vista previa del editor). */
export function runDataSource(ds, dataSources, paramDefs, paramValues) {
  const deps = new Set();
  const collect = (id) => { for (const d of sqlDependencies(dataSources.find((x) => x.id === id)?.sql)) if (!deps.has(d)) { deps.add(d); collect(d); } };
  collect(ds.id);
  const subset = dataSources.filter((d) => deps.has(d.id)).concat([{ ...ds }]);
  const t0 = performance.now();
  const { data, errors } = buildReportData(subset, paramDefs, paramValues);
  if (errors[ds.id]) throw new Error(errors[ds.id]);
  const src = data.sources[ds.id];
  return { rows: src.rows, fields: src.fields, ms: Math.round(performance.now() - t0) };
}
