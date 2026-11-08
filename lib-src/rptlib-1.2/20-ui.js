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
    return (floating ? '<span class="rpt-float-menu">' : '') + '<button type="button" class="rpt-menu-btn" aria-haspopup="menu" aria-label="Más opciones">' + UI.more + '</button>' + (floating ? '</span>' : '');
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

  /* ---------- menú de tarjeta ---------- */
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
      if (typeof v === 'boolean') return v ? 'Sí' : 'No';
      var s = String(v);
      return /["\n\r;,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    return '﻿' + [columns.map(function (c) { return cell(c.label || c.name); }).join(sep)].concat(rows.map(function (r) { return columns.map(function (c) { return cell(r[c.name]); }).join(sep); })).join('\r\n');
  }
  function exportCsv(name, columns, rows) { download(slug(name) + '.csv', new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' })); }

  function inlineStyles(src, dst) {
    var cs = getComputedStyle(src);
    ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'font-size', 'font-family', 'font-weight', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray'].forEach(function (p) { dst.style.setProperty(p, cs.getPropertyValue(p)); });
    for (var i = 0; i < src.children.length; i++) inlineStyles(src.children[i], dst.children[i]);
  }
  /** Convierte el SVG de un componente (con título y leyenda) en PNG. Devuelve una promesa { dataUrl, blob, width, height }. */
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
    if (act === 'table' && x.table) { var t = x.table(); dialog(title + ' · datos', tableHtml(t.columns, t.rows)); }
    else if (act === 'detail' && x.detail) { var d = x.detail(); dialog(title + ' · detalle (' + d.rows.length + ' filas)', tableHtml(d.columns, d.rows)); }
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
