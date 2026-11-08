  /* ---------- estado global ---------- */
  var state = {
    filters: {}, drill: {}, page: null, data: null, items: [], listeners: [], fieldLabels: {},
    measures: {}, hierarchies: {}, relations: [], autoRelate: true, associative: false, printing: false, cache: {}
  };

  /* ---------- medidas: lenguaje de expresiones ----------
   * SUM(x) AVG(x) MIN(x) MAX(x) MEDIAN(x) COUNT(*) COUNT(x) COUNT(DISTINCT x)
   * SUM(x WHERE campo = 'valor')  ·  TOTAL(expr) evalúa sobre todas las filas del visual (para % sobre total)
   * DIVIDE(a, b)  ABS(a)  ROUND(a, n)  + - * /  números y paréntesis */
  var AGG_FN = { SUM: 1, AVG: 1, MIN: 1, MAX: 1, MEDIAN: 1, COUNT: 1, DISTINCTCOUNT: 1 };
  function tokenize(src) {
    var re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_À-ſ][\wÀ-ſ]*)|('(?:[^']|'')*')|(<>|>=|<=|!=|[*/+\-(),=<>]))/y;
    var out = [], m, pos = 0;
    src = String(src || '');
    while (pos < src.length) {
      re.lastIndex = pos;
      m = re.exec(src);
      if (!m || m[0].length === 0) { if (/^\s*$/.test(src.slice(pos))) break; throw new Error('Carácter no válido en «' + src.slice(pos, pos + 10) + '»'); }
      pos = re.lastIndex;
      if (m[1]) out.push({ t: 'num', v: +m[1] });
      else if (m[2]) out.push({ t: 'id', v: m[2] });
      else if (m[3]) out.push({ t: 'str', v: m[3].slice(1, -1).replace(/''/g, "'") });
      else if (m[4]) out.push({ t: 'op', v: m[4] });
    }
    return out;
  }
  function compileMeasure(expr) {
    var tk = tokenize(expr), i = 0, refs = [];
    function peek(v) { return tk[i] && (v == null || String(tk[i].v).toUpperCase() === v); }
    function take(v) { if (!peek(v)) throw new Error('Se esperaba «' + v + '»' + (tk[i] ? ' y hay «' + tk[i].v + '»' : ' al final')); return tk[i++]; }
    function parseExpr() { var n = parseTerm(); while (peek('+') || peek('-')) { var op = tk[i++].v, r = parseTerm(); n = bin(op, n, r); } return n; }
    function parseTerm() { var n = parseFactor(); while (peek('*') || peek('/')) { var op = tk[i++].v, r = parseFactor(); n = bin(op, n, r); } return n; }
    function bin(op, a, b) {
      return function (rows, total) {
        var x = a(rows, total), y = b(rows, total);
        if (x == null || y == null) return null;
        if (op === '+') return x + y; if (op === '-') return x - y; if (op === '*') return x * y;
        return y === 0 ? null : x / y;
      };
    }
    function parseFactor() {
      var t = tk[i];
      if (!t) throw new Error('La expresión está incompleta');
      if (t.t === 'num') { i++; return function () { return t.v; }; }
      if (t.t === 'op' && t.v === '-') { i++; var f = parseFactor(); return function (r, tt) { var v = f(r, tt); return v == null ? null : -v; }; }
      if (t.t === 'op' && t.v === '(') { i++; var e = parseExpr(); take(')'); return e; }
      if (t.t === 'id') {
        var name = t.v.toUpperCase();
        i++;
        if (!peek('(')) throw new Error('«' + t.v + '» debe ir dentro de una agregación, p. ej. SUM(' + t.v + ')');
        if (!AGG_FN[name] && ['TOTAL', 'DIVIDE', 'ABS', 'ROUND'].indexOf(name) < 0) throw new Error('Función desconocida: ' + t.v + ' (usa SUM, AVG, MIN, MAX, MEDIAN, COUNT, TOTAL, DIVIDE, ABS o ROUND)');
        take('(');
        if (AGG_FN[name]) return parseAgg(name);
        if (name === 'TOTAL') { var inner = parseExpr(); take(')'); return function (rows, total) { return inner(total || rows, total || rows); }; }
        var args = [parseExpr()];
        while (peek(',')) { i++; args.push(parseExpr()); }
        take(')');
        if (name === 'DIVIDE') return function (r, tt) { var a = args[0](r, tt), b = args[1](r, tt); return a == null || !b ? (args[2] ? args[2](r, tt) : null) : a / b; };
        if (name === 'ABS') return function (r, tt) { var a = args[0](r, tt); return a == null ? null : Math.abs(a); };
        if (name === 'ROUND') return function (r, tt) { var a = args[0](r, tt), d = args[1] ? args[1](r, tt) : 0; return a == null ? null : Math.round(a * Math.pow(10, d)) / Math.pow(10, d); };
        throw new Error('Función desconocida: ' + t.v);
      }
      throw new Error('No se esperaba «' + t.v + '»');
    }
    function parseAgg(name) {
      var distinct = false, field = null;
      if (peek('DISTINCT')) { i++; distinct = true; }
      if (peek('*')) { i++; field = '*'; }
      else { var f = take(); if (f.t !== 'id') throw new Error('Se esperaba un campo en ' + name + '(…)'); field = f.v; refs.push(field); }
      var cond = null;
      if (peek('WHERE')) {
        i++;
        var cf = take(); if (cf.t !== 'id') throw new Error('Se esperaba un campo tras WHERE');
        refs.push(cf.v);
        var op = take(); if (op.t !== 'op' || !/^(=|<>|!=|>|<|>=|<=)$/.test(op.v)) throw new Error('Operador no válido tras WHERE');
        var val = take(); if (val.t !== 'num' && val.t !== 'str') throw new Error('Se esperaba un valor tras ' + op.v);
        cond = function (r) {
          var x = r[cf.v], y = val.v, nx = toNum(x);
          if (val.t === 'num') x = nx;
          else x = String(x);
          switch (op.v) { case '=': return x === y; case '<>': case '!=': return x !== y; case '>': return x > y; case '<': return x < y; case '>=': return x >= y; default: return x <= y; }
        };
      }
      take(')');
      var agg = name === 'DISTINCTCOUNT' || (name === 'COUNT' && distinct) ? 'countDistinct' : name === 'COUNT' ? 'count' : name.toLowerCase();
      return function (rows) {
        var rs = cond ? rows.filter(cond) : rows;
        if (field === '*') return rs.length;
        if (agg === 'count') return rs.filter(function (r) { return r[field] != null && r[field] !== ''; }).length;
        if (agg === 'median') return median(rs.map(function (r) { return toNum(r[field]); }).filter(function (v) { return !isNaN(v); }));
        return rawAggregate(rs, field, agg);
      };
    }
    var fn = parseExpr();
    if (i < tk.length) throw new Error('Sobra «' + tk[i].v + '» al final de la expresión');
    return { fn: fn, refs: uniq(refs) };
  }

  function rawAggregate(rows, field, agg) {
    agg = agg || 'sum';
    if (agg === 'count') return rows.length;
    if (agg === 'countDistinct') return uniq(rows.map(function (r) { return r[field]; })).length;
    if (agg === 'first') return rows.length ? rows[0][field] : null;
    if (agg === 'last') return rows.length ? rows[rows.length - 1][field] : null;
    var nums = rows.map(function (r) { return toNum(r[field]); }).filter(function (n) { return !isNaN(n); });
    if (!nums.length) return null;
    switch (agg) {
      case 'avg': return nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
      case 'min': return Math.min.apply(null, nums);
      case 'max': return Math.max.apply(null, nums);
      case 'median': return median(nums);
      default: return nums.reduce(function (a, b) { return a + b; }, 0);
    }
  }
  /** Agrega un campo o evalúa una medida (m:<nombre>). total = filas de referencia para TOTAL(). */
  function aggregate(rows, field, agg, total) {
    if (field && String(field).indexOf('m:') === 0) {
      var m = state.measures[String(field).slice(2)];
      if (!m || !m.compiled) return null;
      try { return m.compiled.fn(rows, total || rows); } catch (e) { return null; }
    }
    return rawAggregate(rows, field, agg);
  }

  /* ---------- jerarquías ---------- */
  function hierarchyOf(name) { return name && String(name).indexOf('h:') === 0 ? state.hierarchies[String(name).slice(2)] || null : null; }
  function levelValue(row, level) {
    var v = row[level.field];
    if (level.part) return datePart(v, level.part);
    return v == null ? null : v;
  }
  function levelLabel(level, fields) { return level.label || (level.part ? PARTS[level.part] : labelOf(fields, level.field)); }

  /** Accesor de categoría (campo normal o nivel actual de una jerarquía con su ruta de profundización). */
  function categoryAccess(p, rows, ctx, fields) {
    var h = hierarchyOf(p.category);
    if (!h) return { key: function (r) { var v = r[p.category]; return v == null ? '(vacío)' : String(v); }, rows: rows, field: p.category, part: null, label: labelOf(fields, p.category) };
    var path = (ctx && ctx.id && state.drill[ctx.id]) || [];
    var depth = Math.min(path.length, h.levels.length - 1);
    var filtered = rows;
    for (var i = 0; i < depth; i++) {
      (function (lv, key) { filtered = filtered.filter(function (r) { return String(levelValue(r, lv)) === key; }); })(h.levels[i], path[i]);
    }
    var level = h.levels[depth];
    return {
      key: function (r) { var v = levelValue(r, level); return v == null ? '(vacío)' : String(v); },
      rows: filtered, field: level.field, part: level.part || null, label: levelLabel(level, fields),
      hierarchy: h, depth: depth, path: path.slice(0, depth), canDrill: depth < h.levels.length - 1
    };
  }

  function groupBy(rows, keyFn, values, agg, total) {
    if (typeof keyFn === 'string') { var f = keyFn; keyFn = function (r) { return r[f] == null ? '(vacío)' : String(r[f]); }; }
    var map = {}, order = [];
    rows.forEach(function (r) {
      var k = keyFn(r);
      if (k == null) return;
      if (!map[k]) { map[k] = []; order.push(k); }
      map[k].push(r);
    });
    total = total || rows;
    return order.map(function (k) { return { key: k, rows: map[k], values: values.map(function (v) { var x = aggregate(map[k], v, agg, total); return x == null ? 0 : x; }) }; });
  }

  /* ---------- modelo semántico ---------- */
  function setSemantic(sem) {
    sem = sem || {};
    state.measures = {};
    (sem.measures || []).forEach(function (m) {
      if (!m || !m.name) return;
      var c = null, err = null;
      try { c = compileMeasure(m.expr); } catch (e) { err = e.message; }
      state.measures[m.name] = { name: m.name, label: m.label, source: m.source, expr: m.expr, format: m.format, compiled: c, error: err };
    });
    state.hierarchies = {};
    (sem.hierarchies || []).forEach(function (h) { if (h && h.name && h.levels && h.levels.length) state.hierarchies[h.name] = h; });
    state.relations = (sem.relations || []).filter(function (r) { return r && r.from && r.to && r.from.source && r.to.source && r.from.field && r.to.field; });
    state.autoRelate = sem.autoRelate !== false;
    state.associative = !!sem.associative;
    state.cache = {};
  }
  function measuresFor(srcId) {
    return Object.keys(state.measures).map(function (k) { return state.measures[k]; }).filter(function (m) { return !m.source || m.source === srcId; });
  }
  function augmentFields(srcId, fields) {
    var out = (fields || []).slice();
    measuresFor(srcId).forEach(function (m) { out.push({ name: 'm:' + m.name, label: m.label || m.name, type: 'number', format: m.format || '', measure: true }); });
    return out;
  }

  /* ---------- filtros y propagación por relaciones ---------- */
  function filterKey(source, field, part) { return (source || '*') + '|' + field + (part ? '|' + part : ''); }
  function matchFilter(row, f) {
    var v = f.part ? datePart(row[f.field], f.part) : row[f.field];
    if (f.kind === 'text') return String(v == null ? '' : v).toLowerCase().indexOf(String(f.text || '').toLowerCase()) >= 0;
    if (f.kind === 'range') {
      if (v == null || v === '') return false;
      var n = typeof v === 'number';
      if (f.min !== '' && f.min != null && (n ? v < Number(f.min) : String(v) < String(f.min))) return false;
      if (f.max !== '' && f.max != null && (n ? v > Number(f.max) : String(v).slice(0, String(f.max).length) > String(f.max))) return false;
      return true;
    }
    return f.values.indexOf(String(v)) >= 0;
  }
  function hasField(fields, name) { for (var i = 0; fields && i < fields.length; i++) if (fields[i].name === name) return true; return false; }
  function findPath(from, to) {
    if (from === to) return [];
    var edges = [];
    state.relations.forEach(function (r) {
      edges.push({ from: r.from.source, fromField: r.from.field, to: r.to.source, toField: r.to.field });
      edges.push({ from: r.to.source, fromField: r.to.field, to: r.from.source, toField: r.from.field });
    });
    var queue = [[from, []]], seen = {}; seen[from] = 1;
    while (queue.length) {
      var cur = queue.shift();
      if (cur[1].length > 4) continue;
      for (var i = 0; i < edges.length; i++) {
        var e = edges[i];
        if (e.from !== cur[0] || seen[e.to]) continue;
        var path = cur[1].concat([e]);
        if (e.to === to) return path;
        seen[e.to] = 1;
        queue.push([e.to, path]);
      }
    }
    return null;
  }
  /** Predicado de un filtro sobre un origen destino (null si no le afecta). */
  function predicateFor(f, targetId, targetFields) {
    var direct = function (r) { return matchFilter(r, f); };
    if (!f.source || f.source === targetId) return hasField(targetFields, f.field) ? direct : null;
    if (state.autoRelate && hasField(targetFields, f.field)) return direct;
    var ck = JSON.stringify([f.key, f.values, f.text, f.min, f.max, targetId]);
    if (ck in state.cache) return state.cache[ck];
    var path = findPath(f.source, targetId);
    var data = state.data || { sources: {} };
    var src = data.sources[f.source];
    if (!path || !path.length || !src) { state.cache[ck] = null; return null; }
    var rows = src.rows.filter(direct), pred = null;
    for (var i = 0; i < path.length; i++) {
      var e = path[i], keys = {};
      rows.forEach(function (r) { keys[String(r[e.fromField])] = 1; });
      if (i === path.length - 1) { pred = (function (k, fld) { return function (r) { return !!k[String(r[fld])]; }; })(keys, e.toField); break; }
      var next = data.sources[e.to];
      if (!next) { pred = null; break; }
      rows = next.rows.filter((function (k, fld) { return function (r) { return !!k[String(r[fld])]; }; })(keys, e.toField));
    }
    state.cache[ck] = pred;
    return pred;
  }
  /** Filas de un origen tras aplicar los filtros activos. opts: { origin, excludeField, page } */
  function filterRows(srcId, src, opts) {
    opts = opts || {};
    var preds = [];
    Object.keys(state.filters).forEach(function (k) {
      var f = state.filters[k];
      if (opts.origin && f.origin === opts.origin) return;
      if (opts.excludeField && f.field === opts.excludeField) return;
      if (f.page && opts.page && f.page !== opts.page) return;
      if (f.page && !opts.page) return;
      var p = predicateFor(f, srcId, src.fields);
      if (p) preds.push(p);
    });
    if (!preds.length) return src.rows;
    return src.rows.filter(function (r) { for (var i = 0; i < preds.length; i++) if (!preds[i](r)) return false; return true; });
  }

  function emit() {
    var s = getState();
    state.listeners.forEach(function (fn) { try { fn(s); } catch (e) { /* noop */ } });
    try { document.dispatchEvent(new CustomEvent('rpt:filters', { detail: s.filters })); } catch (e) { /* noop */ }
    if (global.parent && global.parent !== global) {
      try { global.parent.postMessage({ type: 'rpt:filters', filters: s.filters }, '*'); global.parent.postMessage({ type: 'rpt:state', state: s }, '*'); } catch (e) { /* noop */ }
    }
  }
  function getState() { return clone({ filters: state.filters, drill: state.drill, page: state.page }); }
  function setState(s) {
    s = s || {};
    state.filters = s.filters || {};
    state.drill = s.drill || {};
    state.cache = {};
    if (s.page) state.page = s.page;
    emit(); refresh(); showPage();
  }
  function getFilters() { return clone(state.filters); }
  function setFilter(f) {
    if (!f || !f.field) return;
    var kind = f.kind || 'in';
    var key = f.key || filterKey(f.source, f.field, f.part);
    var empty = kind === 'in' ? !(f.values && f.values.length) : kind === 'text' ? !f.text : (f.min === '' || f.min == null) && (f.max === '' || f.max == null);
    if (empty) delete state.filters[key];
    else state.filters[key] = { key: key, source: f.source || null, field: f.field, part: f.part || null, kind: kind, values: (f.values || []).map(String), text: f.text, min: f.min, max: f.max, origin: f.origin || null, page: f.page || null };
    state.cache = {};
    emit(); refresh();
  }
  function removeFilter(key) { delete state.filters[key]; state.cache = {}; emit(); refresh(); }
  function clearFilters() { state.filters = {}; state.cache = {}; emit(); refresh(); }
  function currentFilter(source, field, part) {
    var k = filterKey(source, field, part);
    if (state.filters[k]) return state.filters[k];
    for (var key in state.filters) { var f = state.filters[key]; if (f.field === field && (f.part || null) === (part || null)) return f; }
    return null;
  }
  function toggleValue(field, key, origin, multi, opts) {
    opts = opts || {};
    var cur = currentFilter(opts.source, field, opts.part);
    var vals = cur && cur.kind === 'in' && cur.origin === origin ? cur.values.slice() : cur && cur.kind === 'in' && !origin ? cur.values.slice() : [];
    var i = vals.indexOf(String(key));
    if (multi) { if (i >= 0) vals.splice(i, 1); else vals.push(String(key)); }
    else vals = i >= 0 && vals.length === 1 ? [] : [String(key)];
    if (cur && cur.key !== filterKey(opts.source, field, opts.part)) delete state.filters[cur.key];
    setFilter({ source: opts.source, field: field, part: opts.part, kind: 'in', values: vals, origin: origin, page: opts.page });
  }
  function describeFilter(f) {
    var label = state.fieldLabels[(f.source || '') + '.' + f.field] || state.fieldLabels[f.field] || f.field;
    if (f.part) label += ' (' + (PARTS[f.part] || f.part).toLowerCase() + ')';
    var fmt = function (v) { return f.part ? formatKey(v, f.part) : v; };
    var v = f.kind === 'text' ? '«' + f.text + '»' : f.kind === 'range' ? (f.min || '…') + ' – ' + (f.max || '…') : f.values.length > 2 ? f.values.slice(0, 2).map(fmt).join(', ') + ' +' + (f.values.length - 2) : f.values.map(fmt).join(', ');
    return { label: label, value: v };
  }
