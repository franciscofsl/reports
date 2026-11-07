/*! RptLib 1.2.0 — librería de componentes de informe (estilo Fluent). Sin dependencias.
 *
 *   <link rel="stylesheet" href="https://<host>/lib/rptlib/1.2.0/rptlib.css">
 *   <script src="https://<host>/lib/rptlib/1.2.0/rptlib.js" defer></script>
 *   <div data-rpt="chart" data-source="ventas" data-props='{"type":"donut","category":"region","values":["importe"]}'></div>
 *
 * Datos:      window.RPT_DATA = { sources: { <id>: { fields, rows } }, semantic?, subreports? }
 *             o <meta name="rpt-data-url" content="..."> para descargarlos.
 * Semántica:  <script type="application/json" id="rpt-semantic">{ relations, measures, hierarchies, associative }</script>
 *             Medidas: campo "m:<nombre>"  ·  Jerarquías: categoría "h:<nombre>"
 * Tema:       <html data-rpt-theme data-rpt-palette data-rpt-density style="--rpt-brand:…">
 *             <meta name="rpt-theme" content='{"colors":[…],"font":"…"}'>
 * Páginas:    <section class="rpt-page" data-page="id" data-title="Nombre">…</section>
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
  function truncate(s, n) { s = String(s); return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s; }
  function slug(s) { return String(s || 'datos').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'datos'; }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
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
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(label || 'Gráfico') + '">' + inner + '</svg>';
  }
  function fieldMeta(fields, name) {
    for (var i = 0; fields && i < fields.length; i++) if (fields[i].name === name) return fields[i];
    if (name && name.indexOf('m:') === 0 && state.measures[name.slice(2)]) { var m = state.measures[name.slice(2)]; return { name: name, label: m.label || m.name, type: 'number', format: m.format || '', measure: true }; }
    if (name && name.indexOf('h:') === 0 && state.hierarchies[name.slice(2)]) { var h = state.hierarchies[name.slice(2)]; return { name: name, label: h.label || h.name, type: 'string', hierarchy: true }; }
    return { name: name, label: name, type: 'string' };
  }
  function labelOf(fields, name) { var f = fieldMeta(fields, name); return f.label || f.name; }

  function format(value, fmt, type) {
    if (value == null || value === '' || (typeof value === 'number' && !isFinite(value))) return '—';
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
        case 'boolean': return value === true || value === 1 || value === 'true' ? 'Sí' : 'No';
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
  var PARTS = { year: 'Año', quarter: 'Trimestre', month: 'Mes', day: 'Día' };
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
