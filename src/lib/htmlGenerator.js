// Conversión modelo de diseño <-> HTML del informe, e inyección de datos para la vista previa.
export const LIB_VERSION = '1.0.0';
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
  const rows = (model.rows || [])
    .filter((r) => r.cells.length)
    .map((row) => {
      const cells = row.cells
        .map((c) => {
          const src = c.source ? ` data-source="${escHtml(c.source)}"` : '';
          return `      <div class="rpt-col rpt-col-${c.span || 12}" data-rpt="${escHtml(c.type)}"${src} data-props='${escAttrSingle(JSON.stringify(cleanProps(c.props)))}'></div>`;
        })
        .join('\n');
      return `    <section class="rpt-row">\n${cells}\n    </section>`;
    })
    .join('\n');

  const layout = { libVersion: model.libVersion || LIB_VERSION, title: model.title, subtitle: model.subtitle, rows: model.rows };

  return `<!doctype html>
<html lang="es-ES">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="${GENERATOR}">
  <title>${escHtml(model.title || report.name)}</title>
  <link rel="stylesheet" href="${lib}rptlib.css">
  <script src="${lib}rptlib.js" defer></script>
</head>
<body class="rpt-body">
  <main class="rpt-report">
    <header class="rpt-report-header">
      <h1>${escHtml(model.title || report.name)}</h1>${model.subtitle ? `\n      <p>${escHtml(model.subtitle)}</p>` : ''}
    </header>
${rows}
  </main>
  <!-- Modelo del diseñador: permite volver a abrir este HTML en el editor visual. -->
  <script type="application/json" id="rpt-model">${safeJson(layout)}</script>
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
    return m && Array.isArray(m.rows) ? m : null;
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
  return { libVersion: LIB_VERSION, title, subtitle: '', rows: [] };
}
