import { useMemo, useRef, useState } from 'react';
import DataSourcesEditor from '../components/DataSourcesEditor.jsx';
import Designer from '../components/Designer.jsx';
import ReportFrame from '../components/ReportFrame.jsx';
import Icon from '../components/Icon.jsx';
import { readHtmlFile } from '../components/HtmlTab.jsx';
import { autoLayout } from '../lib/autoLayout.js';
import { emptyModel, generateHtml, parseModelFromHtml, sourcesUsedInHtml } from '../lib/htmlGenerator.js';
import { renameSource, sourceUsage, validateModel } from '../lib/modelOps.js';
import { buildReportData } from '../lib/sqlEngine.js';
import { createReport } from '../lib/store.js';
import { TEMPLATES } from '../lib/templates.js';

const START = [
  { id: 'blank', title: 'En blanco', text: 'Lienzo vacío: define tus orígenes y arrastra componentes.', icon: 'layout' },
  { id: 'auto', title: 'Desde los datos', text: 'Define los orígenes y el asistente propone un diseño automáticamente.', icon: 'wand' },
  ...TEMPLATES.map((t) => ({ id: `tpl:${t.id}`, title: `Plantilla: ${t.name}`, text: t.description, icon: t.icon })),
  { id: 'manual', title: 'Subir HTML', text: 'Flujo clásico: sube un HTML propio y carga los orígenes de datos.', icon: 'upload' },
];

