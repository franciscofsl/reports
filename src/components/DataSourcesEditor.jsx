import { useMemo, useRef, useState } from 'react';
import {
  DATE_PRESETS, FIELD_TYPES, FORMATS, PARAM_TYPES, RELATIVE_DATES, exposedParamNames, getSchema,
  paramOptions, runDataSource, sqlDependencies, sqlParams, validateExpr,
} from '../lib/sqlEngine.js';
import { emptyBuilder, toSql } from '../lib/queryBuilder.js';
import { QUERY_SNIPPETS } from '../lib/templates.js';
import Icon from './Icon.jsx';
import QueryBuilder from './QueryBuilder.jsx';
import SqlEditor from './SqlEditor.jsx';

const ID_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function ParamDefault({ p, upd }) {
  if (p.type === 'daterange') {
    return (
      <select className="ui-input" aria-label="Periodo por defecto" value={p.default || 'este_año'} onChange={(e) => upd({ default: e.target.value })}>
        {DATE_PRESETS.filter((d) => d.value !== 'personalizado').map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
      </select>
    );
  }
  if (p.type === 'date') {
    const rel = RELATIVE_DATES.some((r) => r.value === p.default);
    return (
      <span className="ui-inline">
        <select className="ui-input" aria-label="Tipo de fecha" value={rel ? p.default : ''} onChange={(e) => upd({ default: e.target.value })}>
          <option value="">Fecha fija</option>
          {RELATIVE_DATES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {!rel && <input className="ui-input" type="date" aria-label="Fecha" value={p.default || ''} onChange={(e) => upd({ default: e.target.value })} />}
      </span>
    );
  }
  if (p.type === 'list') {
    const opts = paramOptions(p);
    return (
      <select className="ui-input" aria-label="Valor por defecto" value={p.default ?? ''} onChange={(e) => upd({ default: e.target.value })}>
        <option value="">(Todos)</option>
        {opts.map((o) => <option key={String(o)} value={o}>{String(o)}</option>)}
      </select>
    );
  }
  return <input className="ui-input" aria-label="Valor por defecto" type={p.type === 'number' ? 'number' : 'text'} value={p.default ?? ''} onChange={(e) => upd({ default: p.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })} />;
}

export default function DataSourcesEditor({ dataSources, params, onChange, usage = {}, onRename }) {
  const [selId, setSelId] = useState(dataSources[0]?.id || null);
  const [result, setResult] = useState(null);
  const [showSql, setShowSql] = useState(false);
  const sqlRef = useRef(null);
  const schema = useMemo(() => getSchema(), []);
  const sel = dataSources.find((d) => d.id === selId) || null;

  const setDs = (list) => onChange({ dataSources: list, params });
  const setParams = (list) => onChange({ dataSources, params: list });
  const updateSel = (patch) => setDs(dataSources.map((d) => (d.id === selId ? { ...d, ...patch } : d)));

  const uniqueId = (base) => {
    let id = base;
    let i = 2;
    while (dataSources.some((d) => d.id === id)) id = `${base}_${i++}`;
    return id;
  };
  const addDs = (snippet, visual) => {
    const id = uniqueId(snippet?.id || 'origen');
    const ds = snippet
      ? { id, name: snippet.name, mode: 'sql', sql: snippet.sql, fields: structuredClone(snippet.fields || []), calculated: [] }
      : visual
        ? { id, name: 'Nuevo origen', mode: 'visual', builder: emptyBuilder(), sql: '', fields: [], calculated: [] }
        : { id, name: 'Nuevo origen', mode: 'sql', sql: 'SELECT *\nFROM clientes', fields: [], calculated: [] };
    const list = [...dataSources, ds];
    const missing = sqlParams(ds.sql).filter((n) => !exposedParamNames(params).includes(n));
    onChange({ dataSources: list, params: missing.length ? [...params, ...missing.map((n) => ({ name: n, label: n, type: 'number', default: 2025 }))] : params });
    setSelId(id);
    setResult(null);
  };
  const removeDs = (id) => {
    const dependents = dataSources.filter((d) => sqlDependencies(d.sql).includes(id)).map((d) => d.id);
    const msg = [usage[id] ? `lo usan ${usage[id]} componente(s)` : '', dependents.length ? `dependen de él: ${dependents.join(', ')}` : ''].filter(Boolean).join(' y ');
    if (msg && !confirm(`El origen «${id}» ${msg}. ¿Eliminar igualmente?`)) return;
    const list = dataSources.filter((d) => d.id !== id);
    setDs(list);
    setSelId(list[0]?.id || null);
    setResult(null);
  };
  const rename = (id) => {
    const old = sel.id;
    const valid = ID_RE.test(id) && !dataSources.some((d) => d.id === id && d !== sel);
    // Propaga el nuevo id a los orígenes derivados que lo usan.
    const list = dataSources.map((d) => {
      if (d === sel) return { ...d, id };
      if (!valid) return d;
      const re = new RegExp(`\\borigen\\.${old}\\b`, 'g');
      return re.test(d.sql) ? { ...d, sql: d.sql.replace(re, `origen.${id}`) } : d;
    });
    setDs(list);
    setSelId(id);
    if (valid && old !== id) onRename?.(old, id);
  };

  const execute = (detect) => {
    try {
      const r = runDataSource(sel, dataSources, params);
      setResult({ ok: true, ...r });
      if (detect || !sel.fields?.length || r.fields.length !== sel.fields.length) updateSel({ fields: r.fields });
    } catch (e) {
      setResult({ ok: false, error: e.message });
    }
  };

  const setBuilder = (builder) => {
    updateSel({ builder, sql: toSql(builder).sql });
  };
  const switchMode = (mode) => {
    if (mode === sel.mode) return;
    if (mode === 'visual') {
      const gen = sel.builder ? toSql(sel.builder).sql : '';
      if (sel.sql && sel.sql.trim() !== gen.trim() && !confirm('El editor visual no puede leer SQL escrito a mano. Se sustituirá la consulta por la del diseño visual. ¿Continuar?')) return;
      const builder = sel.builder || emptyBuilder();
      updateSel({ mode, builder, sql: toSql(builder).sql });
    } else updateSel({ mode });
  };

  const usedParams = sel ? sqlParams(sel.sql) : [];
  const exposed = exposedParamNames(params);
  const undefinedParams = usedParams.filter((n) => !exposed.includes(n));
  const idError = sel && (!ID_RE.test(sel.id) ? 'Solo letras, números y _' : dataSources.filter((d) => d.id === sel.id).length > 1 ? 'Identificador duplicado' : '');
  const others = dataSources.filter((d) => d !== sel);
  const calcErrors = (sel?.calculated || []).map((c) => { try { if (c.expr) validateExpr(c.expr); return ''; } catch (e) { return e.message; } });

  return (
    <div className="ds">
      <section className="ui-card">
        <div className="ui-card-head">
          <h3>Parámetros del informe</h3>
          <button className="ui-btn ui-btn-subtle" type="button" onClick={() => setParams([...params, { name: `param${params.length + 1}`, label: 'Parámetro', type: 'string', default: '' }])}>
            <Icon name="add" size={16} />Añadir
          </button>
        </div>
        <p className="ui-hint">Úsalos en las consultas como <code>:nombre</code>. Un rango de fechas expone <code>:nombre_desde</code> y <code>:nombre_hasta</code>. Se envían siempre como parámetros, nunca concatenados.</p>
        {params.length === 0 ? <p className="ui-hint">Sin parámetros.</p> : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead><tr><th>Nombre</th><th>Etiqueta</th><th>Tipo</th><th>Opciones</th><th>Por defecto</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {params.map((p, i) => {
                  const upd = (patch) => setParams(params.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                  return (
                    <tr key={i}>
                      <td><input className="ui-input" aria-label="Nombre" value={p.name} onChange={(e) => upd({ name: e.target.value.replace(/\W/g, '') })} /></td>
                      <td><input className="ui-input" aria-label="Etiqueta" value={p.label} onChange={(e) => upd({ label: e.target.value })} /></td>
                      <td>
                        <select className="ui-input" aria-label="Tipo" value={p.type} onChange={(e) => upd({ type: e.target.value, default: e.target.value === 'daterange' ? 'este_año' : '' })}>
                          {PARAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </td>
                      <td>
                        {p.type === 'list' ? (
                          <span className="ui-stack">
                            <input className="ui-input" aria-label="Valores separados por comas" placeholder="Valores: a, b, c" value={p.options || ''} disabled={!!p.optionsSql} onChange={(e) => upd({ options: e.target.value })} />
                            <input className="ui-input ui-code" aria-label="Consulta de valores" placeholder="o SQL: SELECT DISTINCT region FROM clientes" value={p.optionsSql || ''} onChange={(e) => upd({ optionsSql: e.target.value })} />
                          </span>
                        ) : <span className="ui-hint">{p.type === 'daterange' ? `:${p.name}_desde / :${p.name}_hasta` : '—'}</span>}
                      </td>
                      <td><ParamDefault p={p} upd={upd} /></td>
                      <td><button className="ui-icon-btn" type="button" title="Quitar parámetro" aria-label="Quitar parámetro" onClick={() => setParams(params.filter((_, j) => j !== i))}><Icon name="delete" /></button></td>
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
                  <Icon name={d.mode === 'visual' ? 'layout' : 'db'} size={16} />
                  <span className="ds-item-txt"><b>{d.name}</b><small>{d.id} · {d.fields?.length || 0} campos{usage[d.id] ? ` · ${usage[d.id]} uso(s)` : ''}{sqlDependencies(d.sql).length ? ' · derivado' : ''}</small></span>
                </button>
              </li>
            ))}
          </ul>
          <div className="ui-actions ds-add">
            <button className="ui-btn ui-btn-primary" type="button" onClick={() => addDs(null, true)}><Icon name="layout" size={16} />Visual</button>
            <button className="ui-btn" type="button" onClick={() => addDs()}><Icon name="code" size={16} />SQL</button>
          </div>
          <label className="ui-field">
            <span>Desde plantilla</span>
            <select className="ui-input" value="" onChange={(e) => e.target.value && addDs(QUERY_SNIPPETS.find((q) => q.id === e.target.value))}>
              <option value="">Elegir consulta de ejemplo…</option>
              {QUERY_SNIPPETS.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
          </label>
          {sel?.mode !== 'visual' && (
            <details className="ds-schema" open>
              <summary><Icon name="table" size={16} />Esquema (clic para insertar)</summary>
              {schema.map((t) => (
                <details key={t.name}>
                  <summary>
                    <button type="button" className="ui-link" onClick={(e) => { e.preventDefault(); sqlRef.current?.insert(t.name); }}>{t.name}</button>
                    <small> {t.rowCount} filas</small>
                  </summary>
                  <ul>{t.columns.map((c) => <li key={c.name}><button type="button" className="ui-link" onClick={() => sqlRef.current?.insert(c.name)}>{c.name}</button> <small>{c.type}</small></li>)}</ul>
                </details>
              ))}
              {others.length > 0 && (
                <details>
                  <summary><b>Otros orígenes</b> <small>(derivados)</small></summary>
                  <ul>{others.map((d) => <li key={d.id}><button type="button" className="ui-link" onClick={() => sqlRef.current?.insert(`origen.${d.id}`)}>origen.{d.id}</button></li>)}</ul>
                </details>
              )}
            </details>
          )}
        </aside>

        {sel ? (
          <section className="ui-card ds-editor">
            <div className="ui-grid-2">
              <label className="ui-field">
                <span>Identificador (data-source)</span>
                <input className="ui-input" value={sel.id} aria-invalid={!!idError} onChange={(e) => rename(e.target.value)} />
                {idError ? <small className="ui-error">{idError}</small> : <small className="ui-hint">Al renombrarlo se actualizan los componentes y orígenes que lo usan.</small>}
              </label>
              <label className="ui-field">
                <span>Nombre</span>
                <input className="ui-input" value={sel.name} onChange={(e) => updateSel({ name: e.target.value })} />
              </label>
            </div>

            <div className="ds-mode">
              <div className="ui-seg" role="tablist" aria-label="Modo de edición de la consulta">
                <button type="button" role="tab" aria-selected={sel.mode === 'visual'} className={sel.mode === 'visual' ? 'is-on' : ''} onClick={() => switchMode('visual')}><Icon name="layout" size={14} /> Editor visual</button>
                <button type="button" role="tab" aria-selected={sel.mode !== 'visual'} className={sel.mode !== 'visual' ? 'is-on' : ''} onClick={() => switchMode('sql')}><Icon name="code" size={14} /> SQL</button>
              </div>
              {sel.mode === 'visual' && <button type="button" className="ui-link" onClick={() => setShowSql(!showSql)}>{showSql ? 'Ocultar SQL generado' : 'Ver SQL generado'}</button>}
            </div>

            {sel.mode === 'visual' ? (
              <>
                <QueryBuilder builder={sel.builder || emptyBuilder()} onChange={setBuilder} params={params} />
                {showSql && <SqlEditor value={sel.sql} readOnly origins={others} minHeight={80} ariaLabel="SQL generado" />}
              </>
            ) : (
              <>
                <div className="ui-field">
                  <span>Consulta SQL (solo SELECT · <kbd>Ctrl+Espacio</kbd> autocompleta · <code>FROM origen.&lt;id&gt;</code> reutiliza otro origen)</span>
                  <SqlEditor ref={sqlRef} value={sel.sql} onChange={(sql) => updateSel({ sql })} onRun={() => execute(false)} origins={others} />
                </div>
              </>
            )}

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

            <div className="ui-card-head ds-sub">
              <h4>Campos calculados</h4>
              <button className="ui-btn ui-btn-subtle" type="button" onClick={() => updateSel({ calculated: [...(sel.calculated || []), { name: `calc${(sel.calculated || []).length + 1}`, label: 'Nuevo campo', expr: '', type: 'number', format: '' }] })}>
                <Icon name="add" size={16} />Añadir
              </button>
            </div>
            <p className="ui-hint">Expresiones sobre las columnas del resultado, sin tocar el SQL: <code>importe / pedidos</code>, <code>ROUND(importe * 0.21, 2)</code>, <code>CASE WHEN importe &gt; 5000 THEN 'Alto' ELSE 'Bajo' END</code>.</p>
            {(sel.calculated || []).length > 0 && (
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead><tr><th>Nombre</th><th>Etiqueta</th><th>Expresión</th><th>Tipo</th><th>Formato</th><th aria-label="Acciones" /></tr></thead>
                  <tbody>
                    {sel.calculated.map((c, i) => {
                      const upd = (patch) => updateSel({ calculated: sel.calculated.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                      return (
                        <tr key={i}>
                          <td><input className="ui-input" aria-label="Nombre" value={c.name} onChange={(e) => upd({ name: e.target.value.replace(/\W/g, '') })} /></td>
                          <td><input className="ui-input" aria-label="Etiqueta" value={c.label} onChange={(e) => upd({ label: e.target.value })} /></td>
                          <td>
                            <input className="ui-input ui-code" aria-label="Expresión" aria-invalid={!!calcErrors[i]} value={c.expr} onChange={(e) => upd({ expr: e.target.value })} placeholder="importe / pedidos" />
                            {calcErrors[i] && <small className="ui-error">{calcErrors[i]}</small>}
                          </td>
                          <td><select className="ui-input" aria-label="Tipo" value={c.type} onChange={(e) => upd({ type: e.target.value })}>{FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></td>
                          <td><select className="ui-input" aria-label="Formato" value={c.format || ''} onChange={(e) => upd({ format: e.target.value })}>{FORMATS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></td>
                          <td><button className="ui-icon-btn" type="button" aria-label="Quitar campo calculado" onClick={() => updateSel({ calculated: sel.calculated.filter((_, j) => j !== i) })}><Icon name="delete" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

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
                          <td><code>{f.name}</code>{f.calculated && <small className="ui-badge ui-badge-brand" style={{ marginLeft: 4 }}>calc.</small>}</td>
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
