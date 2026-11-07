import { deleteReport, duplicateReport, listVersions, resetDemo } from '../lib/store.js';
import Icon from '../components/Icon.jsx';

const fmt = (d) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));

export default function ReportList({ reports, go }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Informes</h1>
          <p className="ui-hint">Crea informes HTML con el asistente o sube tu propio HTML y vincúlalo a orígenes de datos.</p>
        </div>
        <div className="ui-actions">
          <button className="ui-btn" type="button" onClick={() => go('#/new?mode=manual')}><Icon name="upload" size={16} />Crear subiendo HTML</button>
          <button className="ui-btn ui-btn-primary" type="button" onClick={() => go('#/new')}><Icon name="wand" size={16} />Nuevo con asistente</button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="ui-card ui-empty">
          <p>No hay informes todavía.</p>
          <button className="ui-btn ui-btn-primary" type="button" onClick={() => go('#/new')}>Crear el primero</button>
        </div>
      ) : (
        <div className="cards">
          {reports.map((r) => (
            <article key={r.id} className="ui-card report-card">
              <button type="button" className="report-card-main" onClick={() => go(`#/report/${r.id}/preview`)}>
                <span className="report-card-icon"><Icon name="report" size={22} /></span>
                <span>
                  <h2>{r.name}</h2>
                  <p>{r.description || 'Sin descripción'}</p>
                </span>
              </button>
              <div className="report-card-meta">
                <span className={`ui-badge ${r.mode === 'designer' ? 'ui-badge-brand' : ''}`}>{r.mode === 'designer' ? 'Diseñador' : 'HTML manual'}</span>
                <span>v{r.version} · {listVersions(r.id).length} versiones</span>
                <span>{r.dataSources.length} orígenes</span>
                <span>Actualizado {fmt(r.updatedAt)}</span>
              </div>
              <div className="ui-actions">
                <button className="ui-btn ui-btn-subtle" type="button" onClick={() => go(`#/report/${r.id}/preview`)}><Icon name="eye" size={16} />Ver</button>
                <button className="ui-btn ui-btn-subtle" type="button" onClick={() => go(`#/report/${r.id}/${r.mode === 'designer' ? 'design' : 'html'}`)}><Icon name="edit" size={16} />Editar</button>
                <button className="ui-btn ui-btn-subtle" type="button" onClick={() => duplicateReport(r.id)}><Icon name="copy" size={16} />Duplicar</button>
                <button className="ui-btn ui-btn-subtle ui-danger" type="button" onClick={() => { if (confirm(`¿Eliminar «${r.name}» y todo su historial?`)) deleteReport(r.id); }}><Icon name="delete" size={16} />Eliminar</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="ui-hint page-foot">
        Prototipo: los datos se guardan en el navegador (localStorage) y las consultas SQL se simulan sobre una BD JSON de ejemplo.{' '}
        <button type="button" className="ui-link" onClick={() => { if (confirm('¿Borrar todos los informes y restaurar el ejemplo?')) resetDemo(); }}>Restablecer datos de ejemplo</button>
      </p>
    </div>
  );
}
