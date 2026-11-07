/*! RptLib 1.1.0 — librería de componentes de informe (estilo Fluent). Sin dependencias.
 *
 *   <link rel="stylesheet" href="https://<host>/lib/rptlib/1.1.0/rptlib.css">
 *   <script src="https://<host>/lib/rptlib/1.1.0/rptlib.js" defer></script>
 *   <div data-rpt="chart" data-source="ventas" data-props='{"type":"donut","category":"region","values":["importe"]}'></div>
 *
 * Datos: window.RPT_DATA = { sources: { <id>: { fields: [...], rows: [...] } } }
 *        o <meta name="rpt-data-url" content="..."> para descargarlos.
 * Tema:  <html data-rpt-theme="light|dark" data-rpt-palette="fluent|ocean|warm|forest|mono"
 *              data-rpt-density="compact|comfortable" style="--rpt-brand:#0f6cbd">
 * Filtros: los componentes `filter` y los clics en gráficos/tablas filtran todos los orígenes
 *          que tengan un campo con el mismo nombre (filtro cruzado).
 */
(function (global) {
  'use strict';

  var VERSION = '1.1.0';
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
    expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  var html = document.documentElement;
  var config = { locale: html.lang || 'es-ES', currency: 'EUR', palette: html.getAttribute('data-rpt-palette') || 'fluent' };

  /* ---------- utilidades ---------- */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toNum(v) { if (typeof v === 'number') return v; if (v == null || v === '') return NaN; return Number(v); }
  function fieldMeta(fields, name) {
    for (var i = 0; fields && i < fields.length; i++) if (fields[i].name === name) return fields[i];
    return { name: name, label: name, type: 'string' };
  }
  function labelOf(fields, name) { var f = fieldMeta(fields, name); return f.label || f.name; }
  function uniq(a) { var s = {}, o = []; a.forEach(function (v) { var k = String(v); if (!s[k]) { s[k] = 1; o.push(v); } }); return o; }
  function cmpLabel(a, b) { return String(a).localeCompare(String(b), config.locale, { numeric: true }); }
  function colors(p, ctx) { return p.colors && p.colors.length ? p.colors : PALETTES[(ctx && ctx.palette) || config.palette] || PALETTES.fluent; }

  function format(value, fmt, type) {
    if (value == null || value === '' || (typeof value === 'number' && isNaN(value))) return '—';
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

  function aggregate(rows, field, agg) {
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
      default: return nums.reduce(function (a, b) { return a + b; }, 0);
    }
  }
  function groupBy(rows, category, values, agg) {
    var map = {}, order = [];
    rows.forEach(function (r) {
      var k = r[category] == null ? '(vacío)' : String(r[category]);
      if (!map[k]) { map[k] = []; order.push(k); }
      map[k].push(r);
    });
    return order.map(function (k) { return { key: k, rows: map[k], values: values.map(function (v) { return aggregate(map[k], v, agg) || 0; }) }; });
  }
  function svgEl(w, h, inner, label) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(label || 'Gráfico') + '">' + inner + '</svg>';
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function truncate(s, n) { s = String(s); return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s; }
  function download(name, blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function slug(s) { return String(s || 'datos').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'datos'; }

  /* ---------- estado de filtros (filtro cruzado) ---------- */
  var state = { filters: {}, data: null, items: [], listeners: [], fieldLabels: {} };

  function matchFilter(row, f) {
    var v = row[f.field];
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
  function filterRows(src, originId, excludeField) {
    var names = {};
    (src.fields || []).forEach(function (f) { names[f.name] = 1; });
    var active = Object.keys(state.filters).map(function (k) { return state.filters[k]; })
      .filter(function (f) { return f.origin !== originId && f.field !== excludeField && names[f.field]; });
    if (!active.length) return src.rows;
    return src.rows.filter(function (r) { for (var i = 0; i < active.length; i++) if (!matchFilter(r, active[i])) return false; return true; });
  }
  function emit() {
    var f = getFilters();
    state.listeners.forEach(function (fn) { try { fn(f); } catch (e) { /* noop */ } });
    try { document.dispatchEvent(new CustomEvent('rpt:filters', { detail: f })); } catch (e) { /* noop */ }
    if (global.parent && global.parent !== global) { try { global.parent.postMessage({ type: 'rpt:filters', filters: f }, '*'); } catch (e) { /* noop */ } }
  }
  function getFilters() { return JSON.parse(JSON.stringify(state.filters)); }
  function setFilter(f) {
    if (!f || !f.field) return;
    var kind = f.kind || 'in';
    var empty = kind === 'in' ? !(f.values && f.values.length) : kind === 'text' ? !f.text : (f.min === '' || f.min == null) && (f.max === '' || f.max == null);
    if (empty) delete state.filters[f.field];
    else state.filters[f.field] = { field: f.field, kind: kind, values: (f.values || []).map(String), text: f.text, min: f.min, max: f.max, origin: f.origin || null };
    emit(); refresh();
  }
  function removeFilter(field) { delete state.filters[field]; emit(); refresh(); }
  function clearFilters() { state.filters = {}; emit(); refresh(); }
  function toggleValue(field, key, origin, multi) {
    var cur = state.filters[field];
    var vals = cur && cur.kind === 'in' ? cur.values.slice() : [];
    var i = vals.indexOf(String(key));
    if (multi) { if (i >= 0) vals.splice(i, 1); else vals.push(String(key)); }
    else vals = i >= 0 && vals.length === 1 ? [] : [String(key)];
    setFilter({ field: field, kind: 'in', values: vals, origin: origin });
  }
  function describeFilter(f) {
    var label = state.fieldLabels[f.field] || f.field;
    var v = f.kind === 'text' ? '«' + f.text + '»' : f.kind === 'range' ? (f.min || '…') + ' – ' + (f.max || '…') : f.values.length > 2 ? f.values.slice(0, 2).join(', ') + ' +' + (f.values.length - 2) : f.values.join(', ');
    return { label: label, value: v };
  }

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

  /* ---------- menú de tarjeta, diálogos y exportación ---------- */
  function menuBtn(floating) {
    return (floating ? '<span class="rpt-float-menu">' : '') + '<button type="button" class="rpt-menu-btn" aria-haspopup="menu" aria-label="Más opciones">' + UI.more + '</button>' + (floating ? '</span>' : '');
  }
  function head(p, ctx, sub) {
    var t = p.title || p.label || '';
    if (!t && !(ctx && ctx.interactive)) return '';
    return '<div class="rpt-card-title"><span>' + esc(t) + '</span><span class="rpt-card-tools">' + (sub ? '<span class="rpt-card-sub">' + esc(sub) + '</span>' : '') + (ctx && ctx.interactive ? menuBtn(false) : '') + '</span></div>';
  }

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
    m.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      closeMenu(); runAction(el, b.getAttribute('data-act'));
    });
    setTimeout(function () { document.addEventListener('pointerdown', onDocDown, true); });
  }

  function tableHtml(columns, rows, limit) {
    limit = limit || 500;
    var h = '<div class="rpt-grid-wrap"><table class="rpt-table"><thead><tr>' + columns.map(function (c) { return '<th class="' + (c.type === 'number' ? 'is-num' : '') + '" scope="col">' + esc(c.label || c.name) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.slice(0, limit).forEach(function (r) {
      h += '<tr>' + columns.map(function (c) { return '<td class="' + (c.type === 'number' ? 'is-num' : '') + '">' + esc(format(r[c.name], c.format, c.type)) + '</td>'; }).join('') + '</tr>';
    });
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
    function cell(v, c) {
      if (v == null) return '';
      if (typeof v === 'number') return dec ? String(v).replace('.', ',') : String(v);
      if (typeof v === 'boolean') return v ? 'Sí' : 'No';
      var s = String(v);
      return /["\n\r;,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    return '﻿' + [columns.map(function (c) { return cell(c.label || c.name); }).join(sep)]
      .concat(rows.map(function (r) { return columns.map(function (c) { return cell(r[c.name], c); }).join(sep); })).join('\r\n');
  }
  function exportCsv(name, columns, rows) { download(slug(name) + '.csv', new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' })); }

  function inlineStyles(src, dst) {
    var cs = getComputedStyle(src);
    ['fill', 'stroke', 'stroke-width', 'opacity', 'font-size', 'font-family', 'font-weight', 'stroke-linecap', 'stroke-linejoin'].forEach(function (p) { dst.style.setProperty(p, cs.getPropertyValue(p)); });
    for (var i = 0; i < src.children.length; i++) inlineStyles(src.children[i], dst.children[i]);
  }
  function exportPng(el, svg, title) {
    var w = svg.viewBox.baseVal.width || svg.clientWidth, h = svg.viewBox.baseVal.height || svg.clientHeight;
    var clone = svg.cloneNode(true);
    inlineStyles(svg, clone);
    var cs = getComputedStyle(el);
    var surface = cs.getPropertyValue('--rpt-surface') || '#fff', fg = cs.getPropertyValue('--rpt-fg') || '#242424', fg2 = cs.getPropertyValue('--rpt-fg-2') || '#424242';
    var legend = Array.prototype.slice.call(el.querySelectorAll('.rpt-legend span'));
    var top = 36, legendH = legend.length ? Math.ceil(legend.length / 3) * 20 + 8 : 0;
    var ns = 'http://www.w3.org/2000/svg';
    var out = document.createElementNS(ns, 'svg');
    var W = Math.max(w, 360) + 32, H = h + top + legendH + 16;
    out.setAttribute('xmlns', ns); out.setAttribute('width', W); out.setAttribute('height', H); out.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    out.innerHTML = '<rect width="100%" height="100%" fill="' + surface + '"/><text x="16" y="24" font-family="Segoe UI, sans-serif" font-size="15" font-weight="600" fill="' + fg + '">' + esc(title || '') + '</text>';
    var g = document.createElementNS(ns, 'g'); g.setAttribute('transform', 'translate(16,' + top + ')');
    clone.removeAttribute('role'); g.appendChild(clone); out.appendChild(g);
    legend.forEach(function (s, i) {
      var col = i % 3, row = Math.floor(i / 3), x = 16 + col * ((W - 32) / 3), y = top + h + 18 + row * 20;
      var c = getComputedStyle(s.querySelector('i')).backgroundColor;
      out.insertAdjacentHTML('beforeend', '<rect x="' + x + '" y="' + (y - 9) + '" width="10" height="10" rx="2" fill="' + c + '"/><text x="' + (x + 16) + '" y="' + y + '" font-family="Segoe UI, sans-serif" font-size="12" fill="' + fg2 + '">' + esc(s.textContent) + '</text>');
    });
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
      var cx = c.getContext('2d'); cx.scale(2, 2); cx.drawImage(img, 0, 0);
      c.toBlob(function (b) { if (b) download(slug(title) + '.png', b); });
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(out));
  }
  function runAction(el, act) {
    var x = el.__rptExport || {};
    var title = x.title || 'Datos';
    if (act === 'table' && x.table) { var t = x.table(); dialog(title + ' · datos', tableHtml(t.columns, t.rows)); }
    else if (act === 'detail' && x.detail) { var d = x.detail(); dialog(title + ' · detalle (' + d.rows.length + ' filas)', tableHtml(d.columns, d.rows)); }
    else if (act === 'csv') { var c = x.table ? x.table() : x.detail(); exportCsv(title, c.columns, c.rows); }
    else if (act === 'png' && x.svg) { var s = x.svg(); if (s) exportPng(el, s, title); }
    else if (act === 'expand' && x.expand) {
      dialog(title, '<div class="rpt-c"></div>', function (body) {
        var host = body.querySelector('.rpt-c');
        var p = JSON.parse(JSON.stringify(el.__rptProps || {}));
        if (el.__rptType === 'chart' || el.__rptType === 'scatter') p.height = Math.max(Number(p.height) || 260, Math.round(window.innerHeight * 0.55));
        if (el.__rptType === 'grid') p.pageSize = 25;
        p.title = '';
        renderComponent(host, el.__rptType, p, el.__rptSource, { interactive: false });
      });
    }
  }
  function cols(fields, names) { return names.map(function (n) { var f = fieldMeta(fields, n); return { name: n, label: f.label || n, type: f.type, format: f.format }; }); }
  function detailOf(src, rows) { return function () { return { columns: cols(src.fields, src.fields.map(function (f) { return f.name; })), rows: rows }; }; }

  /* ---------- componentes ---------- */
  var components = {};

  components.title = function (el, p) {
    var lvl = p.level === 'h3' ? 'h3' : 'h2';
    el.innerHTML = '<div class="rpt-title"><' + lvl + '>' + esc(p.text || 'Título') + '</' + lvl + '>' + (p.subtitle ? '<p>' + esc(p.subtitle) + '</p>' : '') + '</div>';
  };
  components.text = function (el, p) {
    el.innerHTML = '<div class="' + (p.card ? 'rpt-card ' : '') + 'rpt-text">' + esc(p.content || '') + '</div>';
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
      delta: prev ? (last - prev) / Math.abs(prev) : null,
      lastKey: data[data.length - 1].key
    };
  }

  components.tile = function (el, p, src, ctx) {
    var value = p.value;
    if (src && p.field) value = formatField(src.fields, p.field, aggregate(src.rows, p.field, p.agg), p.format);
    else if (src && p.agg === 'count') value = format(src.rows.length, p.format || 'integer');
    var accent = ACCENTS[p.color] || p.color || ACCENTS.brand;
    var spark = src && p.trendField ? sparkline(src.rows, p) : null;
    var sub = p.subtitle ? '<span>' + esc(p.subtitle) + '</span>' : '';
    if (spark && spark.delta != null && isFinite(spark.delta)) {
      var good = p.goodWhen === 'lower' ? spark.delta <= 0 : spark.delta >= 0;
      sub = '<span class="rpt-badge ' + (good ? 'is-good' : 'is-bad') + '">' + (spark.delta >= 0 ? '▲ ' : '▼ ') + esc(format(Math.abs(spark.delta), 'percent')) + '</span><span>vs anterior</span>' + sub;
    }
    el.innerHTML = '<div class="rpt-card rpt-tile" style="--rpt-accent:' + esc(accent) + '">' + (ctx.interactive && src ? menuBtn(true) : '') +
      (p.icon && ICONS[p.icon] ? '<div class="rpt-tile-icon"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[p.icon] + '</svg></div>' : '') +
      '<div class="rpt-tile-body"><div class="rpt-tile-label">' + esc(p.title || '') + '</div>' +
      '<div class="rpt-tile-value" title="' + esc(value) + '">' + esc(value == null ? '—' : value) + '</div>' +
      (sub ? '<div class="rpt-tile-sub">' + sub + '</div>' : '') + (spark ? spark.svg : '') + '</div></div>';
    if (src) el.__rptExport = { title: p.title || 'Loseta', detail: detailOf(src, src.rows) };
  };

  components.kpi = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    var v = p.field ? aggregate(src.rows, p.field, p.agg) : src.rows.length;
    var fmt = p.format || fieldMeta(src.fields, p.field).format;
    var target = p.targetField ? aggregate(src.rows, p.targetField, p.targetAgg || p.agg) : toNum(p.target);
    var h = '<div class="rpt-card rpt-kpi">' + (ctx.interactive ? menuBtn(true) : '') + '<div class="rpt-kpi-label">' + esc(p.label || labelOf(src.fields, p.field)) + '</div>' +
      '<div class="rpt-kpi-value">' + esc(formatField(src.fields, p.field, v, fmt)) + '</div>';
    if (!isNaN(target) && target) {
      var ratio = v / target, good = p.goodWhen !== 'lower' ? ratio >= 1 : ratio <= 1, delta = ratio - 1;
      h += '<div class="rpt-kpi-meta"><span class="rpt-badge ' + (good ? 'is-good' : 'is-bad') + '">' + (delta >= 0 ? '▲ ' : '▼ ') + esc(format(Math.abs(delta), 'percent')) + '</span>' +
        '<span>Objetivo ' + esc(format(target, fmt)) + '</span></div>' +
        '<div class="rpt-progress ' + (good ? 'is-good' : 'is-bad') + '" role="progressbar" aria-label="Progreso hacia el objetivo" aria-valuenow="' + Math.round(ratio * 100) + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + Math.max(0, Math.min(100, ratio * 100)) + '%"></span></div>';
    } else if (p.caption) h += '<div class="rpt-kpi-meta">' + esc(p.caption) + '</div>';
    el.innerHTML = h + '</div>';
    el.__rptExport = { title: p.label || 'Indicador', detail: detailOf(src, src.rows) };
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
    el.innerHTML = '<div class="rpt-card rpt-gauge">' + head(p, ctx) + '<div class="rpt-chart-body">' +
      svgEl(220, 136, inner, (p.title || 'Indicador') + ': ' + format(v, fmt) + (isNaN(target) ? '' : ', objetivo ' + format(target, fmt))) + '</div></div>';
    el.__rptExport = { title: p.title || 'Gauge', detail: detailOf(src, src.rows), svg: function () { return el.querySelector('svg'); } };
  };

  components.filter = function (el, p, src, ctx) {
    if (!src || !p.field) return empty(el, 'Elige origen y campo a filtrar');
    var f = fieldMeta(src.fields, p.field);
    var cur = state.filters[p.field];
    var mode = p.mode || 'select';
    var label = p.label || f.label || p.field;
    var id = (el.id || ctx.id || 'f') + '-in';
    var opts = uniq(src.rows.map(function (r) { return r[p.field]; }).filter(function (v) { return v != null && v !== ''; })).sort(cmpLabel).slice(0, 300);
    var h = '<div class="rpt-card rpt-filter">';
    if (mode === 'multi') {
      var sel = cur && cur.kind === 'in' ? cur.values : [];
      h += '<span class="rpt-filter-label" id="' + id + '">' + esc(label) + '</span><div class="rpt-chips" role="group" aria-labelledby="' + id + '">' +
        opts.map(function (o) { return '<button type="button" class="rpt-chip" data-v="' + esc(o) + '" aria-pressed="' + (sel.indexOf(String(o)) >= 0) + '">' + esc(format(o, f.format, f.type)) + '</button>'; }).join('') + '</div>';
    } else if (mode === 'search') {
      h += '<label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" class="rpt-input" type="search" placeholder="' + esc(p.placeholder || 'Contiene…') + '" value="' + esc(cur && cur.kind === 'text' ? cur.text : '') + '">';
    } else if (mode === 'range') {
      var t = f.type === 'date' ? 'date' : 'number';
      h += '<span class="rpt-filter-label" id="' + id + '">' + esc(label) + '</span><div class="rpt-filter-range" role="group" aria-labelledby="' + id + '">' +
        '<input class="rpt-input" type="' + t + '" data-k="min" aria-label="Desde" placeholder="Desde" value="' + esc(cur && cur.kind === 'range' ? cur.min || '' : '') + '"><span>–</span>' +
        '<input class="rpt-input" type="' + t + '" data-k="max" aria-label="Hasta" placeholder="Hasta" value="' + esc(cur && cur.kind === 'range' ? cur.max || '' : '') + '"></div>';
    } else {
      var v0 = cur && cur.kind === 'in' && cur.values.length === 1 ? cur.values[0] : '';
      h += '<label for="' + id + '">' + esc(label) + '</label><select id="' + id + '" class="rpt-select"><option value="">Todos</option>' +
        opts.map(function (o) { return '<option value="' + esc(o) + '"' + (String(o) === v0 ? ' selected' : '') + '>' + esc(format(o, f.format, f.type)) + '</option>'; }).join('') + '</select>';
    }
    el.innerHTML = h + '</div>';
    if (!ctx.interactive) return;
    var origin = ctx.id;
    if (mode === 'multi') el.querySelectorAll('.rpt-chip').forEach(function (b) { b.addEventListener('click', function () { toggleValue(p.field, b.getAttribute('data-v'), origin, true); }); });
    else if (mode === 'search') {
      var inp = el.querySelector('input'), tm;
      inp.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { setFilter({ field: p.field, kind: 'text', text: inp.value, origin: origin }); }, 250); });
    } else if (mode === 'range') {
      el.querySelectorAll('input').forEach(function (i) { i.addEventListener('change', function () { var a = el.querySelectorAll('input'); setFilter({ field: p.field, kind: 'range', min: a[0].value, max: a[1].value, origin: origin }); }); });
    } else {
      var s = el.querySelector('select');
      s.addEventListener('change', function () { setFilter({ field: p.field, kind: 'in', values: s.value ? [s.value] : [], origin: origin }); });
    }
  };

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

  components.grid = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    var columns = p.columns && p.columns.length ? p.columns : src.fields.map(function (f) { return f.name; });
    var st = el.__rptGrid || (el.__rptGrid = { page: 0, sort: p.sortBy || null, dir: p.sortDir || 'asc', q: '' });
    var pageSize = Number(p.pageSize) || 10;
    var rules = (p.rules || []).filter(function (r) { return r && r.field; });
    var bars = p.databars || [];
    var selVals = p.filterField && ctx.interactive && state.filters[p.filterField] ? state.filters[p.filterField].values || [] : [];
    function isNum(c) { return fieldMeta(src.fields, c).type === 'number'; }
    var current = src.rows;
    function draw() {
      var rows = src.rows;
      if (st.q) { var q = st.q.toLowerCase(); rows = rows.filter(function (r) { return columns.some(function (c) { return String(r[c] == null ? '' : r[c]).toLowerCase().indexOf(q) >= 0; }); }); }
      if (st.sort) {
        var s = st.sort, d = st.dir === 'desc' ? -1 : 1, num = isNum(s);
        rows = rows.slice().sort(function (a, b) { var x = a[s], y = b[s]; return num ? ((toNum(x) || 0) - (toNum(y) || 0)) * d : String(x == null ? '' : x).localeCompare(String(y == null ? '' : y), config.locale) * d; });
      }
      current = rows;
      var maxes = {};
      bars.forEach(function (b) { maxes[b] = Math.max.apply(null, rows.map(function (r) { return Math.abs(toNum(r[b]) || 0); }).concat([0])) || 1; });
      var pages = Math.max(1, Math.ceil(rows.length / pageSize));
      if (st.page >= pages) st.page = pages - 1;
      var slice = rows.slice(st.page * pageSize, st.page * pageSize + pageSize);
      var h = '<div class="rpt-card rpt-grid">' + head(p, ctx, rows.length + ' filas');
      if (p.search !== false) h += '<div class="rpt-grid-tools"><input class="rpt-input" type="search" placeholder="Buscar…" aria-label="Buscar en la tabla" value="' + esc(st.q) + '"></div>';
      h += '<div class="rpt-grid-wrap"><table class="rpt-table"><thead><tr>';
      columns.forEach(function (c) {
        var mark = st.sort === c ? '<span class="rpt-sort" aria-hidden="true">' + (st.dir === 'asc' ? '▲' : '▼') + '</span>' : '';
        h += '<th scope="col" class="has-btn ' + (isNum(c) ? 'is-num' : '') + '" aria-sort="' + (st.sort === c ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '"><button type="button" data-col="' + esc(c) + '">' + esc(labelOf(src.fields, c)) + mark + '</button></th>';
      });
      h += '</tr></thead><tbody>';
      if (!slice.length) h += '<tr><td colspan="' + columns.length + '" style="text-align:center;color:var(--rpt-fg-3)">Sin resultados</td></tr>';
      slice.forEach(function (r) {
        var key = p.filterField ? String(r[p.filterField]) : null;
        var cls = (p.filterField && ctx.interactive ? 'is-clickable' : '') + (key != null && selVals.indexOf(key) >= 0 ? ' is-sel' : '');
        h += '<tr' + (cls ? ' class="' + cls + '"' : '') + (key != null && ctx.interactive ? ' data-key="' + esc(key) + '" tabindex="0"' : '') + '>' + columns.map(function (c) {
          var f = fieldMeta(src.fields, c);
          var extra = rules.filter(function (rr) { return rr.field === c && ruleMatch(r[c], rr); }).map(function (rr) { return 'is-' + (rr.style || 'brand'); }).join(' ');
          if (f.type === 'boolean') { var b = r[c] === true || r[c] === 1 || r[c] === 'true'; return '<td class="' + extra + '"><span class="rpt-bool' + (b ? ' is-true' : '') + '"></span> ' + (b ? 'Sí' : 'No') + '</td>'; }
          var bar = bars.indexOf(c) >= 0 ? '<span class="rpt-databar" style="width:calc(' + Math.round((Math.abs(toNum(r[c]) || 0) / maxes[c]) * 100) + '% - 8px)"></span>' : '';
          return '<td class="' + (f.type === 'number' ? 'is-num ' : '') + extra + '">' + bar + '<span class="rpt-cell-v">' + esc(format(r[c], f.format, f.type)) + '</span></td>';
        }).join('') + '</tr>';
      });
      h += '</tbody>';
      if (p.totals) {
        h += '<tfoot><tr>' + columns.map(function (c, i) {
          if (isNum(c) && !/^id$|_id$/.test(c)) return '<td class="is-num">' + esc(formatField(src.fields, c, aggregate(rows, c, 'sum'))) + '</td>';
          return '<td>' + (i === 0 ? 'Total' : '') + '</td>';
        }).join('') + '</tr></tfoot>';
      }
      h += '</table></div>';
      if (pages > 1) {
        h += '<div class="rpt-pager"><span>Página ' + (st.page + 1) + ' de ' + pages + '</span><span class="rpt-pager-btns">' +
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
    el.__rptOnKey = p.filterField ? function (key, e) { toggleValue(p.filterField, key, ctx.id, e && (e.ctrlKey || e.metaKey)); } : null;
    el.__rptExport = {
      title: p.title || 'Tabla',
      table: function () { return { columns: cols(src.fields, columns), rows: current }; },
      expand: true
    };
    if (!el.__rptGridBound) {
      el.__rptGridBound = true;
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b || !el.__rptGrid) return;
        var s2 = el.__rptGrid;
        if (b.dataset.col) { if (s2.sort === b.dataset.col) s2.dir = s2.dir === 'asc' ? 'desc' : 'asc'; else { s2.sort = b.dataset.col; s2.dir = 'asc'; } s2.page = 0; }
        else if (b.dataset.page) s2.page += b.dataset.page === 'next' ? 1 : -1;
        else return;
        el.__rptDraw();
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
    var cells = {}, max = 0;
    var byRow = {};
    src.rows.forEach(function (r) { var k = String(r[p.rows]); (byRow[k] = byRow[k] || []).push(r); });
    rk.forEach(function (rkey) {
      var rr = byRow[String(rkey)] || [];
      if (ck.length) ck.forEach(function (c) { var v = aggregate(rr.filter(function (x) { return String(x[p.cols]) === String(c); }), p.value, p.agg); cells[rkey + '\u0000' + c] = v; if (v > max) max = v; });
      cells[rkey + '\u0000*'] = aggregate(rr, p.value, p.agg);
      if (!ck.length && cells[rkey + '\u0000*'] > max) max = cells[rkey + '\u0000*'];
    });
    var selVals = state.filters[p.rows] && ctx.interactive ? state.filters[p.rows].values || [] : [];
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
      ck.forEach(function (c) { h += '<td class="is-num is-total">' + esc(format(aggregate(src.rows.filter(function (x) { return String(x[p.cols]) === String(c); }), p.value, p.agg), fmt, 'number')) + '</td>'; });
      h += '<td class="is-num is-total">' + esc(format(aggregate(src.rows, p.value, p.agg), fmt, 'number')) + '</td></tr>';
    }
    el.innerHTML = h + '</tbody></table></div></div>';
    el.__rptOnKey = function (key, e) { toggleValue(p.rows, key, ctx.id, e && (e.ctrlKey || e.metaKey)); };
    el.__rptExport = {
      title: p.title || 'Tabla dinámica', expand: true, detail: detailOf(src, src.rows),
      table: function () {
        var columns = [{ name: '_k', label: labelOf(src.fields, p.rows) }].concat(ck.map(function (c, i) { return { name: '_' + i, label: String(c), type: 'number', format: fmt }; })).concat([{ name: '_t', label: 'Total', type: 'number', format: fmt }]);
        var rows = rk.map(function (rkey) { var o = { _k: rkey, _t: cells[rkey + '\u0000*'] }; ck.forEach(function (c, i) { o['_' + i] = cells[rkey + '\u0000' + c]; }); return o; });
        return { columns: columns, rows: rows };
      }
    };
  };

  function chartSummary(kind, title, data, fmtFn) {
    if (!data.length) return title + ': sin datos';
    var mx = data[0], mn = data[0];
    data.forEach(function (d) { if (d.values[0] > mx.values[0]) mx = d; if (d.values[0] < mn.values[0]) mn = d; });
    return kind + (title ? ': ' + title : '') + '. ' + data.length + ' categorías. Máximo ' + mx.key + ' (' + fmtFn(mx.values[0]) + '), mínimo ' + mn.key + ' (' + fmtFn(mn.values[0]) + ').';
  }
  var KIND = { column: 'Gráfico de columnas', bar: 'Gráfico de barras', line: 'Gráfico de líneas', area: 'Gráfico de área', donut: 'Gráfico de donut', pie: 'Gráfico de tarta', combo: 'Gráfico combinado' };

  components.chart = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    if (!p.category || !(p.values && p.values.length)) return empty(el, 'Elige campo de categoría y de valor');
    var type = p.type || 'column';
    var data = groupBy(src.rows, p.category, p.values, p.agg);
    if (p.sort === 'desc') data.sort(function (a, b) { return b.values[0] - a.values[0]; });
    else if (p.sort === 'asc') data.sort(function (a, b) { return a.values[0] - b.values[0]; });
    else if (p.sort === 'label') data.sort(function (a, b) { return cmpLabel(a.key, b.key); });
    if (p.limit) data = data.slice(0, Number(p.limit));
    var fmtOf = function (i) { return p.format || fieldMeta(src.fields, p.values[i]).format || 'number'; };
    var pal = colors(p, ctx);
    var clickable = ctx.interactive && p.crossFilter !== false;
    var sel = clickable && state.filters[p.category] && state.filters[p.category].origin === ctx.id ? state.filters[p.category].values : null;
    function markAttrs(key, label) {
      var cls = 'rpt-mark' + (clickable ? ' is-click' : '') + (sel ? (sel.indexOf(String(key)) >= 0 ? ' is-sel' : ' is-dim') : '');
      return ' class="' + cls + '"' + (clickable ? ' data-key="' + esc(key) + '" tabindex="0" role="button" aria-pressed="' + !!(sel && sel.indexOf(String(key)) >= 0) + '" aria-label="' + esc(label) + '"' : '');
    }
    var hint = clickable ? '<small>Clic para filtrar · Ctrl+clic para varios</small>' : '';

    el.innerHTML = '<div class="rpt-card rpt-chart">' + head(p, ctx) + '<div class="rpt-chart-body"></div></div>';
    var body = el.querySelector('.rpt-chart-body');
    var height = Number(p.height) || 260;
    var summary = chartSummary(KIND[type] || 'Gráfico', p.title, data, function (v) { return format(v, fmtOf(0)); });

    function draw() {
      var W = Math.max(200, Math.floor(body.clientWidth || 400));
      if (!data.length) { body.innerHTML = '<div class="rpt-empty">Sin datos</div>'; return; }
      if (type === 'donut' || type === 'pie') return drawPie(W);
      if (type === 'bar') return drawBar(W);
      return drawXY(W);
    }
    function legend(items) {
      return '<div class="rpt-legend">' + items.map(function (it) { return '<span' + (it.key != null && clickable ? ' data-key="' + esc(it.key) + '" class="rpt-mark is-click' + (sel ? (sel.indexOf(String(it.key)) >= 0 ? ' is-sel' : ' is-dim') : '') + '" tabindex="0" role="button"' : '') + '><i class="' + (it.line ? 'is-line' : '') + '" style="background:' + it.color + '"></i>' + esc(it.label) + (it.value != null ? ' <b>' + esc(it.value) + '</b>' : '') + '</span>'; }).join('') + '</div>';
    }
    function drawPie(W) {
      var size = Math.min(height, W, 240), r = size / 2, ir = type === 'donut' ? r * 0.62 : 0, cx = r, cy = r;
      var total = data.reduce(function (a, d) { return a + Math.max(0, d.values[0]); }, 0) || 1;
      var a0 = -Math.PI / 2, inner = '';
      data.forEach(function (d, i) {
        var v = Math.max(0, d.values[0]), a1 = a0 + (v / total) * Math.PI * 2;
        if (v / total >= 0.9999) a1 = a0 + Math.PI * 2 - 0.0001;
        var large = a1 - a0 > Math.PI ? 1 : 0;
        var p1 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p2 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
        var path = 'M' + p1 + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + p2;
        if (ir) { var p3 = [cx + ir * Math.cos(a1), cy + ir * Math.sin(a1)], p4 = [cx + ir * Math.cos(a0), cy + ir * Math.sin(a0)]; path += ' L' + p3 + ' A' + ir + ',' + ir + ' 0 ' + large + ' 0 ' + p4 + ' Z'; }
        else path += ' L' + cx + ',' + cy + ' Z';
        var txt = d.key + ': ' + format(d.values[0], fmtOf(0)) + ' (' + format(v / total, 'percent') + ')';
        inner += '<path' + markAttrs(d.key, txt) + ' d="' + path + '" fill="' + pal[i % pal.length] + '" stroke="var(--rpt-surface)" stroke-width="2" data-tip="' + esc('<b>' + esc(d.key) + '</b>' + esc(format(d.values[0], fmtOf(0))) + ' · ' + esc(format(v / total, 'percent')) + hint) + '"></path>';
        a0 = a1;
      });
      if (ir) inner += '<g class="rpt-donut-center"><text class="rpt-donut-total" x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle">' + esc(format(total, compactFmt(fmtOf(0)))) + '</text><text x="' + cx + '" y="' + (cy + 22) + '" text-anchor="middle">Total</text></g>';
      body.innerHTML = '<div class="rpt-donut-layout"><div style="width:' + size + 'px">' + svgEl(size, size, inner, summary) + '</div>' +
        legend(data.map(function (d, i) { return { key: d.key, color: pal[i % pal.length], label: d.key, value: format(d.values[0] / total, 'percent') }; })) + '</div>';
    }
    function drawXY(W) {
      var H = height, padL = 52, padB = 34, padT = 8;
      var series = p.values.length, isCombo = type === 'combo';
      var barIdx = isCombo ? [0] : type === 'column' ? p.values.map(function (_, i) { return i; }) : [];
      var lineIdx = isCombo ? p.values.map(function (_, i) { return i; }).slice(1) : type === 'column' ? [] : p.values.map(function (_, i) { return i; });
      var y2 = isCombo && p.y2 && lineIdx.length > 0;
      var padR = y2 ? 52 : 8;
      var stacked = !!p.stacked && type === 'column';
      var maxL = 0, maxR = 0;
      data.forEach(function (d) {
        if (stacked) maxL = Math.max(maxL, d.values.reduce(function (a, b) { return a + Math.max(0, b); }, 0));
        else barIdx.forEach(function (i) { maxL = Math.max(maxL, d.values[i]); });
        lineIdx.forEach(function (i) { if (y2) maxR = Math.max(maxR, d.values[i]); else maxL = Math.max(maxL, d.values[i]); });
      });
      maxL = niceMax(maxL); maxR = niceMax(maxR);
      var iw = W - padL - padR, ih = H - padB - padT, inner = '';
      for (var g = 0; g <= 4; g++) {
        var gy = padT + ih - (ih * g) / 4;
        inner += '<line class="rpt-gridline" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '"></line>' +
          '<text x="' + (padL - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + esc(format((maxL * g) / 4, compactFmt(fmtOf(barIdx[0] || 0)))) + '</text>';
        if (y2) inner += '<text x="' + (W - padR + 6) + '" y="' + (gy + 4) + '">' + esc(format((maxR * g) / 4, compactFmt(fmtOf(lineIdx[0])))) + '</text>';
      }
      var band = iw / data.length, every = Math.ceil(data.length / Math.max(1, Math.floor(iw / 64)));
      data.forEach(function (d, i) { if (i % every === 0) inner += '<text x="' + (padL + band * i + band / 2) + '" y="' + (H - padB + 16) + '" text-anchor="middle">' + esc(truncate(d.key, Math.max(4, Math.floor((band * every) / 7)))) + '</text>'; });
      if (barIdx.length) {
        var gw = band * 0.7, bw = stacked ? gw : gw / barIdx.length;
        data.forEach(function (d, i) {
          var acc = 0;
          barIdx.forEach(function (s, j) {
            var v = d.values[s], h = (Math.max(0, v) / maxL) * ih;
            var x = padL + band * i + (band - gw) / 2 + (stacked ? 0 : bw * j), y = padT + ih - h - (stacked ? acc : 0);
            if (stacked) acc += h;
            var txt = d.key + ', ' + labelOf(src.fields, p.values[s]) + ': ' + format(v, fmtOf(s));
            inner += '<rect' + markAttrs(d.key, txt) + ' x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(1, bw - (stacked ? 0 : 2)).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + pal[s % pal.length] + '" data-tip="' + esc('<b>' + esc(d.key) + '</b>' + esc(labelOf(src.fields, p.values[s])) + ': ' + esc(format(v, fmtOf(s))) + hint) + '"></rect>';
          });
        });
      }
      lineIdx.forEach(function (s) {
        var mx = y2 ? maxR : maxL;
        var pts = data.map(function (d, i) { return [padL + band * i + band / 2, padT + ih - (Math.max(0, d.values[s]) / mx) * ih]; });
        var line = pts.map(function (pt, i) { return (i ? 'L' : 'M') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1); }).join(' ');
        var col = pal[s % pal.length];
        if (type === 'area') inner += '<path d="' + line + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + (padT + ih) + ' L' + pts[0][0].toFixed(1) + ',' + (padT + ih) + ' Z" fill="' + col + '" opacity=".16"></path>';
        inner += '<path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"></path>';
        pts.forEach(function (pt, i) {
          var txt = data[i].key + ', ' + labelOf(src.fields, p.values[s]) + ': ' + format(data[i].values[s], fmtOf(s));
          inner += '<circle' + markAttrs(data[i].key, txt) + ' cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="' + (data.length > 40 ? 2.5 : 4) + '" fill="var(--rpt-surface)" stroke="' + col + '" stroke-width="2" data-tip="' + esc('<b>' + esc(data[i].key) + '</b>' + esc(labelOf(src.fields, p.values[s])) + ': ' + esc(format(data[i].values[s], fmtOf(s))) + hint) + '"></circle>';
        });
      });
      inner += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (padT + ih) + '" y2="' + (padT + ih) + '" style="stroke:var(--rpt-stroke)"></line>';
      body.innerHTML = svgEl(W, H, inner, summary) + (series > 1 ? legend(p.values.map(function (v, s) { return { color: pal[s % pal.length], label: labelOf(src.fields, v) + (y2 && s > 0 ? ' (eje dcho.)' : ''), line: lineIdx.indexOf(s) >= 0 }; })) : '');
    }
    function drawBar(W) {
      var rowH = 28, padL = Math.min(170, Math.max(70, W * 0.3)), padR = 70, H = data.length * rowH + 4;
      var maxV = 0; data.forEach(function (d) { maxV = Math.max(maxV, d.values[0]); }); maxV = maxV || 1;
      var iw = W - padL - padR, inner = '';
      data.forEach(function (d, i) {
        var w = (Math.max(0, d.values[0]) / maxV) * iw, y = i * rowH + 4;
        var txt = d.key + ': ' + format(d.values[0], fmtOf(0));
        inner += '<text x="' + (padL - 8) + '" y="' + (y + 15) + '" text-anchor="end">' + esc(truncate(d.key, Math.floor(padL / 6.5))) + '</text>' +
          '<rect' + markAttrs(d.key, txt) + ' x="' + padL + '" y="' + y + '" width="' + Math.max(1, w).toFixed(1) + '" height="' + (rowH - 10) + '" rx="2" fill="' + pal[p.multicolor ? i % pal.length : 0] + '" data-tip="' + esc('<b>' + esc(d.key) + '</b>' + esc(format(d.values[0], fmtOf(0))) + hint) + '"></rect>' +
          '<text x="' + (padL + w + 6).toFixed(1) + '" y="' + (y + 15) + '">' + esc(format(d.values[0], compactFmt(fmtOf(0)))) + '</text>';
      });
      body.innerHTML = svgEl(W, H, inner, summary);
    }

    draw();
    el.__rptOnKey = clickable ? function (key, e) { toggleValue(p.category, key, ctx.id, e && (e.ctrlKey || e.metaKey)); } : null;
    el.__rptExport = {
      title: p.title || 'Gráfico', expand: true,
      svg: function () { return body.querySelector('svg'); },
      table: function () {
        var columns = [{ name: '_k', label: labelOf(src.fields, p.category) }].concat(p.values.map(function (v, i) { return { name: '_' + i, label: labelOf(src.fields, v), type: 'number', format: fmtOf(i) }; }));
        return { columns: columns, rows: data.map(function (d) { var o = { _k: d.key }; d.values.forEach(function (v, i) { o['_' + i] = v; }); return o; }) };
      },
      detail: function () {
        var rows = sel ? src.rows.filter(function (r) { return sel.indexOf(String(r[p.category])) >= 0; }) : src.rows;
        return detailOf(src, rows)();
      }
    };
    observe(el, body, draw);
  };

  components.scatter = function (el, p, src, ctx) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    if (!p.x || !p.y) return empty(el, 'Elige los campos X e Y');
    var pal = colors(p, ctx);
    var groups = p.color ? uniq(src.rows.map(function (r) { return r[p.color]; })) : [null];
    var clickable = ctx.interactive && p.color && p.crossFilter !== false;
    var sel = clickable && state.filters[p.color] && state.filters[p.color].origin === ctx.id ? state.filters[p.color].values : null;
    el.innerHTML = '<div class="rpt-card rpt-chart">' + head(p, ctx) + '<div class="rpt-chart-body"></div></div>';
    var body = el.querySelector('.rpt-chart-body');
    var height = Number(p.height) || 280;
    var xs = src.rows.map(function (r) { return toNum(r[p.x]); }).filter(function (v) { return !isNaN(v); });
    var ys = src.rows.map(function (r) { return toNum(r[p.y]); }).filter(function (v) { return !isNaN(v); });
    var ss = p.size ? src.rows.map(function (r) { return toNum(r[p.size]) || 0; }) : [];
    var maxS = ss.length ? Math.max.apply(null, ss) || 1 : 1;
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
      src.rows.forEach(function (r, i) {
        var x = toNum(r[p.x]), y = toNum(r[p.y]); if (isNaN(x) || isNaN(y)) return;
        var gi = p.color ? groups.indexOf(r[p.color]) : 0, key = p.color ? String(r[p.color]) : null;
        var rad = p.size ? 4 + Math.sqrt((toNum(r[p.size]) || 0) / maxS) * 12 : 5;
        var lab = (p.label ? r[p.label] + ' · ' : '') + labelOf(src.fields, p.x) + ': ' + formatField(src.fields, p.x, x) + ', ' + labelOf(src.fields, p.y) + ': ' + formatField(src.fields, p.y, y);
        var cls = 'rpt-mark' + (clickable ? ' is-click' : '') + (sel ? (sel.indexOf(key) >= 0 ? ' is-sel' : ' is-dim') : '');
        inner += '<circle class="' + cls + '"' + (clickable ? ' data-key="' + esc(key) + '" tabindex="0" role="button" aria-label="' + esc(lab) + '"' : '') + ' cx="' + fx(x).toFixed(1) + '" cy="' + fy(y).toFixed(1) + '" r="' + rad.toFixed(1) + '" fill="' + pal[gi % pal.length] + '" fill-opacity=".7" stroke="' + pal[gi % pal.length] + '" data-tip="' + esc('<b>' + esc(p.label ? r[p.label] : (key || '')) + '</b>' + esc(labelOf(src.fields, p.x)) + ': ' + esc(formatField(src.fields, p.x, x)) + '<br>' + esc(labelOf(src.fields, p.y)) + ': ' + esc(formatField(src.fields, p.y, y)) + (p.size ? '<br>' + esc(labelOf(src.fields, p.size)) + ': ' + esc(formatField(src.fields, p.size, r[p.size])) : '')) + '"></circle>';
      });
      body.innerHTML = svgEl(W, H, inner, 'Gráfico de dispersión' + (p.title ? ': ' + p.title : '') + '. ' + xs.length + ' puntos.') +
        (p.color ? '<div class="rpt-legend">' + groups.map(function (gk, i) { return '<span><i style="background:' + pal[i % pal.length] + '"></i>' + esc(gk) + '</span>'; }).join('') + '</div>' : '');
    }
    draw();
    el.__rptOnKey = clickable ? function (key, e) { toggleValue(p.color, key, ctx.id, e && (e.ctrlKey || e.metaKey)); } : null;
    el.__rptExport = {
      title: p.title || 'Dispersión', expand: true, svg: function () { return body.querySelector('svg'); },
      table: function () { return { columns: cols(src.fields, [p.label, p.color, p.x, p.y, p.size].filter(Boolean)), rows: src.rows }; }
    };
    observe(el, body, draw);
  };

  function observe(el, body, draw) {
    if (!global.ResizeObserver) return;
    if (el.__rptRO) el.__rptRO.disconnect();
    var last = body.clientWidth;
    el.__rptRO = new ResizeObserver(function () { var w = body.clientWidth; if (Math.abs(w - last) > 4) { last = w; draw(); } });
    el.__rptRO.observe(body);
  }
  function empty(el, msg) { el.innerHTML = '<div class="rpt-empty">' + esc(msg) + '</div>'; el.__rptExport = null; }

  /* ---------- API ---------- */
  function readProps(el) {
    var raw = el.getAttribute('data-props');
    if (!raw) { var s = el.querySelector('script[type="application/json"]'); raw = s && s.textContent; }
    try { return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
  }
  function bindOnce(el) {
    if (el.__rptBound) return;
    el.__rptBound = true;
    bindTips(el);
    el.addEventListener('click', function (e) {
      var mb = e.target.closest('.rpt-menu-btn');
      if (mb && el.contains(mb) && !mb.closest('.rpt-dialog')) { e.stopPropagation(); openMenu(el, mb); return; }
      var k = e.target.closest('[data-key]');
      if (k && el.contains(k) && el.__rptOnKey && !e.target.closest('button:not([data-key])')) el.__rptOnKey(k.getAttribute('data-key'), e);
    });
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var k = e.target.closest('[data-key]');
      if (k && e.target === k && el.__rptOnKey) { e.preventDefault(); el.__rptOnKey(k.getAttribute('data-key'), e); }
    });
  }
  /** Pinta un componente suelto (lo usa el diseñador). opts: { interactive, palette } */
  function renderComponent(el, type, props, source, opts) {
    opts = opts || {};
    el.classList.add('rpt-c');
    var fn = components[type];
    el.__rptType = type; el.__rptProps = props || {}; el.__rptSource = source || null;
    if (!fn) return empty(el, 'Componente desconocido: ' + type);
    var ctx = { interactive: !!opts.interactive, id: opts.id || el.id || el.getAttribute('data-rpt-id') || null, palette: opts.palette };
    var view = source ? { fields: source.fields || [], rows: opts.rows || source.rows || [], allRows: source.rows || [] } : null;
    try { fn(el, props || {}, view, ctx); }
    catch (e) { empty(el, 'Error al renderizar: ' + e.message); if (global.console) console.error(e); }
    bindOnce(el);
  }
  function renderItem(it) {
    var data = state.data || { sources: {} };
    var src = it.srcId ? (data.sources || {})[it.srcId] : null;
    if (it.srcId && !src) { it.el.classList.add('rpt-c'); return empty(it.el, 'Sin datos para el origen «' + it.srcId + '»'); }
    renderComponent(it.el, it.type, it.props, src, { interactive: true, id: it.id, rows: src ? filterRows(src, it.id, it.type === 'filter' ? it.props.field : null) : null });
  }
  function filterBar() {
    var host = document.querySelector('.rpt-report');
    if (!host) return;
    var bar = host.querySelector('.rpt-filterbar');
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'rpt-filterbar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Filtros activos'); bar.setAttribute('aria-live', 'polite');
      var hd = host.querySelector('.rpt-report-header');
      if (hd) hd.insertAdjacentElement('afterend', bar); else host.insertBefore(bar, host.firstChild);
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.classList.contains('rpt-clear')) clearFilters(); else removeFilter(b.getAttribute('data-field'));
      });
    }
    var keys = Object.keys(state.filters);
    bar.innerHTML = keys.length ? keys.map(function (k) { var d = describeFilter(state.filters[k]); return '<button type="button" class="rpt-chip" data-field="' + esc(k) + '" aria-label="Quitar filtro ' + esc(d.label) + '"><span>' + esc(d.label) + ': <b>' + esc(d.value) + '</b></span> ✕</button>'; }).join('') + (keys.length > 1 ? '<button type="button" class="rpt-clear">Quitar filtros</button>' : '') : '';
  }
  function refresh() {
    var active = document.activeElement;
    state.items.forEach(function (it) {
      if (!document.body.contains(it.el)) return;
      if (it.type === 'filter' && active && it.el.contains(active) && active.tagName === 'INPUT') return; // no robar el foco al escribir
      renderItem(it);
    });
    filterBar();
  }
  function render(root, data) {
    root = root || document;
    state.data = data || global.RPT_DATA || { sources: {} };
    config.palette = html.getAttribute('data-rpt-palette') || config.palette;
    state.fieldLabels = {};
    Object.keys(state.data.sources || {}).forEach(function (k) { (state.data.sources[k].fields || []).forEach(function (f) { if (!state.fieldLabels[f.name]) state.fieldLabels[f.name] = f.label || f.name; }); });
    var nodes = root.querySelectorAll('[data-rpt]');
    state.items = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var id = el.id || el.getAttribute('data-rpt-id') || ('rpt-c-' + i);
      el.setAttribute('data-rpt-id', id);
      state.items.push({ el: el, type: el.getAttribute('data-rpt'), props: readProps(el), srcId: el.getAttribute('data-source'), id: id });
    }
    refresh();
  }
  function autoInit() {
    if (html.hasAttribute('data-rpt-manual')) return;
    var meta = document.querySelector('meta[name="rpt-data-url"]');
    if (!global.RPT_DATA && meta && global.fetch) {
      fetch(meta.content, { credentials: 'include' }).then(function (r) { return r.json(); }).then(function (d) { global.RPT_DATA = d; render(document, d); })
        .catch(function (e) { if (global.console) console.error('RptLib: no se pudieron cargar los datos', e); render(document, { sources: {} }); });
    } else render(document);
  }
  global.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.type === 'rpt:print') global.print();
    else if (d.type === 'rpt:clearFilters') clearFilters();
    else if (d.type === 'rpt:setFilters' && d.filters) { state.filters = d.filters; emit(); refresh(); }
  });

  global.RptLib = {
    version: VERSION, config: config, palettes: PALETTES, accents: ACCENTS, icons: Object.keys(ICONS), components: components,
    render: render, refresh: refresh, renderComponent: renderComponent,
    setFilter: setFilter, removeFilter: removeFilter, clearFilters: clearFilters, getFilters: getFilters, toggleValue: toggleValue,
    onFilters: function (fn) { state.listeners.push(fn); return function () { state.listeners = state.listeners.filter(function (x) { return x !== fn; }); }; },
    format: format, aggregate: aggregate, groupBy: groupBy, toCsv: toCsv, exportCsv: exportCsv
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit); else autoInit();
})(window);
