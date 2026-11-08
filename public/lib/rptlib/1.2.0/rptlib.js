/* ---- 00-core.js ---- */
/*! RptLib 1.2.0 \u2014 librer\u00eda de componentes de informe (estilo Fluent). Sin dependencias.
 *
 *   <link rel="stylesheet" href="https://<host>/lib/rptlib/1.2.0/rptlib.css">
 *   <script src="https://<host>/lib/rptlib/1.2.0/rptlib.js" defer></script>
 *   <div data-rpt="chart" data-source="ventas" data-props='{"type":"donut","category":"region","values":["importe"]}'></div>
 *
 * Datos:      window.RPT_DATA = { sources: { <id>: { fields, rows } }, semantic?, subreports? }
 *             o <meta name="rpt-data-url" content="..."> para descargarlos.
 * Sem\u00e1ntica:  <script type="application/json" id="rpt-semantic">{ relations, measures, hierarchies, associative }</script>
 *             Medidas: campo "m:<nombre>"  \u00b7  Jerarqu\u00edas: categor\u00eda "h:<nombre>"
 * Tema:       <html data-rpt-theme data-rpt-palette data-rpt-density style="--rpt-brand:\u2026">
 *             <meta name="rpt-theme" content='{"colors":[\u2026],"font":"\u2026"}'>
 * P\u00e1ginas:    <section class="rpt-page" data-page="id" data-title="Nombre">\u2026</section>
 */
(function (global) {
  'use strict';

  var VERSION = '1.2.0';
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
  var BASE = SCRIPT_SRC ? SCRIPT_SRC.replace(/[^/]*$/, '') : '';
  var PALETTES = {
    fluent: ['#0f6cbd', '#e3008c', '#2aa0a4', '#d06228', '#7160e8', '#13a10e', '#c239b3', '#986f0b', '#4f6bed', '#ca5010', '#038387', '#8764b8'],
    ocean: ['#0f6cbd', '#038387', '#4f6bed', '#00a2ad', '#3a96dd', '#5c2e91', '#00b7c3', '#0078d4', '#2b88d8', '#005b70'],
    warm: ['#d06228', '#c239b3', '#e3008c', '#ca5010', '#986f0b', '#a4262c', '#ff8c00', '#8764b8', '#da3b01', '#b146c2'],
    forest: ['#107c10', '#498205', '#038387', '#8cbd18', '#00b294', '#567c73', '#486860', '#0b6a0b', '#4f6bed', '#986f0b'],
    mono: ['#0f6cbd', '#2f80cc', '#5596d8', '#7aabe2', '#a2c4ec', '#0c5aa0', '#0a4a85', '#c7dcf5']
  };
  var ACCENTS = { brand: 'var(--rpt-brand)', green: '#107c10', red: '#c50f1f', orange: '#da3b01', purple: '#8764b8', teal: '#038387', pink: '#e3008c', yellow: '#986f0b' };
  var ICONS = {
    money: '<path d="M3 6h18v12H3z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    cart: '<path d="M3 4h2l2.4 10.5h10.2L20 7H6.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="9" cy="19" r="1.4" fill="currentColor"/><circle cx="17" cy="19" r="1.4" fill="currentColor"/>',
    people: '<circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5M16 5.2a3 3 0 0 1 0 5.6M18 14.4c1.6.7 2.6 2.2 3 4.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    box: '<path d="M12 3 4 7v10l8 4 8-4V7z M4 7l8 4 8-4 M12 11v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    chart: '<path d="M4 20V4 M4 20h16 M8 16v-5 M12 16V8 M16 16v-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    check: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m8 12.3 2.7 2.7L16 9.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    alert: '<path d="M12 3.5 2.8 19.5h18.4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 10v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="16.8" r="1" fill="currentColor"/>',
    clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    target: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'
  };
  var UI = {
    more: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    table: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z M4 10h16 M4 15h16 M10 5v14" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    rows: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    csv: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11 M7 10l5 5 5-5 M5 20h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    png: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="15.5" cy="9" r="1.5" fill="currentColor"/></svg>',
    expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    filter: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 5h16l-6 8v6l-4-2v-4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'
  };

  var html = document.documentElement;
  var config = { locale: html.lang || 'es-ES', currency: 'EUR', palette: html.getAttribute('data-rpt-palette') || 'fluent', customPalette: null };

  /* ---------- utilidades ---------- */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function toNum(v) { if (typeof v === 'number') return v; if (v == null || v === '') return NaN; return Number(v); }
  function uniq(a) { var s = {}, o = []; a.forEach(function (v) { var k = String(v); if (!s[k]) { s[k] = 1; o.push(v); } }); return o; }
  function cmpLabel(a, b) { return String(a).localeCompare(String(b), config.locale, { numeric: true }); }
  function truncate(s, n) { s = String(s); return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '\u2026' : s; }
  function slug(s) { return String(s || 'datos').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'datos'; }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function niceMax(v) {
    if (!(v > 0)) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function download(name, blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function svgEl(w, h, inner, label) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(label || 'Gr\u00e1fico') + '">' + inner + '</svg>';
  }
  function fieldMeta(fields, name) {
    for (var i = 0; fields && i < fields.length; i++) if (fields[i].name === name) return fields[i];
    if (name && name.indexOf('m:') === 0 && state.measures[name.slice(2)]) { var m = state.measures[name.slice(2)]; return { name: name, label: m.label || m.name, type: 'number', format: m.format || '', measure: true }; }
    if (name && name.indexOf('h:') === 0 && state.hierarchies[name.slice(2)]) { var h = state.hierarchies[name.slice(2)]; return { name: name, label: h.label || h.name, type: 'string', hierarchy: true }; }
    return { name: name, label: name, type: 'string' };
  }
  function labelOf(fields, name) { var f = fieldMeta(fields, name); return f.label || f.name; }

  function format(value, fmt, type) {
    if (value == null || value === '' || (typeof value === 'number' && !isFinite(value))) return '\u2014';
    fmt = fmt || (type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'boolean' ? 'boolean' : 'text');
    try {
      switch (fmt) {
        case 'integer': return new Intl.NumberFormat(config.locale, { maximumFractionDigits: 0 }).format(toNum(value));
        case 'number': return new Intl.NumberFormat(config.locale, { maximumFractionDigits: 2 }).format(toNum(value));
        case 'currency': return new Intl.NumberFormat(config.locale, { style: 'currency', currency: config.currency }).format(toNum(value));
        case 'compact': return new Intl.NumberFormat(config.locale, { notation: 'compact', maximumFractionDigits: 1 }).format(toNum(value));
        case 'compactCurrency': return new Intl.NumberFormat(config.locale, { style: 'currency', currency: config.currency, notation: 'compact', maximumFractionDigits: 1 }).format(toNum(value));
        case 'percent': return new Intl.NumberFormat(config.locale, { style: 'percent', maximumFractionDigits: 1 }).format(toNum(value));
        case 'date': { var d = new Date(value); return isNaN(d) ? String(value) : new Intl.DateTimeFormat(config.locale, { dateStyle: 'medium' }).format(d); }
        case 'boolean': return value === true || value === 1 || value === 'true' ? 'S\u00ed' : 'No';
        default: return String(value);
      }
    } catch (e) { return String(value); }
  }
  function formatField(fields, name, value, override) { var f = fieldMeta(fields, name); return format(value, override || f.format, f.type); }
  function compactFmt(fmt) { return fmt === 'currency' || fmt === 'compactCurrency' ? 'compactCurrency' : fmt === 'percent' ? 'percent' : 'compact'; }

  /* ---------- fechas y periodos ---------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function isoOf(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return isNaN(v) ? null : isoDate(v);
    var s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    if (/^\d{4}-\d{2}$/.test(s)) return s + '-01';
    if (/^\d{4}$/.test(s)) return s + '-01-01';
    var d = new Date(s);
    return isNaN(d) ? null : isoDate(d);
  }
  var PARTS = { year: 'A\u00f1o', quarter: 'Trimestre', month: 'Mes', day: 'D\u00eda' };
  function datePart(v, part) {
    var s = isoOf(v);
    if (!s) return null;
    var y = s.slice(0, 4), m = +s.slice(5, 7);
    if (part === 'year') return y;
    if (part === 'quarter') return y + '-T' + Math.ceil(m / 3);
    if (part === 'month') return s.slice(0, 7);
    return s;
  }
  function keyKind(k) {
    k = String(k);
    if (/^\d{4}$/.test(k)) return 'year';
    if (/^\d{4}-T[1-4]$/.test(k)) return 'quarter';
    if (/^\d{4}-\d{2}$/.test(k)) return 'month';
    if (/^\d{4}-\d{2}-\d{2}$/.test(k)) return 'day';
    return null;
  }
  function shiftKey(k, kind, n) {
    k = String(k);
    var y = +k.slice(0, 4);
    if (kind === 'year') return String(y + n);
    if (kind === 'quarter') { var q = y * 4 + (+k.slice(6) - 1) + n; return Math.floor(q / 4) + '-T' + (q % 4 + 1); }
    if (kind === 'month') { var mm = y * 12 + (+k.slice(5, 7) - 1) + n; return Math.floor(mm / 12) + '-' + pad2(mm % 12 + 1); }
    if (kind === 'day') { var d = new Date(y, +k.slice(5, 7) - 1, +k.slice(8, 10)); d.setDate(d.getDate() + n); return isoDate(d); }
    return null;
  }
  function yoyKey(k, kind) { k = String(k); return kind === 'year' ? String(+k - 1) : (+k.slice(0, 4) - 1) + k.slice(4); }
  function formatKey(k, kind) {
    kind = kind || keyKind(k);
    try {
      if (kind === 'month') return new Intl.DateTimeFormat(config.locale, { month: 'short', year: 'numeric' }).format(new Date(+String(k).slice(0, 4), +String(k).slice(5, 7) - 1, 1));
      if (kind === 'quarter') return String(k).slice(5) + ' ' + String(k).slice(0, 4);
      if (kind === 'day') return new Intl.DateTimeFormat(config.locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(+String(k).slice(0, 4), +String(k).slice(5, 7) - 1, +String(k).slice(8, 10)));
    } catch (e) { /* noop */ }
    return String(k);
  }
  function linreg(ys) {
    var n = ys.length, sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (var i = 0; i < n; i++) { sx += i; sy += ys[i]; sxy += i * ys[i]; sxx += i * i; }
    var d = n * sxx - sx * sx;
    var slope = d ? (n * sxy - sx * sy) / d : 0, icpt = (sy - slope * sx) / (n || 1);
    var res = 0;
    for (var j = 0; j < n; j++) { var e = ys[j] - (icpt + slope * j); res += e * e; }
    return { slope: slope, intercept: icpt, sd: Math.sqrt(res / Math.max(1, n - 2)) };
  }
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }); var n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; }

