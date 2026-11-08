// Conversión modelo de diseño <-> HTML del informe, e inyección de datos para la vista previa.
export const LIB_VERSION = '1.2.0';
/** Versiones publicadas (inmutables). Los informes antiguos siguen apuntando a la suya. */
export const LIB_VERSIONS = [
  { value: '1.2.0', label: '1.2.0 (actual): modelo semántico, páginas, analítica, nuevas visualizaciones' },
  { value: '1.1.0', label: '1.1.0: filtros, nuevos componentes, temas' },
  { value: '1.0.0', label: '1.0.0' },
];

/** Páginas del modelo (los modelos antiguos tienen una sola lista de filas). */
export function modelPages(model) {
  if (model?.pages?.length) return model.pages;
  return [{ id: 'p1', name: 'Página 1', rows: model?.rows || [] }];
}
export const allRows = (model) => modelPages(model).flatMap((p) => p.rows || []);

const cssStr = (v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ')}"`;
/** CSS de página para impresión/PDF: tamaño, márgenes, encabezado, pie y numeración. */
export function paperCss(paper) {
  if (!paper) return '';
  const boxes = [];
  if (paper.header) boxes.push(`@top-left { content: ${cssStr(paper.header)}; font: 9pt sans-serif; color: #555; }`);
  if (paper.footer) boxes.push(`@bottom-left { content: ${cssStr(paper.footer)}; font: 9pt sans-serif; color: #555; }`);
  if (paper.pageNumbers !== false) boxes.push('@bottom-right { content: "Página " counter(page) " de " counter(pages); font: 9pt sans-serif; color: #555; }');
  const size = `${paper.size || 'A4'} ${paper.orientation === 'landscape' ? 'landscape' : 'portrait'}`;
  const m = Math.max(5, Math.min(40, Number(paper.margin) || 15));
  return `@page { size: ${size}; margin: ${m}mm; ${boxes.join(' ')} }`;
}
export const GENERATOR = 'RptDesigner/0.1';

/** URL absoluta de la librería publicada como estático de la app (CDN propio). */
export function libBaseUrl(version = LIB_VERSION) {
  return new URL(`${import.meta.env.BASE_URL}lib/rptlib/${version}/`, window.location.href).href;
}

const escHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const escAttrSingle = (s) => String(s).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
const safeJson = (o, space) => JSON.stringify(o, null, space).replace(/</g, '\\u003c');

function cleanProps(props) {
  const out = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (v === '' || v == null || (Array.isArray(v) && !v.length && k !== 'columns')) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Genera el HTML del informe. El HTML NO contiene las consultas SQL: solo referencias (ids) a los
 * orígenes de datos. Las consultas viven en la definición del informe en el servidor.
 */
export function generateHtml(report) {
  const model = report.model || { rows: [] };
  const lib = libBaseUrl(model.libVersion || LIB_VERSION);
  const theme = model.theme || {};
  const pages = modelPages(model);
  const cellHtml = (c, ind) => {
    const src = c.source ? ` data-source="${escHtml(c.source)}"` : '';
    const style = c.height ? ` style="min-height:${Number(c.height)}px"` : '';
    return `${ind}<div class="rpt-col rpt-col-${c.span || 12}" data-rpt="${escHtml(c.type)}"${src}${style} data-props='${escAttrSingle(JSON.stringify(cleanProps(c.props)))}'></div>`;
  };
  const rowsHtml = (rows, ind) => rows.filter((r) => r.cells.length)
    .map((row) => `${ind}<section class="rpt-row">\n${row.cells.map((c) => cellHtml(c, `${ind}  `)).join('\n')}\n${ind}</section>`).join('\n');
  const body = pages.length > 1
    ? pages.map((pg) => `    <section class="rpt-page" data-page="${escHtml(pg.id)}" data-title="${escHtml(pg.name)}">\n${rowsHtml(pg.rows, '      ')}\n    </section>`).join('\n')
    : rowsHtml(pages[0].rows, '    ');

  const layout = { libVersion: model.libVersion || LIB_VERSION, title: model.title, subtitle: model.subtitle, theme: model.theme, pages: model.pages, rows: model.pages ? undefined : model.rows, reportFilters: model.reportFilters, paper: model.paper };
  const styleVars = [
    theme.brand && /^#[0-9a-f]{6}$/i.test(theme.brand) && theme.brand.toLowerCase() !== '#0f6cbd' ? `--rpt-brand:${theme.brand}` : '',
    theme.background && /^#[0-9a-f]{6}$/i.test(theme.background) ? `--rpt-bg:${theme.background}` : '',
  ].filter(Boolean).join(';');
  const htmlAttrs = [
    'lang="es-ES"',
    theme.mode && theme.mode !== 'auto' ? `data-rpt-theme="${escHtml(theme.mode)}"` : '',
    theme.palette && theme.palette !== 'fluent' && theme.palette !== 'custom' ? `data-rpt-palette="${escHtml(theme.palette)}"` : '',
    theme.density && theme.density !== 'normal' ? `data-rpt-density="${escHtml(theme.density)}"` : '',
    styleVars ? `style="${styleVars}"` : '',
  ].filter(Boolean).join(' ');
  const themeMeta = (theme.palette === 'custom' && theme.colors?.length) || theme.font
    ? `\n  <meta name="rpt-theme" content='${escAttrSingle(JSON.stringify({ colors: theme.palette === 'custom' ? theme.colors : undefined, font: theme.font || undefined }))}'>` : '';
  const paper = model.paper ? `\n  <meta name="rpt-paper" content='${escAttrSingle(JSON.stringify({ showDate: !!model.paper.showDate }))}'>\n  <style media="print">${paperCss(model.paper)}</style>` : '';
  const logo = theme.logo && /^(https?:|data:image\/)/.test(theme.logo) ? `\n      <img class="rpt-logo" src="${escHtml(theme.logo)}" alt="Logotipo">` : '';
  const filtersAttr = model.reportFilters?.length ? ` data-rpt-filters='${escAttrSingle(JSON.stringify(model.reportFilters))}'` : '';
  const sem = report.semantic && (report.semantic.measures?.length || report.semantic.relations?.length || report.semantic.hierarchies?.length || report.semantic.associative)
    ? `\n  <script type="application/json" id="rpt-semantic">${safeJson(report.semantic)}</script>` : '';

  return `<!doctype html>
<html ${htmlAttrs}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="${GENERATOR}">
  <title>${escHtml(model.title || report.name)}</title>${themeMeta}${paper}
  <link rel="stylesheet" href="${lib}rptlib.css">
  <script src="${lib}rptlib.js" defer></script>
</head>
<body class="rpt-body">
  <main class="rpt-report"${filtersAttr}>
    <header class="rpt-report-header">
      <div>
        <h1>${escHtml(model.title || report.name)}</h1>${model.subtitle ? `\n        <p>${escHtml(model.subtitle)}</p>` : ''}
      </div>${logo}
    </header>
${body}
  </main>
  <!-- Modelo del diseñador: permite volver a abrir este HTML en el editor visual. -->
  <script type="application/json" id="rpt-model">${safeJson(layout)}</script>${sem}
</body>
</html>
`;
}

/** Recupera el modelo de diseño embebido en un HTML (null si es un HTML manual sin modelo). */
export function parseModelFromHtml(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const s = doc.getElementById('rpt-model');
    if (!s) return null;
    const m = JSON.parse(s.textContent);
    return m && (Array.isArray(m.rows) || Array.isArray(m.pages)) ? m : null;
  } catch {
    return null;
  }
}

/** Orígenes referenciados en el HTML (data-source="..."), útil para validar HTML subidos a mano. */
export function sourcesUsedInHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...new Set([...doc.querySelectorAll('[data-source]')].map((e) => e.getAttribute('data-source')))];
}

/** Inserta window.RPT_DATA en el HTML para que la librería lo pinte sin llamadas extra. */
export function injectData(html, data, { theme } = {}) {
  const script = `<script>window.RPT_DATA = ${safeJson(data)};</script>`;
  let out = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}\n${script}`) : `${script}\n${html}`;
  if (theme) out = out.replace(/<html([^>]*)>/i, (m, a) => (/data-rpt-theme/.test(a) ? m : `<html${a} data-rpt-theme="${theme}">`));
  return out;
}

export function emptyModel(title = 'Nuevo informe') {
  return { libVersion: LIB_VERSION, title, subtitle: '', theme: { brand: '#0f6cbd', palette: 'fluent', density: 'normal', mode: 'auto', logo: '' }, rows: [] };
}
