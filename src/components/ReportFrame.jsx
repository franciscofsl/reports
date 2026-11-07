import { useEffect, useMemo, useRef, useState } from 'react';
import { buildReportData } from '../lib/sqlEngine.js';
import { injectData } from '../lib/htmlGenerator.js';
import Icon from './Icon.jsx';
import ParamsBar from './ParamsBar.jsx';

const DEVICES = [
  { id: 'desktop', label: 'Escritorio', width: null, icon: 'M3 5h18v11H3z M8 20h8 M12 16v4' },
  { id: 'tablet', label: 'Tablet', width: 820, icon: 'M6 3h12v18H6z M11 18h2' },
  { id: 'mobile', label: 'Móvil', width: 390, icon: 'M8 3h8v18H8z M11 18h2' },
];

/** Vista previa aislada (iframe sandbox) del HTML con los datos inyectados. */
export default function ReportFrame({ html, dataSources, params, height = '70vh', devices = true }) {
  const [values, setValues] = useState({});
  const [applied, setApplied] = useState({});
  const [filters, setFilters] = useState({});
  const [device, setDevice] = useState('desktop');
  const frame = useRef(null);
  const { data, errors } = useMemo(() => buildReportData(dataSources, params, applied), [dataSources, params, applied]);
  const doc = useMemo(() => (html ? injectData(html, data) : ''), [html, data]);

  useEffect(() => {
    const on = (e) => {
      if (e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === 'rpt:filters') setFilters(e.data.filters || {});
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);
  useEffect(() => setFilters({}), [doc]);

  const post = (msg) => frame.current?.contentWindow?.postMessage(msg, '*');
  const openTab = () => {
    const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const nFilters = Object.keys(filters).length;
  const dev = DEVICES.find((d) => d.id === device);

  return (
    <div className="ui-frame">
      <div className="ui-frame-bar">
        <form className="ui-params" onSubmit={(e) => { e.preventDefault(); setApplied(values); }}>
          <ParamsBar params={params || []} values={values} onChange={setValues} />
          {params?.length > 0 && <button className="ui-btn" type="submit"><Icon name="play" size={16} />Aplicar</button>}
        </form>
        <span className="ui-frame-tools">
          {nFilters > 0 && <button className="ui-btn ui-btn-subtle" type="button" onClick={() => post({ type: 'rpt:clearFilters' })} title={Object.keys(filters).join(', ')}><Icon name="close" size={16} />Quitar {nFilters} filtro{nFilters > 1 ? 's' : ''}</button>}
          {devices && (
            <span className="ui-seg" role="radiogroup" aria-label="Ancho de la vista previa">
              {DEVICES.map((d) => <button key={d.id} type="button" role="radio" aria-checked={device === d.id} aria-label={d.label} title={d.label} className={device === d.id ? 'is-on' : ''} onClick={() => setDevice(d.id)}><Icon path={d.icon} size={16} /></button>)}
            </span>
          )}
          <button className="ui-btn ui-btn-subtle" type="button" onClick={() => post({ type: 'rpt:print' })} disabled={!html} title="Imprimir o guardar como PDF"><Icon path="M7 9V3h10v6 M7 17H4v-7h16v7h-3 M7 14h10v7H7z" size={16} /><span className="ui-hide-s">Imprimir / PDF</span></button>
          <button className="ui-btn ui-btn-subtle" type="button" onClick={openTab} disabled={!html}><Icon name="external" size={16} /><span className="ui-hide-s">Abrir en pestaña</span></button>
        </span>
      </div>
      {Object.keys(errors).length > 0 && (
        <div className="ui-msg ui-msg-error" role="alert">
          {Object.entries(errors).map(([k, v]) => <div key={k}><b>{k}</b>: {v}</div>)}
        </div>
      )}
      {html ? (
        <div className={`ui-iframe-wrap ${dev.width ? 'is-device' : ''}`}>
          <iframe ref={frame} className="ui-iframe" title="Vista previa del informe" sandbox="allow-scripts allow-popups allow-downloads allow-modals" srcDoc={doc}
            style={{ height, maxWidth: dev.width || undefined }} />
        </div>
      ) : (
        <div className="ui-empty">Este informe aún no tiene HTML.</div>
      )}
    </div>
  );
}
