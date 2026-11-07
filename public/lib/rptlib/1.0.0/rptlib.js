/*! RptLib 1.0.0 — librería de componentes de informe (estilo Fluent). Sin dependencias.
 *
 * Uso en un informe HTML:
 *   <link rel="stylesheet" href="https://<host>/lib/rptlib/1.0.0/rptlib.css">
 *   <script src="https://<host>/lib/rptlib/1.0.0/rptlib.js" defer></script>
 *   <div data-rpt="chart" data-source="ventas" data-props='{"type":"donut","category":"region","values":["total"]}'></div>
 *
 * Datos: el host inyecta `window.RPT_DATA = { sources: { <id>: { fields: [...], rows: [...] } }, params: {...} }`
 * o el propio informe declara <meta name="rpt-data-url" content="https://api/.../data"> para descargarlos.
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';
  var PALETTE = ['#0f6cbd', '#e3008c', '#2aa0a4', '#d06228', '#7160e8', '#13a10e', '#c239b3', '#986f0b', '#4f6bed', '#ca5010', '#038387', '#8764b8'];
  var ACCENTS = { brand: '#0f6cbd', green: '#107c10', red: '#c50f1f', orange: '#da3b01', purple: '#8764b8', teal: '#038387', pink: '#e3008c', yellow: '#986f0b' };
  var ICONS = {
    money: '<path d="M3 6h18v12H3z" fill="none" stroke="currentColor" stroke-width="1.6" rx="2"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    cart: '<path d="M3 4h2l2.4 10.5h10.2L20 7H6.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="9" cy="19" r="1.4" fill="currentColor"/><circle cx="17" cy="19" r="1.4" fill="currentColor"/>',
    people: '<circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5M16 5.2a3 3 0 0 1 0 5.6M18 14.4c1.6.7 2.6 2.2 3 4.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    box: '<path d="M12 3 4 7v10l8 4 8-4V7z M4 7l8 4 8-4 M12 11v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    chart: '<path d="M4 20V4 M4 20h16 M8 16v-5 M12 16V8 M16 16v-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    check: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m8 12.3 2.7 2.7L16 9.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    alert: '<path d="M12 3.5 2.8 19.5h18.4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 10v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="16.8" r="1" fill="currentColor"/>',
    clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'
  };

  var config = { locale: (document.documentElement.lang || 'es-ES'), currency: 'EUR' };

  /* ---------- utilidades ---------- */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toNum(v) {
    if (typeof v === 'number') return v;
    if (v == null || v === '') return NaN;
    var n = Number(v);
    return n;
  }
  function fieldMeta(fields, name) {
    for (var i = 0; fields && i < fields.length; i++) if (fields[i].name === name) return fields[i];
    return { name: name, label: name, type: 'string' };
  }
  function labelOf(fields, name) { var f = fieldMeta(fields, name); return f.label || f.name; }

  function format(value, fmt, type) {
    if (value == null || value === '') return '—';
    fmt = fmt || (type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'boolean' ? 'boolean' : 'text');
    try {
      switch (fmt) {
        case 'integer': return new Intl.NumberFormat(config.locale, { maximumFractionDigits: 0 }).format(toNum(value));
        case 'number': return new Intl.NumberFormat(config.locale, { maximumFractionDigits: 2 }).format(toNum(value));
        case 'currency': return new Intl.NumberFormat(config.locale, { style: 'currency', currency: config.currency }).format(toNum(value));
        case 'compact': return new Intl.NumberFormat(config.locale, { notation: 'compact', maximumFractionDigits: 1 }).format(toNum(value));
        case 'compactCurrency': return new Intl.NumberFormat(config.locale, { style: 'currency', currency: config.currency, notation: 'compact', maximumFractionDigits: 1 }).format(toNum(value));
        case 'percent': return new Intl.NumberFormat(config.locale, { style: 'percent', maximumFractionDigits: 1 }).format(toNum(value));
        case 'date': {
          var d = new Date(value);
          return isNaN(d) ? String(value) : new Intl.DateTimeFormat(config.locale, { dateStyle: 'medium' }).format(d);
        }
        case 'boolean': return value === true || value === 1 || value === 'true' ? 'Sí' : 'No';
        default: return String(value);
      }
    } catch (e) { return String(value); }
  }
  function formatField(fields, name, value, override) {
    var f = fieldMeta(fields, name);
    return format(value, override || f.format, f.type);
  }

  function aggregate(rows, field, agg) {
    agg = agg || 'sum';
    if (agg === 'count') return rows.length;
    if (agg === 'countDistinct') {
      var seen = {}; var c = 0;
      rows.forEach(function (r) { var k = String(r[field]); if (!seen[k]) { seen[k] = 1; c++; } });
      return c;
    }
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
    var map = {}; var order = [];
    rows.forEach(function (r) {
      var k = r[category] == null ? '(vacío)' : String(r[category]);
      if (!map[k]) { map[k] = []; order.push(k); }
      map[k].push(r);
    });
    return order.map(function (k) {
      return { key: k, values: values.map(function (v) { return aggregate(map[k], v, agg) || 0; }) };
    });
  }

  function svgEl(w, h, inner) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img">' + inner + '</svg>';
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function truncate(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /* ---------- tooltip compartido ---------- */
  var tipEl = null;
  function tip() {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'rpt-tooltip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
    return tipEl;
  }
  function bindTips(root) {
    function show(e) {
      var t = e.target.closest && e.target.closest('[data-tip]');
      if (!t || !root.contains(t)) return;
      var el = tip(); el.innerHTML = t.getAttribute('data-tip'); el.classList.add('is-on');
      var x = e.clientX || (t.getBoundingClientRect().left + 10), y = e.clientY || t.getBoundingClientRect().top;
      var w = el.offsetWidth, vw = window.innerWidth;
      el.style.left = Math.max(8, Math.min(vw - w - 8, x + 12)) + 'px';
      el.style.top = Math.max(8, y - el.offsetHeight - 10) + 'px';
    }
    function hide() { if (tipEl) tipEl.classList.remove('is-on'); }
    root.addEventListener('pointermove', show);
    root.addEventListener('pointerdown', show);
    root.addEventListener('pointerleave', hide);
  }

  /* ---------- componentes ---------- */
  var components = {};

  components.title = function (el, p) {
    var lvl = p.level === 'h3' ? 'h3' : 'h2';
    el.innerHTML = '<div class="rpt-title"><' + lvl + '>' + esc(p.text || 'Título') + '</' + lvl + '>' + (p.subtitle ? '<p>' + esc(p.subtitle) + '</p>' : '') + '</div>';
  };

  components.text = function (el, p) {
    el.innerHTML = '<div class="' + (p.card ? 'rpt-card ' : '') + 'rpt-text">' + esc(p.content || '') + '</div>';
  };

  components.tile = function (el, p, src) {
    var value = p.value;
    if (src && p.field) value = formatField(src.fields, p.field, aggregate(src.rows, p.field, p.agg), p.format);
    else if (src && p.agg === 'count') value = format(src.rows.length, p.format || 'integer');
    var accent = ACCENTS[p.color] || p.color || ACCENTS.brand;
    el.innerHTML = '<div class="rpt-card rpt-tile" style="--rpt-accent:' + esc(accent) + '">' +
      (p.icon && ICONS[p.icon] ? '<div class="rpt-tile-icon"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[p.icon] + '</svg></div>' : '') +
      '<div class="rpt-tile-body"><div class="rpt-tile-label">' + esc(p.title || '') + '</div>' +
      '<div class="rpt-tile-value" title="' + esc(value) + '">' + esc(value == null ? '—' : value) + '</div>' +
      (p.subtitle ? '<div class="rpt-tile-sub">' + esc(p.subtitle) + '</div>' : '') + '</div></div>';
  };

  components.kpi = function (el, p, src) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    var v = p.field ? aggregate(src.rows, p.field, p.agg) : src.rows.length;
    var fmt = p.format || fieldMeta(src.fields, p.field).format;
    var target = p.targetField ? aggregate(src.rows, p.targetField, p.targetAgg || p.agg) : toNum(p.target);
    var html = '<div class="rpt-card rpt-kpi"><div class="rpt-kpi-label">' + esc(p.label || labelOf(src.fields, p.field)) + '</div>' +
      '<div class="rpt-kpi-value">' + esc(formatField(src.fields, p.field, v, fmt)) + '</div>';
    if (!isNaN(target) && target) {
      var ratio = v / target;
      var higher = p.goodWhen !== 'lower';
      var good = higher ? ratio >= 1 : ratio <= 1;
      var delta = ratio - 1;
      html += '<div class="rpt-kpi-meta"><span class="rpt-badge ' + (good ? 'is-good' : 'is-bad') + '">' + (delta >= 0 ? '▲ ' : '▼ ') + esc(format(Math.abs(delta), 'percent')) + '</span>' +
        '<span>Objetivo ' + esc(format(target, fmt)) + '</span></div>' +
        '<div class="rpt-progress ' + (good ? 'is-good' : 'is-bad') + '" role="progressbar" aria-valuenow="' + Math.round(ratio * 100) + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + Math.max(0, Math.min(100, ratio * 100)) + '%"></span></div>';
    } else if (p.caption) {
      html += '<div class="rpt-kpi-meta">' + esc(p.caption) + '</div>';
    }
    el.innerHTML = html + '</div>';
  };

  components.grid = function (el, p, src) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    var cols = (p.columns && p.columns.length ? p.columns : src.fields.map(function (f) { return f.name; }));
    var state = el.__rptGrid || (el.__rptGrid = { page: 0, sort: p.sortBy || null, dir: p.sortDir || 'asc', q: '' });
    var pageSize = Number(p.pageSize) || 10;

    function isNum(c) { return fieldMeta(src.fields, c).type === 'number'; }
    function draw() {
      var rows = src.rows;
      if (state.q) {
        var q = state.q.toLowerCase();
        rows = rows.filter(function (r) { return cols.some(function (c) { return String(r[c] == null ? '' : r[c]).toLowerCase().indexOf(q) >= 0; }); });
      }
      if (state.sort) {
        var s = state.sort, d = state.dir === 'desc' ? -1 : 1, num = isNum(s);
        rows = rows.slice().sort(function (a, b) {
          var x = a[s], y = b[s];
          if (num) return ((toNum(x) || 0) - (toNum(y) || 0)) * d;
          return String(x == null ? '' : x).localeCompare(String(y == null ? '' : y), config.locale) * d;
        });
      }
      var pages = Math.max(1, Math.ceil(rows.length / pageSize));
      if (state.page >= pages) state.page = pages - 1;
      var slice = rows.slice(state.page * pageSize, state.page * pageSize + pageSize);

      var h = '<div class="rpt-card rpt-grid">' + (p.title ? '<div class="rpt-card-title">' + esc(p.title) + '<span class="rpt-card-sub">' + rows.length + ' filas</span></div>' : '');
      if (p.search !== false) h += '<div class="rpt-grid-tools"><input class="rpt-input" type="search" placeholder="Buscar…" aria-label="Buscar en la tabla" value="' + esc(state.q) + '"></div>';
      h += '<div class="rpt-grid-wrap"><table class="rpt-table"><thead><tr>';
      cols.forEach(function (c) {
        var mark = state.sort === c ? '<span class="rpt-sort">' + (state.dir === 'asc' ? '▲' : '▼') + '</span>' : '';
        h += '<th class="' + (isNum(c) ? 'is-num' : '') + '" aria-sort="' + (state.sort === c ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '"><button type="button" data-col="' + esc(c) + '">' + esc(labelOf(src.fields, c)) + mark + '</button></th>';
      });
      h += '</tr></thead><tbody>';
      if (!slice.length) h += '<tr><td colspan="' + cols.length + '" style="text-align:center;color:var(--rpt-fg-3)">Sin resultados</td></tr>';
      slice.forEach(function (r) {
        h += '<tr>' + cols.map(function (c) {
          var f = fieldMeta(src.fields, c);
          if (f.type === 'boolean') { var b = r[c] === true || r[c] === 1 || r[c] === 'true'; return '<td><span class="rpt-bool' + (b ? ' is-true' : '') + '"></span> ' + (b ? 'Sí' : 'No') + '</td>'; }
          return '<td class="' + (f.type === 'number' ? 'is-num' : '') + '">' + esc(format(r[c], f.format, f.type)) + '</td>';
        }).join('') + '</tr>';
      });
      h += '</tbody>';
      if (p.totals) {
        h += '<tfoot><tr>' + cols.map(function (c, i) {
          if (isNum(c)) return '<td class="is-num">' + esc(formatField(src.fields, c, aggregate(rows, c, 'sum'))) + '</td>';
          return '<td>' + (i === 0 ? 'Total' : '') + '</td>';
        }).join('') + '</tr></tfoot>';
      }
      h += '</table></div>';
      if (pages > 1) {
        h += '<div class="rpt-pager"><span>Página ' + (state.page + 1) + ' de ' + pages + '</span><span class="rpt-pager-btns">' +
          '<button type="button" class="rpt-btn" data-page="prev"' + (state.page === 0 ? ' disabled' : '') + '>Anterior</button>' +
          '<button type="button" class="rpt-btn" data-page="next"' + (state.page >= pages - 1 ? ' disabled' : '') + '>Siguiente</button></span></div>';
      }
      el.innerHTML = h + '</div>';
      var input = el.querySelector('input');
      if (input) input.addEventListener('input', function () {
        state.q = input.value; state.page = 0;
        var pos = input.selectionStart; draw();
        var ni = el.querySelector('input'); ni.focus(); try { ni.setSelectionRange(pos, pos); } catch (e) { /* noop */ }
      });
    }
    if (!el.__rptGridBound) {
      el.__rptGridBound = true;
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var st = el.__rptGrid;
        if (b.dataset.col) {
          if (st.sort === b.dataset.col) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = b.dataset.col; st.dir = 'asc'; }
          st.page = 0;
        } else if (b.dataset.page) st.page += b.dataset.page === 'next' ? 1 : -1;
        el.__rptDraw();
      });
    }
    el.__rptDraw = draw;
    draw();
  };

  components.chart = function (el, p, src) {
    if (!src) return empty(el, 'Vincula un origen de datos');
    if (!p.category || !(p.values && p.values.length)) return empty(el, 'Elige campo de categoría y de valor');
    var type = p.type || 'column';
    var data = groupBy(src.rows, p.category, p.values, p.agg);
    if (p.sort === 'desc') data.sort(function (a, b) { return b.values[0] - a.values[0]; });
    else if (p.sort === 'asc') data.sort(function (a, b) { return a.values[0] - b.values[0]; });
    else if (p.sort === 'label') data.sort(function (a, b) { return a.key.localeCompare(b.key, config.locale, { numeric: true }); });
    if (p.limit) data = data.slice(0, Number(p.limit));
    var fmtOf = function (i) { return p.format || fieldMeta(src.fields, p.values[i]).format || 'number'; };
    var colors = p.colors && p.colors.length ? p.colors : PALETTE;

    el.innerHTML = '<div class="rpt-card rpt-chart">' + (p.title ? '<div class="rpt-card-title">' + esc(p.title) + '</div>' : '') + '<div class="rpt-chart-body"></div></div>';
    var body = el.querySelector('.rpt-chart-body');
    var height = Number(p.height) || 260;

    function draw() {
      var W = Math.max(200, Math.floor(body.clientWidth || 400));
      if (!data.length) { body.innerHTML = '<div class="rpt-empty">Sin datos</div>'; return; }
      if (type === 'donut' || type === 'pie') return drawPie(W);
      if (type === 'bar') return drawBar(W);
      return drawXY(W);
    }

    function legend(items) {
      return '<div class="rpt-legend">' + items.map(function (it) { return '<span><i style="background:' + it.color + '"></i>' + esc(it.label) + (it.value != null ? ' <b>' + esc(it.value) + '</b>' : '') + '</span>'; }).join('') + '</div>';
    }

    function drawPie(W) {
      var size = Math.min(height, W, 240), r = size / 2, ir = type === 'donut' ? r * 0.62 : 0, cx = r, cy = r;
      var total = data.reduce(function (a, d) { return a + Math.max(0, d.values[0]); }, 0) || 1;
      var a0 = -Math.PI / 2, inner = '';
      data.forEach(function (d, i) {
        var v = Math.max(0, d.values[0]); var a1 = a0 + (v / total) * Math.PI * 2;
        if (v / total >= 0.9999) a1 = a0 + Math.PI * 2 - 0.0001;
        var large = a1 - a0 > Math.PI ? 1 : 0;
        var p1 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p2 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
        var path = 'M' + p1 + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + p2;
        if (ir) {
          var p3 = [cx + ir * Math.cos(a1), cy + ir * Math.sin(a1)], p4 = [cx + ir * Math.cos(a0), cy + ir * Math.sin(a0)];
          path += ' L' + p3 + ' A' + ir + ',' + ir + ' 0 ' + large + ' 0 ' + p4 + ' Z';
        } else path += ' L' + cx + ',' + cy + ' Z';
        var tipTxt = '<b>' + esc(d.key) + '</b>' + esc(format(d.values[0], fmtOf(0))) + ' · ' + esc(format(v / total, 'percent'));
        inner += '<path class="rpt-mark" d="' + path + '" fill="' + colors[i % colors.length] + '" stroke="var(--rpt-surface)" stroke-width="2" data-tip="' + esc(tipTxt) + '"></path>';
        a0 = a1;
      });
      if (ir) inner += '<g class="rpt-donut-center"><text class="rpt-donut-total" x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle">' + esc(format(total, p.format === 'currency' || fmtOf(0) === 'currency' ? 'compactCurrency' : 'compact')) + '</text><text x="' + cx + '" y="' + (cy + 22) + '" text-anchor="middle">Total</text></g>';
      body.innerHTML = '<div class="rpt-donut-layout"><div style="width:' + size + 'px">' + svgEl(size, size, inner) + '</div>' +
        legend(data.map(function (d, i) { return { color: colors[i % colors.length], label: d.key, value: format(d.values[0] / total, 'percent') }; })) + '</div>';
    }

    function drawXY(W) {
      var H = height, padL = 52, padB = 34, padT = 8, padR = 8;
      var series = p.values.length;
      var stacked = !!p.stacked && type === 'column';
      var maxV = 0;
      data.forEach(function (d) {
        if (stacked) maxV = Math.max(maxV, d.values.reduce(function (a, b) { return a + Math.max(0, b); }, 0));
        else d.values.forEach(function (v) { maxV = Math.max(maxV, v); });
      });
      maxV = niceMax(maxV);
      var iw = W - padL - padR, ih = H - padB - padT;
      var inner = '';
      for (var g = 0; g <= 4; g++) {
        var gy = padT + ih - (ih * g) / 4;
        inner += '<line class="rpt-gridline" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '"></line>' +
          '<text x="' + (padL - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + esc(format((maxV * g) / 4, 'compact')) + '</text>';
      }
      var band = iw / data.length;
      var every = Math.ceil(data.length / Math.max(1, Math.floor(iw / 64)));
      data.forEach(function (d, i) {
        if (i % every === 0) inner += '<text x="' + (padL + band * i + band / 2) + '" y="' + (H - padB + 16) + '" text-anchor="middle">' + esc(truncate(d.key, Math.max(4, Math.floor((band * every) / 7)))) + '</text>';
      });
      if (type === 'column') {
        var gw = band * 0.7, bw = stacked ? gw : gw / series;
        data.forEach(function (d, i) {
          var acc = 0;
          d.values.forEach(function (v, s) {
            var h = (Math.max(0, v) / maxV) * ih;
            var x = padL + band * i + (band - gw) / 2 + (stacked ? 0 : bw * s);
            var y = padT + ih - h - (stacked ? acc : 0);
            if (stacked) acc += h;
            var t = '<b>' + esc(d.key) + '</b>' + esc(labelOf(src.fields, p.values[s])) + ': ' + esc(format(v, fmtOf(s)));
            inner += '<rect class="rpt-mark" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(1, bw - (stacked ? 0 : 2)).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + colors[s % colors.length] + '" data-tip="' + esc(t) + '"></rect>';
          });
        });
      } else {
        for (var s = 0; s < series; s++) {
          var pts = data.map(function (d, i) { return [padL + band * i + band / 2, padT + ih - (Math.max(0, d.values[s]) / maxV) * ih]; });
          var line = pts.map(function (pt, i) { return (i ? 'L' : 'M') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1); }).join(' ');
          if (type === 'area') inner += '<path d="' + line + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + (padT + ih) + ' L' + pts[0][0].toFixed(1) + ',' + (padT + ih) + ' Z" fill="' + colors[s % colors.length] + '" opacity=".16"></path>';
          inner += '<path d="' + line + '" fill="none" stroke="' + colors[s % colors.length] + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>';
          pts.forEach(function (pt, i) {
            var t = '<b>' + esc(data[i].key) + '</b>' + esc(labelOf(src.fields, p.values[s])) + ': ' + esc(format(data[i].values[s], fmtOf(s)));
            inner += '<circle class="rpt-mark" cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="' + (data.length > 40 ? 2.5 : 4) + '" fill="var(--rpt-surface)" stroke="' + colors[s % colors.length] + '" stroke-width="2" data-tip="' + esc(t) + '"></circle>';
          });
        }
      }
      inner += '<line class="rpt-gridline" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (padT + ih) + '" y2="' + (padT + ih) + '" style="stroke:var(--rpt-stroke)"></line>';
      body.innerHTML = svgEl(W, H, inner) + (series > 1 ? legend(p.values.map(function (v, s) { return { color: colors[s % colors.length], label: labelOf(src.fields, v) }; })) : '');
    }

    function drawBar(W) {
      var rowH = 28, padL = Math.min(160, Math.max(70, W * 0.3)), padR = 70;
      var H = data.length * rowH + 4;
      var maxV = 0; data.forEach(function (d) { maxV = Math.max(maxV, d.values[0]); });
      maxV = maxV || 1;
      var iw = W - padL - padR, inner = '';
      data.forEach(function (d, i) {
        var w = (Math.max(0, d.values[0]) / maxV) * iw, y = i * rowH + 4;
        var t = '<b>' + esc(d.key) + '</b>' + esc(format(d.values[0], fmtOf(0)));
        inner += '<text x="' + (padL - 8) + '" y="' + (y + 15) + '" text-anchor="end">' + esc(truncate(d.key, Math.floor(padL / 6.5))) + '</text>' +
          '<rect class="rpt-mark" x="' + padL + '" y="' + y + '" width="' + Math.max(1, w).toFixed(1) + '" height="' + (rowH - 10) + '" rx="2" fill="' + colors[p.multicolor ? i % colors.length : 0] + '" data-tip="' + esc(t) + '"></rect>' +
          '<text x="' + (padL + w + 6).toFixed(1) + '" y="' + (y + 15) + '">' + esc(format(d.values[0], fmtOf(0) === 'currency' ? 'compactCurrency' : 'compact')) + '</text>';
      });
      body.innerHTML = svgEl(W, H, inner);
    }

    draw();
    if (global.ResizeObserver) {
      if (el.__rptRO) el.__rptRO.disconnect();
      var last = body.clientWidth;
      el.__rptRO = new ResizeObserver(function () { var w = body.clientWidth; if (Math.abs(w - last) > 4) { last = w; draw(); } });
      el.__rptRO.observe(body);
    }
  };

  function empty(el, msg) { el.innerHTML = '<div class="rpt-empty">' + esc(msg) + '</div>'; }

  /* ---------- API pública ---------- */
  function readProps(el) {
    var raw = el.getAttribute('data-props');
    if (!raw) { var s = el.querySelector('script[type="application/json"]'); raw = s && s.textContent; }
    try { return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
  }

  function renderComponent(el, type, props, source) {
    el.classList.add('rpt-c');
    var fn = components[type];
    if (!fn) return empty(el, 'Componente desconocido: ' + type);
    try { fn(el, props || {}, source || null); }
    catch (e) { empty(el, 'Error al renderizar: ' + e.message); if (global.console) console.error(e); }
    if (!el.__rptTips) { el.__rptTips = true; bindTips(el); }
  }

  function render(root, data) {
    root = root || document;
    data = data || global.RPT_DATA || { sources: {} };
    var nodes = root.querySelectorAll('[data-rpt]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var srcId = el.getAttribute('data-source');
      var src = srcId ? (data.sources || {})[srcId] : null;
      if (srcId && !src) { el.classList.add('rpt-c'); empty(el, 'Sin datos para el origen «' + srcId + '»'); continue; }
      renderComponent(el, el.getAttribute('data-rpt'), readProps(el), src);
    }
  }

  function autoInit() {
    if (document.documentElement.hasAttribute('data-rpt-manual')) return;
    var meta = document.querySelector('meta[name="rpt-data-url"]');
    if (!global.RPT_DATA && meta && global.fetch) {
      fetch(meta.content, { credentials: 'include' }).then(function (r) { return r.json(); }).then(function (d) { global.RPT_DATA = d; render(document, d); })
        .catch(function (e) { if (global.console) console.error('RptLib: no se pudieron cargar los datos', e); render(document, { sources: {} }); });
    } else render(document);
  }

  global.RptLib = {
    version: VERSION,
    config: config,
    palette: PALETTE,
    accents: ACCENTS,
    icons: Object.keys(ICONS),
    components: components,
    render: render,
    renderComponent: renderComponent,
    format: format,
    aggregate: aggregate,
    groupBy: groupBy
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
  else autoInit();
})(window);
