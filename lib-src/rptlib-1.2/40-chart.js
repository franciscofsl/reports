  /* ---------- gráficos ---------- */
  var KIND = { column: 'Gráfico de columnas', bar: 'Gráfico de barras', line: 'Gráfico de líneas', area: 'Gráfico de área', donut: 'Gráfico de donut', pie: 'Gráfico de tarta', combo: 'Gráfico combinado', waterfall: 'Gráfico de cascada', funnel: 'Embudo' };
  var CMP_LABEL = { prev: 'Periodo anterior', yoy: 'Año anterior' };

  /** Prepara los datos de un gráfico: categoría (o jerarquía), agregación, orden, comparación y modo asociativo. */
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
    var h = '<nav class="rpt-crumbs" aria-label="Nivel de la jerarquía"><button type="button" data-drill="0">' + esc(acc.hierarchy.label || acc.hierarchy.name) + '</button>';
    acc.path.forEach(function (k, i) { var lv = acc.hierarchy.levels[i]; h += '<span aria-hidden="true">›</span><button type="button" data-drill="' + (i + 1) + '">' + esc(lv.part ? formatKey(k, lv.part) : k) + '</button>'; });
    h += '<span aria-hidden="true">›</span><span class="rpt-crumb-cur">' + esc(acc.label) + '</span>';
    if (acc.canDrill) h += '<span>· clic para profundizar</span>';
    if (acc.depth > 0) h += '<button type="button" data-drill="' + (acc.depth - 1) + '" aria-label="Subir un nivel">↑ Subir</button>';
    return h + '</nav>';
  }

  function makeMarks(p, sd, ctx) {
    var acc = sd.acc;
    var clickable = ctx.interactive && (p.crossFilter !== false || acc.canDrill);
    var f = clickable ? currentFilter(ctx.srcId, acc.field, acc.part) : null;
    var sel = f && f.origin === ctx.id && !acc.canDrill ? f.values : null;
    return {
      clickable: clickable,
      hint: !clickable ? '' : acc.canDrill ? '<small>Clic para profundizar</small>' : '<small>Clic para filtrar · Ctrl+clic para varios</small>',
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
    return kind + (title ? ': ' + title : '') + '. ' + real.length + ' categorías. Máximo ' + mx.label + ' (' + fmtFn(mx.values[0]) + '), mínimo ' + mn.label + ' (' + fmtFn(mn.values[0]) + ').';
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
      inner += '<path' + mk.attrs(d, txt) + ' d="' + path + '" fill="' + pal[i % pal.length] + '" stroke="var(--rpt-surface)" stroke-width="2" data-tip="' + esc('<b>' + esc(d.label) + '</b>' + esc(format(d.values[0], fmt0)) + ' · ' + esc(format(v / total, 'percent')) + mk.hint) + '"></path>';
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
  var REF_LABEL = { avg: 'Media', min: 'Mínimo', max: 'Máximo', median: 'Mediana', target: 'Objetivo', trend: 'Tendencia' };

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
    // Previsión (primera serie, categorías ordenadas).
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
      if (s === 0 && d.cmp && d.cmp[0] != null) { var dd = d.cmp[0] ? (v - d.cmp[0]) / Math.abs(d.cmp[0]) : null; t += '<br>' + esc(CMP_LABEL[p.compare]) + ' (' + esc(formatKey(d.cmpKey, sd.kind)) + '): ' + esc(format(d.cmp[0], fmtOf(0))) + (dd != null ? ' · ' + (dd >= 0 ? '▲ ' : '▼ ') + esc(format(Math.abs(dd), 'percent')) : ''); }
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
      fc.forEach(function (q, k) { inner += '<circle cx="' + xOf(data.length + k).toFixed(1) + '" cy="' + yOf(q.v).toFixed(1) + '" r="3" fill="' + pal[0] + '" data-tip="' + esc('<b>' + esc(q.label) + ' (previsión)</b>' + esc(format(q.v, fmtOf(0))) + '<small>Intervalo 95 %: ' + esc(format(q.lo, compactFmt(fmtOf(0)))) + ' – ' + esc(format(q.hi, compactFmt(fmtOf(0)))) + '</small>') + '"></circle>'; });
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
          '<circle cx="' + xOf(i).toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="10" fill="transparent" data-tip="' + esc('<b>Valor inusual · ' + esc(d.label) + '</b>' + esc(format(a.v, fmtOf(0))) + ' frente a ~' + esc(format(a.exp, fmtOf(0))) + ' esperado (' + (a.r >= 0 ? '+' : '−') + esc(format(Math.abs(a.r / (a.exp || 1)), 'percent')) + ')') + '"></circle>';
      });
    }
    inner += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (padT + ih) + '" y2="' + (padT + ih) + '" style="stroke:var(--rpt-stroke)"></line>';
    var leg = [];
    if (series > 1 || hasCmp || fc) leg = p.values.map(function (v, s) { return { color: pal[s % pal.length], label: labelOf(src.fields, v) + (y2 && s > 0 ? ' (eje dcho.)' : ''), line: lineIdx.indexOf(s) >= 0 }; });
    if (hasCmp) leg.push({ color: 'var(--rpt-fg-3)', label: CMP_LABEL[p.compare], dash: !barIdx.length });
    if (fc) leg.push({ color: pal[0], label: 'Previsión (' + fc.length + ')', dash: true });
    body.innerHTML = svgEl(W, H, inner, chartSummary(KIND[type] || 'Gráfico', p.title, data, function (v) { return format(v, fmtOf(0)); })) + (leg.length && !o.compact ? legendHtml(leg) : '');
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
      var tipx = '<b>' + esc(d.label) + '</b>' + esc(format(d.values[0], fmt0)) + '<br>' + esc(format(d.values[0] / first, 'percent')) + ' del inicio' + (conv != null ? '<br>Conversión desde la etapa anterior: ' + esc(format(conv, 'percent')) : '');
      inner += '<text x="' + (labW - 8) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end">' + esc(truncate(d.label, Math.floor(labW / 6.5))) + '</text>' +
        '<rect' + mk.attrs(d, d.label + ': ' + format(d.values[0], fmt0)) + ' x="' + x.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + (rowH - 6) + '" rx="3" fill="' + pal[i % pal.length] + '" data-tip="' + esc(tipx + mk.hint) + '"></rect>' +
        '<text x="' + (labW + iw / 2) + '" y="' + (y + rowH / 2 + 3) + '" text-anchor="middle" style="fill:#fff;font-weight:600">' + esc(format(d.values[0], compactFmt(fmt0))) + (i ? ' · ' + esc(format(d.values[0] / first, 'percent')) : '') + '</text>';
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
    if (!p.category || !(p.values && p.values.length)) return empty(el, 'Elige campo de categoría y de valor');
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
      title: p.title || 'Gráfico', expand: true,
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
        var lab = (p.label ? r[p.label] + ' · ' : '') + labelOf(src.fields, p.x) + ': ' + formatField(src.fields, p.x, x) + ', ' + labelOf(src.fields, p.y) + ': ' + formatField(src.fields, p.y, y);
        var cls = 'rpt-mark' + (clickable ? ' is-click' : '') + (sel ? (sel.indexOf(key) >= 0 ? ' is-sel' : ' is-dim') : '');
        inner += '<circle class="' + cls + '"' + (clickable ? ' data-key="' + esc(key) + '" tabindex="0" role="button" aria-label="' + esc(lab) + '"' : '') + ' cx="' + fx(x).toFixed(1) + '" cy="' + fy(y).toFixed(1) + '" r="' + rad.toFixed(1) + '" fill="' + pal[gi % pal.length] + '" fill-opacity=".7" stroke="' + pal[gi % pal.length] + '" data-tip="' + esc('<b>' + esc(p.label ? r[p.label] : (key || '')) + '</b>' + esc(labelOf(src.fields, p.x)) + ': ' + esc(formatField(src.fields, p.x, x)) + '<br>' + esc(labelOf(src.fields, p.y)) + ': ' + esc(formatField(src.fields, p.y, y)) + (p.size ? '<br>' + esc(labelOf(src.fields, p.size)) + ': ' + esc(formatField(src.fields, p.size, r[p.size])) : '')) + '"></circle>';
      });
      body.innerHTML = svgEl(W, H, inner, 'Gráfico de dispersión' + (p.title ? ': ' + p.title : '') + '. ' + xs.length + ' puntos.') +
        (p.color ? '<div class="rpt-legend">' + groups.map(function (gk, i) { return '<span><i style="background:' + pal[i % pal.length] + '"></i>' + esc(gk) + '</span>'; }).join('') + '</div>' : '');
    }
    draw();
    el.__rptOnKey = clickable ? function (key, e) { toggleValue(p.color, key, ctx.id, e && (e.ctrlKey || e.metaKey), { source: ctx.srcId, page: ctx.page }); } : null;
    el.__rptExport = { title: p.title || 'Dispersión', expand: true, svg: function () { return body.querySelector('svg'); }, table: function () { return { columns: cols(src.fields, [p.label, p.color, p.x, p.y, p.size].filter(Boolean)), rows: src.rows }; } };
    observe(el, body, draw);
  };