/* ---- 10-semantic.js ---- */
  /* ---------- estado global ---------- */
  var state = {
    filters: {}, drill: {}, page: null, data: null, items: [], listeners: [], fieldLabels: {},
    measures: {}, hierarchies: {}, relations: [], autoRelate: true, associative: false, printing: false, cache: {}
  };

  /* ---------- medidas: lenguaje de expresiones ----------
   * SUM(x) AVG(x) MIN(x) MAX(x) MEDIAN(x) COUNT(*) COUNT(x) COUNT(DISTINCT x)
   * SUM(x WHERE campo = 'valor')  \u00b7  TOTAL(expr) eval\u00faa sobre todas las filas del visual (para % sobre total)
   * DIVIDE(a, b)  ABS(a)  ROUND(a, n)  + - * /  n\u00fameros y par\u00e9ntesis */
  var AGG_FN = { SUM: 1, AVG: 1, MIN: 1, MAX: 1, MEDIAN: 1, COUNT: 1, DISTINCTCOUNT: 1 };
  function tokenize(src) {
    var re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_\u00c0-\u017f][\w\u00c0-\u017f]*)|('(?:[^']|'')*')|(<>|>=|<=|!=|[*/+\-(),=<>]))/y;
    var out = [], m, pos = 0;
    src = String(src || '');
    while (pos < src.length) {
      re.lastIndex = pos;
      m = re.exec(src);
      if (!m || m[0].length === 0) { if (/^\s*$/.test(src.slice(pos))) break; throw new Error('Car\u00e1cter no v\u00e1lido en \u00ab' + src.slice(pos, pos + 10) + '\u00bb'); }
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
    function take(v) { if (!peek(v)) throw new Error('Se esperaba \u00ab' + v + '\u00bb' + (tk[i] ? ' y hay \u00ab' + tk[i].v + '\u00bb' : ' al final')); return tk[i++]; }
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
      if (!t) throw new Error('La expresi\u00f3n est\u00e1 incompleta');
      if (t.t === 'num') { i++; return function () { return t.v; }; }
      if (t.t === 'op' && t.v === '-') { i++; var f = parseFactor(); return function (r, tt) { var v = f(r, tt); return v == null ? null : -v; }; }
      if (t.t === 'op' && t.v === '(') { i++; var e = parseExpr(); take(')'); return e; }
      if (t.t === 'id') {
        var name = t.v.toUpperCase();
        i++;
        if (!peek('(')) throw new Error('\u00ab' + t.v + '\u00bb debe ir dentro de una agregaci\u00f3n, p. ej. SUM(' + t.v + ')');
        if (!AGG_FN[name] && ['TOTAL', 'DIVIDE', 'ABS', 'ROUND'].indexOf(name) < 0) throw new Error('Funci\u00f3n desconocida: ' + t.v + ' (usa SUM, AVG, MIN, MAX, MEDIAN, COUNT, TOTAL, DIVIDE, ABS o ROUND)');
        take('(');
        if (AGG_FN[name]) return parseAgg(name);
        if (name === 'TOTAL') { var inner = parseExpr(); take(')'); return function (rows, total) { return inner(total || rows, total || rows); }; }
        var args = [parseExpr()];
        while (peek(',')) { i++; args.push(parseExpr()); }
        take(')');
        if (name === 'DIVIDE') return function (r, tt) { var a = args[0](r, tt), b = args[1](r, tt); return a == null || !b ? (args[2] ? args[2](r, tt) : null) : a / b; };
        if (name === 'ABS') return function (r, tt) { var a = args[0](r, tt); return a == null ? null : Math.abs(a); };
        if (name === 'ROUND') return function (r, tt) { var a = args[0](r, tt), d = args[1] ? args[1](r, tt) : 0; return a == null ? null : Math.round(a * Math.pow(10, d)) / Math.pow(10, d); };
        throw new Error('Funci\u00f3n desconocida: ' + t.v);
      }
      throw new Error('No se esperaba \u00ab' + t.v + '\u00bb');
    }
    function parseAgg(name) {
      var distinct = false, field = null;
      if (peek('DISTINCT')) { i++; distinct = true; }
      if (peek('*')) { i++; field = '*'; }
      else { var f = take(); if (f.t !== 'id') throw new Error('Se esperaba un campo en ' + name + '(\u2026)'); field = f.v; refs.push(field); }
      var cond = null;
      if (peek('WHERE')) {
        i++;
        var cf = take(); if (cf.t !== 'id') throw new Error('Se esperaba un campo tras WHERE');
        refs.push(cf.v);
        var op = take(); if (op.t !== 'op' || !/^(=|<>|!=|>|<|>=|<=)$/.test(op.v)) throw new Error('Operador no v\u00e1lido tras WHERE');
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
    if (i < tk.length) throw new Error('Sobra \u00ab' + tk[i].v + '\u00bb al final de la expresi\u00f3n');
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
  /** Agrega un campo o eval\u00faa una medida (m:<nombre>). total = filas de referencia para TOTAL(). */
  function aggregate(rows, field, agg, total) {
    if (field && String(field).indexOf('m:') === 0) {
      var m = state.measures[String(field).slice(2)];
      if (!m || !m.compiled) return null;
      try { return m.compiled.fn(rows, total || rows); } catch (e) { return null; }
    }
    return rawAggregate(rows, field, agg);
  }

  /* ---------- jerarqu\u00edas ---------- */
  function hierarchyOf(name) { return name && String(name).indexOf('h:') === 0 ? state.hierarchies[String(name).slice(2)] || null : null; }
  function levelValue(row, level) {
    var v = row[level.field];
    if (level.part) return datePart(v, level.part);
    return v == null ? null : v;
  }
  function levelLabel(level, fields) { return level.label || (level.part ? PARTS[level.part] : labelOf(fields, level.field)); }

  /** Accesor de categor\u00eda (campo normal o nivel actual de una jerarqu\u00eda con su ruta de profundizaci\u00f3n). */
  function categoryAccess(p, rows, ctx, fields) {
    var h = hierarchyOf(p.category);
    if (!h) return { key: function (r) { var v = r[p.category]; return v == null ? '(vac\u00edo)' : String(v); }, rows: rows, field: p.category, part: null, label: labelOf(fields, p.category) };
    var path = (ctx && ctx.id && state.drill[ctx.id]) || [];
    var depth = Math.min(path.length, h.levels.length - 1);
    var filtered = rows;
    for (var i = 0; i < depth; i++) {
      (function (lv, key) { filtered = filtered.filter(function (r) { return String(levelValue(r, lv)) === key; }); })(h.levels[i], path[i]);
    }
    var level = h.levels[depth];
    return {
      key: function (r) { var v = levelValue(r, level); return v == null ? '(vac\u00edo)' : String(v); },
      rows: filtered, field: level.field, part: level.part || null, label: levelLabel(level, fields),
      hierarchy: h, depth: depth, path: path.slice(0, depth), canDrill: depth < h.levels.length - 1
    };
  }

  function groupBy(rows, keyFn, values, agg, total) {
    if (typeof keyFn === 'string') { var f = keyFn; keyFn = function (r) { return r[f] == null ? '(vac\u00edo)' : String(r[f]); }; }
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

  /* ---------- modelo sem\u00e1ntico ---------- */
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

  /* ---------- filtros y propagaci\u00f3n por relaciones ---------- */
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
    var v = f.kind === 'text' ? '\u00ab' + f.text + '\u00bb' : f.kind === 'range' ? (f.min || '\u2026') + ' \u2013 ' + (f.max || '\u2026') : f.values.length > 2 ? f.values.slice(0, 2).map(fmt).join(', ') + ' +' + (f.values.length - 2) : f.values.map(fmt).join(', ');
    return { label: label, value: v };
  }

/* ---- 20-ui.js ---- */
  /* ---------- tooltip ---------- */
  var tipEl = null;
  function tip() {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'rpt-tooltip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
    return tipEl;
  }
  function bindTips(root) {
    function show(e) {
      var t = e.target.closest && e.target.closest('[data-tip]');
      if (!t || !root.contains(t)) { hide(); return; }
      var el = tip(); el.innerHTML = t.getAttribute('data-tip'); el.classList.add('is-on');
      var r = t.getBoundingClientRect();
      var x = e.clientX || r.left + r.width / 2, y = e.clientY || r.top;
      el.style.left = Math.max(8, Math.min(window.innerWidth - el.offsetWidth - 8, x + 12)) + 'px';
      el.style.top = Math.max(8, y - el.offsetHeight - 10) + 'px';
    }
    function hide() { if (tipEl) tipEl.classList.remove('is-on'); }
    root.addEventListener('pointermove', show);
    root.addEventListener('pointerdown', show);
    root.addEventListener('focusin', show);
    root.addEventListener('pointerleave', hide);
    root.addEventListener('focusout', hide);
  }

  function colors(p, ctx) {
    if (p.colors && p.colors.length) return p.colors;
    var pal = ctx && ctx.palette;
    if (Array.isArray(pal) && pal.length) return pal;
    if (pal && PALETTES[pal]) return PALETTES[pal];
    if (config.customPalette && config.customPalette.length) return config.customPalette;
    return PALETTES[config.palette] || PALETTES.fluent;
  }
  function menuBtn(floating) {
    return (floating ? '<span class="rpt-float-menu">' : '') + '<button type="button" class="rpt-menu-btn" aria-haspopup="menu" aria-label="M\u00e1s opciones">' + UI.more + '</button>' + (floating ? '</span>' : '');
  }
  function head(p, ctx, sub) {
    var t = p.title || p.label || '';
    if (!t && !(ctx && ctx.interactive)) return '';
    return '<div class="rpt-card-title"><span>' + esc(t) + '</span><span class="rpt-card-tools">' + (sub ? '<span class="rpt-card-sub">' + esc(sub) + '</span>' : '') + (ctx && ctx.interactive ? menuBtn(false) : '') + '</span></div>';
  }
  function empty(el, msg) { el.innerHTML = '<div class="rpt-empty">' + esc(msg) + '</div>'; el.__rptExport = null; }
  function observe(el, body, draw) {
    if (!global.ResizeObserver) return;
    if (el.__rptRO) el.__rptRO.disconnect();
    var last = body.clientWidth;
    el.__rptRO = new ResizeObserver(function () { var w = body.clientWidth; if (Math.abs(w - last) > 4) { last = w; draw(); } });
    el.__rptRO.observe(body);
  }
  function cols(fields, names) { return names.map(function (n) { var f = fieldMeta(fields, n); return { name: n, label: f.label || n, type: f.type, format: f.format }; }); }
  function detailOf(src, rows) { return function () { return { columns: cols(src.fields, src.fields.filter(function (f) { return !f.measure; }).map(function (f) { return f.name; })), rows: rows }; }; }

  /* ---------- men\u00fa de tarjeta ---------- */
  var openMenuEl = null;
  function closeMenu() { if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; document.removeEventListener('pointerdown', onDocDown, true); } }
  function onDocDown(e) { if (openMenuEl && !openMenuEl.contains(e.target)) closeMenu(); }
  function openMenu(el, btn) {
    closeMenu();
    var x = el.__rptExport || {};
    var items = [];
    if (x.table) items.push(['table', 'Ver datos', UI.table]);
    if (x.detail) items.push(['detail', 'Ver detalle (filas)', UI.rows]);
    if (x.table || x.detail) items.push(['csv', 'Exportar CSV (Excel)', UI.csv]);
    if (x.svg) items.push(['png', 'Exportar imagen PNG', UI.png]);
    if (x.expand) items.push(['expand', 'Ampliar', UI.expand]);
    if (!items.length) return;
    var m = document.createElement('div');
    m.className = 'rpt-menu'; m.setAttribute('role', 'menu');
    m.innerHTML = items.map(function (it) { return '<button type="button" role="menuitem" data-act="' + it[0] + '">' + it[2] + it[1] + '</button>'; }).join('');
    document.body.appendChild(m);
    var r = btn.getBoundingClientRect();
    m.style.top = Math.min(window.innerHeight - m.offsetHeight - 8, r.bottom + 4) + 'px';
    m.style.left = Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px';
    openMenuEl = m;
    var btns = m.querySelectorAll('button');
    btns[0].focus();
    m.addEventListener('keydown', function (e) {
      var i = Array.prototype.indexOf.call(btns, document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
      else if (e.key === 'Escape' || e.key === 'Tab') { closeMenu(); btn.focus(); }
    });
    m.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; closeMenu(); runAction(el, b.getAttribute('data-act')); });
    setTimeout(function () { document.addEventListener('pointerdown', onDocDown, true); });
  }

  function tableHtml(columns, rows, limit) {
    limit = limit || 500;
    var h = '<div class="rpt-grid-wrap"><table class="rpt-table"><thead><tr>' + columns.map(function (c) { return '<th class="' + (c.type === 'number' ? 'is-num' : '') + '" scope="col">' + esc(c.label || c.name) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.slice(0, limit).forEach(function (r) { h += '<tr>' + columns.map(function (c) { return '<td class="' + (c.type === 'number' ? 'is-num' : '') + '">' + esc(format(r[c.name], c.format, c.type)) + '</td>'; }).join('') + '</tr>'; });
    h += '</tbody></table></div>';
    if (rows.length > limit) h += '<p class="rpt-card-sub">Mostrando ' + limit + ' de ' + rows.length + ' filas. Exporta a CSV para verlas todas.</p>';
    return h;
  }
  function dialog(title, bodyHtml, onReady) {
    var d = document.createElement('dialog');
    d.className = 'rpt-dialog';
    d.setAttribute('aria-label', title);
    d.innerHTML = '<div class="rpt-dialog-head"><h2>' + esc(title) + '</h2><button type="button" class="rpt-menu-btn" aria-label="Cerrar">' + UI.close + '</button></div><div class="rpt-dialog-body">' + bodyHtml + '</div>';
    document.body.appendChild(d);
    d.querySelector('.rpt-dialog-head button').addEventListener('click', function () { d.close(); });
    d.addEventListener('close', function () { d.remove(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    if (onReady) onReady(d.querySelector('.rpt-dialog-body'));
    return d;
  }
  function toCsv(columns, rows) {
    var dec = (1.5).toLocaleString(config.locale).indexOf(',') >= 0;
    var sep = dec ? ';' : ',';
    function cell(v) {
      if (v == null) return '';
      if (typeof v === 'number') return dec ? String(v).replace('.', ',') : String(v);
      if (typeof v === 'boolean') return v ? 'S\u00ed' : 'No';
      var s = String(v);
      return /["\n\r;,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    return '\ufeff' + [columns.map(function (c) { return cell(c.label || c.name); }).join(sep)].concat(rows.map(function (r) { return columns.map(function (c) { return cell(r[c.name]); }).join(sep); })).join('\r\n');
  }
  function exportCsv(name, columns, rows) { download(slug(name) + '.csv', new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' })); }

  function inlineStyles(src, dst) {
    var cs = getComputedStyle(src);
    ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'font-size', 'font-family', 'font-weight', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray'].forEach(function (p) { dst.style.setProperty(p, cs.getPropertyValue(p)); });
    for (var i = 0; i < src.children.length; i++) inlineStyles(src.children[i], dst.children[i]);
  }
  /** Convierte el SVG de un componente (con t\u00edtulo y leyenda) en PNG. Devuelve una promesa { dataUrl, blob, width, height }. */
  function svgToPng(el, svg, title, scale) {
    scale = scale || 2;
    var w = svg.viewBox.baseVal.width || svg.clientWidth || 400, h = svg.viewBox.baseVal.height || svg.clientHeight || 260;
    var clone2 = svg.cloneNode(true);
    inlineStyles(svg, clone2);
    var cs = getComputedStyle(el);
    var surface = (cs.getPropertyValue('--rpt-surface') || '#fff').trim(), fg = (cs.getPropertyValue('--rpt-fg') || '#242424').trim(), fg2 = (cs.getPropertyValue('--rpt-fg-2') || '#424242').trim();
    var legend = Array.prototype.slice.call(el.querySelectorAll('.rpt-legend span'));
    var top = title ? 36 : 12, legendH = legend.length ? Math.ceil(legend.length / 3) * 20 + 8 : 0;
    var ns = 'http://www.w3.org/2000/svg';
    var out = document.createElementNS(ns, 'svg');
    var W = Math.max(w, 360) + 32, H = h + top + legendH + 16;
    out.setAttribute('xmlns', ns); out.setAttribute('width', W); out.setAttribute('height', H); out.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    out.innerHTML = '<rect width="100%" height="100%" fill="' + surface + '"/>' + (title ? '<text x="16" y="24" font-family="Segoe UI, sans-serif" font-size="15" font-weight="600" fill="' + fg + '">' + esc(title) + '</text>' : '');
    var g = document.createElementNS(ns, 'g'); g.setAttribute('transform', 'translate(16,' + top + ')');
    clone2.removeAttribute('role'); clone2.setAttribute('width', w); clone2.setAttribute('height', h);
    g.appendChild(clone2); out.appendChild(g);
    legend.forEach(function (s, i) {
      var col = i % 3, row = Math.floor(i / 3), x = 16 + col * ((W - 32) / 3), y = top + h + 18 + row * 20;
      var ii = s.querySelector('i'), c = ii ? getComputedStyle(ii).backgroundColor : fg2;
      out.insertAdjacentHTML('beforeend', '<rect x="' + x + '" y="' + (y - 9) + '" width="10" height="10" rx="2" fill="' + c + '"/><text x="' + (x + 16) + '" y="' + y + '" font-family="Segoe UI, sans-serif" font-size="12" fill="' + fg2 + '">' + esc(s.textContent) + '</text>');
    });
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale;
        var cx = c.getContext('2d'); cx.scale(scale, scale); cx.drawImage(img, 0, 0);
        c.toBlob(function (b) { resolve({ dataUrl: c.toDataURL('image/png'), blob: b, width: W, height: H }); });
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(out));
    });
  }
  function runAction(el, act) {
    var x = el.__rptExport || {};
    var title = x.title || 'Datos';
    if (act === 'table' && x.table) { var t = x.table(); dialog(title + ' \u00b7 datos', tableHtml(t.columns, t.rows)); }
    else if (act === 'detail' && x.detail) { var d = x.detail(); dialog(title + ' \u00b7 detalle (' + d.rows.length + ' filas)', tableHtml(d.columns, d.rows)); }
    else if (act === 'csv') { var c = x.table ? x.table() : x.detail(); exportCsv(title, c.columns, c.rows); }
    else if (act === 'png' && x.svg) { var s = x.svg(); if (s) svgToPng(el, s, title).then(function (r) { download(slug(title) + '.png', r.blob); }); }
    else if (act === 'expand' && x.expand) {
      dialog(title, '<div class="rpt-c"></div>', function (body) {
        var host = body.querySelector('.rpt-c');
        var p = clone(el.__rptProps || {});
        if (el.__rptView && /chart|scatter|map|treemap|sankey|funnel|waterfall/.test(el.__rptType)) p.height = Math.max(Number(p.height) || 260, Math.round(window.innerHeight * 0.55));
        if (el.__rptType === 'grid') p.pageSize = 25;
        p.title = '';
        renderComponent(host, el.__rptType, p, el.__rptView, { interactive: false, srcId: el.__rptSrcId, viewReady: true });
      });
    }
  }

/* ---- 30-basic.js ---- */
  /* ---------- componentes b\u00e1sicos ---------- */
  var components = {};

  components.title = function (el, p) {
    var lvl = p.level === 'h3' ? 'h3' : 'h2';
    el.innerHTML = '<div class="rpt-title"><' + lvl + '>' + esc(p.text || 'T\u00edtulo') + '</' + lvl + '>' + (p.subtitle ? '<p>' + esc(p.subtitle) + '</p>' : '') + '</div>';
  };
  components.text = function (el, p) {
    el.innerHTML = '<div class="' + (p.card ? 'rpt-card ' : '') + 'rpt-text">' + esc(p.content || '') + '</div>';
  };
  components.subreport = function (el, p) {
    el.innerHTML = '<div class="rpt-card"><div class="rpt-card-title"><span>' + esc(p.title || 'Subinforme') + '</span><span class="rpt-card-sub">Subinforme</span></div><div class="rpt-empty">' + (p.report ? 'Se mostrar\u00e1n aqu\u00ed los componentes del informe enlazado, con sus datos.' : 'Elige el informe que quieres incrustar.') + '</div></div>';
  };
  components.pagebreak = function (el, p, src, ctx) {
    el.innerHTML = ctx.designer ? '<div class="rpt-empty">\u2014 Salto de p\u00e1gina (impresi\u00f3n / PDF) \u2014</div>' : '';
  };

  /** Comparaci\u00f3n temporal del \u00faltimo periodo frente al anterior o al mismo del a\u00f1o pasado. */
  function periodCompare(rows, p, total) {
    if (!p.compare || !p.dateField) return null;
    var grain = p.grain || 'month';
    var keys = uniq(rows.map(function (r) { return datePart(r[p.dateField], grain); }).filter(Boolean)).sort();
    if (!keys.length) return null;
    var cur = keys[keys.length - 1];
    var prev = p.compare === 'yoy' ? yoyKey(cur, grain) : shiftKey(cur, grain, -1);
    var inK = function (k) { return function (r) { return datePart(r[p.dateField], grain) === k; }; };
    var curRows = rows.filter(inK(cur));
    var prevRows = (total || rows).filter(inK(prev));
    var v = aggregate(curRows, p.field, p.agg, curRows), pv = prevRows.length ? aggregate(prevRows, p.field, p.agg, prevRows) : null;
    return { cur: cur, prev: prev, value: v, prevValue: pv, delta: pv ? (v - pv) / Math.abs(pv) : null, grain: grain };
  }
  function deltaBadge(delta, goodWhen) {
    if (delta == null || !isFinite(delta)) return '';
    var good = goodWhen === 'lower' ? delta <= 0 : delta >= 0;
    return '<span class="rpt-badge ' + (good ? 'is-good' : 'is-bad') + '">' + (delta >= 0 ? '\u25b2 ' : '\u25bc ') + esc(format(Math.abs(delta), 'percent')) + '</span>';
  }

  components.filter = function (el, p, src, ctx) {
    if (!src || !p.field) return empty(el, 'Elige origen y campo a filtrar');
    var f = fieldMeta(src.fields, p.field);
    var part = p.part || null;
    var cur = currentFilter(ctx.srcId, p.field, part);
    var mode = p.mode || 'select';
    var label = p.label || (f.label || p.field) + (part ? ' (' + PARTS[part].toLowerCase() + ')' : '');
    var id = (el.id || ctx.id || 'f') + '-in';
    var valOf = function (r) { return part ? datePart(r[p.field], part) : r[p.field]; };
    var base = ctx.associative && src.allRows ? src.allRows : src.rows;
    var opts = uniq(base.map(valOf).filter(function (v) { return v != null && v !== ''; })).sort(cmpLabel).slice(0, 300);
    var possible = {};
    if (ctx.associative) src.rows.forEach(function (r) { possible[String(valOf(r))] = 1; });
    var excl = function (o) { return ctx.associative && !possible[String(o)]; };
    var show = function (o) { return part ? formatKey(o, part) : format(o, f.format, f.type); };
    var h = '<div class="rpt-card rpt-filter">';
    if (mode === 'multi') {
      var sel = cur && cur.kind === 'in' ? cur.values : [];
      h += '<span class="rpt-filter-label" id="' + id + '">' + esc(label) + '</span><div class="rpt-chips" role="group" aria-labelledby="' + id + '">' +
        opts.map(function (o) { return '<button type="button" class="rpt-chip' + (excl(o) && sel.indexOf(String(o)) < 0 ? ' is-excluded' : '') + '" data-v="' + esc(o) + '" aria-pressed="' + (sel.indexOf(String(o)) >= 0) + '"' + (excl(o) ? ' title="Excluido por otras selecciones"' : '') + '>' + esc(show(o)) + '</button>'; }).join('') + '</div>';
    } else if (mode === 'search') {
      h += '<label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" class="rpt-input" type="search" placeholder="' + esc(p.placeholder || 'Contiene\u2026') + '" value="' + esc(cur && cur.kind === 'text' ? cur.text : '') + '">';
    } else if (mode === 'range') {
      var t = f.type === 'date' ? 'date' : 'number';
      h += '<span class="rpt-filter-label" id="' + id + '">' + esc(label) + '</span><div class="rpt-filter-range" role="group" aria-labelledby="' + id + '">' +
        '<input class="rpt-input" type="' + t + '" data-k="min" aria-label="Desde" placeholder="Desde" value="' + esc(cur && cur.kind === 'range' ? cur.min || '' : '') + '"><span>\u2013</span>' +
        '<input class="rpt-input" type="' + t + '" data-k="max" aria-label="Hasta" placeholder="Hasta" value="' + esc(cur && cur.kind === 'range' ? cur.max || '' : '') + '"></div>';
    } else {
      var v0 = cur && cur.kind === 'in' && cur.values.length === 1 ? cur.values[0] : '';
      h += '<label for="' + id + '">' + esc(label) + '</label><select id="' + id + '" class="rpt-select"><option value="">Todos</option>' +
        opts.map(function (o) { return '<option value="' + esc(o) + '"' + (String(o) === v0 ? ' selected' : '') + (excl(o) ? ' class="is-excluded"' : '') + '>' + esc(show(o)) + (excl(o) ? ' (excluido)' : '') + '</option>'; }).join('') + '</select>';
    }
    el.innerHTML = h + '</div>';
    if (!ctx.interactive) return;
    var common = { source: ctx.srcId, part: part, page: p.sync === false ? ctx.page : null };
    var origin = ctx.id;
    if (mode === 'multi') el.querySelectorAll('.rpt-chip').forEach(function (b) { b.addEventListener('click', function () { toggleValue(p.field, b.getAttribute('data-v'), origin, true, common); }); });
    else if (mode === 'search') {
      var inp = el.querySelector('input'), tm;
      inp.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { setFilter({ source: common.source, page: common.page, field: p.field, kind: 'text', text: inp.value, origin: origin }); }, 250); });
    } else if (mode === 'range') {
      el.querySelectorAll('input').forEach(function (i) { i.addEventListener('change', function () { var a = el.querySelectorAll('input'); setFilter({ source: common.source, page: common.page, field: p.field, kind: 'range', min: a[0].value, max: a[1].value, origin: origin }); }); });
    } else {
      var s = el.querySelector('select');
      s.addEventListener('change', function () { setFilter({ source: common.source, page: common.page, part: part, field: p.field, kind: 'in', values: s.value ? [s.value] : [], origin: origin }); });
    }
  };

  function sparkline(rows, p) {
    var data = groupBy(rows, p.trendField, [p.field || p.trendField], p.agg).sort(function (a, b) { return cmpLabel(a.key, b.key); });
    if (data.length < 2) return null;
    var vals = data.map(function (d) { return d.values[0]; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), W = 120, H = 30, rg = mx - mn || 1;
    var pts = vals.map(function (v, i) { return [(i / (vals.length - 1)) * W, H - 3 - ((v - mn) / rg) * (H - 6)]; });
    var line = pts.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ');
    var last = vals[vals.length - 1], prev = vals[vals.length - 2];
    return {
      svg: '<svg class="rpt-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + line + ' L' + W + ',' + H + ' L0,' + H + ' Z" fill="var(--rpt-accent, var(--rpt-brand))" opacity=".12"/><path d="' + line + '" fill="none" stroke="var(--rpt-accent, var(--rpt-brand))" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>',
      delta: prev ? (last - prev) / Math.abs(prev) : null
    };
  }

  components.tile = function (el, p, src, ctx) {
    var value = p.value, cmp = null;
    if (src && p.field) {
      cmp = periodCompare(src.rows, p, src.allRows);
      value = formatField(src.fields, p.field, cmp ? cmp.value : aggregate(src.rows, p.field, p.agg), p.format);
    } else if (src && p.agg === 'count') value = format(src.rows.length, p.format || 'integer');
    var accent = ACCENTS[p.color] || p.color || ACCENTS.brand;
    var spark = src && p.trendField ? sparkline(src.rows, p) : null;
    var sub = p.subtitle ? '<span>' + esc(p.subtitle) + '</span>' : '';
    if (cmp) sub = deltaBadge(cmp.delta, p.goodWhen) + '<span>' + esc(formatKey(cmp.cur, cmp.grain)) + (cmp.prevValue == null ? ' \u00b7 sin datos de ' + esc(formatKey(cmp.prev, cmp.grain)) : ' vs ' + esc(formatKey(cmp.prev, cmp.grain))) + '</span>' + sub;
    else if (spark && spark.delta != null && isFinite(spark.delta)) sub = deltaBadge(spark.delta, p.goodWhen) + '<span>vs anterior</span>' + sub;
    el.innerHTML = '<div class="rpt-card rpt-tile" style="--rpt-accent:' + esc(accent) + '">' + (ctx.interactive && src ? menuBtn(true) : '') +
      (p.icon && ICONS[p.icon] ? '<div class="rpt-tile-icon"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[p.icon] + '</svg></div>' : '') +
      '<div class="rpt-tile-body"><div class="rpt-tile-label">' + esc(p.title || '') + '</div>' +
      '<div class="rpt-tile-value" title="' + esc(value) + '">' + esc(value == null ? '\u2014' : value) + '</div>' +
      (sub ? '<div class="rpt-tile-sub">' + sub + '</div>' : '') + (spark ? spark.svg : '') + '</div></div>';
    if (src) el.__rptExport = { title: p.title || 'Loseta', detail: detailOf(src, src.rows), kpi: function () { return { label: p.title || '', value: String(value), sub: el.querySelector('.rpt-tile-sub') ? el.querySelector('.rpt-tile-sub').textContent : '' }; } };
  };

  components.kpi = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    var cmp = periodCompare(src.rows, p, src.allRows);
    var v = cmp ? cmp.value : p.field ? aggregate(src.rows, p.field, p.agg) : src.rows.length;
    var fmt = p.format || fieldMeta(src.fields, p.field).format;
    var target = p.targetField ? aggregate(src.rows, p.targetField, p.targetAgg || p.agg) : toNum(p.target);
    var h = '<div class="rpt-card rpt-kpi">' + (ctx.interactive ? menuBtn(true) : '') + '<div class="rpt-kpi-label">' + esc(p.label || labelOf(src.fields, p.field)) + '</div>' +
      '<div class="rpt-kpi-value">' + esc(formatField(src.fields, p.field, v, fmt)) + '</div>';
    if (cmp) h += '<div class="rpt-kpi-meta">' + deltaBadge(cmp.delta, p.goodWhen) + '<span>' + esc(formatKey(cmp.cur, cmp.grain)) + ' vs ' + esc(formatKey(cmp.prev, cmp.grain)) + (cmp.prevValue != null ? ' (' + esc(format(cmp.prevValue, fmt)) + ')' : ' \u00b7 sin datos') + '</span></div>';
    if (!isNaN(target) && target) {
      var ratio = v / target, good = p.goodWhen !== 'lower' ? ratio >= 1 : ratio <= 1, delta = ratio - 1;
      h += '<div class="rpt-kpi-meta"><span class="rpt-badge ' + (good ? 'is-good' : 'is-bad') + '">' + (delta >= 0 ? '\u25b2 ' : '\u25bc ') + esc(format(Math.abs(delta), 'percent')) + '</span>' +
        '<span>Objetivo ' + esc(format(target, fmt)) + '</span></div>' +
        '<div class="rpt-progress ' + (good ? 'is-good' : 'is-bad') + '" role="progressbar" aria-label="Progreso hacia el objetivo" aria-valuenow="' + Math.round(ratio * 100) + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + Math.max(0, Math.min(100, ratio * 100)) + '%"></span></div>';
    } else if (p.caption && !cmp) h += '<div class="rpt-kpi-meta">' + esc(p.caption) + '</div>';
    el.innerHTML = h + '</div>';
    el.__rptExport = { title: p.label || 'Indicador', detail: detailOf(src, src.rows), kpi: function () { return { label: p.label || labelOf(src.fields, p.field), value: formatField(src.fields, p.field, v, fmt), sub: el.querySelector('.rpt-kpi-meta') ? el.querySelector('.rpt-kpi-meta').textContent : '' }; } };
  };

  components.gauge = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    var v = p.field ? aggregate(src.rows, p.field, p.agg) : src.rows.length;
    var fmt = p.format || fieldMeta(src.fields, p.field).format;
    var target = toNum(p.target);
    var min = toNum(p.min); if (isNaN(min)) min = 0;
    var max = toNum(p.max); if (isNaN(max) || max <= min) max = niceMax(Math.max(v || 0, isNaN(target) ? 0 : target) * 1.15);
    var ratio = Math.max(0, Math.min(1, ((v || 0) - min) / (max - min)));
    var good = isNaN(target) ? null : p.goodWhen === 'lower' ? v <= target : v >= target;
    var color = good == null ? 'var(--rpt-brand)' : good ? 'var(--rpt-success)' : 'var(--rpt-warning)';
    var cx = 110, cy = 110, r = 86, sw = 18;
    function pt(a, rr) { return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; }
    function arc(a0, a1) { var s = pt(a0, r), e = pt(a1, r); return 'M' + s[0].toFixed(1) + ',' + s[1].toFixed(1) + ' A' + r + ',' + r + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + e[0].toFixed(1) + ',' + e[1].toFixed(1); }
    var a0 = Math.PI, aV = Math.PI + ratio * Math.PI;
    var inner = '<path d="' + arc(a0, 2 * Math.PI - 0.0001) + '" fill="none" stroke="var(--rpt-stroke-2)" stroke-width="' + sw + '" stroke-linecap="round"/>';
    if (ratio > 0.002) inner += '<path d="' + arc(a0, aV) + '" fill="none" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
    if (!isNaN(target)) {
      var at = Math.PI + Math.max(0, Math.min(1, (target - min) / (max - min))) * Math.PI, t1 = pt(at, r - sw / 2 - 4), t2 = pt(at, r + sw / 2 + 4);
      inner += '<line x1="' + t1[0].toFixed(1) + '" y1="' + t1[1].toFixed(1) + '" x2="' + t2[0].toFixed(1) + '" y2="' + t2[1].toFixed(1) + '" stroke="var(--rpt-fg)" stroke-width="2.5"><title>Objetivo ' + esc(format(target, fmt)) + '</title></line>';
    }
    inner += '<text class="rpt-gauge-val" x="' + cx + '" y="' + (cy - 14) + '" text-anchor="middle">' + esc(format(v, compactFmt(fmt))) + '</text>' +
      '<text class="rpt-gauge-lbl" x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle">' + (isNaN(target) ? esc(format(ratio, 'percent')) : 'Objetivo ' + esc(format(target, compactFmt(fmt)))) + '</text>' +
      '<text class="rpt-gauge-lbl" x="' + (cx - r) + '" y="' + (cy + 22) + '" text-anchor="middle">' + esc(format(min, compactFmt(fmt))) + '</text>' +
      '<text class="rpt-gauge-lbl" x="' + (cx + r) + '" y="' + (cy + 22) + '" text-anchor="middle">' + esc(format(max, compactFmt(fmt))) + '</text>';
    el.innerHTML = '<div class="rpt-card rpt-gauge">' + head(p, ctx) + '<div class="rpt-chart-body">' + svgEl(220, 136, inner, (p.title || 'Indicador') + ': ' + format(v, fmt) + (isNaN(target) ? '' : ', objetivo ' + format(target, fmt))) + '</div></div>';
    el.__rptExport = { title: p.title || 'Gauge', detail: detailOf(src, src.rows), svg: function () { return el.querySelector('svg'); } };
  };

  /** Detecci\u00f3n de anomal\u00edas: residuo frente a la media de los vecinos, puntuaci\u00f3n z robusta. */
  function anomaliesOf(vals) {
    var n = vals.length;
    if (n < 6) return [];
    var res = vals.map(function (v, i) {
      var nb = [];
      for (var j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) if (j !== i) nb.push(vals[j]);
      var exp = nb.reduce(function (a, b) { return a + b; }, 0) / nb.length;
      return { i: i, v: v, exp: exp, r: v - exp };
    });
    var med = median(res.map(function (x) { return x.r; }));
    var mad = median(res.map(function (x) { return Math.abs(x.r - med); })) || 1e-9;
    return res.filter(function (x) { return Math.abs(0.6745 * (x.r - med) / mad) > 3.2 && Math.abs(x.r) > 0.15 * Math.abs(x.exp || 1); });
  }

  components.narrative = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    if (!p.field) return empty(el, 'Elige la medida a describir');
    var fmt = p.format || fieldMeta(src.fields, p.field).format || 'number';
    var name = (p.label || labelOf(src.fields, p.field)).toLowerCase();
    var rows = src.rows, total = aggregate(rows, p.field, p.agg, rows);
    var ps = [];
    var nf = Object.keys(state.filters).length;
    ps.push('El total de <b>' + esc(name) + '</b> es <b>' + esc(format(total, fmt)) + '</b>' + (nf ? ' con ' + nf + ' filtro' + (nf > 1 ? 's' : '') + ' aplicado' + (nf > 1 ? 's' : '') : '') + ', sobre ' + esc(format(rows.length, 'integer')) + ' registros.');
    if (p.timeField) {
      var grain = p.grain || null;
      var tkey = function (r) { var v = r[p.timeField]; return grain ? datePart(v, grain) : v == null ? null : String(v); };
      var series = groupBy(rows, tkey, [p.field], p.agg, rows).sort(function (a, b) { return cmpLabel(a.key, b.key); });
      if (series.length >= 2) {
        var last = series[series.length - 1], prev = series[series.length - 2], kind = keyKind(last.key);
        var d = prev.values[0] ? (last.values[0] - prev.values[0]) / Math.abs(prev.values[0]) : null;
        var lr = linreg(series.map(function (s) { return s.values[0]; }));
        var best = series.reduce(function (a, b) { return b.values[0] > a.values[0] ? b : a; });
        var txt = 'En <b>' + esc(formatKey(last.key, kind)) + '</b> fue <b>' + esc(format(last.values[0], fmt)) + '</b>';
        if (d != null && isFinite(d)) txt += ', <span class="' + (d >= 0 ? 'is-up' : 'is-down') + '">un ' + esc(format(Math.abs(d), 'percent')) + (d >= 0 ? ' m\u00e1s' : ' menos') + '</span> que en ' + esc(formatKey(prev.key, kind));
        txt += '. El mejor periodo fue <b>' + esc(formatKey(best.key, kind)) + '</b> (' + esc(format(best.values[0], fmt)) + ') y la tendencia general es <b>' + (Math.abs(lr.slope) < 0.01 * Math.abs(total / series.length) ? 'estable' : lr.slope > 0 ? 'al alza' : 'a la baja') + '</b>.';
        ps.push(txt);
        if (p.category) {
          var lastRows = last.rows, prevRows = prev.rows;
          var a = groupBy(lastRows, p.category, [p.field], p.agg, lastRows), b = groupBy(prevRows, p.category, [p.field], p.agg, prevRows);
          var bm = {}; b.forEach(function (x) { bm[x.key] = x.values[0]; });
          var diffs = a.map(function (x) { return { key: x.key, d: x.values[0] - (bm[x.key] || 0) }; }).sort(function (x, y) { return Math.abs(y.d) - Math.abs(x.d); });
          if (diffs.length && diffs[0].d) ps.push('El cambio respecto a ' + esc(formatKey(prev.key, kind)) + ' lo explica sobre todo <b>' + esc(diffs[0].key) + '</b> (<span class="' + (diffs[0].d >= 0 ? 'is-up' : 'is-down') + '">' + (diffs[0].d >= 0 ? '+' : '\u2212') + esc(format(Math.abs(diffs[0].d), compactFmt(fmt))) + '</span>).');
        }
        var an = anomaliesOf(series.map(function (s) { return s.values[0]; }));
        if (an.length) ps.push('Se detecta' + (an.length > 1 ? 'n ' + an.length + ' valores inusuales' : ' un valor inusual') + ' en ' + an.map(function (x) { return '<b>' + esc(formatKey(series[x.i].key, kind)) + '</b>'; }).join(', ') + '.');
      }
    }
    if (p.category) {
      var cats = groupBy(rows, p.category, [p.field], p.agg, rows).sort(function (x, y) { return y.values[0] - x.values[0]; });
      if (cats.length > 1 && total) {
        var catName = labelOf(src.fields, p.category).toLowerCase();
        ps.push('Por ' + esc(catName) + ', <b>' + esc(cats[0].key) + '</b> concentra el <b>' + esc(format(cats[0].values[0] / total, 'percent')) + '</b>, seguida de ' + esc(cats[1].key) + ' (' + esc(format(cats[1].values[0] / total, 'percent')) + '). La de menor peso es ' + esc(cats[cats.length - 1].key) + ' (' + esc(format(cats[cats.length - 1].values[0] / total, 'percent')) + ').');
      }
    }
    el.innerHTML = '<div class="rpt-card rpt-narrative">' + head(p, ctx) + '<div aria-live="polite">' + ps.map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div></div>';
    el.__rptExport = { title: p.title || 'Resumen', text: function () { return Array.prototype.map.call(el.querySelectorAll('.rpt-narrative p'), function (n) { return n.textContent; }); } };
  };

/* ---- 40-chart.js ---- */
  /* ---------- gr\u00e1ficos ---------- */
  var KIND = { column: 'Gr\u00e1fico de columnas', bar: 'Gr\u00e1fico de barras', line: 'Gr\u00e1fico de l\u00edneas', area: 'Gr\u00e1fico de \u00e1rea', donut: 'Gr\u00e1fico de donut', pie: 'Gr\u00e1fico de tarta', combo: 'Gr\u00e1fico combinado', waterfall: 'Gr\u00e1fico de cascada', funnel: 'Embudo' };
  var CMP_LABEL = { prev: 'Periodo anterior', yoy: 'A\u00f1o anterior' };

  /** Prepara los datos de un gr\u00e1fico: categor\u00eda (o jerarqu\u00eda), agregaci\u00f3n, orden, comparaci\u00f3n y modo asociativo. */
  function chartData(p, src, ctx, rowsOverride) {
    var rows = rowsOverride || src.rows;
    var acc = categoryAccess(p, rows, ctx, src.fields);
    var data = groupBy(acc.rows, acc.key, p.values, p.agg, acc.rows);
    var kind = data.length && data.every(function (d) { return keyKind(d.key) === keyKind(data[0].key); }) ? keyKind(data[0].key) : null;
    if (p.sort === 'desc') data.sort(function (a, b) { return b.values[0] - a.values[0]; });
    else if (p.sort === 'asc') data.sort(function (a, b) { return a.values[0] - b.values[0]; });
    else if (p.sort === 'label' || kind) data.sort(function (a, b) { return cmpLabel(a.key, b.key); });
    if (p.compare && kind) {
      var map = {};
      data.forEach(function (d) { map[d.key] = d.values; });
      if (p.compare === 'yoy') {
        var maxY = data.reduce(function (m, d) { return Math.max(m, +String(d.key).slice(0, 4)); }, 0);
        var years = uniq(data.map(function (d) { return String(d.key).slice(0, 4); }));
        if (years.length > 1 && kind !== 'year') data = data.filter(function (d) { return +String(d.key).slice(0, 4) === maxY; });
        data.forEach(function (d) { d.cmp = map[yoyKey(d.key, kind)] || null; d.cmpKey = yoyKey(d.key, kind); });
      } else data.forEach(function (d) { d.cmp = map[shiftKey(d.key, kind, -1)] || null; d.cmpKey = shiftKey(d.key, kind, -1); });
    }
    if (p.limit) data = data.slice(0, Number(p.limit));
    if (ctx.associative && src.allRows && src.allRows.length !== src.rows.length && !acc.hierarchy && !rowsOverride && !p.compare && !p.limit) {
      var present = {};
      data.forEach(function (d) { present[d.key] = 1; });
      var full = groupBy(src.allRows, acc.key, p.values, p.agg, src.allRows);
      full.forEach(function (d) { if (!present[d.key]) { d.excluded = true; data.push(d); } });
      if (kind || p.sort === 'label') data.sort(function (a, b) { return cmpLabel(a.key, b.key); });
    }
    data.forEach(function (d) { d.label = kind ? formatKey(d.key, kind) : d.key; });
    return { data: data, acc: acc, kind: kind };
  }

  function crumbs(acc) {
    if (!acc.hierarchy) return '';
    var h = '<nav class="rpt-crumbs" aria-label="Nivel de la jerarqu\u00eda"><button type="button" data-drill="0">' + esc(acc.hierarchy.label || acc.hierarchy.name) + '</button>';
    acc.path.forEach(function (k, i) { var lv = acc.hierarchy.levels[i]; h += '<span aria-hidden="true">\u203a</span><button type="button" data-drill="' + (i + 1) + '">' + esc(lv.part ? formatKey(k, lv.part) : k) + '</button>'; });
    h += '<span aria-hidden="true">\u203a</span><span class="rpt-crumb-cur">' + esc(acc.label) + '</span>';
    if (acc.canDrill) h += '<span>\u00b7 clic para profundizar</span>';
    if (acc.depth > 0) h += '<button type="button" data-drill="' + (acc.depth - 1) + '" aria-label="Subir un nivel">\u2191 Subir</button>';
    return h + '</nav>';
  }

  function makeMarks(p, sd, ctx) {
    var acc = sd.acc;
    var clickable = ctx.interactive && (p.crossFilter !== false || acc.canDrill);
    var f = clickable ? currentFilter(ctx.srcId, acc.field, acc.part) : null;
    var sel = f && f.origin === ctx.id && !acc.canDrill ? f.values : null;
    return {
      clickable: clickable,
      hint: !clickable ? '' : acc.canDrill ? '<small>Clic para profundizar</small>' : '<small>Clic para filtrar \u00b7 Ctrl+clic para varios</small>',
      attrs: function (d, label) {
        var cls = 'rpt-mark' + (clickable ? ' is-click' : '') + (d.excluded ? ' is-excluded' : sel ? (sel.indexOf(String(d.key)) >= 0 ? ' is-sel' : ' is-dim') : '');
        return ' class="' + cls + '"' + (clickable ? ' data-key="' + esc(d.key) + '" tabindex="0" role="button" aria-pressed="' + !!(sel && sel.indexOf(String(d.key)) >= 0) + '" aria-label="' + esc(label + (d.excluded ? ' (excluido)' : '')) + '"' : '');
      }
    };
  }
  function legendHtml(items, mk) {
    return '<div class="rpt-legend">' + items.map(function (it) {
      return '<span' + (it.key != null && mk && mk.clickable ? ' data-key="' + esc(it.key) + '" class="rpt-mark is-click" tabindex="0" role="button"' : '') + '><i class="' + (it.line ? 'is-line' : '') + (it.dash ? ' is-dash' : '') + '" style="' + (it.dash ? 'color:' : 'background:') + it.color + '"></i>' + esc(it.label) + (it.value != null ? ' <b>' + esc(it.value) + '</b>' : '') + '</span>';
    }).join('') + '</div>';
  }
  function chartSummary(kind, title, data, fmtFn) {
    var real = data.filter(function (d) { return !d.excluded; });
    if (!real.length) return (title || kind) + ': sin datos';
    var mx = real[0], mn = real[0];
    real.forEach(function (d) { if (d.values[0] > mx.values[0]) mx = d; if (d.values[0] < mn.values[0]) mn = d; });
    return kind + (title ? ': ' + title : '') + '. ' + real.length + ' categor\u00edas. M\u00e1ximo ' + mx.label + ' (' + fmtFn(mx.values[0]) + '), m\u00ednimo ' + mn.label + ' (' + fmtFn(mn.values[0]) + ').';
  }

  function drawPie(body, W, H, sd, p, src, ctx, o) {
    var pal = colors(p, ctx), mk = makeMarks(p, sd, ctx), fmt0 = p.format || fieldMeta(src.fields, p.values[0]).format || 'number';
    var data = sd.data, type = p.type;
    var size = Math.min(H, W, o.compact ? 160 : 240), r = size / 2, ir = type === 'donut' ? r * 0.62 : 0, cx = r, cy = r;
    var real = data.filter(function (d) { return !d.excluded; });
    var total = real.reduce(function (a, d) { return a + Math.max(0, d.values[0]); }, 0) || 1;
    var a0 = -Math.PI / 2, inner = '';
    real.forEach(function (d, i) {
      var v = Math.max(0, d.values[0]), a1 = a0 + (v / total) * Math.PI * 2;
      if (v / total >= 0.9999) a1 = a0 + Math.PI * 2 - 0.0001;
      var large = a1 - a0 > Math.PI ? 1 : 0;
      var p1 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p2 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
      var path = 'M' + p1 + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + p2;
      if (ir) { var p3 = [cx + ir * Math.cos(a1), cy + ir * Math.sin(a1)], p4 = [cx + ir * Math.cos(a0), cy + ir * Math.sin(a0)]; path += ' L' + p3 + ' A' + ir + ',' + ir + ' 0 ' + large + ' 0 ' + p4 + ' Z'; }
      else path += ' L' + cx + ',' + cy + ' Z';
      var txt = d.label + ': ' + format(d.values[0], fmt0) + ' (' + format(v / total, 'percent') + ')';
      inner += '<path' + mk.attrs(d, txt) + ' d="' + path + '" fill="' + pal[i % pal.length] + '" stroke="var(--rpt-surface)" stroke-width="2" data-tip="' + esc('<b>' + esc(d.label) + '</b>' + esc(format(d.values[0], fmt0)) + ' \u00b7 ' + esc(format(v / total, 'percent')) + mk.hint) + '"></path>';
      a0 = a1;
    });
    if (ir) inner += '<g class="rpt-donut-center"><text class="rpt-donut-total" x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle">' + esc(format(total, compactFmt(fmt0))) + '</text><text x="' + cx + '" y="' + (cy + 22) + '" text-anchor="middle">Total</text></g>';
    var items = real.map(function (d, i) { return { key: d.key, color: pal[i % pal.length], label: d.label, value: format(d.values[0] / total, 'percent') }; });
    data.filter(function (d) { return d.excluded; }).forEach(function (d) { items.push({ key: d.key, color: 'var(--rpt-stroke)', label: d.label + ' (excluido)' }); });
    body.innerHTML = '<div class="rpt-donut-layout"><div style="width:' + size + 'px">' + svgEl(size, size, inner, chartSummary(KIND[type], p.title, data, function (v) { return format(v, fmt0); })) + '</div>' + (o.compact ? '' : legendHtml(items, mk)) + '</div>';
  }

  function refValue(rl, vals) {
    var real = vals.filter(function (v) { return v != null && isFinite(v); });
    if (!real.length) return null;
    switch (rl.type) {
      case 'avg': return real.reduce(function (a, b) { return a + b; }, 0) / real.length;
      case 'min': return Math.min.apply(null, real);
      case 'max': return Math.max.apply(null, real);
      case 'median': return median(real);
      case 'target': return toNum(rl.value);
      default: return null;
    }
  }
  var REF_LABEL = { avg: 'Media', min: 'M\u00ednimo', max: 'M\u00e1ximo', median: 'Mediana', target: 'Objetivo', trend: 'Tendencia' };

  function drawXY(body, W, H, sd, p, src, ctx, o) {
    var pal = colors(p, ctx), mk = makeMarks(p, sd, ctx);
    var data = sd.data, type = p.type || 'column', series = p.values.length;
    var fmtOf = function (i) { return p.format || fieldMeta(src.fields, p.values[i]).format || 'number'; };
    var padL = o.compact ? 40 : 52, padB = o.compact ? 22 : 34, padT = 8;
    var isCombo = type === 'combo';
    var barIdx = isCombo ? [0] : type === 'column' ? p.values.map(function (_, i) { return i; }) : [];
    var lineIdx = isCombo ? p.values.map(function (_, i) { return i; }).slice(1) : type === 'column' ? [] : p.values.map(function (_, i) { return i; });
    var y2 = isCombo && p.y2 && lineIdx.length > 0;
    var padR = y2 ? 52 : (p.refLines && p.refLines.length ? 46 : 8);
    var stacked = !!p.stacked && type === 'column';
    var hasCmp = !!p.compare && data.some(function (d) { return d.cmp; });
    // Previsi\u00f3n (primera serie, categor\u00edas ordenadas).
    var fcN = Math.max(0, Math.min(24, Number(p.forecast) || 0));
    var realIdx = data.map(function (d, i) { return d.excluded ? -1 : i; }).filter(function (i) { return i >= 0; });
    var ys0 = realIdx.map(function (i) { return data[i].values[0]; });
    var fc = null;
    if (fcN && ys0.length >= 3) {
      var lr = linreg(ys0), lastKey = data[realIdx[realIdx.length - 1]].key;
      fc = [];
      for (var f = 1; f <= fcN; f++) {
        var x = ys0.length - 1 + f, yv = lr.intercept + lr.slope * x, band = 1.96 * lr.sd * Math.sqrt(1 + 1 / ys0.length + f / ys0.length);
        var fk = sd.kind ? shiftKey(lastKey, sd.kind, f) : '+' + f;
        fc.push({ key: fk, label: sd.kind ? formatKey(fk, sd.kind) : fk, v: Math.max(0, yv), lo: Math.max(0, yv - band), hi: yv + band });
      }
    }
    var slots = data.length + (fc ? fc.length : 0);
    var maxL = 0, maxR = 0;
    data.forEach(function (d) {
      if (stacked) maxL = Math.max(maxL, d.values.reduce(function (a, b) { return a + Math.max(0, b); }, 0));
      else barIdx.forEach(function (i) { maxL = Math.max(maxL, d.values[i]); });
      lineIdx.forEach(function (i) { if (y2) maxR = Math.max(maxR, d.values[i]); else maxL = Math.max(maxL, d.values[i]); });
      if (d.cmp) maxL = Math.max(maxL, d.cmp[0] || 0);
    });
    if (fc) fc.forEach(function (q) { maxL = Math.max(maxL, q.hi); });
    var refs = (p.refLines || []).filter(function (rl) { return rl && rl.type; }).map(function (rl) { return { rl: rl, v: rl.type === 'trend' ? null : refValue(rl, ys0) }; });
    refs.forEach(function (r) { if (r.v != null) maxL = Math.max(maxL, r.v); });
    maxL = o.maxV || niceMax(maxL); maxR = niceMax(maxR);
    var iw = W - padL - padR, ih = H - padB - padT, inner = '';
    var yOf = function (v, mx) { return padT + ih - (Math.max(0, v) / (mx || maxL)) * ih; };
    for (var g = 0; g <= 4; g++) {
      var gy = padT + ih - (ih * g) / 4;
      inner += '<line class="rpt-gridline" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '"></line><text x="' + (padL - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + esc(format((maxL * g) / 4, compactFmt(fmtOf(barIdx[0] || 0)))) + '</text>';
      if (y2) inner += '<text x="' + (W - padR + 6) + '" y="' + (gy + 4) + '">' + esc(format((maxR * g) / 4, compactFmt(fmtOf(lineIdx[0])))) + '</text>';
    }
    var band = iw / Math.max(1, slots), every = Math.ceil(slots / Math.max(1, Math.floor(iw / 64)));
    var xOf = function (i) { return padL + band * i + band / 2; };
    var allLabels = data.map(function (d) { return d.label; }).concat(fc ? fc.map(function (q) { return q.label; }) : []);
    allLabels.forEach(function (l, i) { if (i % every === 0) inner += '<text x="' + xOf(i) + '" y="' + (H - padB + 16) + '" text-anchor="middle">' + esc(truncate(l, Math.max(4, Math.floor((band * every) / 7)))) + '</text>'; });
    if (fc) inner += '<line class="rpt-gridline" x1="' + (padL + band * data.length) + '" x2="' + (padL + band * data.length) + '" y1="' + padT + '" y2="' + (padT + ih) + '" style="stroke-dasharray:3 3"></line>';
    var tipFor = function (d, s, v) {
      var t = '<b>' + esc(d.label) + '</b>' + esc(labelOf(src.fields, p.values[s])) + ': ' + esc(format(v, fmtOf(s)));
      if (s === 0 && d.cmp && d.cmp[0] != null) { var dd = d.cmp[0] ? (v - d.cmp[0]) / Math.abs(d.cmp[0]) : null; t += '<br>' + esc(CMP_LABEL[p.compare]) + ' (' + esc(formatKey(d.cmpKey, sd.kind)) + '): ' + esc(format(d.cmp[0], fmtOf(0))) + (dd != null ? ' \u00b7 ' + (dd >= 0 ? '\u25b2 ' : '\u25bc ') + esc(format(Math.abs(dd), 'percent')) : ''); }
      return t + mk.hint;
    };
    if (barIdx.length) {
      var gw = band * 0.7, nb = stacked ? 1 : barIdx.length, bw = gw / nb;
      data.forEach(function (d, i) {
        var acc0 = 0;
        if (hasCmp && d.cmp && !stacked) {
          var hc = (Math.max(0, d.cmp[0] || 0) / maxL) * ih;
          inner += '<rect class="rpt-ghost" x="' + (padL + band * i + (band - gw) / 2 - 3).toFixed(1) + '" y="' + (padT + ih - hc).toFixed(1) + '" width="' + Math.max(1, bw).toFixed(1) + '" height="' + hc.toFixed(1) + '" rx="2" fill="var(--rpt-fg-3)"><title>' + esc(CMP_LABEL[p.compare]) + ': ' + esc(format(d.cmp[0], fmtOf(0))) + '</title></rect>';
        }
        barIdx.forEach(function (s, j) {
          var v = d.values[s], h = (Math.max(0, v) / maxL) * ih;
          var x = padL + band * i + (band - gw) / 2 + (stacked ? 0 : bw * j), y = padT + ih - h - (stacked ? acc0 : 0);
          if (stacked) acc0 += h;
          inner += '<rect' + mk.attrs(d, d.label + ', ' + labelOf(src.fields, p.values[s]) + ': ' + format(v, fmtOf(s))) + ' x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(1, bw - (stacked ? 0 : 2)).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + pal[s % pal.length] + '" data-tip="' + esc(tipFor(d, s, v)) + '"></rect>';
        });
      });
    }
    if (hasCmp && !barIdx.length) {
      var cpts = data.map(function (d, i) { return d.cmp ? [xOf(i), yOf(d.cmp[0] || 0)] : null; });
      var cpath = '', started = false;
      cpts.forEach(function (pt) { if (!pt) { started = false; return; } cpath += (started ? 'L' : 'M') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1) + ' '; started = true; });
      inner += '<path d="' + cpath + '" fill="none" stroke="var(--rpt-fg-3)" stroke-width="1.8" stroke-dasharray="4 3"></path>';
    }
    lineIdx.forEach(function (s) {
      var mx = y2 ? maxR : maxL, col = pal[s % pal.length];
      var pts = [], path = '';
      data.forEach(function (d, i) { if (!d.excluded) pts.push([xOf(i), yOf(d.values[s], mx), d]); });
      path = pts.map(function (pt, i) { return (i ? 'L' : 'M') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1); }).join(' ');
      if (type === 'area' && pts.length) inner += '<path d="' + path + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + (padT + ih) + ' L' + pts[0][0].toFixed(1) + ',' + (padT + ih) + ' Z" fill="' + col + '" opacity=".16"></path>';
      inner += '<path d="' + path + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"></path>';
      data.forEach(function (d, i) {
        var cy = yOf(d.values[s], mx);
        inner += '<circle' + mk.attrs(d, d.label + ', ' + labelOf(src.fields, p.values[s]) + ': ' + format(d.values[s], fmtOf(s))) + ' cx="' + xOf(i).toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (data.length > 40 || o.compact ? 2.5 : 4) + '" fill="var(--rpt-surface)" stroke="' + (d.excluded ? 'var(--rpt-stroke)' : col) + '" stroke-width="2" data-tip="' + esc(tipFor(d, s, d.values[s])) + '"></circle>';
      });
    });
    if (fc) {
      var lastI = realIdx[realIdx.length - 1], base = [xOf(lastI), yOf(data[lastI].values[0])];
      var up = fc.map(function (q, k) { return [xOf(data.length + k), yOf(q.hi)]; }), lo = fc.map(function (q, k) { return [xOf(data.length + k), yOf(q.lo)]; });
      inner += '<path d="M' + base.join(',') + ' ' + up.map(function (q) { return 'L' + q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + ' ' + lo.reverse().map(function (q) { return 'L' + q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + ' Z" fill="' + pal[0] + '" opacity=".12"><title>Intervalo de confianza del 95 %</title></path>';
      inner += '<path class="rpt-forecast" d="M' + base.join(',') + ' ' + fc.map(function (q, k) { return 'L' + xOf(data.length + k).toFixed(1) + ',' + yOf(q.v).toFixed(1); }).join(' ') + '" fill="none" stroke="' + pal[0] + '" stroke-width="2"></path>';
      fc.forEach(function (q, k) { inner += '<circle cx="' + xOf(data.length + k).toFixed(1) + '" cy="' + yOf(q.v).toFixed(1) + '" r="3" fill="' + pal[0] + '" data-tip="' + esc('<b>' + esc(q.label) + ' (previsi\u00f3n)</b>' + esc(format(q.v, fmtOf(0))) + '<small>Intervalo 95 %: ' + esc(format(q.lo, compactFmt(fmtOf(0)))) + ' \u2013 ' + esc(format(q.hi, compactFmt(fmtOf(0)))) + '</small>') + '"></circle>'; });
    }
    refs.forEach(function (r, k) {
      var col = r.rl.color || ['var(--rpt-fg-2)', 'var(--rpt-warning)', 'var(--rpt-success)', 'var(--rpt-danger)'][k % 4];
      var lbl = r.rl.label || REF_LABEL[r.rl.type];
      if (r.rl.type === 'trend') {
        if (ys0.length < 2) return;
        var t = linreg(ys0), i0 = realIdx[0], i1 = realIdx[realIdx.length - 1];
        inner += '<line class="rpt-ref" x1="' + xOf(i0) + '" x2="' + xOf(i1) + '" y1="' + yOf(t.intercept) + '" y2="' + yOf(t.intercept + t.slope * (ys0.length - 1)) + '" stroke="' + col + '"><title>' + esc(lbl) + '</title></line>';
        inner += '<text class="rpt-ref-label" x="' + (xOf(i1) + 4) + '" y="' + (yOf(t.intercept + t.slope * (ys0.length - 1)) + 3) + '" style="fill:' + col + '">' + esc(lbl) + '</text>';
        return;
      }
      if (r.v == null) return;
      var yy = yOf(r.v);
      inner += '<line class="rpt-ref" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + col + '"><title>' + esc(lbl + ': ' + format(r.v, fmtOf(0))) + '</title></line>' +
        '<text class="rpt-ref-label" x="' + (W - padR + 3) + '" y="' + (yy + 3) + '" style="fill:' + col + '">' + esc(truncate(lbl, 8)) + '</text>';
    });
    if (p.anomalies && ys0.length >= 6) {
      anomaliesOf(ys0).forEach(function (a) {
        var i = realIdx[a.i], d = data[i], s0 = barIdx.length ? 0 : lineIdx[0];
        var cy = barIdx.length ? yOf(d.values[0]) - 6 : yOf(d.values[s0]);
        inner += '<circle class="rpt-anomaly" cx="' + xOf(i).toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="9"></circle>' +
          '<circle cx="' + xOf(i).toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="10" fill="transparent" data-tip="' + esc('<b>Valor inusual \u00b7 ' + esc(d.label) + '</b>' + esc(format(a.v, fmtOf(0))) + ' frente a ~' + esc(format(a.exp, fmtOf(0))) + ' esperado (' + (a.r >= 0 ? '+' : '\u2212') + esc(format(Math.abs(a.r / (a.exp || 1)), 'percent')) + ')') + '"></circle>';
      });
    }
    inner += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (padT + ih) + '" y2="' + (padT + ih) + '" style="stroke:var(--rpt-stroke)"></line>';
    var leg = [];
    if (series > 1 || hasCmp || fc) leg = p.values.map(function (v, s) { return { color: pal[s % pal.length], label: labelOf(src.fields, v) + (y2 && s > 0 ? ' (eje dcho.)' : ''), line: lineIdx.indexOf(s) >= 0 }; });
    if (hasCmp) leg.push({ color: 'var(--rpt-fg-3)', label: CMP_LABEL[p.compare], dash: !barIdx.length });
    if (fc) leg.push({ color: pal[0], label: 'Previsi\u00f3n (' + fc.length + ')', dash: true });
    body.innerHTML = svgEl(W, H, inner, chartSummary(KIND[type] || 'Gr\u00e1fico', p.title, data, function (v) { return format(v, fmtOf(0)); })) + (leg.length && !o.compact ? legendHtml(leg) : '');
  }

  function drawBar(body, W, H, sd, p, src, ctx, o) {
    var pal = colors(p, ctx), mk = makeMarks(p, sd, ctx), data = sd.data;
    var fmt0 = p.format || fieldMeta(src.fields, p.values[0]).format || 'number';
    var rowH = o.compact ? 22 : 28, padL = Math.min(170, Math.max(70, W * 0.3)), padR = 70, Ht = data.length * rowH + 4;
    var maxV = o.maxV || 0;
    if (!maxV) data.forEach(function (d) { maxV = Math.max(maxV, d.values[0], d.cmp ? d.cmp[0] || 0 : 0); });
    maxV = maxV || 1;
    var iw = W - padL - padR, inner = '';
    data.forEach(function (d, i) {
      var w = (Math.max(0, d.values[0]) / maxV) * iw, y = i * rowH + 4;
      var tipx = '<b>' + esc(d.label) + '</b>' + esc(format(d.values[0], fmt0));
      if (d.cmp) { var wc = (Math.max(0, d.cmp[0] || 0) / maxV) * iw; inner += '<rect class="rpt-ghost" x="' + padL + '" y="' + (y + rowH - 12) + '" width="' + Math.max(1, wc).toFixed(1) + '" height="3" fill="var(--rpt-fg-3)"></rect>'; tipx += '<br>' + esc(CMP_LABEL[p.compare]) + ': ' + esc(format(d.cmp[0], fmt0)); }
      inner += '<text x="' + (padL - 8) + '" y="' + (y + 15) + '" text-anchor="end">' + esc(truncate(d.label, Math.floor(padL / 6.5))) + '</text>' +
        '<rect' + mk.attrs(d, d.label + ': ' + format(d.values[0], fmt0)) + ' x="' + padL + '" y="' + y + '" width="' + Math.max(1, w).toFixed(1) + '" height="' + (rowH - 12) + '" rx="2" fill="' + pal[p.multicolor ? i % pal.length : 0] + '" data-tip="' + esc(tipx + mk.hint) + '"></rect>' +
        '<text x="' + (padL + w + 6).toFixed(1) + '" y="' + (y + 15) + '">' + esc(format(d.values[0], compactFmt(fmt0))) + '</text>';
    });
    body.innerHTML = svgEl(W, Ht, inner, chartSummary(KIND.bar, p.title, data, function (v) { return format(v, fmt0); }));
  }

  function drawWaterfall(body, W, H, sd, p, src, ctx, o) {
    var mk = makeMarks(p, sd, ctx), data = sd.data.filter(function (d) { return !d.excluded; });
    var fmt0 = p.format || fieldMeta(src.fields, p.values[0]).format || 'number';
    var steps = [], acc0 = 0;
    data.forEach(function (d) { var v = d.values[0]; steps.push({ d: d, from: acc0, to: acc0 + v, v: v }); acc0 += v; });
    if (p.total !== false) steps.push({ d: { key: '__total', label: p.totalLabel || 'Total', values: [acc0] }, from: 0, to: acc0, v: acc0, total: true });
    var lo = Math.min(0, Math.min.apply(null, steps.map(function (s) { return Math.min(s.from, s.to); }))), hi = niceMax(Math.max.apply(null, steps.map(function (s) { return Math.max(s.from, s.to); })));
    var padL = 56, padB = 34, padT = 8, padR = 8, iw = W - padL - padR, ih = H - padB - padT, inner = '';
    var yOf = function (v) { return padT + ih - ((v - lo) / (hi - lo || 1)) * ih; };
    for (var g = 0; g <= 4; g++) { var gv = lo + ((hi - lo) * g) / 4, gy = yOf(gv); inner += '<line class="rpt-gridline" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '"></line><text x="' + (padL - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + esc(format(gv, compactFmt(fmt0))) + '</text>'; }
    var band = iw / steps.length, bw = band * 0.62, every = Math.ceil(steps.length / Math.max(1, Math.floor(iw / 64)));
    steps.forEach(function (s, i) {
      var x = padL + band * i + (band - bw) / 2, y = yOf(Math.max(s.from, s.to)), h = Math.max(1, Math.abs(yOf(s.from) - yOf(s.to)));
      var col = s.total ? 'var(--rpt-fg-2)' : s.v >= 0 ? 'var(--rpt-brand)' : 'var(--rpt-danger)';
      var tipx = '<b>' + esc(s.d.label) + '</b>' + (s.total ? '' : (s.v >= 0 ? '+' : '') ) + esc(format(s.v, fmt0)) + (s.total ? '' : '<small>Acumulado: ' + esc(format(s.to, fmt0)) + '</small>');
      inner += '<rect' + (s.total ? ' class="rpt-mark"' : mk.attrs(s.d, s.d.label + ': ' + format(s.v, fmt0))) + ' x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + col + '" data-tip="' + esc(tipx) + '"></rect>';
      if (i < steps.length - 1 && !s.total) inner += '<line x1="' + (x + bw) + '" x2="' + (x + band) + '" y1="' + yOf(s.to) + '" y2="' + yOf(s.to) + '" style="stroke:var(--rpt-fg-3);stroke-dasharray:2 2"></line>';
      if (i % every === 0) inner += '<text x="' + (x + bw / 2) + '" y="' + (H - padB + 16) + '" text-anchor="middle">' + esc(truncate(s.d.label, Math.max(4, Math.floor((band * every) / 7)))) + '</text>';
    });
    inner += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + yOf(0) + '" y2="' + yOf(0) + '" style="stroke:var(--rpt-stroke)"></line>';
    body.innerHTML = svgEl(W, H, inner, KIND.waterfall + (p.title ? ': ' + p.title : '') + '. Total ' + format(acc0, fmt0) + '.');
  }

  function drawFunnel(body, W, H, sd, p, src, ctx, o) {
    var pal = colors(p, ctx), mk = makeMarks(p, sd, ctx), data = sd.data.filter(function (d) { return !d.excluded; });
    if (!p.sort) data.sort(function (a, b) { return b.values[0] - a.values[0]; });
    var fmt0 = p.format || fieldMeta(src.fields, p.values[0]).format || 'number';
    var rowH = Math.max(30, Math.min(48, (H - 10) / Math.max(1, data.length))), first = data.length ? data[0].values[0] || 1 : 1, maxV = Math.max.apply(null, data.map(function (d) { return d.values[0]; }).concat([1]));
    var labW = Math.min(150, W * 0.28), iw = W - labW - 8, inner = '';
    data.forEach(function (d, i) {
      var w = Math.max(2, (d.values[0] / maxV) * iw), x = labW + (iw - w) / 2, y = i * rowH + 2;
      var prev = i ? data[i - 1].values[0] : null, conv = prev ? d.values[0] / prev : null;
      var tipx = '<b>' + esc(d.label) + '</b>' + esc(format(d.values[0], fmt0)) + '<br>' + esc(format(d.values[0] / first, 'percent')) + ' del inicio' + (conv != null ? '<br>Conversi\u00f3n desde la etapa anterior: ' + esc(format(conv, 'percent')) : '');
      inner += '<text x="' + (labW - 8) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end">' + esc(truncate(d.label, Math.floor(labW / 6.5))) + '</text>' +
        '<rect' + mk.attrs(d, d.label + ': ' + format(d.values[0], fmt0)) + ' x="' + x.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + (rowH - 6) + '" rx="3" fill="' + pal[i % pal.length] + '" data-tip="' + esc(tipx + mk.hint) + '"></rect>' +
        '<text x="' + (labW + iw / 2) + '" y="' + (y + rowH / 2 + 3) + '" text-anchor="middle" style="fill:#fff;font-weight:600">' + esc(format(d.values[0], compactFmt(fmt0))) + (i ? ' \u00b7 ' + esc(format(d.values[0] / first, 'percent')) : '') + '</text>';
    });
    body.innerHTML = svgEl(W, data.length * rowH + 4, inner, KIND.funnel + (p.title ? ': ' + p.title : '') + '. ' + data.length + ' etapas.');
  }

  function drawChartInto(body, W, H, sd, p, src, ctx, o) {
    if (!sd.data.length) { body.innerHTML = '<div class="rpt-empty">Sin datos</div>'; return; }
    var type = p.type || 'column';
    if (type === 'donut' || type === 'pie') return drawPie(body, W, H, sd, p, src, ctx, o);
    if (type === 'bar') return drawBar(body, W, H, sd, p, src, ctx, o);
    if (type === 'waterfall') return drawWaterfall(body, W, H, sd, p, src, ctx, o);
    if (type === 'funnel') return drawFunnel(body, W, H, sd, p, src, ctx, o);
    return drawXY(body, W, H, sd, p, src, ctx, o);
  }

  components.chart = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    if (!p.category || !(p.values && p.values.length)) return empty(el, 'Elige campo de categor\u00eda y de valor');
    var height = Number(p.height) || 260;
    var sd = chartData(p, src, ctx);
    var fmtOf = function (i) { return p.format || fieldMeta(src.fields, p.values[i]).format || 'number'; };
    el.innerHTML = '<div class="rpt-card rpt-chart">' + head(p, ctx) + crumbs(sd.acc) + '<div class="rpt-chart-body"></div></div>';
    var body = el.querySelector('.rpt-chart-body');
    var panels = null;
    if (p.splitBy) {
      var groups = groupBy(src.rows, p.splitBy, [p.values[0]], p.agg).sort(function (a, b) { return b.values[0] - a.values[0]; }).slice(0, Number(p.splitLimit) || 12);
      panels = groups.map(function (g) { return { key: g.key, total: g.values[0], sd: chartData(p, src, ctx, g.rows) }; });
    }
    function draw() {
      var W = Math.max(200, Math.floor(body.clientWidth || 400));
      if (!panels) return drawChartInto(body, W, height, sd, p, src, ctx, {});
      var maxV = 0;
      panels.forEach(function (pn) { pn.sd.data.forEach(function (d) { maxV = Math.max(maxV, p.stacked ? d.values.reduce(function (a, b) { return a + b; }, 0) : Math.max.apply(null, d.values)); }); });
      maxV = niceMax(maxV);
      body.innerHTML = '<div class="rpt-sm-grid" style="--rpt-sm-min:' + (Number(p.panelWidth) || 220) + 'px">' + panels.map(function (pn, i) {
        return '<div class="rpt-sm-panel"><h4><span' + (ctx.interactive ? ' class="rpt-mark is-click" data-key="__split__' + esc(pn.key) + '" role="button" tabindex="0"' : '') + ' style="color:var(--rpt-fg)">' + esc(pn.key) + '</span><span>' + esc(format(pn.total, compactFmt(fmtOf(0)))) + '</span></h4><div class="rpt-sm-body" data-i="' + i + '"></div></div>';
      }).join('') + '</div>';
      body.querySelectorAll('.rpt-sm-body').forEach(function (b) {
        var pn = panels[+b.getAttribute('data-i')];
        drawChartInto(b, Math.max(160, b.clientWidth || 200), Number(p.panelHeight) || 150, pn.sd, p, src, ctx, { compact: true, maxV: maxV });
      });
    }
    draw();
    el.__rptOnKey = ctx.interactive ? function (key, e) {
      if (String(key).indexOf('__split__') === 0) return toggleValue(p.splitBy, String(key).slice(9), ctx.id, e && (e.ctrlKey || e.metaKey), { source: ctx.srcId, page: ctx.page });
      if (sd.acc.canDrill) { state.drill[ctx.id] = sd.acc.path.concat([String(key)]); emit(); refresh(); return; }
      if (p.crossFilter === false || key === '__total') return;
      toggleValue(sd.acc.field, key, ctx.id, e && (e.ctrlKey || e.metaKey), { source: ctx.srcId, part: sd.acc.part, page: ctx.page });
    } : null;
    el.__rptOnDrill = function (depth) { state.drill[ctx.id] = (state.drill[ctx.id] || []).slice(0, depth); emit(); refresh(); };
    el.__rptExport = {
      title: p.title || 'Gr\u00e1fico', expand: true,
      svg: function () { return body.querySelector('svg'); },
      table: function () {
        var columns = [{ name: '_k', label: sd.acc.label }].concat(p.values.map(function (v, i) { return { name: '_' + i, label: labelOf(src.fields, v), type: 'number', format: fmtOf(i) }; }));
        if (p.compare) columns.push({ name: '_c', label: CMP_LABEL[p.compare], type: 'number', format: fmtOf(0) });
        return { columns: columns, rows: sd.data.filter(function (d) { return !d.excluded; }).map(function (d) { var o = { _k: d.label }; d.values.forEach(function (v, i) { o['_' + i] = v; }); if (p.compare) o._c = d.cmp ? d.cmp[0] : null; return o; }) };
      },
      detail: detailOf(src, sd.acc.rows)
    };
    observe(el, body, draw);
  };

  components.scatter = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    if (!p.x || !p.y) return empty(el, 'Elige los campos X e Y');
    var pal = colors(p, ctx);
    var groups = p.color ? uniq(src.rows.map(function (r) { return r[p.color]; })) : [null];
    var clickable = ctx.interactive && p.color && p.crossFilter !== false;
    var cf = clickable ? currentFilter(ctx.srcId, p.color) : null;
    var sel = cf && cf.origin === ctx.id ? cf.values : null;
    el.innerHTML = '<div class="rpt-card rpt-chart">' + head(p, ctx) + '<div class="rpt-chart-body"></div></div>';
    var body = el.querySelector('.rpt-chart-body');
    var height = Number(p.height) || 280;
    var xs = src.rows.map(function (r) { return toNum(r[p.x]); }).filter(function (v) { return !isNaN(v); });
    var ys = src.rows.map(function (r) { return toNum(r[p.y]); }).filter(function (v) { return !isNaN(v); });
    var maxS = p.size ? Math.max.apply(null, src.rows.map(function (r) { return toNum(r[p.size]) || 0; }).concat([1])) : 1;
    function draw() {
      var W = Math.max(220, Math.floor(body.clientWidth || 400)), H = height, padL = 52, padB = 36, padT = 10, padR = 12;
      if (!xs.length) { body.innerHTML = '<div class="rpt-empty">Sin datos</div>'; return; }
      var minX = Math.min(0, Math.min.apply(null, xs)), maxX = niceMax(Math.max.apply(null, xs)), minY = Math.min(0, Math.min.apply(null, ys)), maxY = niceMax(Math.max.apply(null, ys));
      var iw = W - padL - padR, ih = H - padT - padB, inner = '';
      var fx = function (v) { return padL + ((v - minX) / (maxX - minX || 1)) * iw; }, fy = function (v) { return padT + ih - ((v - minY) / (maxY - minY || 1)) * ih; };
      for (var g = 0; g <= 4; g++) {
        var gy = padT + ih - (ih * g) / 4, gx = padL + (iw * g) / 4;
        inner += '<line class="rpt-gridline" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '"></line><text x="' + (padL - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + esc(format(minY + ((maxY - minY) * g) / 4, 'compact')) + '</text>';
        inner += '<text x="' + gx + '" y="' + (H - padB + 16) + '" text-anchor="middle">' + esc(format(minX + ((maxX - minX) * g) / 4, 'compact')) + '</text>';
      }
      inner += '<text x="' + (padL + iw / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + esc(labelOf(src.fields, p.x)) + '</text>';
      src.rows.forEach(function (r) {
        var x = toNum(r[p.x]), y = toNum(r[p.y]); if (isNaN(x) || isNaN(y)) return;
        var gi = p.color ? groups.indexOf(r[p.color]) : 0, key = p.color ? String(r[p.color]) : null;
        var rad = p.size ? 4 + Math.sqrt((toNum(r[p.size]) || 0) / maxS) * 12 : 5;
        var lab = (p.label ? r[p.label] + ' \u00b7 ' : '') + labelOf(src.fields, p.x) + ': ' + formatField(src.fields, p.x, x) + ', ' + labelOf(src.fields, p.y) + ': ' + formatField(src.fields, p.y, y);
        var cls = 'rpt-mark' + (clickable ? ' is-click' : '') + (sel ? (sel.indexOf(key) >= 0 ? ' is-sel' : ' is-dim') : '');
        inner += '<circle class="' + cls + '"' + (clickable ? ' data-key="' + esc(key) + '" tabindex="0" role="button" aria-label="' + esc(lab) + '"' : '') + ' cx="' + fx(x).toFixed(1) + '" cy="' + fy(y).toFixed(1) + '" r="' + rad.toFixed(1) + '" fill="' + pal[gi % pal.length] + '" fill-opacity=".7" stroke="' + pal[gi % pal.length] + '" data-tip="' + esc('<b>' + esc(p.label ? r[p.label] : (key || '')) + '</b>' + esc(labelOf(src.fields, p.x)) + ': ' + esc(formatField(src.fields, p.x, x)) + '<br>' + esc(labelOf(src.fields, p.y)) + ': ' + esc(formatField(src.fields, p.y, y)) + (p.size ? '<br>' + esc(labelOf(src.fields, p.size)) + ': ' + esc(formatField(src.fields, p.size, r[p.size])) : '')) + '"></circle>';
      });
      body.innerHTML = svgEl(W, H, inner, 'Gr\u00e1fico de dispersi\u00f3n' + (p.title ? ': ' + p.title : '') + '. ' + xs.length + ' puntos.') +
        (p.color ? '<div class="rpt-legend">' + groups.map(function (gk, i) { return '<span><i style="background:' + pal[i % pal.length] + '"></i>' + esc(gk) + '</span>'; }).join('') + '</div>' : '');
    }
    draw();
    el.__rptOnKey = clickable ? function (key, e) { toggleValue(p.color, key, ctx.id, e && (e.ctrlKey || e.metaKey), { source: ctx.srcId, page: ctx.page }); } : null;
    el.__rptExport = { title: p.title || 'Dispersi\u00f3n', expand: true, svg: function () { return body.querySelector('svg'); }, table: function () { return { columns: cols(src.fields, [p.label, p.color, p.x, p.y, p.size].filter(Boolean)), rows: src.rows }; } };
    observe(el, body, draw);
  };

/* ---- 50-viz.js ---- */
  /* ---------- visualizaciones avanzadas ---------- */
  components.waterfall = function (el, p, src, ctx) { components.chart(el, Object.assign({}, p, { type: 'waterfall' }), src, ctx); };
  components.funnel = function (el, p, src, ctx) { components.chart(el, Object.assign({}, p, { type: 'funnel' }), src, ctx); };

  function scaleColor(t) { return 'color-mix(in srgb, var(--rpt-brand) ' + Math.round(12 + t * 88) + '%, var(--rpt-stroke-2))'; }
  function scaleLegend(min, max, fmt) {
    return '<div class="rpt-scale"><span>' + esc(format(min, compactFmt(fmt))) + '</span><i style="background:linear-gradient(90deg,' + scaleColor(0) + ',' + scaleColor(1) + ')"></i><span>' + esc(format(max, compactFmt(fmt))) + '</span></div>';
  }

  /* --- mapa de coropletas --- */
  var MAPS = {}, mapWaiters = [], mapsLoading = false;
  function registerMap(name, def) {
    def.index = {};
    def.features.forEach(function (f) { (f.aliases || [norm(f.name)]).forEach(function (a) { def.index[a] = f; }); });
    MAPS[name] = def;
    var w = mapWaiters; mapWaiters = [];
    w.forEach(function (fn) { try { fn(); } catch (e) { /* noop */ } });
  }
  function loadMaps(cb) {
    mapWaiters.push(cb);
    if (mapsLoading) return;
    mapsLoading = true;
    var s = document.createElement('script');
    s.src = BASE + 'maps/es.js';
    s.onerror = function () { mapsLoading = false; };
    document.head.appendChild(s);
  }
  function findFeature(def, name) {
    var n = norm(name);
    return def.index[n] || def.index[n.replace(/^(comunidad foral de|comunidad de|comunitat|principado de|region de|ciudad autonoma de|illes|islas)\s+/, '')] || null;
  }
  components.map = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    if (!p.field || !p.value) return empty(el, 'Elige el campo de lugar y el valor');
    var geo = p.geo || 'es-comunidades', def = MAPS[geo];
    if (!def) {
      el.innerHTML = '<div class="rpt-card rpt-map">' + head(p, ctx) + '<div class="rpt-empty">Cargando mapa\u2026</div></div>';
      loadMaps(function () { if (document.body.contains(el)) renderComponent(el, 'map', p, el.__rptView, { interactive: ctx.interactive, id: ctx.id, srcId: ctx.srcId, page: ctx.page, viewReady: true }); });
      return;
    }
    var fmt = p.format || fieldMeta(src.fields, p.value).format || 'number';
    var data = groupBy(src.rows, p.field, [p.value], p.agg, src.rows);
    var byFeature = {}, unmatched = [];
    data.forEach(function (d) { var f = findFeature(def, d.key); if (f) byFeature[f.id] = d; else unmatched.push(d.key); });
    var vals = data.map(function (d) { return d.values[0]; }), mn = Math.min.apply(null, vals.concat([0])), mx = Math.max.apply(null, vals.concat([0])) || 1;
    var clickable = ctx.interactive && p.crossFilter !== false;
    var cf = clickable ? currentFilter(ctx.srcId, p.field) : null;
    var sel = cf && cf.origin === ctx.id ? cf.values : null;
    var inner = '';
    def.features.forEach(function (f) {
      var d = byFeature[f.id];
      if (!d) { inner += '<path d="' + f.d + '" fill="var(--rpt-stroke-2)" stroke="var(--rpt-surface)" stroke-width=".7"><title>' + esc(f.name) + ': sin datos</title></path>'; return; }
      var t = (d.values[0] - mn) / ((mx - mn) || 1);
      var cls = 'rpt-mark' + (clickable ? ' is-click' : '') + (sel ? (sel.indexOf(String(d.key)) >= 0 ? ' is-sel' : ' is-dim') : '');
      var tipx = '<b>' + esc(f.name) + '</b>' + esc(labelOf(src.fields, p.value)) + ': ' + esc(format(d.values[0], fmt)) + (clickable ? '<small>Clic para filtrar</small>' : '');
      inner += '<path class="' + cls + '"' + (clickable ? ' data-key="' + esc(d.key) + '" tabindex="0" role="button" aria-label="' + esc(f.name + ': ' + format(d.values[0], fmt)) + '"' : '') + ' d="' + f.d + '" fill="' + scaleColor(t) + '" data-tip="' + esc(tipx) + '"></path>';
    });
    if (def.border) inner += '<path class="rpt-map-border" d="' + def.border + '"></path>';
    var vb = def.viewBox.split(' ');
    el.innerHTML = '<div class="rpt-card rpt-map">' + head(p, ctx) + '<div class="rpt-chart-body">' +
      '<svg viewBox="' + def.viewBox + '" width="' + vb[2] + '" height="' + vb[3] + '" role="img" aria-label="' + esc('Mapa' + (p.title ? ': ' + p.title : '') + '. ' + data.length + ' zonas con datos.') + '">' + inner + '</svg>' +
      scaleLegend(mn, mx, fmt) + (unmatched.length ? '<div class="rpt-note">Sin ubicar en el mapa: ' + esc(unmatched.slice(0, 6).join(', ')) + (unmatched.length > 6 ? '\u2026' : '') + '</div>' : '') + '</div></div>';
    el.__rptOnKey = clickable ? function (key, e) { toggleValue(p.field, key, ctx.id, e && (e.ctrlKey || e.metaKey), { source: ctx.srcId, page: ctx.page }); } : null;
    el.__rptExport = { title: p.title || 'Mapa', expand: true, svg: function () { return el.querySelector('svg'); }, table: function () { return { columns: [{ name: '_k', label: labelOf(src.fields, p.field) }, { name: '_v', label: labelOf(src.fields, p.value), type: 'number', format: fmt }], rows: data.map(function (d) { return { _k: d.key, _v: d.values[0] }; }) }; } };
  };

  /* --- treemap (squarified) --- */
  function squarify(items, x, y, w, h) {
    var out = [], total = items.reduce(function (a, b) { return a + b.v; }, 0);
    if (!total || !items.length) return out;
    var scale = (w * h) / total;
    var rest = items.map(function (it) { return { it: it, a: it.v * scale }; });
    function worst(row, len) { var s = 0, mx = 0, mn = Infinity; row.forEach(function (r) { s += r.a; mx = Math.max(mx, r.a); mn = Math.min(mn, r.a); }); var s2 = s * s, l2 = len * len; return Math.max((l2 * mx) / s2, s2 / (l2 * mn)); }
    while (rest.length) {
      var len = Math.min(w, h), row = [rest[0]], i = 1;
      while (i < rest.length && worst(row.concat([rest[i]]), len) <= worst(row, len)) { row.push(rest[i]); i++; }
      var sum = row.reduce(function (a, b) { return a + b.a; }, 0);
      if (w >= h) { var cw = sum / h, cy = y; row.forEach(function (r) { var rh = r.a / cw; out.push({ it: r.it, x: x, y: cy, w: cw, h: rh }); cy += rh; }); x += cw; w -= cw; }
      else { var rh2 = sum / w, cx = x; row.forEach(function (r) { var rw = r.a / rh2; out.push({ it: r.it, x: cx, y: y, w: rw, h: rh2 }); cx += rw; }); y += rh2; h -= rh2; }
      rest = rest.slice(row.length);
    }
    return out;
  }
  components.treemap = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    if (!p.category || !p.value) return empty(el, 'Elige categor\u00eda y valor');
    var pal = colors(p, ctx), fmt = p.format || fieldMeta(src.fields, p.value).format || 'number';
    el.innerHTML = '<div class="rpt-card rpt-chart">' + head(p, ctx) + '<div class="rpt-chart-body"></div></div>';
    var body = el.querySelector('.rpt-chart-body'), H = Number(p.height) || 300;
    var clickable = ctx.interactive && p.crossFilter !== false;
    var cf = clickable ? currentFilter(ctx.srcId, p.category) : null, sel = cf && cf.origin === ctx.id ? cf.values : null;
    var total = aggregate(src.rows, p.value, p.agg, src.rows) || 1;
    function draw() {
      var W = Math.max(200, Math.floor(body.clientWidth || 400)), inner = '';
      var rects = [];
      if (p.group) {
        var gs = groupBy(src.rows, p.group, [p.value], p.agg, src.rows).filter(function (g) { return g.values[0] > 0; }).sort(function (a, b) { return b.values[0] - a.values[0]; });
        squarify(gs.map(function (g, i) { return { key: g.key, v: g.values[0], rows: g.rows, color: pal[i % pal.length] }; }), 0, 0, W, H).forEach(function (gr) {
          inner += '<rect x="' + gr.x + '" y="' + gr.y + '" width="' + gr.w + '" height="' + gr.h + '" fill="none" stroke="var(--rpt-surface)" stroke-width="3"></rect>';
          var items = groupBy(gr.it.rows, p.category, [p.value], p.agg, src.rows).filter(function (d) { return d.values[0] > 0; }).sort(function (a, b) { return b.values[0] - a.values[0]; });
          squarify(items.map(function (d) { return { key: d.key, v: d.values[0], color: gr.it.color, group: gr.it.key }; }), gr.x + 2, gr.y + 16, Math.max(0, gr.w - 4), Math.max(0, gr.h - 18)).forEach(function (r) { rects.push(r); });
          if (gr.w > 50) inner += '<text x="' + (gr.x + 4) + '" y="' + (gr.y + 12) + '" style="font-weight:600;fill:var(--rpt-fg-2)">' + esc(truncate(gr.it.key, Math.floor(gr.w / 7))) + '</text>';
        });
      } else {
        var items2 = groupBy(src.rows, p.category, [p.value], p.agg, src.rows).filter(function (d) { return d.values[0] > 0; }).sort(function (a, b) { return b.values[0] - a.values[0]; });
        rects = squarify(items2.map(function (d, i) { return { key: d.key, v: d.values[0], color: pal[i % pal.length] }; }), 0, 0, W, H);
      }
      rects.forEach(function (r) {
        var k = r.it.key, cls = 'rpt-mark' + (clickable ? ' is-click' : '') + (sel ? (sel.indexOf(String(k)) >= 0 ? ' is-sel' : ' is-dim') : '');
        var tipx = '<b>' + esc(k) + '</b>' + (r.it.group ? esc(r.it.group) + '<br>' : '') + esc(format(r.it.v, fmt)) + ' \u00b7 ' + esc(format(r.it.v / total, 'percent'));
        inner += '<rect class="' + cls + '"' + (clickable ? ' data-key="' + esc(k) + '" tabindex="0" role="button" aria-label="' + esc(k + ': ' + format(r.it.v, fmt)) + '"' : '') + ' x="' + r.x.toFixed(1) + '" y="' + r.y.toFixed(1) + '" width="' + Math.max(0, r.w - 1).toFixed(1) + '" height="' + Math.max(0, r.h - 1).toFixed(1) + '" fill="' + r.it.color + '" fill-opacity="' + (p.group ? 0.55 + 0.45 * Math.min(1, r.it.v / (rects[0].it.v || 1)) : 1) + '" data-tip="' + esc(tipx) + '"></rect>';
        if (r.w > 54 && r.h > 30) inner += '<text x="' + (r.x + 6) + '" y="' + (r.y + 16) + '" style="fill:#fff;font-weight:600;pointer-events:none">' + esc(truncate(k, Math.floor(r.w / 7))) + '</text><text x="' + (r.x + 6) + '" y="' + (r.y + 30) + '" style="fill:#fff;opacity:.9;pointer-events:none">' + esc(format(r.it.v, compactFmt(fmt))) + '</text>';
      });
      body.innerHTML = svgEl(W, H, inner, 'Mapa de \u00e1rbol' + (p.title ? ': ' + p.title : '') + '. ' + rects.length + ' elementos.');
    }
    draw();
    el.__rptOnKey = clickable ? function (key, e) { toggleValue(p.category, key, ctx.id, e && (e.ctrlKey || e.metaKey), { source: ctx.srcId, page: ctx.page }); } : null;
    el.__rptExport = { title: p.title || 'Treemap', expand: true, svg: function () { return body.querySelector('svg'); }, detail: detailOf(src, src.rows) };
    observe(el, body, draw);
  };

  /* --- mapa de calor por calendario --- */
  components.calendar = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    if (!p.dateField || !p.value) return empty(el, 'Elige el campo de fecha y el valor');
    var fmt = p.format || fieldMeta(src.fields, p.value).format || 'number';
    var byDay = {};
    groupBy(src.rows, function (r) { return datePart(r[p.dateField], 'day'); }, [p.value], p.agg, src.rows).forEach(function (d) { byDay[d.key] = d.values[0]; });
    var years = uniq(Object.keys(byDay).map(function (k) { return k.slice(0, 4); })).sort().reverse().slice(0, Number(p.years) || 1);
    var vals = Object.keys(byDay).filter(function (k) { return years.indexOf(k.slice(0, 4)) >= 0; }).map(function (k) { return byDay[k]; });
    var mx = Math.max.apply(null, vals.concat([1]));
    var clickable = ctx.interactive && p.crossFilter !== false;
    el.innerHTML = '<div class="rpt-card rpt-chart">' + head(p, ctx) + '<div class="rpt-chart-body"></div></div>';
    var body = el.querySelector('.rpt-chart-body');
    var months = [], wd = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    for (var m = 0; m < 12; m++) months.push(new Intl.DateTimeFormat(config.locale, { month: 'short' }).format(new Date(2020, m, 1)));
    function draw() {
      var W = Math.max(260, Math.floor(body.clientWidth || 600)), cs = Math.max(7, Math.min(16, Math.floor((W - 30) / 54))), inner = '', yOff = 0;
      years.forEach(function (y) {
        var start = new Date(+y, 0, 1), dow = (start.getDay() + 6) % 7;
        inner += '<text x="0" y="' + (yOff + 12) + '" style="font-weight:600;fill:var(--rpt-fg-2)">' + y + '</text>';
        var top = yOff + 30;
        wd.forEach(function (l, i) { if (i % 2 === 0) inner += '<text x="0" y="' + (top + i * cs + cs - 2) + '">' + l + '</text>'; });
        var lastMonth = -1;
        for (var d = new Date(start); d.getFullYear() === +y; d.setDate(d.getDate() + 1)) {
          var idx = Math.floor((d - start) / 864e5) + dow, wk = Math.floor(idx / 7), day = idx % 7, k = isoDate(d), v = byDay[k];
          var x = 20 + wk * cs, yy = top + day * cs;
          if (d.getMonth() !== lastMonth && d.getDate() <= 7) { lastMonth = d.getMonth(); inner += '<text x="' + x + '" y="' + (top - 6) + '">' + esc(months[lastMonth]) + '</text>'; }
          var fill = v == null ? 'var(--rpt-stroke-2)' : scaleColor(v / mx);
          var tipx = '<b>' + esc(formatKey(k, 'day')) + '</b>' + (v == null ? 'Sin datos' : esc(format(v, fmt)));
          inner += '<rect' + (v != null && clickable ? ' class="rpt-mark is-click" data-key="' + k + '" tabindex="-1" role="button" aria-label="' + esc(formatKey(k, 'day') + ': ' + format(v, fmt)) + '"' : ' class="rpt-mark"') + ' x="' + x + '" y="' + yy + '" width="' + (cs - 2) + '" height="' + (cs - 2) + '" rx="2" fill="' + fill + '" data-tip="' + esc(tipx) + '"></rect>';
        }
        yOff = top + 7 * cs + 16;
      });
      body.innerHTML = svgEl(W, yOff, inner, 'Calendario' + (p.title ? ': ' + p.title : '') + ' ' + years.join(', ')) + scaleLegend(0, mx, fmt);
    }
    draw();
    el.__rptOnKey = clickable ? function (key, e) { toggleValue(p.dateField, key, ctx.id, e && (e.ctrlKey || e.metaKey), { source: ctx.srcId, part: 'day', page: ctx.page }); } : null;
    el.__rptExport = { title: p.title || 'Calendario', expand: true, svg: function () { return body.querySelector('svg'); }, table: function () { return { columns: [{ name: '_k', label: 'Fecha', type: 'date', format: 'date' }, { name: '_v', label: labelOf(src.fields, p.value), type: 'number', format: fmt }], rows: Object.keys(byDay).sort().map(function (k) { return { _k: k, _v: byDay[k] }; }) }; } };
    observe(el, body, draw);
  };

  /* --- bullet chart --- */
  components.bullet = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    if (!p.category || !p.value) return empty(el, 'Elige categor\u00eda y valor');
    var fmt = p.format || fieldMeta(src.fields, p.value).format || 'number';
    var data = groupBy(src.rows, p.category, [p.value].concat(p.targetField ? [p.targetField] : []), p.agg, src.rows);
    if (p.sort !== 'label') data.sort(function (a, b) { return b.values[0] - a.values[0]; });
    if (p.limit) data = data.slice(0, Number(p.limit));
    var ranges = (p.ranges && p.ranges.length ? p.ranges : [60, 90]).map(Number).sort(function (a, b) { return a - b; });
    var clickable = ctx.interactive && p.crossFilter !== false;
    el.innerHTML = '<div class="rpt-card rpt-chart">' + head(p, ctx) + '<div class="rpt-chart-body"></div></div>';
    var body = el.querySelector('.rpt-chart-body');
    function draw() {
      var W = Math.max(240, Math.floor(body.clientWidth || 400)), rowH = 34, padL = Math.min(160, W * 0.28), padR = 64, iw = W - padL - padR, inner = '';
      data.forEach(function (d, i) {
        var target = p.targetField ? d.values[1] : toNum(p.target);
        var mx = Math.max(d.values[0], isNaN(target) ? 0 : target) * 1.15 || 1, y = i * rowH + 4, sx = function (v) { return padL + (v / mx) * iw; };
        inner += '<text x="' + (padL - 8) + '" y="' + (y + 17) + '" text-anchor="end">' + esc(truncate(d.key, Math.floor(padL / 6.5))) + '</text>';
        if (!isNaN(target)) {
          var prevX = padL;
          ranges.concat([100 * mx / (target || 1)]).forEach(function (rg, k) {
            var x2 = sx(Math.min(mx, (rg / 100) * target));
            inner += '<rect x="' + prevX + '" y="' + y + '" width="' + Math.max(0, x2 - prevX) + '" height="' + (rowH - 10) + '" fill="var(--rpt-fg-3)" opacity="' + [0.32, 0.2, 0.1][k] + '"></rect>';
            prevX = x2;
          });
        }
        var good = isNaN(target) ? null : p.goodWhen === 'lower' ? d.values[0] <= target : d.values[0] >= target;
        var tipx = '<b>' + esc(d.key) + '</b>' + esc(format(d.values[0], fmt)) + (isNaN(target) ? '' : '<br>Objetivo: ' + esc(format(target, fmt)) + ' (' + esc(format(d.values[0] / target, 'percent')) + ')');
        inner += '<rect class="rpt-mark' + (clickable ? ' is-click' : '') + '"' + (clickable ? ' data-key="' + esc(d.key) + '" tabindex="0" role="button" aria-label="' + esc(d.key + ': ' + format(d.values[0], fmt)) + '"' : '') + ' x="' + padL + '" y="' + (y + 8) + '" width="' + Math.max(1, sx(d.values[0]) - padL).toFixed(1) + '" height="' + (rowH - 26) + '" fill="' + (good === false ? 'var(--rpt-warning)' : 'var(--rpt-brand)') + '" data-tip="' + esc(tipx) + '"></rect>';
        if (!isNaN(target)) inner += '<line x1="' + sx(target) + '" x2="' + sx(target) + '" y1="' + (y + 2) + '" y2="' + (y + rowH - 12) + '" stroke="var(--rpt-fg)" stroke-width="2.5"></line>';
        inner += '<text x="' + (W - padR + 6) + '" y="' + (y + 17) + '">' + esc(format(d.values[0], compactFmt(fmt))) + '</text>';
      });
      body.innerHTML = svgEl(W, data.length * rowH + 4, inner, 'Gr\u00e1fico de vi\u00f1eta' + (p.title ? ': ' + p.title : '') + '. ' + data.length + ' categor\u00edas.');
    }
    draw();
    el.__rptOnKey = clickable ? function (key, e) { toggleValue(p.category, key, ctx.id, e && (e.ctrlKey || e.metaKey), { source: ctx.srcId, page: ctx.page }); } : null;
    el.__rptExport = { title: p.title || 'Bullet', expand: true, svg: function () { return body.querySelector('svg'); }, table: function () { return { columns: [{ name: '_k', label: labelOf(src.fields, p.category) }, { name: '_v', label: labelOf(src.fields, p.value), type: 'number', format: fmt }, { name: '_t', label: 'Objetivo', type: 'number', format: fmt }], rows: data.map(function (d) { return { _k: d.key, _v: d.values[0], _t: p.targetField ? d.values[1] : toNum(p.target) }; }) }; } };
    observe(el, body, draw);
  };

  /* --- Sankey --- */
  components.sankey = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    var levels = (p.levels || []).filter(Boolean);
    if (levels.length < 2 || !p.value) return empty(el, 'Elige al menos dos niveles y un valor');
    var pal = colors(p, ctx), fmt = p.format || fieldMeta(src.fields, p.value).format || 'number';
    var clickable = ctx.interactive && p.crossFilter !== false;
    el.innerHTML = '<div class="rpt-card rpt-chart">' + head(p, ctx) + '<div class="rpt-chart-body"></div></div>';
    var body = el.querySelector('.rpt-chart-body'), H = Number(p.height) || 320;
    var nodes = levels.map(function (lv) { return groupBy(src.rows, lv, [p.value], p.agg, src.rows).sort(function (a, b) { return b.values[0] - a.values[0]; }); });
    var links = [];
    for (var l = 0; l < levels.length - 1; l++) {
      groupBy(src.rows, (function (a, b) { return function (r) { return String(r[a]) + '\u0000' + String(r[b]); }; })(levels[l], levels[l + 1]), [p.value], p.agg, src.rows).forEach(function (g) {
        var parts = g.key.split('\u0000');
        if (g.values[0] > 0) links.push({ l: l, s: parts[0], t: parts[1], v: g.values[0] });
      });
    }
    function draw() {
      var W = Math.max(300, Math.floor(body.clientWidth || 600)), nw = 12, gap = 6, inner = '';
      var colX = function (l) { return 10 + (l * (W - 140 - nw)) / (levels.length - 1); };
      var total = nodes[0].reduce(function (a, n) { return a + n.values[0]; }, 0) || 1;
      var pos = {};
      nodes.forEach(function (ns, l) {
        var avail = H - gap * (ns.length - 1), y = 0, k = avail / (ns.reduce(function (a, n) { return a + n.values[0]; }, 0) || 1);
        ns.forEach(function (n, i) { var h = Math.max(2, n.values[0] * k); pos[l + '|' + n.key] = { x: colX(l), y: y, h: h, out: y, inn: y, color: pal[(l === 0 ? i : i + 3) % pal.length], k: k }; y += h + gap; });
      });
      links.sort(function (a, b) { return b.v - a.v; }).forEach(function (lk) {
        var a = pos[lk.l + '|' + lk.s], b = pos[(lk.l + 1) + '|' + lk.t];
        if (!a || !b) return;
        var w1 = lk.v * a.k, w2 = lk.v * b.k, y1 = a.out + w1 / 2, y2 = b.inn + w2 / 2;
        a.out += w1; b.inn += w2;
        var x1 = a.x + nw, x2 = b.x, mx = (x1 + x2) / 2;
        inner += '<path d="M' + x1 + ',' + y1.toFixed(1) + ' C' + mx + ',' + y1.toFixed(1) + ' ' + mx + ',' + y2.toFixed(1) + ' ' + x2 + ',' + y2.toFixed(1) + '" fill="none" stroke="' + a.color + '" stroke-opacity=".35" stroke-width="' + Math.max(1, (w1 + w2) / 2).toFixed(1) + '" data-tip="' + esc('<b>' + esc(lk.s) + ' \u2192 ' + esc(lk.t) + '</b>' + esc(format(lk.v, fmt)) + ' \u00b7 ' + esc(format(lk.v / total, 'percent'))) + '"></path>';
      });
      nodes.forEach(function (ns, l) {
        ns.forEach(function (n) {
          var q = pos[l + '|' + n.key], last = l === levels.length - 1;
          inner += '<rect class="rpt-mark' + (clickable ? ' is-click' : '') + '"' + (clickable ? ' data-key="' + esc(l + '|' + n.key) + '" tabindex="0" role="button" aria-label="' + esc(n.key + ': ' + format(n.values[0], fmt)) + '"' : '') + ' x="' + q.x + '" y="' + q.y.toFixed(1) + '" width="' + nw + '" height="' + q.h.toFixed(1) + '" fill="' + q.color + '" data-tip="' + esc('<b>' + esc(n.key) + '</b>' + esc(labelOf(src.fields, levels[l])) + ': ' + esc(format(n.values[0], fmt))) + '"></rect>';
          if (q.h > 9) inner += '<text x="' + (last ? q.x - 4 : q.x + nw + 4) + '" y="' + (q.y + q.h / 2 + 4).toFixed(1) + '"' + (last ? ' text-anchor="end"' : '') + '>' + esc(truncate(n.key, 18)) + ' \u00b7 ' + esc(format(n.values[0], compactFmt(fmt))) + '</text>';
        });
      });
      body.innerHTML = svgEl(W, H, inner, 'Diagrama de Sankey' + (p.title ? ': ' + p.title : '') + '. ' + links.length + ' flujos.');
    }
    draw();
    el.__rptOnKey = clickable ? function (key, e) { var i = String(key).indexOf('|'); toggleValue(levels[+String(key).slice(0, i)], String(key).slice(i + 1), ctx.id, e && (e.ctrlKey || e.metaKey), { source: ctx.srcId, page: ctx.page }); } : null;
    el.__rptExport = { title: p.title || 'Sankey', expand: true, svg: function () { return body.querySelector('svg'); }, table: function () { return { columns: [{ name: 's', label: 'Origen' }, { name: 't', label: 'Destino' }, { name: 'v', label: labelOf(src.fields, p.value), type: 'number', format: fmt }], rows: links }; } };
    observe(el, body, draw);
  };