export default function Wizard({ go, initialMode }) {
  const [step, setStep] = useState(0);
  const [start, setStart] = useState(initialMode === 'manual' ? 'manual' : 'blank');
  const [draft, setDraft] = useState({ name: '', description: '', mode: initialMode === 'manual' ? 'manual' : 'designer', model: emptyModel(''), dataSources: [], params: [], html: '' });
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const manual = start === 'manual';

  const steps = manual ? ['Información', 'Orígenes de datos', 'Subir HTML', 'Revisar'] : ['Información', 'Orígenes de datos', 'Diseño', 'Revisar'];
  const patch = (p) => setDraft((d) => ({ ...d, ...p }));

  const chooseStart = (id) => {
    setStart(id);
    if (id.startsWith('tpl:')) {
      const tpl = TEMPLATES.find((t) => `tpl:${t.id}` === id);
      const t = tpl.build();
      setDraft((d) => ({ ...d, ...t, mode: 'designer', name: d.name || t.model.title, model: { ...t.model, title: d.name || t.model.title } }));
    } else if (id === 'blank' || id === 'auto') {
      setDraft((d) => ({ ...d, mode: 'designer', model: emptyModel(d.name), dataSources: [], params: [] }));
    } else {
      setDraft((d) => ({ ...d, mode: 'manual', dataSources: [], params: [] }));
    }
  };

  const html = useMemo(() => (draft.mode === 'designer' ? generateHtml(draft) : draft.html), [draft]);
  const issues = draft.mode === 'designer'
    ? validateModel(draft.model, draft.dataSources)
    : sourcesUsedInHtml(draft.html || '<p></p>').filter((s) => !draft.dataSources.some((d) => d.id === s)).map((s) => ({ msg: `El HTML usa el origen «${s}», que no está definido` }));

  const canNext = () => {
    if (step === 0 && !draft.name.trim()) return 'Indica un nombre para el informe.';
    if (step === 1 && start === 'auto' && !draft.dataSources.length) return 'Para el diseño automático define al menos un origen de datos.';
    if (step === 2 && manual && !draft.html) return 'Sube un archivo HTML o pega su contenido.';
    if (step === 2 && !manual && !draft.model.rows.length) return 'Añade al menos un componente al lienzo.';
    return '';
  };
  const next = () => {
    const e = canNext();
    setError(e);
    if (e) return;
    if (step === 0 && draft.mode === 'designer' && !draft.model.title) patch({ model: { ...draft.model, title: draft.name } });
    if (step === 1 && start === 'auto' && !draft.model.rows.length) {
      const { data } = buildReportData(draft.dataSources, draft.params);
      patch({ model: { ...autoLayout(draft.dataSources, data, { title: draft.model.title || draft.name, subtitle: draft.description }), theme: draft.model.theme } });
    }
    setStep(step + 1);
  };
  const finish = () => {
    const saved = createReport({ ...draft, html });
    go(`#/report/${saved.id}/preview`);
  };

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <button type="button" className="ui-link" onClick={() => go('#/')}><Icon name="back" size={14} /> Informes</button>
          <h1>Asistente de nuevo informe</h1>
        </div>
      </div>
      <ol className="stepper" aria-label="Pasos">
        {steps.map((s, i) => (
          <li key={s} className={i === step ? 'is-cur' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
            <button type="button" disabled={i > step} onClick={() => setStep(i)}><span className="stepper-n">{i < step ? <Icon name="check" size={14} /> : i + 1}</span><span className="stepper-l">{s}</span></button>
          </li>
        ))}
      </ol>

      <div className="wizard-body">
        {step === 0 && (
          <div className="ui-card wizard-info">
            <div className="ui-grid-2">
              <label className="ui-field"><span>Nombre del informe *</span><input className="ui-input" autoFocus value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="p. ej. Ventas trimestrales" /></label>
              <label className="ui-field"><span>Descripción</span><input className="ui-input" value={draft.description} onChange={(e) => patch({ description: e.target.value })} /></label>
            </div>
            <h3>¿Cómo quieres empezar?</h3>
            <div className="choice-grid" role="radiogroup">
              {START.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={start === s.id} className={`choice ${start === s.id ? 'is-on' : ''}`} onClick={() => chooseStart(s.id)}>
                  <Icon name={s.icon} size={24} />
                  <b>{s.title}</b>
                  <small>{s.text}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <>
            <p className="ui-hint">Define las consultas que alimentan el informe con el <b>editor visual</b> (arrastrando tablas) o escribiendo SQL, y revisa el tipo y formato de cada campo.{start === 'auto' ? ' Al continuar se generará un diseño a partir de estos orígenes.' : ''}</p>
            <DataSourcesEditor dataSources={draft.dataSources} params={draft.params} usage={sourceUsage(draft.model)} onChange={patch}
              onRename={(from, to) => setDraft((d) => ({ ...d, model: renameSource(d.model, from, to) }))} />
          </>
        )}

        {step === 2 && !manual && (
          <Designer model={draft.model} dataSources={draft.dataSources} params={draft.params} onChange={(model) => patch({ model })} />
        )}

        {step === 2 && manual && (
          <div className="ui-card">
            <div className="ui-actions">
              <button className="ui-btn ui-btn-primary" type="button" onClick={() => fileRef.current.click()}><Icon name="upload" size={16} />Elegir archivo HTML…</button>
              <input ref={fileRef} type="file" accept=".html,.htm,text/html" hidden onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  const text = await readHtmlFile(f);
                  const model = parseModelFromHtml(text);
                  patch({ html: text, ...(model ? { model } : {}) });
                  setError('');
                } catch (err) { setError(err.message); }
              }} />
            </div>
            <label className="ui-field"><span>o pega el HTML</span>
              <textarea className="ui-input ui-code ui-html" spellCheck={false} value={draft.html} onChange={(e) => patch({ html: e.target.value })} />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-review">
            <div className="ui-card">
              <h3>{draft.name}</h3>
              <p className="ui-hint">{draft.description}</p>
              <ul className="review-list">
                <li><b>Modo:</b> {draft.mode === 'designer' ? 'Diseñador visual' : 'HTML manual'}</li>
                <li><b>Orígenes:</b> {draft.dataSources.map((d) => d.id).join(', ') || 'ninguno'}</li>
                <li><b>Parámetros:</b> {draft.params.map((p) => p.name).join(', ') || 'ninguno'}</li>
                <li><b>Tamaño HTML:</b> {(new Blob([html]).size / 1024).toFixed(1)} KB (la librería se carga por URL)</li>
              </ul>
              {issues.length > 0 && <div className="ui-msg ui-msg-warn"><b>Avisos</b><ul>{issues.map((i, k) => <li key={k}>{i.msg}</li>)}</ul></div>}
            </div>
            <ReportFrame html={html} dataSources={draft.dataSources} params={draft.params} />
          </div>
        )}
      </div>

      {error && <div className="ui-msg ui-msg-error" role="alert">{error}</div>}
      <div className="wizard-nav">
        <button className="ui-btn" type="button" onClick={() => (step ? setStep(step - 1) : go('#/'))}><Icon name="back" size={16} />{step ? 'Atrás' : 'Cancelar'}</button>
        <span className="ui-spacer" />
        {step < steps.length - 1
          ? <button className="ui-btn ui-btn-primary" type="button" onClick={next}>Siguiente<Icon name="right" size={16} /></button>
          : <button className="ui-btn ui-btn-primary" type="button" onClick={finish}><Icon name="save" size={16} />Crear informe</button>}
      </div>
    </div>
  );
}
