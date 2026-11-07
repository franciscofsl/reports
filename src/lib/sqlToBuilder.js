// SQL -> modelo del editor visual. Interpreta el subconjunto de SQL que el editor visual sabe
// representar; si encuentra algo que no puede representar, lanza un error que explica el motivo.
import alasql from 'alasql';
import { bid, emptyBuilder } from './queryBuilder.js';
import { getSchema } from './sqlEngine.js';

const yy = alasql.yy;
const is = (node, cls) => !!node && !!yy[cls] && node instanceof yy[cls];
const AGG_OK = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];
const CMP = { '=': '=', '!=': '<>', '<>': '<>', '>': '>', '>=': '>=', '<': '<', '<=': '<=' };

class Unsupported extends Error {}
const fail = (msg) => { throw new Unsupported(msg); };

function literalValue(n) {
  if (is(n, 'NumValue') || is(n, 'StringValue') || is(n, 'LogicValue')) return n.value;
  if (n && typeof n === 'object' && 'value' in n && Object.keys(n).length <= 2) return n.value;
  return undefined;
}
const isParam = (n) => is(n, 'ParamValue') || (n && typeof n.param === 'string' && !n.columnid);
const isNull = (n) => is(n, 'NullValue');

/** Convierte una consulta SQL al modelo del editor visual. Lanza Error con el motivo si no es posible. */
export function sqlToBuilder(sql, previous) {
  let st;
  try {
    const parsed = alasql.parse(sql);
    if (parsed.statements.length !== 1) fail('tiene varias sentencias');
    [st] = parsed.statements;
  } catch (e) {
    if (e instanceof Unsupported) throw e;
    throw new Error(`la consulta tiene errores de sintaxis (${e.message.split('\n')[0]})`);
  }
  if (!is(st, 'Select')) fail('no es una consulta SELECT');
  if (st.union || st.unionall || st.except || st.intersect) fail('usa UNION / EXCEPT / INTERSECT');
  if (st.having) fail('usa HAVING (filtros sobre agregados)');
  if (st.into) fail('usa SELECT INTO');
  if (!st.from || st.from.length !== 1) fail(st.from?.length > 1 ? 'usa varias tablas en el FROM separadas por comas (usa JOIN)' : 'no tiene FROM');

  const schema = getSchema();
  const b = emptyBuilder();
  const prevPos = Object.fromEntries((previous?.tables || []).map((t) => [`${t.alias}:${t.table}`, { x: t.x, y: t.y }]));

  const addTableNode = (node, alias) => {
    if (node.databaseid) fail(`usa la tabla «${node.databaseid}.${node.tableid}» (los orígenes derivados solo se editan en SQL)`);
    if (is(node, 'Select') || node.select) fail('usa subconsultas en el FROM o en un JOIN');
    const table = node.tableid;
    if (!table || !schema.some((s) => s.name === table)) fail(`usa la tabla «${table}», que no existe en la base de datos`);
    const a = alias || node.as || table;
    if (b.tables.some((t) => t.alias === a)) fail(`repite el alias «${a}»`);
    const i = b.tables.length;
    b.tables.push({ alias: a, table, ...(prevPos[`${a}:${table}`] || { x: 24 + i * 290, y: 24 + (i % 2) * 48 }) });
    return a;
  };
  addTableNode(st.from[0], st.from[0].as);

  for (const j of st.joins || []) {
    const mode = String(j.joinmode || 'INNER').toUpperCase();
    if (mode !== 'INNER' && mode !== 'LEFT') fail(`usa ${mode} JOIN (solo se admiten uniones internas e izquierdas)`);
    if (j.using) fail('usa JOIN … USING (usa ON a.col = b.col)');
    if (j.select) fail('usa subconsultas en un JOIN');
    const alias = addTableNode(j.table, j.as);
    const conds = [];
    const walk = (n) => {
      if (is(n, 'Op') && n.op === 'AND') { walk(n.left); walk(n.right); return; }
      if (is(n, 'Op') && n.op === '=' && is(n.left, 'Column') && is(n.right, 'Column') && n.left.tableid && n.right.tableid) { conds.push(n); return; }
      fail(`la unión con «${j.table.tableid}» no es una igualdad simple entre columnas`);
    };
    if (!j.on) fail(`la unión con «${j.table.tableid}» no tiene condición ON`);
    walk(j.on);
    for (const c of conds) {
      for (const side of [c.left, c.right]) if (!b.tables.some((t) => t.alias === side.tableid)) fail(`la unión usa el alias desconocido «${side.tableid}»`);
      b.joins.push({ id: bid('j'), type: mode, left: c.left.tableid, leftCol: c.left.columnid, right: c.right.tableid, rightCol: c.right.columnid });
    }
    if (!conds.some((c) => c.left.tableid === alias || c.right.tableid === alias)) fail(`la unión con «${j.table.tableid}» no relaciona esa tabla`);
  }

  // Disposición por niveles de unión (BFS desde la tabla del FROM) para que las líneas no se crucen.
  if (!Object.keys(prevPos).length && b.tables.length > 1) {
    const depth = { [b.tables[0].alias]: 0 };
    const queue = [b.tables[0].alias];
    while (queue.length) {
      const a = queue.shift();
      for (const j of b.joins) {
        const other = j.left === a ? j.right : j.right === a ? j.left : null;
        if (other && depth[other] == null) { depth[other] = depth[a] + 1; queue.push(other); }
      }
    }
    const nextY = {};
    for (const t of b.tables) {
      const d = depth[t.alias] ?? 1;
      const h = Math.min(280, 44 + (schema.find((x) => x.name === t.table)?.columns.length || 4) * 22);
      t.x = 24 + d * 340;
      t.y = nextY[d] ?? 24;
      nextY[d] = t.y + h + 24;
    }
  }

  const colsOf = (alias) => schema.find((s) => s.name === b.tables.find((t) => t.alias === alias)?.table)?.columns.map((c) => c.name) || [];
  const resolve = (col) => {
    if (!is(col, 'Column')) fail('usa expresiones que el editor visual no puede representar');
    if (col.columnid === '*') return { alias: col.tableid || b.tables[0].alias, col: '*' };
    if (col.tableid) {
      if (!b.tables.some((t) => t.alias === col.tableid)) fail(`usa el alias desconocido «${col.tableid}»`);
      if (!colsOf(col.tableid).includes(col.columnid)) fail(`usa la columna «${col.tableid}.${col.columnid}», que no existe`);
      return { alias: col.tableid, col: col.columnid };
    }
    const owners = b.tables.filter((t) => colsOf(t.alias).includes(col.columnid));
    if (!owners.length) fail(`usa la columna «${col.columnid}», que no existe en las tablas de la consulta`);
    return { alias: owners[0].alias, col: col.columnid };
  };
  // Expresión de columna con función opcional (YEAR, MONTH, SUBSTRING(x,1,7), UPPER, ROUND(x,2)).
  const colWithFn = (n) => {
    if (is(n, 'Column')) return { ...resolve(n), fn: '' };
    if (is(n, 'FuncValue') || n?.funcid) {
      const f = String(n.funcid).toUpperCase();
      const a = n.args || [];
      if ((f === 'YEAR' || f === 'MONTH' || f === 'UPPER') && a.length === 1) return { ...resolve(a[0]), fn: f };
      if (f === 'SUBSTRING' && a.length === 3 && literalValue(a[1]) === 1 && literalValue(a[2]) === 7) return { ...resolve(a[0]), fn: 'YM' };
      if (a.some((x) => is(x, 'AggrValue') || x?.aggregatorid)) fail(`usa una agregación dentro de ${f}(…); el editor visual aplica la función a la columna antes de agregar`);
      if (f === 'ROUND' && (a.length === 1 || (a.length === 2 && literalValue(a[1]) === 2))) return { ...resolve(a[0]), fn: 'ROUND' };
      fail(`usa la función ${f}(…) con argumentos que el editor visual no admite`);
    }
    if (is(n, 'AggrValue') || n?.aggregatorid) fail(`usa una agregación dentro de otra expresión (${n.aggregatorid}); aplica la función a la columna y luego agrega`);
    if (is(n, 'Op')) fail(`usa operaciones aritméticas o lógicas en las columnas (${n.op}); defínelas como campo calculado`);
    if (n?.whens) fail('usa CASE WHEN; defínelo como campo calculado');
    if (n && n.select) fail('usa subconsultas');
    return fail('usa expresiones que el editor visual no puede representar');
  };

  // SELECT
  b.distinct = !!st.distinct;
  const star = st.columns.length === 1 && is(st.columns[0], 'Column') && st.columns[0].columnid === '*';
  if (star) {
    if (st.columns[0].tableid && b.tables.length > 1) fail('usa «alias.*» con varias tablas; elige las columnas');
  } else {
    for (const c of st.columns) {
      let entry;
      if (is(c, 'AggrValue') || c.aggregatorid) {
        const agg = String(c.aggregatorid).toUpperCase();
        if (!AGG_OK.includes(agg)) fail(`usa la agregación ${agg}`);
        const e = c.expression;
        if (agg === 'COUNT' && is(e, 'Column') && e.columnid === '*') entry = { alias: b.tables[0].alias, col: '*', fn: '', agg: 'COUNT' };
        else {
          const x = colWithFn(e);
          if (x.col === '*') fail(`usa ${agg}(*)`);
          entry = { ...x, agg: c.distinct ? (agg === 'COUNT' ? 'COUNT DISTINCT' : fail(`usa ${agg}(DISTINCT …)`)) : agg };
        }
      } else {
        const x = colWithFn(c);
        if (x.col === '*') fail('mezcla «*» con otras columnas');
        entry = { ...x, agg: '' };
      }
      const def = entry.col === '*' ? 'recuento' : entry.agg ? `${entry.agg.split(' ')[0].toLowerCase()}_${entry.col}` : entry.col;
      b.columns.push({ id: bid('c'), alias: entry.alias, col: entry.col, fn: entry.fn, agg: entry.agg, as: c.as || def, sort: '' });
    }
  }

  // GROUP BY: debe coincidir con las columnas no agregadas (el editor visual lo genera solo).
  const hasAgg = b.columns.some((c) => c.agg);
  if (st.group?.length) {
    if (!hasAgg) fail('agrupa sin columnas agregadas (usa DISTINCT en su lugar)');
    const expected = new Set(b.columns.filter((c) => !c.agg && c.col !== '*').map((c) => `${c.alias}.${c.col}.${c.fn}`));
    const got = new Set(st.group.map((g) => { const x = colWithFn(g); return `${x.alias}.${x.col}.${x.fn}`; }));
    if (expected.size !== got.size || [...expected].some((k) => !got.has(k))) fail('agrupa por columnas distintas de las seleccionadas sin agregar');
  }

  // ORDER BY: por alias o por columna seleccionada.
  for (const o of st.order || []) {
    const e = o.expression;
    const dir = String(o.direction || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    let target = null;
    if (is(e, 'Column') && !e.tableid) target = b.columns.find((c) => c.as === e.columnid) || null;
    if (!target) {
      let x;
      try { x = colWithFn(e); } catch { fail('ordena por una expresión que no está en las columnas'); }
      target = b.columns.find((c) => c.alias === x.alias && c.col === x.col && c.fn === x.fn && !c.agg);
    }
    if (!target) fail('ordena por una columna que no está seleccionada; añádela a las columnas');
    target.sort = dir;
  }

  // LIMIT / TOP
  const lim = st.limit ?? st.top;
  if (lim) {
    const v = literalValue(lim);
    if (typeof v !== 'number') fail('usa un LIMIT que no es un número fijo');
    b.limit = String(v);
  }
  if (st.offset) fail('usa OFFSET');

  // WHERE: conjunción de condiciones simples.
  if (st.where) {
    const terms = [];
    const unwrap = (n) => (is(n, 'Expression') ? unwrap(n.expression) : is(n, 'UniOp') && !n.op ? unwrap(n.right) : n);
    const flatten = (n) => {
      n = unwrap(n);
      if (is(n, 'Op') && n.op === 'AND') { flatten(n.left); flatten(n.right); } else terms.push(n);
    };
    flatten(st.where);
    for (const t of terms) b.filters.push(parseCondition(t, unwrap, colWithFn));
  }
  return b;
}

function parseCondition(t, unwrap, colWithFn) {
  const base = { id: bid('f'), kind: 'value', value: '', value2: '', param: '', optional: false };
  // (:p IS NULL OR <condición con :p>)
  if (is(t, 'Op') && t.op === 'OR') {
    const l = unwrap(t.left);
    const r = unwrap(t.right);
    if (is(l, 'Op') && l.op === 'IS' && isParam(l.left) && isNull(l.right)) {
      const inner = parseCondition(r, unwrap, colWithFn);
      if (inner.kind === 'param' && inner.param === l.left.param) return { ...inner, optional: true };
    }
    fail('usa OR en el WHERE (solo se admite el patrón opcional «:p IS NULL OR …»)');
  }
  if (!is(t, 'Op')) fail('tiene una condición en el WHERE que el editor visual no puede representar');
  if (t.op === 'NOT' || t.op === 'NOT LIKE' || t.op === 'NOT IN') fail('usa NOT en el WHERE');
  if (t.op === 'IS') {
    const c = colWithFn(t.left);
    if (isNull(t.right)) return { ...base, ...c, op: 'IS NULL' };
    if (is(t.right, 'UniOp') && t.right.op === 'NOT' && isNull(t.right.right)) return { ...base, ...c, op: 'IS NOT NULL' };
    fail('usa IS con algo distinto de NULL');
  }
  if (t.op === 'BETWEEN') {
    const c = colWithFn(t.left);
    if (isParam(t.right1) && isParam(t.right2)) {
      const m1 = /^(\w+)_desde$/.exec(t.right1.param);
      const m2 = /^(\w+)_hasta$/.exec(t.right2.param);
      if (m1 && m2 && m1[1] === m2[1]) return { ...base, ...c, op: 'BETWEEN', kind: 'param', param: m1[1] };
      fail('usa BETWEEN con parámetros que no son un rango de fechas (:p_desde / :p_hasta)');
    }
    const v1 = literalValue(t.right1);
    const v2 = literalValue(t.right2);
    if (v1 === undefined || v2 === undefined) fail('usa BETWEEN con expresiones');
    return { ...base, ...c, op: 'BETWEEN', value: String(v1), value2: String(v2) };
  }
  if (t.op === 'IN') {
    const c = colWithFn(t.left);
    if (!Array.isArray(t.right)) fail('usa IN con una subconsulta');
    const vals = t.right.map(literalValue);
    if (vals.some((v) => v === undefined)) fail('usa IN con valores que no son fijos');
    return { ...base, ...c, op: 'IN', value: vals.join(', ') };
  }
  if (t.op === 'LIKE') {
    const c = colWithFn(t.left);
    const r = t.right;
    const lit = literalValue(r);
    if (typeof lit === 'string') {
      if (!/^%[^%_]*%$/.test(lit)) fail('usa un LIKE distinto de «contiene» (%texto%)');
      return { ...base, ...c, op: 'LIKE', value: lit.slice(1, -1) };
    }
    // '%' + :p + '%'
    if (is(r, 'Op') && r.op === '+' && literalValue(r.right) === '%' && is(r.left, 'Op') && r.left.op === '+' && literalValue(r.left.left) === '%' && isParam(r.left.right)) {
      return { ...base, ...c, op: 'LIKE', kind: 'param', param: r.left.right.param };
    }
    fail('usa un LIKE con un patrón que el editor visual no admite');
  }
  const op = CMP[t.op];
  if (!op) fail(`usa el operador ${t.op} en el WHERE`);
  const c = colWithFn(t.left);
  if (isParam(t.right)) return { ...base, ...c, op, kind: 'param', param: t.right.param };
  const v = literalValue(t.right);
  if (v === undefined) fail('compara con una expresión (no con un valor fijo o un parámetro)');
  return { ...base, ...c, op, value: String(v) };
}

export { Unsupported };
