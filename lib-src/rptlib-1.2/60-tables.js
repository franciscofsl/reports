  /* ---------- tablas ---------- */
  var ICON_RULES = { 'icon-up': ['▲', 'is-good'], 'icon-down': ['▼', 'is-bad'], 'icon-flat': ['▬', 'is-neutral'], 'dot-good': ['●', 'is-good'], 'dot-warn': ['●', 'is-warn'], 'dot-bad': ['●', 'is-bad'], flag: ['⚑', 'is-bad'], star: ['★', 'is-warn'] };
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
      if (f.type === 'boolean') { var b = r[c] === true || r[c] === 1 || r[c] === 'true'; return '<td class="' + extra + '">' + icons + '<span class="rpt-bool' + (b ? ' is-true' : '') + '"></span> ' + (b ? 'Sí' : 'No') + '</td>'; }
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
      if (p.search !== false && !state.printing) h += '<div class="rpt-grid-tools"><input class="rpt-input" type="search" placeholder="Buscar…" aria-label="Buscar en la tabla" value="' + esc(st.q) + '"></div>';
      h += '<div class="rpt-grid-wrap"' + (state.printing ? ' style="max-height:none;overflow:visible"' : '') + '><table class="rpt-table"><thead><tr>';
      columns.forEach(function (c) {
        var mark = st.sort === c ? '<span class="rpt-sort" aria-hidden="true">' + (st.dir === 'asc' ? '▲' : '▼') + '</span>' : '';
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
          if (i === 0) return '<td><span class="rpt-tw" aria-hidden="true">' + (it.collapsed ? '▸' : '▾') + '</span>' + esc(labelOf(src.fields, it.field)) + ': ' + esc(formatField(src.fields, it.field, it.key)) + ' <span class="rpt-card-sub">(' + it.rows.length + ')</span></td>';
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
      title: p.title || 'Tabla dinámica', expand: true, detail: detailOf(src, src.rows),
      table: function () {
        var columns = [{ name: '_k', label: labelOf(src.fields, p.rows) }].concat(ck.map(function (c, i) { return { name: '_' + i, label: String(c), type: 'number', format: fmt }; })).concat([{ name: '_t', label: 'Total', type: 'number', format: fmt }]);
        var rows = rk.map(function (rkey) { var o = { _k: rkey, _t: cells[rkey + '\u0000*'] }; ck.forEach(function (c, i) { o['_' + i] = cells[rkey + '\u0000' + c]; }); return o; });
        return { columns: columns, rows: rows };
      }
    };
  };
