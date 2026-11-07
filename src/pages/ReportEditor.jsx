import { useEffect, useMemo, useState } from 'react';
import DataSourcesEditor from '../components/DataSourcesEditor.jsx';
import Designer from '../components/Designer.jsx';
import HistoryTab from '../components/HistoryTab.jsx';
import HtmlTab from '../components/HtmlTab.jsx';
import Icon from '../components/Icon.jsx';
import ReportFrame from '../components/ReportFrame.jsx';
import { emptyModel, generateHtml, parseModelFromHtml } from '../lib/htmlGenerator.js';
import { sourceUsage, validateModel } from '../lib/modelOps.js';
import { getReport, saveReport } from '../lib/store.js';

const TABS = [
  { id: 'preview', label: 'Vista previa', icon: 'eye' },
  { id: 'design', label: 'Diseño', icon: 'layout' },
  { id: 'data', label: 'Orígenes de datos', icon: 'db' },
  { id: 'html', label: 'HTML', icon: 'code' },
  { id: 'history', label: 'Historial', icon: 'history' },
];

const snapshot = (r) => JSON.stringify({ n: r.name, d: r.description, m: r.mode, mo: r.model, ds: r.dataSources, p: r.params, h: r.mode === 'manual' ? r.html : '' });

export default function ReportEditor({ id, tab, go }) {
  const [saved, setSaved] = useState(() => getReport(id));
  const [draft, setDraft] = useState(saved);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => { const r = getReport(id); setSaved(r); setDraft(r); }, [id]);

  const dirty = useMemo(() => saved && draft && snapshot(saved) !== snapshot(draft), [saved, draft]);
  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const html = useMemo(() => (draft ? (draft.mode === 'designer' ? generateHtml(draft) : draft.html) : ''), [draft]);
  const issues = useMemo(() => (draft?.mode === 'designer' ? validateModel(draft.model, draft.dataSources) : []), [draft]);

  if (!draft) {
    return <div className="page"><div className="ui-card ui-empty"><p>Informe no encontrado.</p><button className="ui-btn" type="button" onClick={() => go('#/')}>Volver</button></div></div>;
  }

  const patch = (p) => setDraft((d) => ({ ...d, ...p }));
  const flash = (t) => { setToast(t); setTimeout(() => setToast(''), 2500); };

  const save = () => {
    if (issues.length && !confirm(`Hay ${issues.length} aviso(s) de vinculación:\n\n${issues.map((i) => `• ${i.msg}`).join('\n')}\n\n¿Guardar igualmente?`)) return;
    try {
      const r = saveReport({ ...draft, html }, note.trim() || (draft.mode === 'designer' ? 'Cambios en el diseñador' : 'Cambios en el HTML'));
      setSaved(r);
      setDraft(r);
      setNote('');
      flash(`Guardada la versión ${r.version}`);
    } catch (e) {
      alert(e.message);
    }
  };

  const leave = (hash) => { if (!dirty || confirm('Hay cambios sin guardar. ¿Salir igualmente?')) go(hash); };
  const embedded = draft.mode === 'manual' && draft.html ? parseModelFromHtml(draft.html) : null;

  return (
    <div className="page page-wide">
      <div className="editor-head">
        <div className="editor-title">
          <button type="button" className="ui-link" onClick={() => leave('#/')}><Icon name="back" size={14} /> Informes</button>
          <input className="editor-name" aria-label="Nombre del informe" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
          <input className="editor-desc" aria-label="Descripción" placeholder="Añade una descripción" value={draft.description || ''} onChange={(e) => patch({ description: e.target.value })} />
        </div>
        <div className="editor-save">
          <span className={`ui-badge ${dirty ? 'ui-badge-warn' : ''}`}>{dirty ? 'Cambios sin guardar' : `Guardado · v${saved.version}`}</span>
          {dirty && <input className="ui-input" placeholder="Nota de la versión (opcional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Nota de la versión" />}
          <button className="ui-btn" type="button" disabled={!dirty} onClick={() => { if (confirm('¿Descartar los cambios no guardados?')) setDraft(saved); }}>Descartar</button>
          <button className="ui-btn ui-btn-primary" type="button" disabled={!dirty} onClick={save}><Icon name="save" size={16} />Guardar versión</button>
        </div>
      </div>

      <nav className="tabs" role="tablist" aria-label="Secciones del informe">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => go(`#/report/${id}/${t.id}`)}>
            <Icon name={t.icon} size={16} /><span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="tab-body" role="tabpanel">
        {tab === 'preview' && <ReportFrame key={draft.version} html={html} dataSources={draft.dataSources} params={draft.params} height="calc(100vh - 260px)" />}
        {tab === 'design' && (draft.mode === 'designer' ? (
          <Designer model={draft.model || emptyModel(draft.name)} dataSources={draft.dataSources} params={draft.params} onChange={(model) => patch({ model })} />
        ) : (
          <div className="ui-card ui-empty">
            <p><b>Este informe usa HTML manual.</b></p>
            {embedded ? (
              <>
                <p>El HTML contiene un modelo del diseñador; puedes volver a editarlo visualmente.</p>
                <button className="ui-btn ui-btn-primary" type="button" onClick={() => patch({ mode: 'designer', model: embedded })}>Abrir en el diseñador</button>
              </>
            ) : (
              <>
                <p>Puedes seguir editándolo en la pestaña HTML o empezar un diseño visual (sustituirá al HTML al guardar; el actual queda en el historial).</p>
                <div className="ui-actions" style={{ justifyContent: 'center' }}>
                  <button className="ui-btn" type="button" onClick={() => go(`#/report/${id}/html`)}>Ir a HTML</button>
                  <button className="ui-btn ui-btn-primary" type="button" onClick={() => patch({ mode: 'designer', model: draft.model || emptyModel(draft.name) })}>Usar el diseñador</button>
                </div>
              </>
            )}
          </div>
        ))}
        {tab === 'data' && <DataSourcesEditor dataSources={draft.dataSources} params={draft.params} usage={sourceUsage(draft.mode === 'designer' ? draft.model : null)} onChange={patch} />}
        {tab === 'html' && <HtmlTab report={draft} onChange={patch} />}
        {tab === 'history' && <HistoryTab report={saved} dirty={dirty} onRestored={(r) => { setSaved(r); setDraft(r); flash(`Restaurada como versión ${r.version}`); }} />}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