/* ---- 60-tables.js ---- */
  /* ---------- tablas ---------- */
  var ICON_RULES = { 'icon-up': ['\u25b2', 'is-good'], 'icon-down': ['\u25bc', 'is-bad'], 'icon-flat': ['\u25ac', 'is-neutral'], 'dot-good': ['\u25cf', 'is-good'], 'dot-warn': ['\u25cf', 'is-warn'], 'dot-bad': ['\u25cf', 'is-bad'], flag: ['\u2691', 'is-bad'], star: ['\u2605', 'is-warn'] };
  function ruleMatch(v, r) {
    var n = toNum(v), x = toNum(r.value), num = !isNaN(n) && !isNaN(x);
    switch (r.op) {
      case '>': return num ? n > x : String(v) > String(r.value);
      case '>=': return num ? n >= x : String(v) >= String(r.value);
      case '<': return num ? n < x : String(v) < String(r.value);
      case '<=': return num ? n <= x : String(v) <= String(r.value);
      case '!=': return String(v) !== String(r.value);
      case 'contains': return String(v == null ? '' : v).toLowerCase().indexOf(String(r.value).toLowerCase()) >= 0;
      default: return String(v) === String(r.value);
    }
  }
  function miniSpark(vals) {
    if (vals.length < 2) return '';
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), rg = mx - mn || 1, W = 90, H = 22;
    var pts = vals.map(function (v, i) { return [(i / (vals.length - 1)) * (W - 4) + 2, H - 3 - ((v - mn) / rg) * (H - 6)]; });
    var last = pts[pts.length - 1];
    return '<svg class="rpt-cell-spark" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><path d="' + pts.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '" fill="none" stroke="var(--rpt-brand)" stroke-width="1.6"/><circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2.2" fill="var(--rpt-brand)"/></svg>';
  }

  components.grid = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    var columns = (p.columns && p.columns.length ? p.columns : src.fields.filter(function (f) { return !f.measure; }).map(function (f) { return f.name; }));
    var groupFields = (p.groupBy || []).filter(Boolean).slice(0, 2);
    var st = el.__rptGrid || (el.__rptGrid = { page: 0, sort: p.sortBy || null, dir: p.sortDir || 'asc', q: '', collapsed: {} });
    var pageSize = groupFields.length || state.printing ? Infinity : Number(p.pageSize) || 10;
    var rules = (p.rules || []).filter(function (r) { return r && r.field; });
    var bars = p.databars || [];
    var sparks = (p.sparklines || []).filter(function (s) { return s && s.key && s.time && s.value; });
    var subAgg = p.subtotalAgg || 'sum';
    var selF = p.filterField && ctx.interactive ? currentFilter(ctx.srcId, p.filterField) : null;
    var selVals = selF ? selF.values || [] : [];
    function isNum(c) { return fieldMeta(src.fields, c).type === 'number'; }
    var current = src.rows, display = [];
    var sparkMaps = sparks.map(function (s) {
      var m = {}, other = s.source && state.data && state.data.sources ? state.data.sources[s.source] : null;
      var base = other ? (ctx.interactive ? filterRows(s.source, other, { page: ctx.page }) : other.rows) : src.rows;
      base.forEach(function (r) { var k = String(r[s.key]); (m[k] = m[k] || []).push(r); });
      Object.keys(m).forEach(function (k) { m[k] = groupBy(m[k], s.time, [s.value], s.agg || 'sum').sort(function (a, b) { return cmpLabel(a.key, b.key); }).map(function (d) { return d.values[0]; }); });
      return m;
    });
    function cellHtml(r, c) {
      var f = fieldMeta(src.fields, c);
      var matched = rules.filter(function (rr) { return rr.field === c && ruleMatch(r[c], rr); });
      var icons = matched.filter(function (rr) { return ICON_RULES[rr.style]; }).map(function (rr) { var ic = ICON_RULES[rr.style]; return '<i class="rpt-ico ' + ic[1] + '" aria-hidden="true">' + ic[0] + '</i>'; }).join('');
      var extra = matched.filter(function (rr) { return !ICON_RULES[rr.style]; }).map(function (rr) { return 'is-' + (rr.style || 'brand'); }).join(' ');
      if (f.type === 'boolean') { var b = r[c] === true || r[c] === 1 || r[c] === 'true'; return '<td class="' + extra + '">' + icons + '<span class="rpt-bool' + (b ? ' is-true' : '') + '"></span> ' + (b ? 'S\u00ed' : 'No') + '</td>'; }
      var bar = bars.indexOf(c) >= 0 ? '<span class="rpt-databar" style="width:calc(' + Math.round((Math.abs(toNum(r[c]) || 0) / (bars.max[c] || 1)) * 100) + '% - 8px)"></span>' : '';
      return '<td class="' + (f.type === 'number' ? 'is-num ' : '') + extra + '">' + bar + icons + '<span class="rpt-cell-v">' + esc(format(r[c], f.format, f.type)) + '</span></td>';
    }
    function buildGroups(rows, level, path) {
      var gf = groupFields[level];
      var gs = groupBy(rows, gf, [], null);
      gs.sort(function (a, b) { return cmpLabel(a.key, b.key); });
      if (p.groupSortDesc) gs.reverse();
      gs.forEach(function (g, i) {
        var key = path.concat([g.key]).join('\u0000');
        var collapsed = !state.printing && st.collapsed[key];
        display.push({ type: 'group', level: level + 1, field: gf, key: g.key, id: key, rows: g.rows, collapsed: collapsed, brk: p.groupPageBreak && level === 0 && i > 0 });
        if (collapsed) return;
        if (level + 1 < groupFields.length) buildGroups(g.rows, level + 1, path.concat([g.key]));
        else g.rows.forEach(function (r) { display.push({ type: 'row', row: r, level: level + 1 }); });
      });
    }
    function draw() {
      var rows = src.rows;
      if (st.q) { var q = st.q.toLowerCase(); rows = rows.filter(function (r) { return columns.some(function (c) { return String(r[c] == null ? '' : r[c]).toLowerCase().indexOf(q) >= 0; }); }); }
      if (st.sort) {
        var s = st.sort, d = st.dir === 'desc' ? -1 : 1, num = isNum(s);
        rows = rows.slice().sort(function (a, b) { var x = a[s], y = b[s]; return num ? ((toNum(x) || 0) - (toNum(y) || 0)) * d : String(x == null ? '' : x).localeCompare(String(y == null ? '' : y), config.locale) * d; });
      }
      current = rows;
      bars.max = {};
      bars.forEach(function (b) { bars.max[b] = Math.max.apply(null, rows.map(function (r) { return Math.abs(toNum(r[b]) || 0); }).concat([0])) || 1; });
      display = [];
      if (groupFields.length) buildGroups(rows, 0, []);
      var pages = Math.max(1, Math.ceil(rows.length / pageSize));
      if (st.page >= pages) st.page = pages - 1;
      var slice = groupFields.length ? null : rows.slice(st.page * pageSize, st.page * pageSize + pageSize);
      var h = '<div class="rpt-card rpt-grid">' + head(p, ctx, rows.length + ' filas');
      if (p.search !== false && !state.printing) h += '<div class="rpt-grid-tools"><input class="rpt-input" type="search" placeholder="Buscar\u2026" aria-label="Buscar en la tabla" value="' + esc(st.q) + '"></div>';
      h += '<div class="rpt-grid-wrap"' + (state.printing ? ' style="max-height:none;overflow:visible"' : '') + '><table class="rpt-table"><thead><tr>';
      columns.forEach(function (c) {
        var mark = st.sort === c ? '<span class="rpt-sort" aria-hidden="true">' + (st.dir === 'asc' ? '\u25b2' : '\u25bc') + '</span>' : '';
        h += '<th scope="col" class="has-btn ' + (isNum(c) ? 'is-num' : '') + '" aria-sort="' + (st.sort === c ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '"><button type="button" data-col="' + esc(c) + '">' + esc(labelOf(src.fields, c)) + mark + '</button></th>';
      });
      sparks.forEach(function (s) { h += '<th scope="col">' + esc(s.label || 'Tendencia') + '</th>'; });
      h += '</tr></thead><tbody>';
      var rowHtml = function (r, level) {
        var key = p.filterField ? String(r[p.filterField]) : null;
        var cls = (p.filterField && ctx.interactive ? 'is-clickable' : '') + (key != null && selVals.indexOf(key) >= 0 ? ' is-sel' : '') + (level ? ' rpt-indent-' + level : '');
        return '<tr' + (cls.trim() ? ' class="' + cls.trim() + '"' : '') + (key != null && ctx.interactive ? ' data-key="' + esc(key) + '" tabindex="0"' : '') + '>' + columns.map(function (c) { return cellHtml(r, c); }).join('') +
          sparks.map(function (s, i) { return '<td>' + miniSpark(sparkMaps[i][String(r[s.key])] || []) + '</td>'; }).join('') + '</tr>';
      };
      if (!rows.length) h += '<tr><td colspan="' + (columns.length + sparks.length) + '" style="text-align:center;color:var(--rpt-fg-3)">Sin resultados</td></tr>';
      if (slice) slice.forEach(function (r) { h += rowHtml(r, 0); });
      else display.forEach(function (it) {
        if (it.type === 'row') { h += rowHtml(it.row, it.level); return; }
        h += '<tr class="rpt-group rpt-group-' + it.level + (it.brk ? ' rpt-break' : '') + '" data-group="' + esc(it.id) + '" tabindex="0" aria-expanded="' + !it.collapsed + '">' + columns.map(function (c, i) {
          if (i === 0) return '<td><span class="rpt-tw" aria-hidden="true">' + (it.collapsed ? '\u25b8' : '\u25be') + '</span>' + esc(labelOf(src.fields, it.field)) + ': ' + esc(formatField(src.fields, it.field, it.key)) + ' <span class="rpt-card-sub">(' + it.rows.length + ')</span></td>';
          if (p.subtotals !== false && isNum(c) && !/^id$|_id$/.test(c)) return '<td class="is-num">' + esc(formatField(src.fields, c, aggregate(it.rows, c, subAgg))) + '</td>';
          return '<td></td>';
        }).join('') + sparks.map(function () { return '<td></td>'; }).join('') + '</tr>';
      });
      h += '</tbody>';
      if (p.totals) {
        h += '<tfoot><tr>' + columns.map(function (c, i) {
          if (isNum(c) && !/^id$|_id$/.test(c)) return '<td class="is-num">' + esc(formatField(src.fields, c, aggregate(rows, c, groupFields.length ? subAgg : 'sum'))) + '</td>';
          return '<td>' + (i === 0 ? 'Total' : '') + '</td>';
        }).join('') + sparks.map(function () { return '<td></td>'; }).join('') + '</tr></tfoot>';
      }
      h += '</table></div>';
      if (pages > 1 && !state.printing) {
        h += '<div class="rpt-pager"><span>P\u00e1gina ' + (st.page + 1) + ' de ' + pages + '</span><span class="rpt-pager-btns">' +
          '<button type="button" class="rpt-btn" data-page="prev"' + (st.page === 0 ? ' disabled' : '') + '>Anterior</button>' +
          '<button type="button" class="rpt-btn" data-page="next"' + (st.page >= pages - 1 ? ' disabled' : '') + '>Siguiente</button></span></div>';
      }
      el.innerHTML = h + '</div>';
      var input = el.querySelector('.rpt-grid-tools input');
      if (input) input.addEventListener('input', function () {
        st.q = input.value; st.page = 0;
        var pos = input.selectionStart; draw();
        var ni = el.querySelector('.rpt-grid-tools input'); ni.focus(); try { ni.setSelectionRange(pos, pos); } catch (e) { /* noop */ }
      });
    }
    el.__rptDraw = draw;
    el.__rptOnKey = p.filterField ? function (key, e) { toggleValue(p.filterField, key, ctx.id, e && (e.ctrlKey || e.metaKey), { source: ctx.srcId, page: ctx.page }); } : null;
    el.__rptExport = {
      title: p.title || 'Tabla', expand: true,
      table: function () { return { columns: cols(src.fields, columns), rows: current }; },
      groups: groupFields.length ? function () {
        var saved = st.collapsed; st.collapsed = {}; display = []; buildGroups(current, 0, []); st.collapsed = saved;
        return display.map(function (it) {
          if (it.type === 'row') return { type: 'row', level: it.level, row: it.row };
          var vals = {};
          columns.forEach(function (c) { if (isNum(c) && !/^id$|_id$/.test(c)) vals[c] = aggregate(it.rows, c, subAgg); });
          return { type: 'group', level: it.level, label: labelOf(src.fields, it.field) + ': ' + formatField(src.fields, it.field, it.key) + ' (' + it.rows.length + ')', values: vals, pageBreak: it.brk };
        });
      } : null,
      totals: p.totals ? function () { var t = {}; columns.forEach(function (c) { if (isNum(c) && !/^id$|_id$/.test(c)) t[c] = aggregate(current, c, groupFields.length ? subAgg : 'sum'); }); return t; } : null
    };
    if (!el.__rptGridBound) {
      el.__rptGridBound = true;
      el.addEventListener('click', function (e) {
        var s2 = el.__rptGrid;
        var gr = e.target.closest('tr.rpt-group');
        if (gr && s2) { var id = gr.getAttribute('data-group'); s2.collapsed[id] = !s2.collapsed[id]; el.__rptDraw(); return; }
        var b = e.target.closest('button'); if (!b || !s2) return;
        if (b.dataset.col) { if (s2.sort === b.dataset.col) s2.dir = s2.dir === 'asc' ? 'desc' : 'asc'; else { s2.sort = b.dataset.col; s2.dir = 'asc'; } s2.page = 0; }
        else if (b.dataset.page) s2.page += b.dataset.page === 'next' ? 1 : -1;
        else return;
        el.__rptDraw();
      });
      el.addEventListener('keydown', function (e) {
        var gr = e.target.closest && e.target.closest('tr.rpt-group');
        if (gr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); gr.click(); }
      });
    }
    draw();
  };

  components.pivot = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    if (!p.rows || !p.value) return empty(el, 'Elige campo de filas y valor');
    var rk = uniq(src.rows.map(function (r) { return r[p.rows]; })).sort(cmpLabel);
    var ck = p.cols ? uniq(src.rows.map(function (r) { return r[p.cols]; })).sort(cmpLabel).slice(0, 24) : [];
    var fmt = p.format || fieldMeta(src.fields, p.value).format;
    var cells = {}, max = 0, byRow = {};
    src.rows.forEach(function (r) { var k = String(r[p.rows]); (byRow[k] = byRow[k] || []).push(r); });
    rk.forEach(function (rkey) {
      var rr = byRow[String(rkey)] || [];
      if (ck.length) ck.forEach(function (c) { var v = aggregate(rr.filter(function (x) { return String(x[p.cols]) === String(c); }), p.value, p.agg, src.rows); cells[rkey + '\u0000' + c] = v; if (v > max) max = v; });
      cells[rkey + '\u0000*'] = aggregate(rr, p.value, p.agg, src.rows);
      if (!ck.length && cells[rkey + '\u0000*'] > max) max = cells[rkey + '\u0000*'];
    });
    var pf = ctx.interactive ? currentFilter(ctx.srcId, p.rows) : null;
    var selVals = pf ? pf.values || [] : [];
    var h = '<div class="rpt-card rpt-pivot">' + head(p, ctx) + '<div class="rpt-grid-wrap"><table class="rpt-table"><thead><tr><th scope="col">' + esc(labelOf(src.fields, p.rows)) + (p.cols ? ' \\ ' + esc(labelOf(src.fields, p.cols)) : '') + '</th>';
    ck.forEach(function (c) { h += '<th scope="col" class="is-num">' + esc(formatField(src.fields, p.cols, c)) + '</th>'; });
    if (p.totals !== false || !ck.length) h += '<th scope="col" class="is-num">' + (ck.length ? 'Total' : esc(labelOf(src.fields, p.value))) + '</th>';
    h += '</tr></thead><tbody>';
    function cell(v, heat) {
      var bg = p.heatmap && heat && max ? ' style="background:color-mix(in srgb, var(--rpt-brand) ' + Math.round((v / max) * 55) + '%, transparent)"' : '';
      return '<td class="is-num rpt-heat"' + bg + '>' + esc(format(v, fmt, 'number')) + '</td>';
    }
    rk.forEach(function (rkey) {
      var sel = selVals.indexOf(String(rkey)) >= 0;
      h += '<tr' + (ctx.interactive ? ' class="is-clickable' + (sel ? ' is-sel' : '') + '" data-key="' + esc(rkey) + '" tabindex="0"' : '') + '><th scope="row" style="position:static">' + esc(formatField(src.fields, p.rows, rkey)) + '</th>';
      ck.forEach(function (c) { h += cell(cells[rkey + '\u0000' + c], true); });
      if (p.totals !== false || !ck.length) h += ck.length ? '<td class="is-num is-total">' + esc(format(cells[rkey + '\u0000*'], fmt, 'number')) + '</td>' : cell(cells[rkey + '\u0000*'], true);
      h += '</tr>';
    });
    if (p.totals !== false && rk.length > 1) {
      h += '<tr class="is-total"><th scope="row" style="position:static">Total</th>';
      ck.forEach(function (c) { h += '<td class="is-num is-total">' + esc(format(aggregate(src.rows.filter(function (x) { return String(x[p.cols]) === String(c); }), p.value, p.agg, src.rows), fmt, 'number')) + '</td>'; });
      h += '<td class="is-num is-total">' + esc(format(aggregate(src.rows, p.value, p.agg, src.rows), fmt, 'number')) + '</td></tr>';
    }
    el.innerHTML = h + '</tbody></table></div></div>';
    el.__rptOnKey = function (key, e) { toggleValue(p.rows, key, ctx.id, e && (e.ctrlKey || e.metaKey), { source: ctx.srcId, page: ctx.page }); };
    el.__rptExport = {
      title: p.title || 'Tabla din\u00e1mica', expand: true, detail: detailOf(src, src.rows),
      table: function () {
        var columns = [{ name: '_k', label: labelOf(src.fields, p.rows) }].concat(ck.map(function (c, i) { return { name: '_' + i, label: String(c), type: 'number', format: fmt }; })).concat([{ name: '_t', label: 'Total', type: 'number', format: fmt }]);
        var rows = rk.map(function (rkey) { var o = { _k: rkey, _t: cells[rkey + '\u0000*'] }; ck.forEach(function (c, i) { o['_' + i] = cells[rkey + '\u0000' + c]; }); return o; });
        return { columns: columns, rows: rows };
      }
    };
  };

