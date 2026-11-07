// Editor visual de consultas: modelo -> SQL.
// builder = { tables:[{alias,table,x,y}], joins:[{id,left,leftCol,right,rightCol,type}],
//             columns:[{id,alias,col,fn,agg,as,sort}], filters:[{id,alias,col,op,kind,value,value2,param,optional}],
//             distinct, limit }
import { getRelations, getSchema } from './sqlEngine.js';

export const AGGS = [
  { value: '', label: '—' },
  { value: 'SUM', label: 'Suma' },
  { value: 'AVG', label: 'Media' },
  { value: 'COUNT', label: 'Recuento' },
  { value: 'COUNT DISTINCT', label: 'Recuento distinto' },
  { value: 'MIN', label: 'Mínimo' },
  { value: 'MAX', label: 'Máximo' },
];
export const FNS = [
  { value: '', label: '—' },
  { value: 'YEAR', label: 'Año', types: ['date'] },
  { value: 'MONTH', label: 'Mes (1-12)', types: ['date'] },
  { value: 'YM', label: 'Año-mes (AAAA-MM)', types: ['date'] },
  { value: 'UPPER', label: 'Mayúsculas', types: ['string'] },
  { value: 'ROUND', label: 'Redondear', types: ['number'] },
];
export const OPS = [
  { value: '=', label: '=' }, { value: '<>', label: '≠' }, { value: '>', label: '>' }, { value: '>=', label: '≥' },
  { value: '<', label: '<' }, { value: '<=', label: '≤' }, { value: 'LIKE', label: 'contiene' }, { value: 'IN', label: 'en lista' },
  { value: 'BETWEEN', label: 'entre' }, { value: 'IS NULL', label: 'vacío' }, { value: 'IS NOT NULL', label: 'no vacío' },
];

let n = 0;
export const bid = (p) => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;

export const emptyBuilder = () => ({ tables: [], joins: [], columns: [], filters: [], distinct: false, limit: '' });

export function columnType(table, col) {
  const t = getSchema().find((x) => x.name === table);
  return t?.columns.find((c) => c.name === col)?.type || 'string';
}

function aliasFor(b, table) {
  const base = table.replace(/[^a-z]/gi, '').slice(0, 1).toLowerCase() || 't';
  let a = base;
  let i = 2;
  while (b.tables.some((t) => t.alias === a)) a = `${base}${i++}`;
  return a;
}

/** Añade una tabla y la une automáticamente con las que ya hay si existe relación. */
export function addTable(b, table, pos) {
  const alias = aliasFor(b, table);
  const next = { ...b, tables: [...b.tables, { alias, table, x: pos?.x ?? 24 + b.tables.length * 290, y: pos?.y ?? 24 + (b.tables.length % 2) * 48 }], joins: [...b.joins] };
  for (const rel of getRelations()) {
    if (next.joins.some((j) => j.right === alias || j.left === alias)) break;
    const other = b.tables.find((t) => (rel.from === table && t.table === rel.to) || (rel.to === table && t.table === rel.from));
    if (!other) continue;
    const join = rel.from === table
      ? { left: other.alias, leftCol: rel.toCol, right: alias, rightCol: rel.fromCol }
      : { left: other.alias, leftCol: rel.fromCol, right: alias, rightCol: rel.toCol };
    next.joins.push({ id: bid('j'), type: 'INNER', ...join });
  }
  return next;
}

export function removeTable(b, alias) {
  return {
    ...b,
    tables: b.tables.filter((t) => t.alias !== alias),
    joins: b.joins.filter((j) => j.left !== alias && j.right !== alias),
    columns: b.columns.filter((c) => c.alias !== alias),
    filters: b.filters.filter((f) => f.alias !== alias),
  };
}

export function toggleColumn(b, alias, col) {
  const exists = b.columns.find((c) => c.alias === alias && c.col === col);
  if (exists) return { ...b, columns: b.columns.filter((c) => c !== exists) };
  const taken = new Set(b.columns.map((c) => c.as));
  let as = col;
  if (taken.has(as)) as = `${alias}_${col}`;
  return { ...b, columns: [...b.columns, { id: bid('c'), alias, col, fn: '', agg: '', as, sort: '' }] };
}

const ident = (s) => (/^[a-z_][a-z0-9_]*$/i.test(s) ? s : `[${String(s).replace(/]/g, '')}]`);

function colExpr(c) {
  if (c.col === '*') return '*';
  let e = `${c.alias}.${ident(c.col)}`;
  if (c.fn === 'YM') e = `SUBSTRING(${e}, 1, 7)`;
  else if (c.fn === 'ROUND') e = `ROUND(${e}, 2)`;
  else if (c.fn) e = `${c.fn}(${e})`;
  return e;
}
function selectExpr(c) {
  const e = colExpr(c);
  if (c.agg === 'COUNT DISTINCT') return `COUNT(DISTINCT ${e})`;
  if (c.agg) return `${c.agg}(${e})`;
  return e;
}
function literal(v, type) {
  if (type === 'number' && v !== '' && !isNaN(Number(v))) return String(Number(v));
  if (type === 'boolean' && /^(true|false|sí|si|no)$/i.test(String(v).trim())) return /^(true|sí|si)$/i.test(String(v).trim()) ? 'TRUE' : 'FALSE';
  return `'${String(v ?? '').replace(/'/g, "''")}'`;
}

