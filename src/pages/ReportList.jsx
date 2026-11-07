import { useMemo, useRef, useState } from 'react';
import { deleteReport, duplicateReport, exportReport, importReport, listVersions, resetDemo } from '../lib/store.js';
import Icon from '../components/Icon.jsx';

const fmt = (d) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function downloadJson(name, obj) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export default function ReportList({ reports, go }) {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('recent');
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  const list = useMemo(() => {
    const n = norm(q);
    let r = reports.filter((x) => (!n || norm(`${x.name} ${x.description} ${x.dataSources.map((d) => d.id).join(' ')}`).includes(n))
      && (!mode || x.mode === mode) && (!status || (status === 'published' ? !!x.published : !x.published)));
    r = [...r].sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name, 'es') : sort === 'created' ? String(b.createdAt).localeCompare(String(a.createdAt)) : String(b.updatedAt).localeCompare(String(a.updatedAt))));
    return r;
  }, [reports, q, mode, status, sort]);

  const onImport = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const saved = importReport(await f.text());
      setMsg({ ok: true, text: `Importado «${saved.name}».` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Informes</h1>
          <p className="ui-hint">Crea informes HTML con el asistente o sube tu propio HTML y vincúlalo a orígenes de datos.</p>
        </div>
        <div className="ui-actions">
          <button className="ui-btn" type="button" onClick={() => fileRef.current.click()}><Icon name="upload" size={16} />Importar</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onImport} />
          <button className="ui-btn" type="button" onClick={() => go('#/new?mode=manual')}><Icon name="code" size={16} />Subir HTML</button>
          <button className="ui-btn ui-btn-primary" type="button" onClick={() => go('#/new')}><Icon name="wand" size={16} />Nuevo con asistente</button>
        </div>
      </div>

      <div className="list-tools" role="search">
        <label className="list-search">
          <Icon name="search" size={16} />
          <input className="ui-input" type="search" placeholder="Buscar por nombre, descripción u origen…" aria-label="Buscar informes" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="ui-input" aria-label="Filtrar por modo" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">Todos los modos</option><option value="designer">Diseñador</option><option value="manual">HTML manual</option>
        </select>
        <select className="ui-input" aria-label="Filtrar por estado" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option><option value="published">Publicados</option><option value="draft">Sin publicar</option>
        </select>
        <select className="ui-input" aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Modificados recientemente</option><option value="created">Creados recientemente</option><option value="name">Nombre (A-Z)</option>
        </select>
      </div>
      {msg && <div className={`ui-msg ${msg.ok ? 'ui-msg-ok' : 'ui-msg-error'}`} role="status">{msg.text}</div>}

      {reports.length === 0 ? (
        <div className="ui-card ui-empty">
          <p>No hay informes todavía.</p>
          <button className="ui-btn ui-btn-primary" type="button" onClick={() => go('#/new')}>Crear el primero</button>
        </div>
      ) : list.length === 0 ? (
        <div className="ui-card ui-empty"><p>Ningún informe coincide con la búsqueda.</p><button className="ui-btn" type="button" onClick={() => { setQ(''); setMode(''); setStatus(''); }}>Limpiar filtros</button></div>
      ) : (
        <div className="cards">
          {list.map((r) => (
            <article key={r.id} className="ui-card report-card">
              <button type="button" className="report-card-main" onClick={() => go(`#/report/${r.id}/preview`)}>
                <span className="report-card-icon" style={r.model?.theme?.brand ? { color: r.model.theme.brand } : undefined}><Icon name="report" size={22} /></span>
                <span>
                  <h2>{r.name}</h2>
                  <p>{r.description || 'Sin descripción'}</p>
                </span>
              </button>
              <div className="report-card-meta">
                <span className={`ui-badge ${r.mode === 'designer' ? 'ui-badge-brand' : ''}`}>{r.mode === 'designer' ? 'Diseñador' : 'HTML manual'}</span>
                {r.published ? <span className="ui-badge ui-badge-ok">Publicada v{r.published.n}</span> : <span className="ui-badge">Sin publicar</span>}
                <span>v{r.version} · {listVersions(r.id).length} versiones · {r.dataSources.length} orígenes</span>
                <span>Actualizado {fmt(r.updatedAt)}</span>
              </div>
              <div className="ui-actions">
                <button className="ui-btn ui-btn-subtle" type="button" onClick={() => go(`#/view/${r.id}`)}><Icon name="eye" size={16} />Visor</button>
                <button className="ui-btn ui-btn-subtle" type="button" onClick={() => go(`#/report/${r.id}/${r.mode === 'designer' ? 'design' : 'html'}`)}><Icon name="edit" size={16} />Editar</button>
                <button className="ui-btn ui-btn-subtle" type="button" onClick={() => duplicateReport(r.id)}><Icon name="copy" size={16} />Duplicar</button>
                <button className="ui-btn ui-btn-subtle" type="button" onClick={() => downloadJson(`${norm(r.name).replace(/[^a-z0-9]+/g, '-')}.informe.json`, exportReport(r.id, true))} title="Exporta definición, orígenes e historial"><Icon name="download" size={16} />Exportar</button>
                <button className="ui-btn ui-btn-subtle ui-danger" type="button" onClick={() => { if (confirm(`¿Eliminar «${r.name}» y todo su historial?`)) deleteReport(r.id); }}><Icon name="delete" size={16} />Eliminar</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="ui-hint page-foot">
        Prototipo: los datos se guardan en el navegador (localStorage) y las consultas SQL se simulan sobre una BD JSON de ejemplo.{' '}
        <button type="button" className="ui-link" onClick={() => { if (confirm('¿Borrar todos los informes y restaurar los ejemplos?')) resetDemo(); }}>Restablecer datos de ejemplo</button>
      </p>
    </div>
  );
}
