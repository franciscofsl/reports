import { useMemo, useState } from 'react';
import ReportFrame from '../components/ReportFrame.jsx';
import Icon from '../components/Icon.jsx';
import { generateHtml } from '../lib/htmlGenerator.js';
import { getPublished, getReport, listVersions } from '../lib/store.js';

const fmtDate = (d) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(d));

/** Visor de lectura: muestra la versión publicada (lo que se comparte con los lectores). */
export default function Viewer({ id, go }) {
  const [copied, setCopied] = useState(false);
  const pub = useMemo(() => getPublished(id), [id]);
  const report = getReport(id);
  const fallback = !pub && report ? listVersions(id)[0] : null;
  const v = pub?.version || fallback;
  if (!report || !v) {
    return <div className="page"><div className="ui-card ui-empty"><p>El informe no existe o no tiene versiones.</p><button className="ui-btn" type="button" onClick={() => go('#/')}>Ir a informes</button></div></div>;
  }
  const html = v.mode === 'designer' && v.model ? generateHtml({ ...report, ...v }) : v.html;
  const share = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div className="viewer">
      <div className="viewer-bar">
        <button type="button" className="ui-link" onClick={() => go('#/')}><Icon name="back" size={14} /> Informes</button>
        <div className="viewer-title">
          <h1>{report.name}</h1>
          <small>{pub ? <>Versión publicada v{v.n}{v.label ? ` · ${v.label}` : ''} · {fmtDate(pub.report.published.date)}</> : <span className="ui-error">Sin publicar: se muestra la última versión guardada (v{v.n}).</span>}</small>
        </div>
        <span className="ui-actions" style={{ margin: 0 }}>
          <button className="ui-btn" type="button" onClick={share}><Icon name="share" size={16} />{copied ? 'Enlace copiado' : 'Copiar enlace'}</button>
          <button className="ui-btn ui-btn-subtle" type="button" onClick={() => go(`#/report/${id}/design`)}><Icon name="edit" size={16} />Editar</button>
        </span>
      </div>
      <ReportFrame key={v.id} html={html} dataSources={v.dataSources || []} params={v.params || []} height="calc(100vh - 170px)" devices={false} />
    </div>
  );
}
