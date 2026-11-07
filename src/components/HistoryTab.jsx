import { useState, useSyncExternalStore } from 'react';
import { listVersions, publishVersion, restoreVersion, setVersionLabel, subscribe, unpublish } from '../lib/store.js';
import { generateHtml } from '../lib/htmlGenerator.js';
import { diffVersions } from '../lib/diff.js';
import Icon from './Icon.jsx';
import ReportFrame from './ReportFrame.jsx';
import { download, fileName } from './HtmlTab.jsx';

const fmtDate = (d) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
const PARTS = [['design', 'Diseño / HTML'], ['data', 'Orígenes de datos'], ['params', 'Parámetros']];

function DiffList({ title, items, render }) {
  if (!items.length) return null;
  return <div className="diff-group"><h5>{title}</h5><ul>{items.map((x, i) => <li key={i}>{render ? render(x) : x}</li>)}</ul></div>;
}

function DiffView({ a, b }) {
  const d = diffVersions(a, b);
  return (
    <div className="diff">
      {d.empty && <p className="ui-hint">No hay diferencias de contenido entre v{a.n} y v{b.n}.</p>}
      <DiffList title="General" items={d.general} />
      <DiffList title="Componentes añadidos" items={d.components.added} render={(c) => <><span className="diff-add">+</span> {c.name} <small>(fila.posición {c.pos})</small></>} />
      <DiffList title="Componentes eliminados" items={d.components.removed} render={(c) => <><span className="diff-del">−</span> {c.name}</>} />
      <DiffList title="Componentes modificados" items={d.components.changed} render={(c) => <><b>{c.name}</b><ul>{c.changes.map((x, i) => <li key={i}><code>{x}</code></li>)}</ul></>} />
      <DiffList title="Orígenes añadidos" items={d.sources.added} render={(x) => <><span className="diff-add">+</span> <code>{x}</code></>} />
      <DiffList title="Orígenes eliminados" items={d.sources.removed} render={(x) => <><span className="diff-del">−</span> <code>{x}</code></>} />
      <DiffList title="Orígenes modificados" items={d.sources.changed} render={(s) => (
        <>
          <b><code>{s.id}</code></b>
          {s.fields.length > 0 && <ul>{s.fields.map((f, i) => <li key={i}><code>{f}</code></li>)}</ul>}
          {s.calculated && <div className="ui-hint">Campos calculados modificados</div>}
          {s.sql && <pre className="diff-sql">{s.sql.map((l, i) => <span key={i} className={`diff-${l.type}`}>{l.type === 'add' ? '+ ' : l.type === 'del' ? '− ' : '  '}{l.text}{'\n'}</span>)}</pre>}
        </>
      )} />
      <DiffList title="Parámetros añadidos" items={d.params.added} />
      <DiffList title="Parámetros eliminados" items={d.params.removed} />
      <DiffList title="Parámetros modificados" items={d.params.changed} render={(x) => <code>{x}</code>} />
    </div>
  );
}