/* ---- 70-report.js ---- */
  /* ---------- montaje del informe ---------- */
  function readProps(el) {
    var raw = el.getAttribute('data-props');
    if (!raw) { var s = el.querySelector(':scope > script[type="application/json"]'); raw = s && s.textContent; }
    try { return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
  }
  function readJsonNode(sel) {
    var n = document.querySelector(sel);
    if (!n) return null;
    try { return JSON.parse(n.tagName === 'META' ? n.getAttribute('content') : n.textContent); } catch (e) { return null; }
  }
  function bindOnce(el) {
    if (el.__rptBound) return;
    el.__rptBound = true;
    bindTips(el);
    el.addEventListener('click', function (e) {
      var mb = e.target.closest('.rpt-menu-btn');
      if (mb && el.contains(mb) && !mb.closest('.rpt-dialog')) { e.stopPropagation(); openMenu(el, mb); return; }
      var dr = e.target.closest('[data-drill]');
      if (dr && el.contains(dr) && el.__rptOnDrill) { el.__rptOnDrill(+dr.getAttribute('data-drill')); return; }
      var k = e.target.closest('[data-key]');
      if (k && el.contains(k) && el.__rptOnKey && !e.target.closest('button:not([data-key])')) el.__rptOnKey(k.getAttribute('data-key'), e);
    });
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var k = e.target.closest('[data-key]');
      if (k && e.target === k && el.__rptOnKey) { e.preventDefault(); el.__rptOnKey(k.getAttribute('data-key'), e); }
    });
  }
  /** Pinta un componente suelto (lo usa el dise\u00f1ador). opts: { interactive, palette, semantic, srcId, designer } */
  function renderComponent(el, type, props, source, opts) {
    opts = opts || {};
    el.classList.add('rpt-c');
    if (opts.semantic) setSemantic(opts.semantic);
    if (opts.data) state.data = opts.data;
    var fn = components[type];
    var srcId = opts.srcId || el.getAttribute('data-source') || null;
    var view = null;
    if (source) view = opts.viewReady ? source : { fields: augmentFields(srcId, source.fields || []), rows: opts.rows || source.rows || [], allRows: source.rows || [] };
    el.__rptType = type; el.__rptProps = props || {}; el.__rptView = view; el.__rptSrcId = srcId;
    if (!fn) return empty(el, 'Componente desconocido: ' + type);
    var ctx = { interactive: !!opts.interactive, id: opts.id || el.getAttribute('data-rpt-id') || null, palette: opts.palette, srcId: srcId, page: opts.page || null, associative: !!opts.interactive && state.associative, designer: !!opts.designer };
    try { fn(el, props || {}, view, ctx); }
    catch (e) { empty(el, 'Error al renderizar: ' + e.message); if (global.console) console.error(e); }
    bindOnce(el);
  }
  function renderItem(it) {
    var data = state.data || { sources: {} };
    var src = it.srcId ? (data.sources || {})[it.srcId] : null;
    if (it.srcId && !src) { it.el.classList.add('rpt-c'); return empty(it.el, 'Sin datos para el origen \u00ab' + it.srcId + '\u00bb'); }
    var rows = src ? filterRows(it.srcId, src, { origin: it.id, page: it.page, excludeField: it.type === 'filter' ? it.props.field : null }) : null;
    renderComponent(it.el, it.type, it.props, src, { interactive: true, id: it.id, srcId: it.srcId, rows: rows, page: it.page });
  }

  function expandSubreports(root) {
    var subs = (state.data && state.data.subreports) || {};
    root.querySelectorAll('[data-rpt="subreport"]').forEach(function (el) {
      var p = readProps(el), sub = subs[p.report];
      el.removeAttribute('data-rpt');
      el.setAttribute('data-rpt-sub', p.report || '');
      el.classList.add('rpt-c', 'rpt-subreport');
      if (!sub) { el.innerHTML = '<div class="rpt-empty">Subinforme \u00ab' + esc(p.title || p.report || '') + '\u00bb no disponible: se resuelve al publicar desde la aplicaci\u00f3n.</div>'; return; }
      var card = document.createElement('div'); card.className = 'rpt-card';
      card.innerHTML = '<div class="rpt-card-title"><span>' + esc(p.title || sub.title || 'Subinforme') + '</span><span class="rpt-card-sub">Subinforme</span></div>';
      var body = document.createElement('div'); body.className = 'rpt-sub-body';
      (sub.rows || []).forEach(function (row) {
        var sec = document.createElement('section'); sec.className = 'rpt-row';
        row.cells.forEach(function (c) {
          if (c.type === 'subreport') return;
          var d = document.createElement('div');
          d.className = 'rpt-col rpt-col-' + (c.span || 12);
          d.setAttribute('data-rpt', c.type);
          if (c.source) d.setAttribute('data-source', c.source);
          d.setAttribute('data-props', JSON.stringify(c.props || {}));
          sec.appendChild(d);
        });
        body.appendChild(sec);
      });
      card.appendChild(body);
      el.innerHTML = '';
      el.appendChild(card);
    });
  }

  function reportRoot() { return document.querySelector('.rpt-report'); }
  function headerTools() {
    var hd = document.querySelector('.rpt-report-header');
    if (!hd) return null;
    var t = hd.querySelector('.rpt-header-tools');
    if (!t) { t = document.createElement('div'); t.className = 'rpt-header-tools'; hd.appendChild(t); }
    return t;
  }
  function setupFilterPane() {
    var host = reportRoot();
    if (!host || host.__rptPane) return;
    var defs;
    try { defs = JSON.parse(host.getAttribute('data-rpt-filters') || '[]'); } catch (e) { defs = []; }
    if (!defs.length) return;
    host.__rptPane = true;
    var pane = document.createElement('div');
    pane.className = 'rpt-filterpane'; pane.id = 'rpt-filterpane'; pane.hidden = true;
    pane.setAttribute('role', 'region'); pane.setAttribute('aria-label', 'Filtros del informe');
    defs.forEach(function (f, i) {
      var d = document.createElement('div');
      d.setAttribute('data-rpt', 'filter');
      d.setAttribute('data-rpt-id', 'rpt-pane-' + i);
      if (f.source) d.setAttribute('data-source', f.source);
      d.setAttribute('data-props', JSON.stringify({ field: f.field, label: f.label, mode: f.mode || 'select', part: f.part || undefined }));
      pane.appendChild(d);
    });
    var hd = host.querySelector('.rpt-report-header');
    if (hd) hd.insertAdjacentElement('afterend', pane); else host.insertBefore(pane, host.firstChild);
    var tools = headerTools();
    if (tools) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rpt-btn rpt-filterpane-btn'; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'rpt-filterpane');
      b.innerHTML = UI.filter + '<span>Filtros</span><span class="rpt-count" hidden></span>';
      b.addEventListener('click', function () { pane.hidden = !pane.hidden; b.setAttribute('aria-expanded', String(!pane.hidden)); });
      tools.appendChild(b);
    }
  }
  function setupPages() {
    var host = reportRoot();
    if (!host) return;
    var pages = host.querySelectorAll(':scope > .rpt-page');
    if (pages.length < 2 || host.__rptNav) { if (pages.length === 1 && !state.page) state.page = pages[0].getAttribute('data-page'); return; }
    host.__rptNav = true;
    var nav = document.createElement('nav');
    nav.className = 'rpt-pages-nav'; nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'P\u00e1ginas del informe');
    pages.forEach(function (pg, i) {
      var id = pg.getAttribute('data-page') || ('p' + i);
      pg.setAttribute('data-page', id); pg.setAttribute('role', 'tabpanel'); pg.id = pg.id || 'rpt-page-' + id;
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('data-page', id); b.setAttribute('aria-controls', pg.id);
      b.textContent = pg.getAttribute('data-title') || ('P\u00e1gina ' + (i + 1));
      nav.appendChild(b);
    });
    nav.addEventListener('click', function (e) { var b = e.target.closest('button[data-page]'); if (!b) return; state.page = b.getAttribute('data-page'); showPage(); emit(); });
    nav.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var bs = Array.prototype.slice.call(nav.querySelectorAll('button')), i = bs.indexOf(document.activeElement);
      var n = bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length]; n.focus(); n.click();
    });
    pages[0].insertAdjacentElement('beforebegin', nav);
    if (!state.page) state.page = pages[0].getAttribute('data-page');
    showPage();
  }
  function showPage() {
    var host = reportRoot();
    if (!host) return;
    var pages = host.querySelectorAll(':scope > .rpt-page');
    if (pages.length < 2) return;
    var found = false;
    pages.forEach(function (pg) { if (pg.getAttribute('data-page') === state.page) found = true; });
    if (!found) state.page = pages[0].getAttribute('data-page');
    pages.forEach(function (pg) { pg.hidden = pg.getAttribute('data-page') !== state.page; });
    host.querySelectorAll('.rpt-pages-nav button').forEach(function (b) { var on = b.getAttribute('data-page') === state.page; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  }
  function filterBar() {
    var host = reportRoot();
    if (!host) return;
    var bar = host.querySelector(':scope > .rpt-filterbar');
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'rpt-filterbar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Filtros activos'); bar.setAttribute('aria-live', 'polite');
      var after = host.querySelector(':scope > .rpt-filterpane') || host.querySelector(':scope > .rpt-report-header');
      if (after) after.insertAdjacentElement('afterend', bar); else host.insertBefore(bar, host.firstChild);
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.classList.contains('rpt-clear')) clearFilters(); else removeFilter(b.getAttribute('data-key'));
      });
    }
    var keys = Object.keys(state.filters);
    bar.innerHTML = keys.length ? keys.map(function (k) { var d = describeFilter(state.filters[k]); return '<button type="button" class="rpt-chip" data-key="' + esc(k) + '" aria-label="Quitar filtro ' + esc(d.label) + '"><span>' + esc(d.label) + ': <b>' + esc(d.value) + '</b></span> \u2715</button>'; }).join('') + (keys.length > 1 ? '<button type="button" class="rpt-clear">Quitar filtros</button>' : '') : '';
    var cnt = document.querySelector('.rpt-filterpane-btn .rpt-count');
    if (cnt) { cnt.hidden = !keys.length; cnt.textContent = keys.length; }
  }
  function refresh() {
    var active = document.activeElement;
    state.items.forEach(function (it) {
      if (!document.body.contains(it.el)) return;
      if (it.type === 'filter' && active && it.el.contains(active) && active.tagName === 'INPUT') return;
      renderItem(it);
    });
    filterBar();
  }
  function applyThemeMeta() {
    var t = readJsonNode('meta[name="rpt-theme"]');
    if (!t) return;
    if (Array.isArray(t.colors) && t.colors.length) config.customPalette = t.colors;
    if (t.font) html.style.setProperty('--rpt-font', t.font);
    if (t.radius != null) html.style.setProperty('--rpt-radius', t.radius + 'px');
  }
  function render(root, data) {
    root = root || document;
    state.data = data || global.RPT_DATA || { sources: {} };
    config.palette = html.getAttribute('data-rpt-palette') || config.palette;
    applyThemeMeta();
    setSemantic(state.data.semantic || readJsonNode('#rpt-semantic') || {});
    state.fieldLabels = {};
    Object.keys(state.data.sources || {}).forEach(function (k) {
      augmentFields(k, state.data.sources[k].fields || []).forEach(function (f) { state.fieldLabels[k + '.' + f.name] = f.label || f.name; if (!state.fieldLabels[f.name]) state.fieldLabels[f.name] = f.label || f.name; });
    });
    expandSubreports(root);
    setupFilterPane();
    var nodes = root.querySelectorAll('[data-rpt]');
    state.items = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest('.rpt-dialog')) continue;
      var id = el.id || el.getAttribute('data-rpt-id') || ('rpt-c-' + i);
      el.setAttribute('data-rpt-id', id);
      var pg = el.closest('.rpt-page');
      state.items.push({ el: el, type: el.getAttribute('data-rpt'), props: readProps(el), srcId: el.getAttribute('data-source'), id: id, page: pg ? pg.getAttribute('data-page') : null });
    }
    setupPages();
    refresh();
    if (global.parent && global.parent !== global) { try { global.parent.postMessage({ type: 'rpt:ready', version: VERSION }, '*'); } catch (e) { /* noop */ } }
  }

  /* ---------- impresi\u00f3n ---------- */
  global.addEventListener('beforeprint', function () {
    state.printing = true; refresh();
    var paper = readJsonNode('meta[name="rpt-paper"]');
    var st = document.getElementById('rpt-print-date');
    if (paper && paper.showDate) {
      if (!st) { st = document.createElement('style'); st.id = 'rpt-print-date'; document.head.appendChild(st); }
      st.textContent = '@page { @top-right { content: "' + new Intl.DateTimeFormat(config.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()).replace(/"/g, '') + '"; font: 9pt sans-serif; color: #666; } }';
    }
  });
  global.addEventListener('afterprint', function () { state.printing = false; refresh(); });

  /* ---------- exportaci\u00f3n (Word / Excel): recopila el contenido ---------- */
  function nextFrame() { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); }
  function collect() {
    var host = reportRoot();
    var hidden = host ? Array.prototype.filter.call(host.querySelectorAll(':scope > .rpt-page'), function (p) { return p.hidden; }) : [];
    hidden.forEach(function (p) { p.hidden = false; });
    return nextFrame().then(function () {
      var hd = document.querySelector('.rpt-report-header');
      var out = {
        title: hd && hd.querySelector('h1') ? hd.querySelector('h1').textContent : document.title,
        subtitle: hd && hd.querySelector('p') ? hd.querySelector('p').textContent : '',
        generatedAt: new Date().toISOString(),
        filters: Object.keys(state.filters).map(function (k) { var d = describeFilter(state.filters[k]); return d.label + ': ' + d.value; }),
        paper: readJsonNode('meta[name="rpt-paper"]') || {},
        pages: []
      };
      var pages = host ? Array.prototype.slice.call(host.querySelectorAll(':scope > .rpt-page')) : [];
      var groups = pages.length ? pages.map(function (p) { return { name: p.getAttribute('data-title') || '', id: p.getAttribute('data-page') }; }) : [{ name: '', id: null }];
      var jobs = [];
      groups.forEach(function (g) {
        var page = { name: g.name, items: [] };
        out.pages.push(page);
        state.items.filter(function (it) { return !g.id || it.page === g.id; }).forEach(function (it) {
          var el = it.el, x = el.__rptExport || {}, p = it.props || {};
          var title = p.title || p.label || p.text || '';
          var span = +((el.className.match(/rpt-col-(\d+)/) || [])[1] || 12);
          if (it.type === 'filter') return;
          if (it.type === 'pagebreak') { page.items.push({ kind: 'break' }); return; }
          if (it.type === 'title') { page.items.push({ kind: 'heading', text: p.text || '', sub: p.subtitle || '' }); return; }
          if (it.type === 'text') { page.items.push({ kind: 'text', title: '', paragraphs: [p.content || ''] }); return; }
          if (x.kpi) { page.items.push(Object.assign({ kind: 'kpi', span: span }, x.kpi())); return; }
          if (x.text) { page.items.push({ kind: 'text', title: title, paragraphs: x.text() }); return; }
          if ((it.type === 'grid' || it.type === 'pivot') && x.table) {
            var t = x.table();
            page.items.push({ kind: 'table', title: title, columns: t.columns, rows: t.rows, groups: x.groups ? x.groups() : null, totals: x.totals ? x.totals() : null });
            return;
          }
          if (x.svg && x.svg()) {
            var entry = { kind: 'image', title: title, span: span, table: x.table ? x.table() : null };
            page.items.push(entry);
            jobs.push(svgToPng(el, x.svg(), '', 2).then(function (r) { entry.dataUrl = r.dataUrl; entry.width = r.width; entry.height = r.height; }));
          }
        });
      });
      return Promise.all(jobs).then(function () { hidden.forEach(function (p) { p.hidden = true; }); return out; });
    });
  }

  global.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.type === 'rpt:print') global.print();
    else if (d.type === 'rpt:clearFilters') clearFilters();
    else if (d.type === 'rpt:setFilters' && d.filters) { state.filters = d.filters; state.cache = {}; emit(); refresh(); }
    else if (d.type === 'rpt:setState') setState(d.state);
    else if (d.type === 'rpt:collect') collect().then(function (payload) { e.source.postMessage({ type: 'rpt:collected', id: d.id, payload: payload }, '*'); }, function (err) { e.source.postMessage({ type: 'rpt:collected', id: d.id, error: String(err && err.message || err) }, '*'); });
  });

  function autoInit() {
    if (html.hasAttribute('data-rpt-manual')) return;
    var meta = document.querySelector('meta[name="rpt-data-url"]');
    if (!global.RPT_DATA && meta && global.fetch) {
      fetch(meta.content, { credentials: 'include' }).then(function (r) { return r.json(); }).then(function (d) { global.RPT_DATA = d; render(document, d); })
        .catch(function (err) { if (global.console) console.error('RptLib: no se pudieron cargar los datos', err); render(document, { sources: {} }); });
    } else render(document);
  }

  global.RptLib = {
    version: VERSION, config: config, palettes: PALETTES, accents: ACCENTS, icons: Object.keys(ICONS), components: components,
    render: render, refresh: refresh, renderComponent: renderComponent,
    setFilter: setFilter, removeFilter: removeFilter, clearFilters: clearFilters, getFilters: getFilters, toggleValue: toggleValue,
    getState: getState, setState: setState,
    onFilters: function (fn) { state.listeners.push(fn); return function () { state.listeners = state.listeners.filter(function (x) { return x !== fn; }); }; },
    setSemantic: setSemantic, compileMeasure: compileMeasure, aggregate: aggregate, groupBy: groupBy, datePart: datePart, formatKey: formatKey,
    registerMap: registerMap, maps: MAPS, collect: collect,
    format: format, toCsv: toCsv, exportCsv: exportCsv,
    _internals: { filterRows: filterRows, predicateFor: predicateFor, anomaliesOf: anomaliesOf, linreg: linreg, squarify: squarify, chartData: chartData, state: state }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit); else autoInit();
})(window);
