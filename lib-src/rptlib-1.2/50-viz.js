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
      el.innerHTML = '<div class="rpt-card rpt-map">' + head(p, ctx) + '<div class="rpt-empty">Cargando mapa…</div></div>';
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
      scaleLegend(mn, mx, fmt) + (unmatched.length ? '<div class="rpt-note">Sin ubicar en el mapa: ' + esc(unmatched.slice(0, 6).join(', ')) + (unmatched.length > 6 ? '…' : '') + '</div>' : '') + '</div></div>';
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
    if (!p.category || !p.value) return empty(el, 'Elige categoría y valor');
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
        var tipx = '<b>' + esc(k) + '</b>' + (r.it.group ? esc(r.it.group) + '<br>' : '') + esc(format(r.it.v, fmt)) + ' · ' + esc(format(r.it.v / total, 'percent'));
        inner += '<rect class="' + cls + '"' + (clickable ? ' data-key="' + esc(k) + '" tabindex="0" role="button" aria-label="' + esc(k + ': ' + format(r.it.v, fmt)) + '"' : '') + ' x="' + r.x.toFixed(1) + '" y="' + r.y.toFixed(1) + '" width="' + Math.max(0, r.w - 1).toFixed(1) + '" height="' + Math.max(0, r.h - 1).toFixed(1) + '" fill="' + r.it.color + '" fill-opacity="' + (p.group ? 0.55 + 0.45 * Math.min(1, r.it.v / (rects[0].it.v || 1)) : 1) + '" data-tip="' + esc(tipx) + '"></rect>';
        if (r.w > 54 && r.h > 30) inner += '<text x="' + (r.x + 6) + '" y="' + (r.y + 16) + '" style="fill:#fff;font-weight:600;pointer-events:none">' + esc(truncate(k, Math.floor(r.w / 7))) + '</text><text x="' + (r.x + 6) + '" y="' + (r.y + 30) + '" style="fill:#fff;opacity:.9;pointer-events:none">' + esc(format(r.it.v, compactFmt(fmt))) + '</text>';
      });
      body.innerHTML = svgEl(W, H, inner, 'Mapa de árbol' + (p.title ? ': ' + p.title : '') + '. ' + rects.length + ' elementos.');
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
    if (!p.category || !p.value) return empty(el, 'Elige categoría y valor');
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
      body.innerHTML = svgEl(W, data.length * rowH + 4, inner, 'Gráfico de viñeta' + (p.title ? ': ' + p.title : '') + '. ' + data.length + ' categorías.');
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
        inner += '<path d="M' + x1 + ',' + y1.toFixed(1) + ' C' + mx + ',' + y1.toFixed(1) + ' ' + mx + ',' + y2.toFixed(1) + ' ' + x2 + ',' + y2.toFixed(1) + '" fill="none" stroke="' + a.color + '" stroke-opacity=".35" stroke-width="' + Math.max(1, (w1 + w2) / 2).toFixed(1) + '" data-tip="' + esc('<b>' + esc(lk.s) + ' → ' + esc(lk.t) + '</b>' + esc(format(lk.v, fmt)) + ' · ' + esc(format(lk.v / total, 'percent'))) + '"></path>';
      });
      nodes.forEach(function (ns, l) {
        ns.forEach(function (n) {
          var q = pos[l + '|' + n.key], last = l === levels.length - 1;
          inner += '<rect class="rpt-mark' + (clickable ? ' is-click' : '') + '"' + (clickable ? ' data-key="' + esc(l + '|' + n.key) + '" tabindex="0" role="button" aria-label="' + esc(n.key + ': ' + format(n.values[0], fmt)) + '"' : '') + ' x="' + q.x + '" y="' + q.y.toFixed(1) + '" width="' + nw + '" height="' + q.h.toFixed(1) + '" fill="' + q.color + '" data-tip="' + esc('<b>' + esc(n.key) + '</b>' + esc(labelOf(src.fields, levels[l])) + ': ' + esc(format(n.values[0], fmt))) + '"></rect>';
          if (q.h > 9) inner += '<text x="' + (last ? q.x - 4 : q.x + nw + 4) + '" y="' + (q.y + q.h / 2 + 4).toFixed(1) + '"' + (last ? ' text-anchor="end"' : '') + '>' + esc(truncate(n.key, 18)) + ' · ' + esc(format(n.values[0], compactFmt(fmt))) + '</text>';
        });
      });
      body.innerHTML = svgEl(W, H, inner, 'Diagrama de Sankey' + (p.title ? ': ' + p.title : '') + '. ' + links.length + ' flujos.');
    }
    draw();
    el.__rptOnKey = clickable ? function (key, e) { var i = String(key).indexOf('|'); toggleValue(levels[+String(key).slice(0, i)], String(key).slice(i + 1), ctx.id, e && (e.ctrlKey || e.metaKey), { source: ctx.srcId, page: ctx.page }); } : null;
    el.__rptExport = { title: p.title || 'Sankey', expand: true, svg: function () { return body.querySelector('svg'); }, table: function () { return { columns: [{ name: 's', label: 'Origen' }, { name: 't', label: 'Destino' }, { name: 'v', label: labelOf(src.fields, p.value), type: 'number', format: fmt }], rows: links }; } };
    observe(el, body, draw);
  };
