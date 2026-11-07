import { useMemo } from 'react';
import { buildReportData } from '../lib/sqlEngine.js';
import { emptySemantic } from '../lib/reportData.js';
import { FORMATS } from '../lib/sqlEngine.js';
import Icon from './Icon.jsx';

const PARTS = [{ value: '', label: 'Valor del campo' }, { value: 'year', label: 'Año' }, { value: 'quarter', label: 'Trimestre' }, { value: 'month', label: 'Mes' }, { value: 'day', label: 'Día' }];
const ID_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const EXAMPLES = [
  ['SUM(importe)', 'Suma'],
  ['SUM(importe) / COUNT(*)', 'Ticket medio'],
  ['SUM(importe) / TOTAL(SUM(importe))', '% sobre el total del visual'],
  ["SUM(importe WHERE estado = 'Entregado')", 'Suma con condición'],
  ['COUNT(DISTINCT cliente)', 'Recuento distinto'],
  ['DIVIDE(SUM(importe), SUM(objetivo))', 'Cumplimiento (división segura)'],
];

/** Sugerencias de relación: campos con el mismo nombre en dos orígenes, o <x>_id ↔ id. */
function suggestRelations(dataSources, existing) {
  const out = [];
  const has = (a, b) => existing.some((r) => (r.from.source === a.s && r.from.field === a.f && r.to.source === b.s && r.to.field === b.f) || (r.from.source === b.s && r.from.field === b.f && r.to.source === a.s && r.to.field === a.f));
  for (let i = 0; i < dataSources.length; i++) {
    for (let j = i + 1; j < dataSources.length; j++) {
      const A = dataSources[i];
      const B = dataSources[j];
      for (const fa of A.fields || []) {
        for (const fb of B.fields || []) {
          const same = fa.name === fb.name && (fa.type === 'string' || /(^id$|_id$)/.test(fa.name));
          const fk = (fa.name === `${B.id.replace(/s$/, '')}_id` && fb.name === 'id') || (fb.name === `${A.id.replace(/s$/, '')}_id` && fa.name === 'id');
          if ((same || fk) && !has({ s: A.id, f: fa.name }, { s: B.id, f: fb.name })) out.push({ from: { source: A.id, field: fa.name }, to: { source: B.id, field: fb.name }, reason: same ? 'mismo nombre' : 'clave foránea' });
        }
      }
    }
  }
  return out.slice(0, 12);
}

