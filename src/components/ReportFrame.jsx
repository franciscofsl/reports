import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { injectData } from '../lib/htmlGenerator.js';
import { buildFullData } from '../lib/reportData.js';
import { deleteBookmark, listBookmarks, saveBookmark, subscribe } from '../lib/store.js';
import Icon from './Icon.jsx';
import ParamsBar from './ParamsBar.jsx';

const DEVICES = [
  { id: 'desktop', label: 'Escritorio', width: null, icon: 'M3 5h18v11H3z M8 20h8 M12 16v4' },
  { id: 'tablet', label: 'Tablet', width: 820, icon: 'M6 3h12v18H6z M11 18h2' },
  { id: 'mobile', label: 'Móvil', width: 390, icon: 'M8 3h8v18H8z M11 18h2' },
];

/** Codifica/decodifica el estado de una vista en la URL (base64url de JSON). */
export function encodeView(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeView(s) {
  try {
    const bin = atob(String(s).replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
}
const slug = (s) => String(s || 'informe').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'informe';

function Popover({ label, icon, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <span className="ui-pop" ref={ref}>
      <button type="button" className="ui-btn ui-btn-subtle" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}><Icon name={icon} path={icon.length > 12 ? icon : undefined} size={16} /><span className="ui-hide-s">{label}</span><Icon name="down" size={12} /></button>
      {open && <div className={`ui-pop-body ui-pop-${align}`} role="dialog" aria-label={label}>{children(() => setOpen(false))}</div>}
    </span>
  );
}

/** Vista previa aislada (iframe sandbox) del HTML con los datos inyectados. */
export default function ReportFrame({ html, dataSources, params, semantic, model, reportId, reportName, brand, height = '70vh', devices = true, initialState = null, initialParams = null }) {
  const [values, setValues] = useState(initialParams || {});
  const [applied, setApplied] = useState(initialParams || {});
  const [rptState, setRptState] = useState(null);
  const [device, setDevice] = useState('desktop');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [bmName, setBmName] = useState('');
  const frame = useRef(null);
  const pending = useRef(initialState);
  const waiters = useRef({});
  const bookmarks = useSyncExternalStore(subscribe, () => JSON.stringify(reportId ? listBookmarks(reportId) : []));
  const bmList = JSON.parse(bookmarks);

  const { data, errors } = useMemo(() => buildFullData({ id: reportId, dataSources, params, semantic, model }, applied), [reportId, dataSources, params, semantic, model, applied]);
  const doc = useMemo(() => (html ? injectData(html, data) : ''), [html, data]);

  useEffect(() => {
    const on = (e) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data || {};
      if (d.type === 'rpt:state') setRptState(d.state);
      else if (d.type === 'rpt:filters' && !d.state) setRptState((s) => ({ ...(s || {}), filters: d.filters || {} }));
      else if (d.type === 'rpt:ready') {
        if (pending.current) { frame.current.contentWindow.postMessage({ type: 'rpt:setState', state: pending.current }, '*'); pending.current = null; }
      } else if (d.type === 'rpt:collected' && waiters.current[d.id]) { waiters.current[d.id](d); delete waiters.current[d.id]; }
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);
  useEffect(() => setRptState(null), [doc]);

  const post = (m) => frame.current?.contentWindow?.postMessage(m, '*');
  const flash = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 3500); };
  const openTab = () => {
    const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const collect = () => new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    waiters.current[id] = (d) => (d.error ? reject(new Error(d.error)) : resolve(d.payload));
    post({ type: 'rpt:collect', id });
    setTimeout(() => { if (waiters.current[id]) { delete waiters.current[id]; reject(new Error('El informe no respondió (¿usa una versión antigua de RptLib?)')); } }, 15000);
  });
  const exportAs = async (kind) => {
    if (kind === 'pdf') { post({ type: 'rpt:print' }); return; }
    setBusy(kind === 'docx' ? 'Generando Word…' : 'Generando Excel…');
    try {
      const payload = await collect();
      const ex = await import('../lib/exporters.js');
      const blob = kind === 'docx' ? await ex.buildDocx(payload, { brand }) : await ex.buildXlsx(payload, { brand });
      ex.saveBlob(`${slug(reportName || payload.title)}.${kind}`, blob);
      flash(true, `Exportado a ${kind === 'docx' ? 'Word' : 'Excel'}.`);
    } catch (e) {
      flash(false, `No se pudo exportar: ${e.message}`);
    } finally {
      setBusy('');
    }
  };
  const viewLink = (st, pv) => `${window.location.origin}${window.location.pathname}#/view/${reportId}?v=${encodeView({ s: st || {}, p: pv || {} })}`;
  const applyView = (bm) => {
    const same = JSON.stringify(bm.params || {}) === JSON.stringify(applied);
    setValues(bm.params || {});
    if (same) post({ type: 'rpt:setState', state: bm.state });
    else { pending.current = bm.state; setApplied(bm.params || {}); }
  };
  const nFilters = Object.keys(rptState?.filters || {}).length;
  const dev = DEVICES.find((d) => d.id === device);

  return (
    <div className="ui-frame">
      <div className="ui-frame-bar">
        <form className="ui-params" onSubmit={(e) => { e.preventDefault(); setApplied(values); }}>
          <ParamsBar params={params || []} values={values} onChange={setValues} />
          {params?.length > 0 && <button className="ui-btn" type="submit"><Icon name="play" size={16} />Aplicar</button>}
        </form>
        <span className="ui-frame-tools">
          {nFilters > 0 && <button className="ui-btn ui-btn-subtle" type="button" onClick={() => post({ type: 'rpt:clearFilters' })}><Icon name="close" size={16} />Quitar {nFilters} filtro{nFilters > 1 ? 's' : ''}</button>}
          {reportId && (
            <Popover label="Vistas" icon="M6 4h12v17l-6-4-6 4z">
              {(close) => (
                <div className="views">
                  <form className="views-save" onSubmit={(e) => { e.preventDefault(); if (!bmName.trim()) return; saveBookmark(reportId, { name: bmName.trim(), state: rptState || {}, params: applied }); setBmName(''); flash(true, 'Vista guardada.'); }}>
                    <label className="ui-field"><span>Guardar la vista actual (filtros, nivel, página y parámetros)</span>
                      <span className="ui-inline"><input className="ui-input" placeholder="p. ej. Zona Sur – T3" value={bmName} onChange={(e) => setBmName(e.target.value)} /><button type="submit" className="ui-btn ui-btn-primary" disabled={!bmName.trim()}>Guardar</button></span>
                    </label>
                  </form>
                  <button type="button" className="ui-link" onClick={() => { navigator.clipboard?.writeText(viewLink(rptState, applied)); flash(true, 'Enlace de la vista actual copiado.'); close(); }}><Icon name="share" size={14} />Copiar enlace de la vista actual</button>
                  {bmList.length > 0 && <h5>Vistas guardadas</h5>}
                  <ul className="views-list">
                    {bmList.map((b) => (
                      <li key={b.id}>
                        <button type="button" className="ui-link" onClick={() => { applyView(b); close(); }}>{b.name}</button>
                        <small>{Object.keys(b.state?.filters || {}).length} filtro(s)</small>
                        <button type="button" className="ui-icon-btn ui-icon-btn-s" aria-label={`Copiar enlace de ${b.name}`} title="Copiar enlace" onClick={() => { navigator.clipboard?.writeText(viewLink(b.state, b.params)); flash(true, `Enlace de «${b.name}» copiado.`); }}><Icon name="share" size={14} /></button>
                        <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" aria-label={`Eliminar vista ${b.name}`} onClick={() => deleteBookmark(reportId, b.id)}><Icon name="delete" size={14} /></button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Popover>
          )}
          <Popover label="Exportar" icon="download">
            {(close) => (
              <div className="ui-menu-list" role="menu">
                <button type="button" role="menuitem" onClick={() => { close(); exportAs('pdf'); }}><Icon path="M7 9V3h10v6 M7 17H4v-7h16v7h-3 M7 14h10v7H7z" size={16} />Imprimir / PDF</button>
                <button type="button" role="menuitem" onClick={() => { close(); exportAs('docx'); }}><Icon name="report" size={16} />Word (.docx)</button>
                <button type="button" role="menuitem" onClick={() => { close(); exportAs('xlsx'); }}><Icon name="table" size={16} />Excel (.xlsx)</button>
              </div>
            )}
          </Popover>
          {devices && (
            <span className="ui-seg" role="radiogroup" aria-label="Ancho de la vista previa">
              {DEVICES.map((d) => <button key={d.id} type="button" role="radio" aria-checked={device === d.id} aria-label={d.label} title={d.label} className={device === d.id ? 'is-on' : ''} onClick={() => setDevice(d.id)}><Icon path={d.icon} size={16} /></button>)}
            </span>
          )}
          <button className="ui-btn ui-btn-subtle" type="button" onClick={openTab} disabled={!html} title="Abrir en pestaña"><Icon name="external" size={16} /><span className="ui-hide-s">Abrir</span></button>
        </span>
      </div>
      {(busy || msg) && <div className={`ui-msg ${msg && !msg.ok ? 'ui-msg-error' : 'ui-msg-ok'}`} role="status">{busy || msg.text}</div>}
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
