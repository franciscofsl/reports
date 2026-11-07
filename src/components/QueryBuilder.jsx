import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AGGS, FNS, OPS, addTable, bid, columnType, removeTable, toggleColumn, toSql } from '../lib/queryBuilder.js';
import { exposedParamNames, getSchema } from '../lib/sqlEngine.js';
import Icon from './Icon.jsx';

const BOX_W = 200;

/** Editor visual de consultas: arrastra tablas, márcalas columnas, une campos y define filtros. */
export default function QueryBuilder({ builder, onChange, params = [] }) {
  const schema = useMemo(() => getSchema(), []);
  const canvasRef = useRef(null);
  const rowRefs = useRef({});
  const [lines, setLines] = useState([]);
  const [drag, setDrag] = useState(null); // { alias, dx, dy, x, y }
  const [pending, setPending] = useState(null); // { alias, col } para crear una unión
  const b = builder;
  const set = (patch) => onChange({ ...b, ...patch });
  const tableOf = (alias) => b.tables.find((t) => t.alias === alias);
  const posOf = (t) => (drag?.alias === t.alias ? { x: drag.x, y: drag.y } : { x: t.x, y: t.y });
  const { warnings } = useMemo(() => toSql(b), [b]);
  const paramNames = useMemo(() => [...new Set([...params.map((p) => p.name), ...exposedParamNames(params)])], [params]);

  useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const cr = c.getBoundingClientRect();
    const pt = (alias, col, side) => {
      const el = rowRefs.current[`${alias}.${col}`];
      const box = el?.closest('.qb-box');
      if (!el || !box) return null;
      const r = el.getBoundingClientRect();
      const br = box.getBoundingClientRect();
      const y = Math.min(Math.max(r.top + r.height / 2, br.top + 40), br.bottom - 8);
      return { x: (side === 'right' ? br.right : br.left) - cr.left + c.scrollLeft, y: y - cr.top + c.scrollTop };
    };
    const next = b.joins.map((j) => {
      const L = tableOf(j.left);
      const R = tableOf(j.right);
      if (!L || !R) return null;
      const lx = posOf(L).x;
      const rx = posOf(R).x;
      const a = pt(j.left, j.leftCol, lx <= rx ? 'right' : 'left');
      const z = pt(j.right, j.rightCol, lx <= rx ? 'left' : 'right');
      return a && z ? { id: j.id, a, z, type: j.type } : null;
    }).filter(Boolean);
    if (JSON.stringify(next) !== JSON.stringify(lines)) setLines(next);
  });

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') setPending(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const startMove = (e, t) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = posOf(t);
    setDrag({ alias: t.alias, dx: e.clientX - p.x, dy: e.clientY - p.y, x: p.x, y: p.y });
  };
  const onMove = (e) => {
    if (!drag) return;
    setDrag({ ...drag, x: Math.max(0, e.clientX - drag.dx), y: Math.max(0, e.clientY - drag.dy) });
  };
  const endMove = () => {
    if (!drag) return;
    set({ tables: b.tables.map((t) => (t.alias === drag.alias ? { ...t, x: Math.round(drag.x), y: Math.round(drag.y) } : t)) });
    setDrag(null);
  };

  const clickHandle = (alias, col) => {
    if (!pending) return setPending({ alias, col });
    if (pending.alias === alias) return setPending(pending.col === col ? null : { alias, col });
    set({ joins: [...b.joins, { id: bid('j'), type: 'INNER', left: pending.alias, leftCol: pending.col, right: alias, rightCol: col }] });
    setPending(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const table = e.dataTransfer.getData('text/x-rpt-table');
    if (!table) return;
    const r = canvasRef.current.getBoundingClientRect();
    onChange(addTable(b, table, { x: Math.max(0, e.clientX - r.left + canvasRef.current.scrollLeft - 60), y: Math.max(0, e.clientY - r.top + canvasRef.current.scrollTop - 16) }));
  };

  const updCol = (id, patch) => set({ columns: b.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const moveCol = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= b.columns.length) return;
    const cols = [...b.columns];
    [cols[i], cols[j]] = [cols[j], cols[i]];
    set({ columns: cols });
  };
  const updFilter = (id, patch) => set({ filters: b.filters.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const allCols = b.tables.flatMap((t) => (schema.find((s) => s.name === t.table)?.columns || []).map((c) => ({ alias: t.alias, col: c.name, type: c.type, label: `${t.alias}.${c.name}` })));
  const maxY = Math.max(340, ...b.tables.map((t) => posOf(t).y + 300));
  const maxX = Math.max(600, ...b.tables.map((t) => posOf(t).x + BOX_W + 24));

  return (
    <div className="qb">
      <div className="qb-top">
        <aside className="qb-tables" aria-label="Tablas de la base de datos">
          <h4>Tablas</h4>
          <p className="ui-hint">Arrastra al lienzo o pulsa +</p>
          <ul>
            {schema.map((t) => (
              <li key={t.name} draggable onDragStart={(e) => { e.dataTransfer.setData('text/x-rpt-table', t.name); e.dataTransfer.effectAllowed = 'copy'; }}>
                <Icon name="table" size={14} /><span>{t.name}</span><small>{t.rowCount}</small>
                <button type="button" className="ui-icon-btn ui-icon-btn-s" title={`Añadir ${t.name}`} aria-label={`Añadir tabla ${t.name}`} onClick={() => onChange(addTable(b, t.name))}><Icon name="add" size={14} /></button>
              </li>
            ))}
          </ul>
        </aside>

        <div ref={canvasRef} className={`qb-canvas ${pending ? 'is-joining' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onPointerMove={onMove} onPointerUp={endMove} onPointerCancel={endMove}
          aria-label="Lienzo de la consulta">
          <div className="qb-canvas-inner" style={{ width: maxX, height: maxY }}>
            <svg className="qb-lines" width={maxX} height={maxY} aria-hidden="true">
              {lines.map((l) => {
                const mx = (l.a.x + l.z.x) / 2;
                return <path key={l.id} d={`M${l.a.x},${l.a.y} C${mx},${l.a.y} ${mx},${l.z.y} ${l.z.x},${l.z.y}`} className={l.type === 'LEFT' ? 'is-left' : ''} />;
              })}
            </svg>
            {lines.map((l) => {
              const j = b.joins.find((x) => x.id === l.id);
              return (
                <div key={l.id} className="qb-join" style={{ left: (l.a.x + l.z.x) / 2 - 46, top: (l.a.y + l.z.y) / 2 - 13 }}>
                  <select aria-label={`Tipo de unión ${j.left}.${j.leftCol} = ${j.right}.${j.rightCol}`} value={j.type} onChange={(e) => set({ joins: b.joins.map((x) => (x.id === j.id ? { ...x, type: e.target.value } : x)) })}>
                    <option value="INNER">Interna</option><option value="LEFT">Izquierda</option>
                  </select>
                  <button type="button" title="Quitar unión" aria-label="Quitar unión" onClick={() => set({ joins: b.joins.filter((x) => x.id !== j.id) })}><Icon name="close" size={12} /></button>
                </div>
              );
            })}
            {b.tables.length === 0 && (
              <div className="qb-empty"><Icon name="db" size={28} /><p>Arrastra aquí tablas de la izquierda.</p><p className="ui-hint">Las relaciones (<code>cliente_id → clientes.id</code>) se unen solas.</p></div>
            )}
            {b.tables.map((t) => {
              const cols = schema.find((s) => s.name === t.table)?.columns || [];
              const p = posOf(t);
              return (
                <div key={t.alias} className={`qb-box ${drag?.alias === t.alias ? 'is-drag' : ''}`} style={{ left: p.x, top: p.y, width: BOX_W }}>
                  <div className="qb-box-head" onPointerDown={(e) => startMove(e, t)} title="Arrastra para mover">
                    <b>{t.table}</b><small>{t.alias}</small>
                    <button type="button" className="ui-icon-btn ui-icon-btn-s" aria-label={`Quitar tabla ${t.table}`} onClick={() => onChange(removeTable(b, t.alias))}><Icon name="close" size={14} /></button>
                  </div>
                  <ul className="qb-cols-list">
                    {cols.map((c) => {
                      const on = b.columns.some((x) => x.alias === t.alias && x.col === c.name);
                      const isPending = pending?.alias === t.alias && pending.col === c.name;
                      const joined = b.joins.some((j) => (j.left === t.alias && j.leftCol === c.name) || (j.right === t.alias && j.rightCol === c.name));
                      return (
                        <li key={c.name} ref={(el) => { rowRefs.current[`${t.alias}.${c.name}`] = el; }} className={on ? 'is-on' : ''}>
                          <label><input type="checkbox" checked={on} onChange={() => onChange(toggleColumn(b, t.alias, c.name))} /> {c.name}</label>
                          <small>{c.type}</small>
                          <button type="button" className={`qb-handle ${isPending ? 'is-pending' : ''} ${joined ? 'is-joined' : ''}`} aria-pressed={isPending}
                            title={pending ? 'Unir con esta columna' : 'Unir esta columna con otra tabla'} aria-label={`Unir ${t.alias}.${c.name}`} onClick={() => clickHandle(t.alias, c.name)} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {pending && <div className="ui-msg">Unión: elige la columna de otra tabla que corresponde a <code>{pending.alias}.{pending.col}</code> (Esc para cancelar).</div>}
      {warnings.length > 0 && b.tables.length > 0 && <div className="ui-msg ui-msg-warn">{warnings.map((w) => <div key={w}>{w}</div>)}</div>}

      <section className="qb-section">
        <div className="ui-card-head">
          <h4>Columnas</h4>
          <button type="button" className="ui-btn ui-btn-subtle" disabled={!b.tables.length} onClick={() => set({ columns: [...b.columns, { id: bid('c'), alias: b.tables[0].alias, col: '*', fn: '', agg: 'COUNT', as: 'recuento', sort: '' }] })}>
            <Icon name="add" size={16} />Recuento de filas
          </button>
        </div>
        {b.columns.length === 0 ? <p className="ui-hint">Marca columnas en las tablas del lienzo.</p> : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead><tr><th>Columna</th><th>Función</th><th>Agregación</th><th>Nombre (alias)</th><th>Orden</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {b.columns.map((c, i) => {
                  const type = c.col === '*' ? 'number' : columnType(tableOf(c.alias)?.table, c.col);
                  return (
                    <tr key={c.id}>
                      <td><code>{c.col === '*' ? 'COUNT(*)' : `${c.alias}.${c.col}`}</code></td>
                      <td>
                        <select className="ui-input" aria-label="Función" value={c.fn} disabled={c.col === '*'} onChange={(e) => updCol(c.id, { fn: e.target.value })}>
                          {FNS.filter((f) => !f.types || f.types.includes(type)).map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className="ui-input" aria-label="Agregación" value={c.agg} disabled={c.col === '*'} onChange={(e) => updCol(c.id, { agg: e.target.value })}>
                          {AGGS.filter((a) => type === 'number' || ['', 'COUNT', 'COUNT DISTINCT'].includes(a.value)).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                      </td>
                      <td><input className="ui-input" aria-label="Alias" value={c.as} onChange={(e) => updCol(c.id, { as: e.target.value.replace(/[^\w]/g, '_') })} /></td>
                      <td>
                        <select className="ui-input" aria-label="Orden" value={c.sort} onChange={(e) => updCol(c.id, { sort: e.target.value })}>
                          <option value="">—</option><option value="ASC">Ascendente</option><option value="DESC">Descendente</option>
                        </select>
                      </td>
                      <td className="ui-nowrap">
                        <button type="button" className="ui-icon-btn ui-icon-btn-s" aria-label="Subir" onClick={() => moveCol(i, -1)} disabled={i === 0}><Icon name="up" size={14} /></button>
                        <button type="button" className="ui-icon-btn ui-icon-btn-s" aria-label="Bajar" onClick={() => moveCol(i, 1)} disabled={i === b.columns.length - 1}><Icon name="down" size={14} /></button>
                        <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" aria-label="Quitar columna" onClick={() => set({ columns: b.columns.filter((x) => x.id !== c.id) })}><Icon name="delete" size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="qb-section">
        <div className="ui-card-head">
          <h4>Filtros (WHERE)</h4>
          <button type="button" className="ui-btn ui-btn-subtle" disabled={!allCols.length} onClick={() => set({ filters: [...b.filters, { id: bid('f'), alias: allCols[0].alias, col: allCols[0].col, op: '=', kind: 'value', value: '', value2: '', param: paramNames[0] || '', optional: false }] })}>
            <Icon name="add" size={16} />Añadir filtro
          </button>
        </div>
        {b.filters.length === 0 ? <p className="ui-hint">Sin filtros. Puedes comparar con un valor fijo o con un parámetro del informe.</p> : (
          <div className="qb-filters">
            {b.filters.map((f) => {
              const noValue = f.op === 'IS NULL' || f.op === 'IS NOT NULL';
              const rangeParams = params.filter((p) => p.type === 'daterange').map((p) => p.name);
              return (
                <div key={f.id} className="qb-filter">
                  <select className="ui-input" aria-label="Columna" value={`${f.alias}.${f.col}`} onChange={(e) => { const [alias, col] = e.target.value.split('.'); updFilter(f.id, { alias, col, fn: '' }); }}>
                    {allCols.map((c) => <option key={c.label} value={c.label}>{c.label}</option>)}
                  </select>
                  <select className="ui-input qb-fn" aria-label="Función del filtro" value={f.fn || ''} onChange={(e) => updFilter(f.id, { fn: e.target.value })}>
                    {FNS.filter((x) => !x.types || x.types.includes(columnType(tableOf(f.alias)?.table, f.col))).map((x) => <option key={x.value} value={x.value}>{x.value ? x.label : 'Valor tal cual'}</option>)}
                  </select>
                  <select className="ui-input qb-op" aria-label="Operador" value={f.op} onChange={(e) => updFilter(f.id, { op: e.target.value })}>
                    {OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {!noValue && (
                    <select className="ui-input qb-kind" aria-label="Comparar con" value={f.kind} onChange={(e) => updFilter(f.id, { kind: e.target.value })}>
                      <option value="value">Valor</option><option value="param" disabled={f.op === 'IN'}>Parámetro</option>
                    </select>
                  )}
                  {!noValue && f.kind === 'value' && (
                    <>
                      <input className="ui-input" aria-label="Valor" placeholder={f.op === 'IN' ? 'a, b, c' : 'Valor'} value={f.value ?? ''} onChange={(e) => updFilter(f.id, { value: e.target.value })} />
                      {f.op === 'BETWEEN' && <input className="ui-input" aria-label="Hasta" placeholder="Hasta" value={f.value2 ?? ''} onChange={(e) => updFilter(f.id, { value2: e.target.value })} />}
                    </>
                  )}
                  {!noValue && f.kind === 'param' && (
                    <>
                      <select className="ui-input" aria-label="Parámetro" value={f.param} onChange={(e) => updFilter(f.id, { param: e.target.value })}>
                        <option value="">Elegir…</option>
                        {(f.op === 'BETWEEN' ? rangeParams : paramNames).map((n) => <option key={n} value={n}>:{n}</option>)}
                      </select>
                      {f.op !== 'BETWEEN' && <label className="ui-check qb-opt"><input type="checkbox" checked={!!f.optional} onChange={(e) => updFilter(f.id, { optional: e.target.checked })} /> Ignorar si vacío</label>}
                    </>
                  )}
                  <button type="button" className="ui-icon-btn ui-danger" aria-label="Quitar filtro" onClick={() => set({ filters: b.filters.filter((x) => x.id !== f.id) })}><Icon name="delete" size={16} /></button>
                </div>
              );
            })}
            {params.length === 0 && <p className="ui-hint">Para filtrar por parámetros, créalos arriba en «Parámetros del informe».</p>}
          </div>
        )}
      </section>

      <section className="qb-section qb-options">
        <label className="ui-check"><input type="checkbox" checked={!!b.distinct} onChange={(e) => set({ distinct: e.target.checked })} /> Sin duplicados (DISTINCT)</label>
        <label className="ui-field ui-field-inline"><span>Límite de filas</span><input className="ui-input" type="number" min="0" value={b.limit ?? ''} onChange={(e) => set({ limit: e.target.value })} /></label>
      </section>
    </div>
  );
}