export default function SemanticEditor({ semantic, dataSources, params, onChange }) {
  const sem = { ...emptySemantic(), ...(semantic || {}) };
  const set = (patch) => onChange({ ...sem, ...patch });
  const { data } = useMemo(() => buildReportData(dataSources, params), [dataSources, params]);
  const suggestions = useMemo(() => suggestRelations(dataSources, sem.relations), [dataSources, sem.relations]);
  const fieldsOf = (id) => dataSources.find((d) => d.id === id)?.fields || [];
  const lib = window.RptLib;

  const measureInfo = (m) => {
    if (!m.expr) return { error: 'Escribe una expresión' };
    if (!ID_RE.test(m.name || '')) return { error: 'Nombre: solo letras, números y _' };
    if (!lib?.compileMeasure) return {};
    try {
      const c = lib.compileMeasure(m.expr);
      const srcs = m.source ? [m.source] : dataSources.map((d) => d.id);
      const src = srcs.map((id) => data.sources[id]).find((s) => s && c.refs.every((r) => s.fields.some((f) => f.name === r)));
      const missing = !src ? c.refs.filter((r) => !srcs.some((id) => data.sources[id]?.fields.some((f) => f.name === r))) : [];
      if (missing.length) return { error: `Campos desconocidos en ${m.source || 'los orígenes'}: ${missing.join(', ')}` };
      const v = src ? c.fn(src.rows, src.rows) : null;
      return { value: v == null ? '—' : lib.format(v, m.format || 'number') };
    } catch (e) {
      return { error: e.message };
    }
  };

  const updList = (key, i, patch) => set({ [key]: sem[key].map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const delList = (key, i) => set({ [key]: sem[key].filter((_, j) => j !== i) });

  return (
    <div className="sem">
      <section className="ui-card">
        <div className="ui-card-head"><h3>Relaciones entre orígenes</h3>
          <button type="button" className="ui-btn ui-btn-subtle" disabled={dataSources.length < 2} onClick={() => set({ relations: [...sem.relations, { from: { source: dataSources[0].id, field: '' }, to: { source: dataSources[1].id, field: '' } }] })}><Icon name="add" size={16} />Añadir</button>
        </div>
        <p className="ui-hint">Cuando filtras un origen, el filtro viaja por estas relaciones a los demás (p. ej. un clic en el mapa de <code>historico.comunidad</code> filtra <code>pedidos</code> mediante <code>historico.id → pedidos.id</code>). Se admiten cadenas de varias relaciones.</p>
        <label className="ui-check"><input type="checkbox" checked={sem.autoRelate !== false} onChange={(e) => set({ autoRelate: e.target.checked })} /> Relacionar automáticamente campos con el mismo nombre en distintos orígenes</label>
        {sem.relations.map((r, i) => (
          <div key={i} className="sem-rel">
            <select className="ui-input" aria-label="Origen A" value={r.from.source} onChange={(e) => updList('relations', i, { from: { source: e.target.value, field: '' } })}>{dataSources.map((d) => <option key={d.id} value={d.id}>{d.id}</option>)}</select>
            <select className="ui-input" aria-label="Campo A" value={r.from.field} onChange={(e) => updList('relations', i, { from: { ...r.from, field: e.target.value } })}><option value="">Campo…</option>{fieldsOf(r.from.source).map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}</select>
            <span aria-hidden="true">↔</span>
            <select className="ui-input" aria-label="Origen B" value={r.to.source} onChange={(e) => updList('relations', i, { to: { source: e.target.value, field: '' } })}>{dataSources.map((d) => <option key={d.id} value={d.id}>{d.id}</option>)}</select>
            <select className="ui-input" aria-label="Campo B" value={r.to.field} onChange={(e) => updList('relations', i, { to: { ...r.to, field: e.target.value } })}><option value="">Campo…</option>{fieldsOf(r.to.source).map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}</select>
            <button type="button" className="ui-icon-btn ui-danger" aria-label="Quitar relación" onClick={() => delList('relations', i)}><Icon name="delete" size={16} /></button>
          </div>
        ))}
        {suggestions.length > 0 && (
          <details className="sem-sugg">
            <summary>Relaciones sugeridas ({suggestions.length})</summary>
            <ul>{suggestions.map((sg, i) => (
              <li key={i}><code>{sg.from.source}.{sg.from.field}</code> ↔ <code>{sg.to.source}.{sg.to.field}</code> <small>{sg.reason}</small>
                <button type="button" className="ui-link" onClick={() => set({ relations: [...sem.relations, { from: sg.from, to: sg.to }] })}>Añadir</button></li>
            ))}</ul>
          </details>
        )}
      </section>

      <section className="ui-card">
        <div className="ui-card-head"><h3>Medidas reutilizables</h3>
          <button type="button" className="ui-btn ui-btn-subtle" onClick={() => set({ measures: [...sem.measures, { name: `medida${sem.measures.length + 1}`, label: 'Nueva medida', source: dataSources[0]?.id || '', expr: '', format: '' }] })}><Icon name="add" size={16} />Añadir</button>
        </div>
        <p className="ui-hint">Defínelas una vez y úsalas en cualquier visual (aparecen como <b>ƒ</b> al elegir campos). Se calculan para cada grupo del visual y respetan los filtros.</p>
        <details className="sem-help"><summary>Sintaxis y ejemplos</summary>
          <p className="ui-hint">Agregaciones: <code>SUM</code>, <code>AVG</code>, <code>MIN</code>, <code>MAX</code>, <code>MEDIAN</code>, <code>COUNT(*)</code>, <code>COUNT(campo)</code>, <code>COUNT(DISTINCT campo)</code>, con condición opcional <code>SUM(x WHERE campo = 'valor')</code>. <code>TOTAL(expr)</code> se evalúa sobre todas las filas del visual. Además <code>DIVIDE(a, b)</code>, <code>ROUND(a, n)</code>, <code>ABS(a)</code> y <code>+ - * /</code>.</p>
          <ul>{EXAMPLES.map(([e, d]) => <li key={e}><code>{e}</code> — {d}</li>)}</ul>
        </details>
        {sem.measures.length > 0 && (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead><tr><th>Nombre</th><th>Etiqueta</th><th>Origen</th><th>Expresión</th><th>Formato</th><th>Valor (todo)</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {sem.measures.map((m, i) => {
                  const info = measureInfo(m);
                  return (
                    <tr key={i}>
                      <td><input className="ui-input" aria-label="Nombre de la medida" value={m.name} onChange={(e) => updList('measures', i, { name: e.target.value.replace(/\W/g, '') })} /></td>
                      <td><input className="ui-input" aria-label="Etiqueta de la medida" value={m.label || ''} onChange={(e) => updList('measures', i, { label: e.target.value })} /></td>
                      <td><select className="ui-input" aria-label="Origen de la medida" value={m.source || ''} onChange={(e) => updList('measures', i, { source: e.target.value })}><option value="">Cualquiera</option>{dataSources.map((d) => <option key={d.id} value={d.id}>{d.id}</option>)}</select></td>
                      <td>
                        <input className="ui-input ui-code" aria-label="Expresión de la medida" aria-invalid={!!info.error} value={m.expr} placeholder="SUM(importe) / COUNT(*)" onChange={(e) => updList('measures', i, { expr: e.target.value })} />
                        {info.error && <small className="ui-error">{info.error}</small>}
                      </td>
                      <td><select className="ui-input" aria-label="Formato de la medida" value={m.format || ''} onChange={(e) => updList('measures', i, { format: e.target.value })}>{FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select></td>
                      <td className="ui-nowrap"><b>{info.value ?? ''}</b></td>
                      <td><button type="button" className="ui-icon-btn ui-danger" aria-label="Quitar medida" onClick={() => delList('measures', i)}><Icon name="delete" size={16} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ui-card">
        <div className="ui-card-head"><h3>Jerarquías (profundizar)</h3>
          <button type="button" className="ui-btn ui-btn-subtle" disabled={!dataSources.length} onClick={() => set({ hierarchies: [...sem.hierarchies, { name: `jerarquia${sem.hierarchies.length + 1}`, label: 'Nueva jerarquía', source: dataSources[0].id, levels: [] }] })}><Icon name="add" size={16} />Añadir</button>
        </div>
        <p className="ui-hint">Úsalas como categoría de un gráfico (aparecen como <b>⇣</b>): un clic en una barra baja al siguiente nivel y las migas permiten volver.</p>
        <div className="sem-quick">
          {dataSources.flatMap((d) => (d.fields || []).filter((f) => f.type === 'date').map((f) => (
            <button key={`${d.id}.${f.name}`} type="button" className="ui-btn ui-btn-subtle" onClick={() => set({ hierarchies: [...sem.hierarchies, { name: `cal_${d.id}_${f.name}`, label: `Calendario (${f.label || f.name})`, source: d.id, levels: ['year', 'quarter', 'month', 'day'].map((part) => ({ field: f.name, part })) }] })}>
              <Icon name="add" size={14} />Fecha: {d.id}.{f.name} (Año → Trimestre → Mes → Día)
            </button>
          )))}
        </div>
        {sem.hierarchies.map((h, i) => (
          <div key={i} className="sem-hier">
            <div className="sem-hier-head">
              <input className="ui-input" aria-label="Nombre de la jerarquía" value={h.name} onChange={(e) => updList('hierarchies', i, { name: e.target.value.replace(/\W/g, '') })} />
              <input className="ui-input" aria-label="Etiqueta de la jerarquía" value={h.label || ''} onChange={(e) => updList('hierarchies', i, { label: e.target.value })} />
              <select className="ui-input" aria-label="Origen de la jerarquía" value={h.source} onChange={(e) => updList('hierarchies', i, { source: e.target.value, levels: [] })}>{dataSources.map((d) => <option key={d.id} value={d.id}>{d.id}</option>)}</select>
              <button type="button" className="ui-icon-btn ui-danger" aria-label="Quitar jerarquía" onClick={() => delList('hierarchies', i)}><Icon name="delete" size={16} /></button>
            </div>
            <ol className="sem-levels">
              {h.levels.map((lv, k) => (
                <li key={k}>
                  <select className="ui-input" aria-label={`Campo del nivel ${k + 1}`} value={lv.field} onChange={(e) => updList('hierarchies', i, { levels: h.levels.map((x, j) => (j === k ? { ...x, field: e.target.value } : x)) })}>
                    <option value="">Campo…</option>{fieldsOf(h.source).map((f) => <option key={f.name} value={f.name}>{f.label || f.name}</option>)}
                  </select>
                  <select className="ui-input" aria-label={`Parte del nivel ${k + 1}`} value={lv.part || ''} onChange={(e) => updList('hierarchies', i, { levels: h.levels.map((x, j) => (j === k ? { ...x, part: e.target.value || undefined } : x)) })}>
                    {PARTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" aria-label="Quitar nivel" onClick={() => updList('hierarchies', i, { levels: h.levels.filter((_, j) => j !== k) })}><Icon name="close" size={14} /></button>
                </li>
              ))}
            </ol>
            <button type="button" className="ui-link" onClick={() => updList('hierarchies', i, { levels: [...h.levels, { field: '' }] })}>+ Añadir nivel</button>
          </div>
        ))}
      </section>

      <section className="ui-card">
        <h3>Selección</h3>
        <label className="ui-check"><input type="checkbox" checked={!!sem.associative} onChange={(e) => set({ associative: e.target.checked })} /> Selección asociativa (estilo Qlik): mostrar en gris lo excluido por las selecciones en lugar de ocultarlo</label>
      </section>
    </div>
  );
}
