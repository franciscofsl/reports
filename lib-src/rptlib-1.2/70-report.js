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
  /** Pinta un componente suelto (lo usa el diseñador). opts: { interactive, palette, semantic, srcId, designer } */
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
    if (it.srcId && !src) { it.el.classList.add('rpt-c'); return empty(it.el, 'Sin datos para el origen «' + it.srcId + '»'); }
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
      if (!sub) { el.innerHTML = '<div class="rpt-empty">Subinforme «' + esc(p.title || p.report || '') + '» no disponible: se resuelve al publicar desde la aplicación.</div>'; return; }
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
    nav.className = 'rpt-pages-nav'; nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'Páginas del informe');
    pages.forEach(function (pg, i) {
      var id = pg.getAttribute('data-page') || ('p' + i);
      pg.setAttribute('data-page', id); pg.setAttribute('role', 'tabpanel'); pg.id = pg.id || 'rpt-page-' + id;
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('data-page', id); b.setAttribute('aria-controls', pg.id);
      b.textContent = pg.getAttribute('data-title') || ('Página ' + (i + 1));
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
    bar.innerHTML = keys.length ? keys.map(function (k) { var d = describeFilter(state.filters[k]); return '<button type="button" class="rpt-chip" data-key="' + esc(k) + '" aria-label="Quitar filtro ' + esc(d.label) + '"><span>' + esc(d.label) + ': <b>' + esc(d.value) + '</b></span> ✕</button>'; }).join('') + (keys.length > 1 ? '<button type="button" class="rpt-clear">Quitar filtros</button>' : '') : '';
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

  /* ---------- impresión ---------- */
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

  /* ---------- exportación (Word / Excel): recopila el contenido ---------- */
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
