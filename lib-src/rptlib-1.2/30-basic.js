  /* ---------- componentes básicos ---------- */
  var components = {};

  components.title = function (el, p) {
    var lvl = p.level === 'h3' ? 'h3' : 'h2';
    el.innerHTML = '<div class="rpt-title"><' + lvl + '>' + esc(p.text || 'Título') + '</' + lvl + '>' + (p.subtitle ? '<p>' + esc(p.subtitle) + '</p>' : '') + '</div>';
  };
  components.text = function (el, p) {
    el.innerHTML = '<div class="' + (p.card ? 'rpt-card ' : '') + 'rpt-text">' + esc(p.content || '') + '</div>';
  };
  components.subreport = function (el, p) {
    el.innerHTML = '<div class="rpt-card"><div class="rpt-card-title"><span>' + esc(p.title || 'Subinforme') + '</span><span class="rpt-card-sub">Subinforme</span></div><div class="rpt-empty">' + (p.report ? 'Se mostrarán aquí los componentes del informe enlazado, con sus datos.' : 'Elige el informe que quieres incrustar.') + '</div></div>';
  };
  components.pagebreak = function (el, p, src, ctx) {
    el.innerHTML = ctx.designer ? '<div class="rpt-empty">— Salto de página (impresión / PDF) —</div>' : '';
  };

  /** Comparación temporal del último periodo frente al anterior o al mismo del año pasado. */
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
    return '<span class="rpt-badge ' + (good ? 'is-good' : 'is-bad') + '">' + (delta >= 0 ? '▲ ' : '▼ ') + esc(format(Math.abs(delta), 'percent')) + '</span>';
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
      h += '<label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" class="rpt-input" type="search" placeholder="' + esc(p.placeholder || 'Contiene…') + '" value="' + esc(cur && cur.kind === 'text' ? cur.text : '') + '">';
    } else if (mode === 'range') {
      var t = f.type === 'date' ? 'date' : 'number';
      h += '<span class="rpt-filter-label" id="' + id + '">' + esc(label) + '</span><div class="rpt-filter-range" role="group" aria-labelledby="' + id + '">' +
        '<input class="rpt-input" type="' + t + '" data-k="min" aria-label="Desde" placeholder="Desde" value="' + esc(cur && cur.kind === 'range' ? cur.min || '' : '') + '"><span>–</span>' +
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
    if (cmp) sub = deltaBadge(cmp.delta, p.goodWhen) + '<span>' + esc(formatKey(cmp.cur, cmp.grain)) + (cmp.prevValue == null ? ' · sin datos de ' + esc(formatKey(cmp.prev, cmp.grain)) : ' vs ' + esc(formatKey(cmp.prev, cmp.grain))) + '</span>' + sub;
    else if (spark && spark.delta != null && isFinite(spark.delta)) sub = deltaBadge(spark.delta, p.goodWhen) + '<span>vs anterior</span>' + sub;
    el.innerHTML = '<div class="rpt-card rpt-tile" style="--rpt-accent:' + esc(accent) + '">' + (ctx.interactive && src ? menuBtn(true) : '') +
      (p.icon && ICONS[p.icon] ? '<div class="rpt-tile-icon"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[p.icon] + '</svg></div>' : '') +
      '<div class="rpt-tile-body"><div class="rpt-tile-label">' + esc(p.title || '') + '</div>' +
      '<div class="rpt-tile-value" title="' + esc(value) + '">' + esc(value == null ? '—' : value) + '</div>' +
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
    if (cmp) h += '<div class="rpt-kpi-meta">' + deltaBadge(cmp.delta, p.goodWhen) + '<span>' + esc(formatKey(cmp.cur, cmp.grain)) + ' vs ' + esc(formatKey(cmp.prev, cmp.grain)) + (cmp.prevValue != null ? ' (' + esc(format(cmp.prevValue, fmt)) + ')' : ' · sin datos') + '</span></div>';
    if (!isNaN(target) && target) {
      var ratio = v / target, good = p.goodWhen !== 'lower' ? ratio >= 1 : ratio <= 1, delta = ratio - 1;
      h += '<div class="rpt-kpi-meta"><span class="rpt-badge ' + (good ? 'is-good' : 'is-bad') + '">' + (delta >= 0 ? '▲ ' : '▼ ') + esc(format(Math.abs(delta), 'percent')) + '</span>' +
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

  /** Detección de anomalías: residuo frente a la media de los vecinos, puntuación z robusta. */
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
        if (d != null && isFinite(d)) txt += ', <span class="' + (d >= 0 ? 'is-up' : 'is-down') + '">un ' + esc(format(Math.abs(d), 'percent')) + (d >= 0 ? ' más' : ' menos') + '</span> que en ' + esc(formatKey(prev.key, kind));
        txt += '. El mejor periodo fue <b>' + esc(formatKey(best.key, kind)) + '</b> (' + esc(format(best.values[0], fmt)) + ') y la tendencia general es <b>' + (Math.abs(lr.slope) < 0.01 * Math.abs(total / series.length) ? 'estable' : lr.slope > 0 ? 'al alza' : 'a la baja') + '</b>.';
        ps.push(txt);
        if (p.category) {
          var lastRows = last.rows, prevRows = prev.rows;
          var a = groupBy(lastRows, p.category, [p.field], p.agg, lastRows), b = groupBy(prevRows, p.category, [p.field], p.agg, prevRows);
          var bm = {}; b.forEach(function (x) { bm[x.key] = x.values[0]; });
          var diffs = a.map(function (x) { return { key: x.key, d: x.values[0] - (bm[x.key] || 0) }; }).sort(function (x, y) { return Math.abs(y.d) - Math.abs(x.d); });
          if (diffs.length && diffs[0].d) ps.push('El cambio respecto a ' + esc(formatKey(prev.key, kind)) + ' lo explica sobre todo <b>' + esc(diffs[0].key) + '</b> (<span class="' + (diffs[0].d >= 0 ? 'is-up' : 'is-down') + '">' + (diffs[0].d >= 0 ? '+' : '−') + esc(format(Math.abs(diffs[0].d), compactFmt(fmt))) + '</span>).');
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
