import { useMemo, useRef, useState } from 'react';
import { FIELD_TYPES, FORMATS, getSchema, mergeFields, resolveParams, runQuery, sqlParams } from '../lib/sqlEngine.js';
import { QUERY_SNIPPETS } from '../lib/templates.js';
import Icon from './Icon.jsx';

const ID_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export default function DataSourcesEditor({ dataSources, params, onChange, usage = {} }) {
  const [selId, setSelId] = useState(dataSources[0]?.id || null);
  const [result, setResult] = useState(null);
  const sqlRef = useRef(null);
  const schema = useMemo(() => getSchema(), []);
  const sel = dataSources.find((d) => d.id === selId) || null;

  const setDs = (list) => onChange({ dataSources: list, params });
  const setParams = (list) => onChange({ dataSources, params: list });
  const updateSel = (patch) => setDs(dataSources.map((d) => (d.id === selId ? { ...d, ...patch } : d)));

  const addDs = (snippet) => {
    let base = snippet?.id || 'origen';
    let id = base;
    let i = 2;
    while (dataSources.some((d) => d.id === id)) id = `${base}_${i++}`;
    const ds = snippet
      ? { id, name: snippet.name, sql: snippet.sql, fields: structuredClone(snippet.fields) }
      : { id, name: 'Nuevo origen', sql: 'SELECT *\nFROM clientes', fields: [] };
    setDs([...dataSources, ds]);
    setSelId(id);
    setResult(null);
    // Si la consulta usa parámetros que no existen, se crean.
    const missing = sqlParams(ds.sql).filter((n) => !params.some((p) => p.name === n));
    if (missing.length) onChange({ dataSources: [...dataSources, ds], params: [...params, ...missing.map((n) => ({ name: n, label: n, type: 'number', default: 2025 }))] });
  };

  const removeDs = (id) => {
    if (usage[id] && !confirm(`El origen «${id}» lo usan ${usage[id]} componente(s). ¿Eliminar igualmente?`)) return;
    const list = dataSources.filter((d) => d.id !== id);
    setDs(list);
    setSelId(list[0]?.id || null);
    setResult(null);
  };

  const execute = (detect) => {
    try {
      const r = runQuery(sel.sql, resolveParams(params));
      setResult({ ok: true, ...r });
      if (detect || !sel.fields?.length) updateSel({ fields: mergeFields(sel.fields, r.fields) });
    } catch (e) {
      setResult({ ok: false, error: e.message });
    }
  };

  const insertAtCursor = (text) => {
    const ta = sqlRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    updateSel({ sql: value.slice(0, s) + text + value.slice(e) });
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + text.length, s + text.length); });
  };

  const usedParams = sel ? sqlParams(sel.sql) : [];
  const undefinedParams = usedParams.filter((n) => !params.some((p) => p.name === n));
  const idError = sel && (!ID_RE.test(sel.id) ? 'Solo letras, números y _' : dataSources.filter((d) => d.id === sel.id).length > 1 ? 'Identificador duplicado' : '');

  return (
    <div className="ds">
      <section className="ui-card">
        <div className="ui-card-head">
          <h3>Parámetros del informe</h3>
          <button className="ui-btn ui-btn-subtle" type="button" onClick={() => setParams([...params, { name: `param${params.length + 1}`, label: 'Parámetro', type: 'string', default: '' }])}>
            <Icon name="add" size={16} />Añadir
          </button>
        </div>
        <p className="ui-hint">Úsalos en las consultas como <code>:nombre</code>. El lector puede cambiarlos al ver el informe; se envían siempre como parámetros, nunca concatenados en el SQL.</p>
        {params.length === 0 ? <p className="ui-hint">Sin parámetros.</p> : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead><tr><th>Nombre</th><th>Etiqueta</th><th>Tipo</th><th>Valor por defecto</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {params.map((p, i) => {
                  const upd = (patch) => setParams(params.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                  return (
                    <tr key={i}>
                      <td><input className="ui-input" aria-label="Nombre" value={p.name} onChange={(e) => upd({ name: e.target.value.replace(/\W/g, '') })} /></td>
                      <td><input className="ui-input" aria-label="Etiqueta" value={p.label} onChange={(e) => upd({ label: e.target.value })} /></td>
                      <td>
                        <select className="ui-input" aria-label="Tipo" value={p.type} onChange={(e) => upd({ type: e.target.value })}>
                          <option value="string">Texto</option><option value="number">Número</option><option value="date">Fecha</option>
                        </select>
                      </td>
                      <td><input className="ui-input" aria-label="Valor por defecto" type={p.type === 'number' ? 'number' : p.type === 'date' ? 'date' : 'text'} value={p.default ?? ''} onChange={(e) => upd({ default: p.type === 'number' ? Number(e.target.value) : e.target.value })} /></td>
                      <td><button className="ui-icon-btn" type="button" title="Quitar parámetro" onClick={() => setParams(params.filter((_, j) => j !== i))}><Icon name="delete" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="ds-main">
        <aside className="ui-card ds-list">
          <div className="ui-card-head"><h3>Orígenes</h3></div>
          <ul className="ds-items" role="listbox" aria-label="Orígenes de datos">
            {dataSources.map((d) => (
              <li key={d.id}>
                <button type="button" role="option" aria-selected={d.id === selId} className={`ds-item ${d.id === selId ? 'is-sel' : ''}`} onClick={() => { setSelId(d.id); setResult(null); }}>
                  <Icon name="db" size={16} />
                  <span className="ds-item-txt"><b>{d.name}</b><small>{d.id} · {d.fields?.length || 0} campos{usage[d.id] ? ` · ${usage[d.id]} uso(s)` : ''}</small></span>
                </button>
              </li>
            ))}
          </ul>
          <button className="ui-btn ui-btn-block" type="button" onClick={() => addDs()}><Icon name="add" size={16} />Origen vacío</button>
          <label className="ui-field">
            <span>Desde plantilla</span>
            <select className="ui-input" value="" onChange={(e) => e.target.value && addDs(QUERY_SNIPPETS.find((q) => q.id === e.target.value))}>
              <option value="">Elegir consulta de ejemplo…</option>
              {QUERY_SNIPPETS.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
          </label>
          <details className="ds-schema">
            <summary><Icon name="table" size={16} />Esquema de la BD</summary>
            {schema.map((t) => (
              <details key={t.name}>
                <summary>
                  <button type="button" className="ui-link" onClick={(e) => { e.preventDefault(); insertAtCursor(t.name); }} title="Insertar en la consulta">{t.name}</button>
                  <small> {t.rowCount} filas</small>
                </summary>
                <ul>
                  {t.columns.map((c) => (
                    <li key={c.name}><button type="button" className="ui-link" onClick={() => insertAtCursor(c.name)}>{c.name}</button> <small>{c.type}</small></li>
                  ))}
                </ul>
              </details>
            ))}
          </details>
        </aside>

        {sel ? (
          <section className="ui-card ds-editor">
            <div className="ui-grid-2">
              <label className="ui-field">
                <span>Identificador (data-source)</span>
                <input className="ui-input" value={sel.id} aria-invalid={!!idError} onChange={(e) => { const id = e.target.value; updateSel({ id }); setSelId(id); }} />
                {idError && <small className="ui-error">{idError}</small>}
              </label>
              <label className="ui-field">
                <span>Nombre</span>
                <input className="ui-input" value={sel.name} onChange={(e) => updateSel({ name: e.target.value })} />
              </label>
            </div>
            <label className="ui-field">
              <span>Consulta SQL (solo SELECT)</span>
              <textarea ref={sqlRef} className="ui-input ui-code" rows={9} spellCheck={false} value={sel.sql} onChange={(e) => updateSel({ sql: e.target.value })}
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); execute(false); } }} />
            </label>
            {undefinedParams.length > 0 && (
              <div className="ui-msg ui-msg-warn">
                Parámetros sin definir: {undefinedParams.map((n) => <code key={n}>:{n}</code>)}{' '}
                <button type="button" className="ui-link" onClick={() => setParams([...params, ...undefinedParams.map((n) => ({ name: n, label: n, type: 'string', default: '' }))])}>Crearlos</button>
              </div>
            )}
            <div className="ui-actions">
              <button className="ui-btn ui-btn-primary" type="button" onClick={() => execute(false)}><Icon name="play" size={16} />Ejecutar <kbd>Ctrl+Enter</kbd></button>
              <button className="ui-btn" type="button" onClick={() => execute(true)}><Icon name="wand" size={16} />Detectar campos</button>
              <span className="ui-spacer" />
              <button className="ui-btn ui-btn-subtle ui-danger" type="button" onClick={() => removeDs(sel.id)}><Icon name="delete" size={16} />Eliminar origen</button>
            </div>

            {result && !result.ok && <div className="ui-msg ui-msg-error" role="alert">{result.error}</div>}
            {result?.ok && <div className="ui-msg ui-msg-ok">{result.rows.length} filas en {result.ms} ms</div>}

            <h4>Campos que retorna</h4>
            {!sel.fields?.length ? <p className="ui-hint">Ejecuta la consulta para detectar los campos y sus tipos.</p> : (
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead><tr><th>Campo</th><th>Etiqueta</th><th>Tipo</th><th>Formato</th></tr></thead>
                  <tbody>
                    {sel.fields.map((f, i) => {
                      const upd = (patch) => updateSel({ fields: sel.fields.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                      return (
                        <tr key={f.name}>
                          <td><code>{f.name}</code></td>
                          <td><input className="ui-input" aria-label={`Etiqueta de ${f.name}`} value={f.label} onChange={(e) => upd({ label: e.target.value })} /></td>
                          <td><select className="ui-input" aria-label={`Tipo de ${f.name}`} value={f.type} onChange={(e) => upd({ type: e.target.value })}>{FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></td>
                          <td><select className="ui-input" aria-label={`Formato de ${f.name}`} value={f.format || ''} onChange={(e) => upd({ format: e.target.value })}>{FORMATS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {result?.ok && result.rows.length > 0 && (
              <>
                <h4>Vista previa (primeras 10 filas)</h4>
                <div className="ui-table-wrap">
                  <table className="ui-table ui-table-compact">
                    <thead><tr>{Object.keys(result.rows[0]).map((k) => <th key={k}>{k}</th>)}</tr></thead>
                    <tbody>{result.rows.slice(0, 10).map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{String(v ?? '')}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        ) : (
          <section className="ui-card ui-empty">Añade un origen de datos para empezar.</section>
        )}
      </div>
    </div>
  );
}
