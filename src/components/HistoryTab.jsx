import { useState } from 'react';
import { listVersions, restoreVersion } from '../lib/store.js';
import { generateHtml } from '../lib/htmlGenerator.js';
import Icon from './Icon.jsx';
import ReportFrame from './ReportFrame.jsx';
import { download, fileName } from './HtmlTab.jsx';

const fmtDate = (d) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));

export default function HistoryTab({ report, dirty, onRestored }) {
  const [preview, setPreview] = useState(null);
  const versions = listVersions(report.id);

  const restore = (v) => {
    const warn = dirty ? '\n\nTienes cambios sin guardar que se perderán.' : '';
    if (!confirm(`¿Restaurar la versión ${v.n} (${fmtDate(v.date)})?\nSe creará una nueva versión con ese contenido; el historial no se pierde.${warn}`)) return;
    onRestored(restoreVersion(report.id, v.id));
    setPreview(null);
  };
  const htmlOf = (v) => (v.mode === 'designer' && v.model ? generateHtml({ ...report, ...v }) : v.html);

  return (
    <div className="hist">
      <div className="ui-card">
        <div className="ui-card-head"><h3>Historial de versiones</h3><small>{versions.length} guardadas (máx. 50)</small></div>
        <ol className="hist-list">
          {versions.map((v, i) => (
            <li key={v.id} className={`hist-item ${preview?.id === v.id ? 'is-sel' : ''}`}>
              <div className="hist-n">v{v.n}</div>
              <div className="hist-info">
                <b>{v.note || 'Guardado'}</b>
                <small>{fmtDate(v.date)} · {v.mode === 'designer' ? 'Diseñador' : 'HTML manual'} · {(new Blob([v.html || '']).size / 1024).toFixed(1)} KB · {v.dataSources?.length || 0} orígenes</small>
              </div>
              <div className="hist-actions">
                {i === 0 && <span className="ui-badge ui-badge-brand">Actual</span>}
                <button className="ui-btn ui-btn-subtle" type="button" onClick={() => setPreview(preview?.id === v.id ? null : v)}><Icon name="eye" size={16} />Ver</button>
                <button className="ui-btn ui-btn-subtle" type="button" onClick={() => download(fileName(`${report.name}-v${v.n}`), v.html)}><Icon name="download" size={16} /><span className="ui-hide-s">Descargar</span></button>
                {i > 0 && <button className="ui-btn" type="button" onClick={() => restore(v)}><Icon name="restore" size={16} />Restaurar</button>}
              </div>
            </li>
          ))}
        </ol>
      </div>
      {preview && (
        <div className="ui-card">
          <div className="ui-card-head"><h3>Vista previa de v{preview.n}</h3><button className="ui-icon-btn" type="button" onClick={() => setPreview(null)} aria-label="Cerrar"><Icon name="close" /></button></div>
          <ReportFrame html={htmlOf(preview)} dataSources={preview.dataSources || []} params={preview.params || []} height="60vh" />
        </div>
      )}
    </div>
  );
}
