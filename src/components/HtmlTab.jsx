import { useMemo, useRef, useState } from 'react';
import { generateHtml, libBaseUrl, parseModelFromHtml, sourcesUsedInHtml } from '../lib/htmlGenerator.js';
import { MANUAL_SAMPLE_HTML } from '../lib/templates.js';
import Icon from './Icon.jsx';

export function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/html' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
export const fileName = (name) => `${String(name || 'informe').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.html`;

export function readHtmlFile(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) return reject(new Error('El archivo supera 2 MB.'));
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

export default function HtmlTab({ report, onChange }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState(null);
  const designer = report.mode === 'designer';
  const html = designer ? generateHtml(report) : report.html || '';
  const embedded = useMemo(() => (!designer && html ? parseModelFromHtml(html) : null), [designer, html]);
  const used = useMemo(() => (html ? sourcesUsedInHtml(html) : []), [html]);
  const missing = used.filter((id) => !report.dataSources.some((d) => d.id === id));
  const usesLib = /rptlib(\.min)?\.js/.test(html);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const text = await readHtmlFile(f);
      onChange({ mode: 'manual', html: text });
      setMsg({ ok: true, text: `Cargado «${f.name}» (${(f.size / 1024).toFixed(1)} KB).` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  return (
    <div className="ui-card">
      <div className="ui-card-head">
        <h3>HTML del informe</h3>
        <span className={`ui-badge ${designer ? 'ui-badge-brand' : ''}`}>{designer ? 'Generado por el diseñador' : 'Manual'}</span>
      </div>
      <div className="ui-actions">
        <button className="ui-btn" type="button" onClick={() => fileRef.current.click()}><Icon name="upload" size={16} />Cargar HTML…</button>
        <input ref={fileRef} type="file" accept=".html,.htm,text/html" hidden onChange={onFile} />
        <button className="ui-btn" type="button" onClick={() => download(fileName(report.name), html)} disabled={!html}><Icon name="download" size={16} />Descargar</button>
        <button className="ui-btn" type="button" onClick={() => navigator.clipboard?.writeText(html).then(() => setMsg({ ok: true, text: 'Copiado al portapapeles.' }))} disabled={!html}><Icon name="copy" size={16} />Copiar</button>
        <span className="ui-spacer" />
        {designer ? (
          <button className="ui-btn ui-btn-subtle" type="button" onClick={() => { if (confirm('El HTML pasará a editarse a mano y dejará de regenerarse desde el diseñador. ¿Continuar?')) onChange({ mode: 'manual', html }); }}>
            <Icon name="edit" size={16} />Editar a mano
          </button>
        ) : (
          <>
            {!html && <button className="ui-btn ui-btn-subtle" type="button" onClick={() => onChange({ html: MANUAL_SAMPLE_HTML(libBaseUrl()) })}>Insertar ejemplo</button>}
            {embedded && (
              <button className="ui-btn ui-btn-primary" type="button" onClick={() => onChange({ mode: 'designer', model: embedded })}>
                <Icon name="layout" size={16} />Abrir en el diseñador
              </button>
            )}
          </>
        )}
      </div>
      {msg && <div className={`ui-msg ${msg.ok ? 'ui-msg-ok' : 'ui-msg-error'}`}>{msg.text}</div>}
      {!designer && embedded && <div className="ui-msg">Este HTML contiene un modelo del diseñador: puedes volver a editarlo visualmente (se descartarán los cambios manuales).</div>}
      {html && !usesLib && <div className="ui-msg ui-msg-warn">El HTML no referencia la librería RptLib; los componentes <code>data-rpt</code> no se pintarán. Librería: <code>{libBaseUrl()}rptlib.js</code></div>}
      {missing.length > 0 && <div className="ui-msg ui-msg-warn">Orígenes usados en el HTML que no existen en el informe: {missing.map((m) => <code key={m}>{m}</code>)}</div>}
      <p className="ui-hint">
        Librería publicada: <code>{libBaseUrl()}rptlib.css</code> y <code>rptlib.js</code>. Atributos: <code>data-rpt</code> (tipo), <code>data-source</code> (id del origen) y <code>data-props</code> (JSON).
      </p>
      <textarea className="ui-input ui-code ui-html" spellCheck={false} readOnly={designer} aria-label="Código HTML" value={html}
        onChange={(e) => onChange({ html: e.target.value })} placeholder="Pega aquí el HTML del informe o cárgalo desde un archivo." />
    </div>
  );
}
