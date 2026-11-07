import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CATALOG, autoBind, byType, newCell } from '../lib/catalog.js';
import * as ops from '../lib/modelOps.js';
import { buildReportData } from '../lib/sqlEngine.js';
import Icon from './Icon.jsx';
import LiveComponent from './LiveComponent.jsx';
import PropertyPanel from './PropertyPanel.jsx';

const GROUPS = [...new Set(CATALOG.map((c) => c.group))];

export default function Designer({ model, dataSources, params, onChange }) {
  const [selected, setSelected] = useState(null);
  const [pane, setPane] = useState('canvas'); // pestaña visible en móvil
  const [drop, setDrop] = useState(null); // indicador de destino
  const drag = useRef(null); // { kind: 'new'|'move', type?, cellId? }
  const undo = useRef({ past: [], future: [] });

  const { data } = useMemo(() => buildReportData(dataSources, params), [dataSources, params]);
  const selCell = selected ? ops.findCell(model, selected) : null;
  const issues = useMemo(() => ops.validateModel(model, dataSources), [model, dataSources]);

  const commit = useCallback((next) => {
    if (next === model) return;
    undo.current.past.push(model);
    if (undo.current.past.length > 100) undo.current.past.shift();
    undo.current.future = [];
    onChange(next);
  }, [model, onChange]);

  const doUndo = useCallback(() => {
    const prev = undo.current.past.pop();
    if (!prev) return;
    undo.current.future.push(model);
    onChange(prev);
  }, [model, onChange]);
  const doRedo = useCallback(() => {
    const next = undo.current.future.pop();
    if (!next) return;
    undo.current.past.push(model);
    onChange(next);
  }, [model, onChange]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      const editing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !editing) { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !editing) { e.preventDefault(); doRedo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !editing) { e.preventDefault(); commit(ops.removeCell(model, selected)); setSelected(null); }
      else if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [model, selected, commit, doUndo, doRedo]);

  const defaultSource = dataSources[0];
  const create = (type) => autoBind(newCell(type, defaultSource?.id), defaultSource);

  const addByTap = (type) => {
    const cell = create(type);
    commit(ops.insertCell(model, cell, ops.smartTarget(model, selected, cell.span)));
    setSelected(cell.id);
    setPane('canvas');
  };

  const applyDrop = (target) => {
    const d = drag.current;
    drag.current = null;
    setDrop(null);
    if (!d) return;
    if (d.kind === 'new') {
      const cell = create(d.type);
      commit(ops.insertCell(model, cell, target));
      setSelected(cell.id);
    } else if (d.kind === 'move') {
      commit(ops.moveCell(model, d.cellId, target));
    }
  };

  const startDrag = (e, payload) => {
    drag.current = payload;
    e.dataTransfer.effectAllowed = payload.kind === 'new' ? 'copy' : 'move';
    e.dataTransfer.setData('text/plain', payload.type || payload.cellId);
  };
  const endDrag = () => { drag.current = null; setDrop(null); };

  const overCell = (e, r, c) => {
    if (!drag.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const at = e.clientX < rect.left + rect.width / 2 ? c : c + 1;
    if (drop?.row !== r || drop?.at !== at) setDrop({ row: r, at });
  };
  const overRowEnd = (e, r) => {
    if (!drag.current) return;
    e.preventDefault();
    const at = model.rows[r].cells.length;
    if (drop?.row !== r || drop?.at !== at) setDrop({ row: r, at });
  };
  const overNewRow = (e, i) => {
    if (!drag.current) return;
    e.preventDefault();
    if (drop?.newRow !== i) setDrop({ newRow: i });
  };

  const newRowZone = (index) => (
    <div key={`nr-${index}`} className={`dz-newrow ${drop?.newRow === index ? 'is-over' : ''}`} onDragOver={(e) => overNewRow(e, index)}
      onDragLeave={() => setDrop(null)} onDrop={(e) => { e.preventDefault(); applyDrop({ newRow: index }); }}>
      <span>Soltar como fila nueva</span>
    </div>
  );

  return (
    <div className="dz" data-pane={pane}>
      <div className="dz-tabs ui-seg" role="tablist" aria-label="Paneles del diseñador">
        {[['palette', 'Componentes'], ['canvas', 'Lienzo'], ['props', 'Propiedades']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={pane === k} className={pane === k ? 'is-on' : ''} onClick={() => setPane(k)}>{l}</button>
        ))}
      </div>

      <aside className="dz-palette ui-card" aria-label="Paleta de componentes">
        <div className="ui-card-head"><h3>Componentes</h3><small>RptLib {model.libVersion}</small></div>
        {GROUPS.map((g) => (
          <div key={g} className="dz-group">
            <h4>{g}</h4>
            {CATALOG.filter((c) => c.group === g).map((c) => (
              <div key={c.type} role="button" tabIndex={0} className="dz-tool" draggable onDragStart={(e) => startDrag(e, { kind: 'new', type: c.type })} onDragEnd={endDrag}
                onClick={() => addByTap(c.type)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addByTap(c.type); } }}
                title="Arrastra al lienzo o toca/pulsa Intro para añadir">
                <span className="dz-tool-icon"><Icon path={c.icon} /></span>
                <span><b>{c.label}</b><small>{c.description}</small></span>
              </div>
            ))}
          </div>
        ))}
        <div className="dz-group">
          <h4>Orígenes disponibles</h4>
          {dataSources.length ? dataSources.map((d) => (
            <div key={d.id} className="dz-ds"><Icon name="db" size={14} /> <b>{d.id}</b> <small>{data.sources[d.id]?.rows.length ?? 'error'} filas</small></div>
          )) : <p className="ui-hint">No hay orígenes. Créalos en el paso/pestaña «Orígenes de datos».</p>}
        </div>
      </aside>

      <section className="dz-canvas-wrap" aria-label="Lienzo del informe">
        <div className="dz-toolbar">
          <button type="button" className="ui-icon-btn" title="Deshacer (Ctrl+Z)" onClick={doUndo} disabled={!undo.current.past.length}><Icon path="M9 14 4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3" /></button>
          <button type="button" className="ui-icon-btn" title="Rehacer (Ctrl+Y)" onClick={doRedo} disabled={!undo.current.future.length}><Icon path="m15 14 5-5-5-5 M20 9H10a6 6 0 0 0 0 12h3" /></button>
          <span className="ui-spacer" />
          {issues.length > 0 && <span className="ui-badge ui-badge-warn" title={issues.map((i) => i.msg).join('\n')}>{issues.length} aviso(s) de vinculación</span>}
        </div>
        <div className="dz-canvas rpt-body" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="rpt-report">
            <header className={`rpt-report-header dz-header ${!selected ? 'is-sel' : ''}`} onClick={() => { setSelected(null); }}>
              <h1>{model.title || 'Sin título'}</h1>
              {model.subtitle && <p>{model.subtitle}</p>}
            </header>

            {model.rows.length === 0 && (
              <div className={`dz-empty ${drop?.newRow === 0 ? 'is-over' : ''}`} onDragOver={(e) => overNewRow(e, 0)} onDrop={(e) => { e.preventDefault(); applyDrop({ newRow: 0 }); }}>
                <Icon name="layout" size={32} />
                <p><b>El informe está vacío.</b></p>
                <p>Arrastra aquí componentes de la paleta (o tócalos en móvil).</p>
              </div>
            )}

            {model.rows.map((row, r) => (
              <div key={row.id} className={`dz-row-wrap ${row.cells.some((x) => x.id === selected) ? 'has-sel' : ''}`}>
                {newRowZone(r)}
                <div className="dz-row-tools">
                  <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Subir fila" onClick={() => commit(ops.moveRow(model, r, -1))} disabled={r === 0}><Icon name="up" size={14} /></button>
                  <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Bajar fila" onClick={() => commit(ops.moveRow(model, r, 1))} disabled={r === model.rows.length - 1}><Icon name="down" size={14} /></button>
                  <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" title="Eliminar fila" onClick={() => { if (confirm('¿Eliminar la fila completa?')) commit(ops.removeRow(model, r)); }}><Icon name="delete" size={14} /></button>
                </div>
                <div className="rpt-row dz-row" onDragOver={(e) => overRowEnd(e, r)} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDrop(null); }}
                  onDrop={(e) => { e.preventDefault(); applyDrop(drop && drop.row === r ? drop : { row: r }); }}>
                  {row.cells.map((cell, c) => {
                    const isSel = selected === cell.id;
                    const def = byType[cell.type];
                    const src = cell.source ? data.sources[cell.source] : null;
                    const marker = drop?.row === r ? (drop.at === c ? 'is-drop-before' : drop.at === c + 1 && c === row.cells.length - 1 ? 'is-drop-after' : '') : '';
                    return (
                      <div key={cell.id} className={`rpt-col rpt-col-${cell.span} dz-cell ${isSel ? 'is-sel' : ''} ${marker}`}
                        onDragOver={(e) => overCell(e, r, c)} onClick={(e) => { e.stopPropagation(); setSelected(cell.id); }}
                        onDoubleClick={() => setPane('props')}>
                        <div className="dz-cell-bar">
                          <span className="dz-grip" draggable onDragStart={(e) => { e.stopPropagation(); startDrag(e, { kind: 'move', cellId: cell.id }); }} onDragEnd={endDrag} title="Arrastrar para mover">
                            <Icon name="grip" size={14} />{def?.label}{cell.source ? ` · ${cell.source}` : ''}
                          </span>
                          {isSel && (
                            <span className="dz-cell-actions">
                              <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Mover a la izquierda" onClick={() => commit(ops.nudgeCell(model, cell.id, 'left'))}><Icon name="left" size={14} /></button>
                              <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Mover a la derecha" onClick={() => commit(ops.nudgeCell(model, cell.id, 'right'))}><Icon name="right" size={14} /></button>
                              <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Mover a la fila superior" onClick={() => commit(ops.nudgeCell(model, cell.id, 'up'))}><Icon name="up" size={14} /></button>
                              <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Mover a la fila inferior" onClick={() => commit(ops.nudgeCell(model, cell.id, 'down'))}><Icon name="down" size={14} /></button>
                              <button type="button" className="ui-icon-btn ui-icon-btn-s dz-only-mobile" title="Propiedades" onClick={() => setPane('props')}><Icon name="settings" size={14} /></button>
                              <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" title="Eliminar (Supr)" onClick={(e) => { e.stopPropagation(); commit(ops.removeCell(model, cell.id)); setSelected(null); }}><Icon name="delete" size={14} /></button>
                            </span>
                          )}
                        </div>
                        <LiveComponent type={cell.type} props={cell.props} source={src} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {model.rows.length > 0 && newRowZone(model.rows.length)}
          </div>
        </div>
      </section>

      <aside className="dz-props ui-card" aria-label="Propiedades">
        <PropertyPanel
          model={model}
          cell={selCell}
          dataSources={dataSources}
          onModel={commit}
          onCell={(patch) => commit(ops.updateCell(model, selected, patch))}
          onRemove={() => { commit(ops.removeCell(model, selected)); setSelected(null); }}
          onDuplicate={() => { const r = ops.duplicateCell(model, selected); commit(r.model); setSelected(r.id); }}
        />
        {issues.length > 0 && (
          <div className="ui-msg ui-msg-warn pp-issues">
            <b>Avisos</b>
            <ul>{issues.map((i, k) => <li key={k}><button type="button" className="ui-link" onClick={() => setSelected(i.cellId)}>{i.msg}</button></li>)}</ul>
          </div>
        )}
      </aside>
    </div>
  );
}