export default function HistoryTab({ report, dirty, onRestored, onPublished }) {
  const [preview, setPreview] = useState(null);
  const [compare, setCompare] = useState([]); // ids
  const [restoring, setRestoring] = useState(null); // { id, parts }
  const versions = useSyncExternalStore(subscribe, () => JSON.stringify(listVersions(report.id)));
  const list = JSON.parse(versions);
  const publishedId = report.published?.versionId;

  const toggleCompare = (id) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c.slice(-1), id]));
  const doRestore = () => {
    const v = list.find((x) => x.id === restoring.id);
    if (dirty && !confirm('Tienes cambios sin guardar que se perderán. ¿Continuar?')) return;
    onRestored(restoreVersion(report.id, v.id, restoring.parts));
    setRestoring(null);
    setPreview(null);
  };
  const htmlOf = (v) => (v.mode === 'designer' && v.model ? generateHtml({ ...report, ...v }) : v.html);
  const pair = compare.length === 2 ? compare.map((id) => list.find((v) => v.id === id)).sort((x, y) => x.n - y.n) : null;

  return (
    <div className="hist">
      <div className="ui-card">
        <div className="ui-card-head">
          <h3>Historial de versiones</h3>
          <small>{list.length} guardadas (máx. 50) · marca dos para compararlas</small>
        </div>
        {report.published && (
          <div className="ui-msg ui-msg-ok hist-pub">
            <span>Publicada la <b>v{report.published.n}</b> el {fmtDate(report.published.date)}. Es la que ve el lector en el visor.</span>
            <span className="ui-actions" style={{ margin: 0 }}>
              <a className="ui-btn ui-btn-subtle" href={`#/view/${report.id}`} target="_blank" rel="noreferrer"><Icon name="external" size={16} />Abrir visor</a>
              <button type="button" className="ui-btn ui-btn-subtle" onClick={() => { unpublish(report.id); onPublished?.(); }}>Despublicar</button>
            </span>
          </div>
        )}
        <ol className="hist-list">
          {list.map((v, i) => (
            <li key={v.id} className={`hist-item ${preview?.id === v.id ? 'is-sel' : ''}`}>
              <label className="hist-cmp" title="Comparar">
                <input type="checkbox" checked={compare.includes(v.id)} onChange={() => toggleCompare(v.id)} aria-label={`Comparar versión ${v.n}`} />
              </label>
              <div className="hist-n">v{v.n}</div>
              <div className="hist-info">
                <b>{v.note || 'Guardado'}</b>
                <small>{fmtDate(v.date)} · {v.mode === 'designer' ? 'Diseñador' : 'HTML manual'} · {(new Blob([v.html || '']).size / 1024).toFixed(1)} KB · {v.dataSources?.length || 0} orígenes</small>
                <input className="hist-label" aria-label={`Etiqueta de la versión ${v.n}`} placeholder="+ etiqueta (p. ej. «Aprobada por dirección»)" defaultValue={v.label || ''}
                  onBlur={(e) => e.target.value !== (v.label || '') && setVersionLabel(report.id, v.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} />
              </div>
              <div className="hist-actions">
                {i === 0 && <span className="ui-badge ui-badge-brand">Actual</span>}
                {publishedId === v.id ? <span className="ui-badge ui-badge-ok">Publicada</span> : (
                  <button className="ui-btn ui-btn-subtle" type="button" onClick={() => { publishVersion(report.id, v.id); onPublished?.(); }}><Icon name="check" size={16} />Publicar</button>
                )}
                <button className="ui-btn ui-btn-subtle" type="button" onClick={() => setPreview(preview?.id === v.id ? null : v)}><Icon name="eye" size={16} />Ver</button>
                <button className="ui-btn ui-btn-subtle" type="button" aria-label={`Descargar versión ${v.n}`} onClick={() => download(fileName(`${report.name}-v${v.n}`), v.html)}><Icon name="download" size={16} /><span className="ui-hide-s">Descargar</span></button>
                {i > 0 && <button className="ui-btn" type="button" onClick={() => setRestoring(restoring?.id === v.id ? null : { id: v.id, parts: PARTS.map((p) => p[0]) })}><Icon name="restore" size={16} />Restaurar</button>}
              </div>
              {restoring?.id === v.id && (
                <div className="hist-restore">
                  <span>¿Qué quieres restaurar de la v{v.n}?</span>
                  {PARTS.map(([k, l]) => (
                    <label key={k} className="ui-check"><input type="checkbox" checked={restoring.parts.includes(k)} onChange={(e) => setRestoring({ ...restoring, parts: e.target.checked ? [...restoring.parts, k] : restoring.parts.filter((x) => x !== k) })} /> {l}</label>
                  ))}
                  <button className="ui-btn ui-btn-primary" type="button" disabled={!restoring.parts.length} onClick={doRestore}>Restaurar como nueva versión</button>
                  <button className="ui-btn ui-btn-subtle" type="button" onClick={() => setRestoring(null)}>Cancelar</button>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
      {pair && (
        <div className="ui-card">
          <div className="ui-card-head"><h3>Cambios de v{pair[0].n} a v{pair[1].n}</h3><button className="ui-icon-btn" type="button" onClick={() => setCompare([])} aria-label="Cerrar comparación"><Icon name="close" /></button></div>
          <DiffView a={pair[0]} b={pair[1]} />
        </div>
      )}
      {preview && (
        <div className="ui-card">
          <div className="ui-card-head"><h3>Vista previa de v{preview.n}</h3><button className="ui-icon-btn" type="button" onClick={() => setPreview(null)} aria-label="Cerrar"><Icon name="close" /></button></div>
          <ReportFrame html={htmlOf(preview)} dataSources={preview.dataSources || []} params={preview.params || []} height="60vh" />
        </div>
      )}
    </div>
  );
}
