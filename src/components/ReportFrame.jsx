import { useMemo, useState } from 'react';
import { buildReportData } from '../lib/sqlEngine.js';
import { injectData } from '../lib/htmlGenerator.js';
import Icon from './Icon.jsx';

/** Vista previa aislada (iframe sandbox) del HTML con los datos inyectados. */
export default function ReportFrame({ html, dataSources, params, height = '70vh' }) {
  const [values, setValues] = useState({});
  const [applied, setApplied] = useState({});
  const { data, errors } = useMemo(() => buildReportData(dataSources, params, applied), [dataSources, params, applied]);
  const doc = useMemo(() => (html ? injectData(html, data) : ''), [html, data]);

  const openTab = () => {
    const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <div className="ui-frame">
      <div className="ui-frame-bar">
        <form className="ui-params" onSubmit={(e) => { e.preventDefault(); setApplied(values); }}>
          {(params || []).map((p) => (
            <label key={p.name} className="ui-field ui-field-inline">
              <span>{p.label || p.name}</span>
              <input className="ui-input" type={p.type === 'number' ? 'number' : p.type === 'date' ? 'date' : 'text'}
                value={values[p.name] ?? p.default ?? ''} onChange={(e) => setValues({ ...values, [p.name]: e.target.value })} />
            </label>
          ))}
          {params?.length > 0 && <button className="ui-btn" type="submit"><Icon name="play" size={16} />Aplicar</button>}
        </form>
        <button className="ui-btn ui-btn-subtle" type="button" onClick={openTab} disabled={!html}><Icon name="external" size={16} />Abrir en pestaña</button>
      </div>
      {Object.keys(errors).length > 0 && (
        <div className="ui-msg ui-msg-error" role="alert">
          {Object.entries(errors).map(([k, v]) => <div key={k}><b>{k}</b>: {v}</div>)}
        </div>
      )}
      {html ? (
        <iframe className="ui-iframe" title="Vista previa del informe" sandbox="allow-scripts allow-popups" srcDoc={doc} style={{ height }} />
      ) : (
        <div className="ui-empty">Este informe aún no tiene HTML.</div>
      )}
    </div>
  );
}