/** Genera el SQL y una lista de avisos. */
export function toSql(b) {
  const warnings = [];
  if (!b.tables.length) return { sql: '', warnings: ['Arrastra o añade al menos una tabla.'] };
  const byAlias = Object.fromEntries(b.tables.map((t) => [t.alias, t]));
  const cols = b.columns.length ? b.columns : null;
  const hasAgg = b.columns.some((c) => c.agg);

  const select = cols
    ? cols.map((c) => (c.col === '*' && c.agg === 'COUNT' ? `COUNT(*) AS ${ident(c.as || 'recuento')}` : `${selectExpr(c)} AS ${ident(c.as || c.col)}`)).join(',\n       ')
    : b.tables.map((t) => `${t.alias}.*`).join(', ');
  if (!cols) warnings.push('No hay columnas seleccionadas: se devolverán todas.');

  // FROM + JOIN respetando el orden de conexión.
  const placed = new Set([b.tables[0].alias]);
  let from = `${b.tables[0].table} AS ${b.tables[0].alias}`;
  const pending = b.joins.filter((j) => byAlias[j.left] && byAlias[j.right]);
  let progress = true;
  while (progress) {
    progress = false;
    for (const j of pending) {
      if (j.done) continue;
      const lIn = placed.has(j.left);
      const rIn = placed.has(j.right);
      if (lIn && rIn) { from += ` AND ${j.left}.${ident(j.leftCol)} = ${j.right}.${ident(j.rightCol)}`; j.done = true; progress = true; }
      else if (lIn || rIn) {
        const add = lIn ? j.right : j.left;
        from += `\n${j.type === 'LEFT' ? 'LEFT JOIN' : 'INNER JOIN'} ${byAlias[add].table} AS ${add} ON ${j.left}.${ident(j.leftCol)} = ${j.right}.${ident(j.rightCol)}`;
        placed.add(add);
        j.done = true;
        progress = true;
      }
    }
  }
  pending.forEach((j) => delete j.done);
  for (const t of b.tables) {
    if (!placed.has(t.alias)) {
      warnings.push(`La tabla «${t.table}» no está relacionada: une una columna con otra tabla (producto cartesiano).`);
      from += `\nCROSS JOIN ${t.table} AS ${t.alias}`;
    }
  }

  const complete = (f) => {
    if (!f.alias || !f.col) return false;
    if (f.op === 'IS NULL' || f.op === 'IS NOT NULL') return true;
    if (f.kind === 'param') return !!f.param;
    if (f.op === 'BETWEEN') return f.value !== '' && f.value != null && f.value2 !== '' && f.value2 != null;
    return f.value !== '' && f.value != null;
  };
  const incomplete = b.filters.filter((f) => !complete(f)).length;
  if (incomplete) warnings.push(`${incomplete} filtro(s) sin completar: se ignoran hasta que indiques un valor o parámetro.`);
  const where = b.filters.filter(complete).map((f) => {
    const type = f.fn === 'YEAR' || f.fn === 'MONTH' || f.fn === 'ROUND' ? 'number' : f.fn ? 'string' : columnType(byAlias[f.alias]?.table, f.col);
    const e = colExpr({ alias: f.alias, col: f.col, fn: f.fn || '' });
    const val = (v) => (f.kind === 'param' ? `:${f.param || 'param'}` : literal(v, type));
    let cond;
    if (f.op === 'IS NULL' || f.op === 'IS NOT NULL') cond = `${e} ${f.op}`;
    else if (f.op === 'LIKE') cond = f.kind === 'param' ? `${e} LIKE '%' + :${f.param} + '%'` : `${e} LIKE ${literal(`%${f.value ?? ''}%`, 'string')}`;
    else if (f.op === 'IN') cond = `${e} IN (${String(f.value || '').split(',').map((s) => literal(s.trim(), type)).join(', ')})`;
    else if (f.op === 'BETWEEN') cond = f.kind === 'param' ? `${e} BETWEEN :${f.param}_desde AND :${f.param}_hasta` : `${e} BETWEEN ${literal(f.value, type)} AND ${literal(f.value2, type)}`;
    else cond = `${e} ${f.op} ${val(f.value)}`;
    if (f.kind === 'param' && f.optional && !['BETWEEN', 'IS NULL', 'IS NOT NULL', 'IN'].includes(f.op)) cond = `(:${f.param} IS NULL OR ${cond})`;
    return cond;
  });

  let sql = `SELECT ${b.distinct ? 'DISTINCT ' : ''}${select}\nFROM ${from}`;
  if (where.length) sql += `\nWHERE ${where.join('\n  AND ')}`;
  if (hasAgg) {
    const groups = b.columns.filter((c) => !c.agg && c.col !== '*').map(colExpr);
    if (groups.length) sql += `\nGROUP BY ${groups.join(', ')}`;
  }
  const order = b.columns.filter((c) => c.sort).map((c) => `${ident(c.as || c.col)} ${c.sort}`);
  if (order.length) sql += `\nORDER BY ${order.join(', ')}`;
  if (b.limit && Number(b.limit) > 0) sql += `\nLIMIT ${Number(b.limit)}`;
  return { sql, warnings };
}

/** Parámetros que el modelo visual referencia. */
export function builderParams(b) {
  return [...new Set(b.filters.filter((f) => f.kind === 'param' && f.param).map((f) => f.param))];
}
