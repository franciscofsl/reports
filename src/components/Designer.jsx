import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CATALOG, THEME_DEFAULTS, autoBind, byType, newCell, uid } from '../lib/catalog.js';
import * as ops from '../lib/modelOps.js';
import { autoLayout } from '../lib/autoLayout.js';
import { buildReportData } from '../lib/sqlEngine.js';
import { deleteBlock, listBlocks, listReports, readClipboard, saveBlock, subscribe, writeClipboard } from '../lib/store.js';
import Icon from './Icon.jsx';
import LiveComponent from './LiveComponent.jsx';
import PropertyPanel from './PropertyPanel.jsx';
import ShowMePanel from './ShowMePanel.jsx';
import { modelPages } from '../lib/htmlGenerator.js';

const GROUPS = [...new Set(CATALOG.map((c) => c.group))];
const DEVICES = [
  { id: 'desktop', label: 'Escritorio', width: null, icon: 'M3 5h18v11H3z M8 20h8 M12 16v4' },
  { id: 'tablet', label: 'Tablet', width: 820, icon: 'M6 3h12v18H6z M11 18h2' },
  { id: 'mobile', label: 'Móvil', width: 390, icon: 'M8 3h8v18H8z M11 18h2' },
];
let blocksCache = null;
const blocksSnap = () => (blocksCache ??= listBlocks());
const blocksSub = (fn) => subscribe(() => { blocksCache = null; fn(); });

export default function Designer({ model, dataSources, params, onChange, semantic, reportId }) {
  const [selection, setSelection] = useState([]);
  const [pane, setPane] = useState('canvas'); // pestaña visible en móvil
  const [device, setDevice] = useState('desktop');
  const [drop, setDrop] = useState(null);
  const [resize, setResize] = useState(null); // { id, span?, height? } durante el arrastre
  const drag = useRef(null);
  const undo = useRef({ past: [], future: [] });
  const blocks = useSyncExternalStore(blocksSub, blocksSnap);

  const [pageIdx, setPageIdx] = useState(0);
  const pages = modelPages(model);
  const pi = Math.min(pageIdx, pages.length - 1);
  const pm = useMemo(() => ops.pageModel(model, pi), [model, pi]);
  const reports = useMemo(() => listReports().filter((r) => r.id !== reportId), [reportId]);
  const { data } = useMemo(() => buildReportData(dataSources, params), [dataSources, params]);
  const theme = { ...THEME_DEFAULTS, ...(model.theme || {}) };
  const selCells = selection.map((id) => ops.findCell(pm, id)).filter(Boolean);
  const primary = selection[selection.length - 1] || null;
  const issues = useMemo(() => ops.validateModel(model, dataSources, semantic), [model, dataSources, semantic]);
  const select = (id, additive) => setSelection((s) => (id == null ? [] : additive ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]));

  const commitModel = useCallback((next) => {
    if (next === model) return;
    undo.current.past.push(model);
    if (undo.current.past.length > 100) undo.current.past.shift();
    undo.current.future = [];
    onChange(next);
  }, [model, onChange]);
  // Las operaciones de filas trabajan sobre la página activa.
  const commit = useCallback((nextPm) => { if (nextPm !== pm) commitModel(ops.withPageRows(model, pi, nextPm.rows)); }, [model, pm, pi, commitModel]);
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

  const copy = useCallback(() => { if (selCells.length) writeClipboard(selCells); }, [selCells]);
  const paste = useCallback(() => {
    const clip = readClipboard();
    if (!clip?.length) return;
    const r = ops.pasteCells(pm, clip, primary);
    commit(r.model);
    setSelection(r.ids);
  }, [pm, primary, commit]);
  const duplicate = useCallback(() => {
    if (!selCells.length) return;
    const r = ops.pasteCells(pm, selCells, primary);
    commit(r.model);
    setSelection(r.ids);
  }, [pm, selCells, primary, commit]);
  const removeSel = useCallback(() => { if (selection.length) { commit(ops.removeCells(pm, selection)); setSelection([]); } }, [pm, selection, commit]);

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable || t.closest?.('.cm-editor, dialog');
      if (editing) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); }
      else if (mod && k === 'y') { e.preventDefault(); doRedo(); }
      else if (mod && k === 'c' && selection.length) { e.preventDefault(); copy(); }
      else if (mod && k === 'v') { e.preventDefault(); paste(); }
      else if (mod && k === 'd' && selection.length) { e.preventDefault(); duplicate(); }
      else if (mod && k === 'a') { e.preventDefault(); setSelection(pm.rows.flatMap((r) => r.cells.map((c) => c.id))); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) { e.preventDefault(); removeSel(); }
      else if (e.key === 'Escape') setSelection([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [model, selection, doUndo, doRedo, copy, paste, duplicate, removeSel]);

  const defaultSource = dataSources[0];
  const create = (type) => autoBind(newCell(type, defaultSource?.id), defaultSource);
  const addByTap = (type) => {
    const cell = create(type);
    commit(ops.insertCell(pm, cell, ops.smartTarget(pm, primary, cell.span)));
    setSelection([cell.id]);
    setPane('canvas');
  };
  const insertBlock = (b) => {
    const r = ops.insertRow(pm, b.row);
    commit(r.model);
    setSelection(r.ids);
    setPane('canvas');
  };
  const runAutoLayout = () => {
    if (!dataSources.length) return alert('Define antes algún origen de datos.');
    if (pm.rows.length && !confirm('El diseño automático sustituirá el contenido del lienzo (puedes deshacerlo con Ctrl+Z). ¿Continuar?')) return;
    const m = autoLayout(dataSources, data, { title: model.title, subtitle: model.subtitle });
    commit({ ...pm, rows: m.rows });
    setSelection([]);
  };

  /* --- arrastrar y soltar --- */
  const applyDrop = (target) => {
    const d = drag.current;
    drag.current = null;
    setDrop(null);
    if (!d) return;
    if (d.kind === 'new') {
      const cell = create(d.type);
      commit(ops.insertCell(pm, cell, target));
      setSelection([cell.id]);
    } else if (d.kind === 'block') {
      const r = ops.insertRow(pm, d.block.row, target.newRow ?? (target.row != null ? target.row + 1 : undefined));
      commit(r.model);
      setSelection(r.ids);
    } else if (d.kind === 'move') commit(ops.moveCell(pm, d.cellId, target));
  };
  const startDrag = (e, payload) => {
    drag.current = payload;
    e.dataTransfer.effectAllowed = payload.kind === 'move' ? 'move' : 'copy';
    e.dataTransfer.setData('text/plain', payload.type || payload.cellId || 'block');
  };
  const endDrag = () => { drag.current = null; setDrop(null); };
  const overCell = (e, r, c) => {
    if (!drag.current) return;
    e.preventDefault();
    e.stopPropagation();
    if (drag.current.kind === 'block') { if (drop?.newRow !== r + 1) setDrop({ newRow: r + 1 }); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const at = e.clientX < rect.left + rect.width / 2 ? c : c + 1;
    if (drop?.row !== r || drop?.at !== at) setDrop({ row: r, at });
  };
  const overRowEnd = (e, r) => {
    if (!drag.current) return;
    e.preventDefault();
    const at = pm.rows[r].cells.length;
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

  /* --- redimensionar arrastrando bordes (ratón y táctil) --- */
  const startResize = (e, cell, axis) => {
    e.preventDefault();
    e.stopPropagation();
    const cellEl = e.currentTarget.closest('.dz-cell');
    const rowEl = cellEl.parentElement;
    const rowW = rowEl.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(rowEl).columnGap) || 16;
    const colW = (rowW + gap) / 12;
    const left = cellEl.getBoundingClientRect().left;
    const top = cellEl.getBoundingClientRect().top;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    let last = { id: cell.id };
    const move = (ev) => {
      if (axis === 'x') last = { id: cell.id, span: Math.max(2, Math.min(12, Math.round((ev.clientX - left + gap) / colW))) };
      else last = { id: cell.id, height: Math.max(80, Math.round(ev.clientY - top)) };
      setResize(last);
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      setResize(null);
      if (last.span && last.span !== cell.span) commit(ops.updateCell(pm, cell.id, { span: last.span }));
      if (last.height) commit(ops.updateCell(pm, cell.id, { height: last.height }));
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  const dev = DEVICES.find((d) => d.id === device);
  const paletteArg = theme.palette === 'custom' && theme.colors?.length ? theme.colors : theme.palette;
  const canvasStyle = {
    ...(theme.brand && theme.brand !== THEME_DEFAULTS.brand ? { '--rpt-brand': theme.brand } : {}),
    ...(theme.font ? { '--rpt-font': theme.font } : {}),
    ...(theme.background ? { '--rpt-bg': theme.background } : {}),
    ...(dev.width ? { maxWidth: dev.width } : {}),
  };
  /* --- páginas --- */
  const setPages = (next, idx) => { const { rows: _r, ...rest } = model; commitModel({ ...rest, pages: next }); if (idx != null) setPageIdx(idx); setSelection([]); };
  const addPage = () => setPages([...pages, { id: uid('pg'), name: `Página ${pages.length + 1}`, rows: [] }], pages.length);
  const renamePage = (i) => { const name = prompt('Nombre de la página', pages[i].name); if (name) setPages(pages.map((pg, j) => (j === i ? { ...pg, name } : pg))); };
  const removePage = (i) => { if (pages.length < 2 || !confirm(`¿Eliminar la página «${pages[i].name}» y sus componentes?`)) return; setPages(pages.filter((_, j) => j !== i), Math.max(0, i - 1)); };
  const movePage = (i, d) => { const j = i + d; if (j < 0 || j >= pages.length) return; const n = [...pages]; [n[i], n[j]] = [n[j], n[i]]; setPages(n, j); };
  const addSuggested = (sg) => {
    const cell = { id: uid('c'), type: sg.type, span: sg.span, source: sg.source, props: sg.props };
    commit(ops.insertCell(pm, cell, ops.smartTarget(pm, primary, cell.span)));
    setSelection([cell.id]);
    setPane('canvas');
  };

  return (
    <div className="dz" data-pane={pane}>
      <div className="dz-tabs ui-seg" role="tablist" aria-label="Paneles del diseñador">
        {[['palette', 'Componentes'], ['canvas', 'Lienzo'], ['props', selection.length > 1 ? `Propiedades (${selection.length})` : 'Propiedades']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={pane === k} className={pane === k ? 'is-on' : ''} onClick={() => setPane(k)}>{l}</button>
        ))}
      </div>

      <aside className="dz-palette ui-card" aria-label="Paleta de componentes">
        <div className="ui-card-head"><h3>Componentes</h3><small>RptLib {model.libVersion}</small></div>
        <button type="button" className="ui-btn ui-btn-block" onClick={runAutoLayout} title="Propone un diseño a partir de los orígenes de datos"><Icon name="wand" size={16} />Diseño automático</button>
        <ShowMePanel dataSources={dataSources} data={data} semantic={semantic} onAdd={addSuggested} palette={paletteArg} />
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
          <h4>Mis bloques</h4>
          {blocks.length ? blocks.map((b) => (
            <div key={b.id} className="dz-block">
              <div role="button" tabIndex={0} className="dz-tool" draggable onDragStart={(e) => startDrag(e, { kind: 'block', block: b })} onDragEnd={endDrag}
                onClick={() => insertBlock(b)} onKeyDown={(e) => { if (e.key === 'Enter') insertBlock(b); }} title="Inserta la fila guardada">
                <span className="dz-tool-icon"><Icon name="copy" /></span>
                <span><b>{b.name}</b><small>{b.row.cells.length} componentes · {(b.sources || []).join(', ') || 'sin datos'}</small></span>
              </div>
              <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" aria-label={`Eliminar bloque ${b.name}`} onClick={() => { if (confirm(`¿Eliminar el bloque «${b.name}»?`)) deleteBlock(b.id); }}><Icon name="delete" size={14} /></button>
            </div>
          )) : <p className="ui-hint">Guarda una fila con <Icon name="save" size={12} /> para reutilizarla en otros informes.</p>}
        </div>
        <div className="dz-group">
          <h4>Orígenes disponibles</h4>
          {dataSources.length ? dataSources.map((d) => (
            <div key={d.id} className="dz-ds"><Icon name="db" size={14} /> <b>{d.id}</b> <small>{data.sources[d.id]?.rows.length ?? 'error'} filas</small></div>
          )) : <p className="ui-hint">No hay orígenes. Créalos en «Orígenes de datos».</p>}
        </div>
      </aside>

      <section className="dz-canvas-wrap" aria-label="Lienzo del informe">
        <div className="dz-toolbar">
          <button type="button" className="ui-icon-btn" title="Deshacer (Ctrl+Z)" aria-label="Deshacer" onClick={doUndo} disabled={!undo.current.past.length}><Icon path="M9 14 4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3" /></button>
          <button type="button" className="ui-icon-btn" title="Rehacer (Ctrl+Y)" aria-label="Rehacer" onClick={doRedo} disabled={!undo.current.future.length}><Icon path="m15 14 5-5-5-5 M20 9H10a6 6 0 0 0 0 12h3" /></button>
          <span className="dz-sep" />
          <button type="button" className="ui-icon-btn" title="Copiar (Ctrl+C)" aria-label="Copiar" onClick={copy} disabled={!selection.length}><Icon name="copy" /></button>
          <button type="button" className="ui-icon-btn" title="Pegar (Ctrl+V)" aria-label="Pegar" onClick={paste}><Icon path="M8 4h8v3H8z M6 6H5v15h14V6h-1 M9 13h6 M9 17h4" /></button>
          <span className="ui-spacer" />
          {issues.length > 0 && <span className="ui-badge ui-badge-warn" title={issues.map((i) => i.msg).join('\n')}>{issues.length} aviso(s)</span>}
          <div className="ui-seg dz-devices" role="radiogroup" aria-label="Vista por dispositivo">
            {DEVICES.map((d) => (
              <button key={d.id} type="button" role="radio" aria-checked={device === d.id} className={device === d.id ? 'is-on' : ''} onClick={() => setDevice(d.id)} title={d.label} aria-label={d.label}><Icon path={d.icon} size={16} /></button>
            ))}
          </div>
        </div>
        <div className="dz-pages" role="tablist" aria-label="Páginas del informe">
          {pages.map((pg, i) => (
            <span key={pg.id} className={`dz-page ${i === pi ? 'is-on' : ''}`}>
              <button type="button" role="tab" aria-selected={i === pi} onClick={() => { setPageIdx(i); setSelection([]); }} onDoubleClick={() => renamePage(i)} title="Doble clic para renombrar">{pg.name}</button>
              {i === pi && (
                <>
                  <button type="button" className="ui-icon-btn ui-icon-btn-s" aria-label="Renombrar página" title="Renombrar" onClick={() => renamePage(i)}><Icon name="edit" size={12} /></button>
                  {pages.length > 1 && <button type="button" className="ui-icon-btn ui-icon-btn-s" aria-label="Mover página a la izquierda" title="Mover a la izquierda" onClick={() => movePage(i, -1)} disabled={i === 0}><Icon name="left" size={12} /></button>}
                  {pages.length > 1 && <button type="button" className="ui-icon-btn ui-icon-btn-s" aria-label="Mover página a la derecha" title="Mover a la derecha" onClick={() => movePage(i, 1)} disabled={i === pages.length - 1}><Icon name="right" size={12} /></button>}
                  {pages.length > 1 && <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" aria-label="Eliminar página" title="Eliminar página" onClick={() => removePage(i)}><Icon name="delete" size={12} /></button>}
                </>
              )}
            </span>
          ))}
          <button type="button" className="ui-btn ui-btn-subtle dz-addpage" onClick={addPage}><Icon name="add" size={14} />Página</button>
        </div>
        <div className="dz-canvas" onClick={(e) => { if (e.target === e.currentTarget) select(null); }}>
          <div className={`dz-device rpt-body ${dev.width ? 'is-framed' : ''}`} style={canvasStyle}
            data-rpt-theme={theme.mode !== 'auto' ? theme.mode : undefined} data-rpt-density={theme.density !== 'normal' ? theme.density : undefined}>
            <div className="rpt-report">
              <header className={`rpt-report-header dz-header ${!selection.length ? 'is-sel' : ''}`} onClick={() => select(null)}>
                <div>
                  <h1>{model.title || 'Sin título'}</h1>
                  {model.subtitle && <p>{model.subtitle}</p>}
                </div>
                {theme.logo && <img className="rpt-logo" src={theme.logo} alt="" />}
              </header>

              {pm.rows.length === 0 && (
                <div className={`dz-empty ${drop?.newRow === 0 ? 'is-over' : ''}`} onDragOver={(e) => overNewRow(e, 0)} onDrop={(e) => { e.preventDefault(); applyDrop({ newRow: 0 }); }}>
                  <Icon name="layout" size={32} />
                  <p><b>El informe está vacío.</b></p>
                  <p>Arrastra componentes de la paleta (o tócalos en móvil), o genera un borrador:</p>
                  <button type="button" className="ui-btn ui-btn-primary" onClick={runAutoLayout}><Icon name="wand" size={16} />Diseño automático</button>
                </div>
              )}

              {pm.rows.map((row, r) => (
                <div key={row.id} className={`dz-row-wrap ${row.cells.some((x) => selection.includes(x.id)) ? 'has-sel' : ''}`}>
                  {newRowZone(r)}
                  <div className="dz-row-tools">
                    <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Subir fila" aria-label="Subir fila" onClick={() => commit(ops.moveRow(pm, r, -1))} disabled={r === 0}><Icon name="up" size={14} /></button>
                    <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Bajar fila" aria-label="Bajar fila" onClick={() => commit(ops.moveRow(pm, r, 1))} disabled={r === pm.rows.length - 1}><Icon name="down" size={14} /></button>
                    <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Seleccionar fila" aria-label="Seleccionar fila" onClick={() => setSelection(row.cells.map((c) => c.id))}><Icon path="M4 7h16v10H4z" size={14} /></button>
                    <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Guardar fila como bloque" aria-label="Guardar fila como bloque" onClick={() => {
                      const name = prompt('Nombre del bloque', row.cells.map((c) => byType[c.type]?.label).join(' + '));
                      if (name) saveBlock(name, row, [...new Set(row.cells.map((c) => c.source).filter(Boolean))]);
                    }}><Icon name="save" size={14} /></button>
                    <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" title="Eliminar fila" aria-label="Eliminar fila" onClick={() => { if (confirm('¿Eliminar la fila completa?')) commit(ops.removeRow(pm, r)); }}><Icon name="delete" size={14} /></button>
                  </div>
                  <div className="rpt-row dz-row" onDragOver={(e) => overRowEnd(e, r)} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDrop(null); }}
                    onDrop={(e) => { e.preventDefault(); applyDrop(drop && (drop.row === r || drop.newRow != null) ? drop : { row: r }); }}>
                    {row.cells.map((cell, c) => {
                      const isSel = selection.includes(cell.id);
                      const def = byType[cell.type];
                      const src = cell.source ? data.sources[cell.source] : null;
                      const span = resize?.id === cell.id && resize.span ? resize.span : cell.span;
                      const height = resize?.id === cell.id && resize.height ? resize.height : cell.height;
                      const marker = drop?.row === r ? (drop.at === c ? 'is-drop-before' : drop.at === c + 1 && c === row.cells.length - 1 ? 'is-drop-after' : '') : '';
                      return (
                        <div key={cell.id} className={`rpt-col rpt-col-${span} dz-cell ${isSel ? 'is-sel' : ''} ${primary === cell.id ? 'is-primary' : ''} ${marker}`}
                          style={height ? { minHeight: height } : undefined}
                          onDragOver={(e) => overCell(e, r, c)} onClick={(e) => { e.stopPropagation(); select(cell.id, e.shiftKey || e.ctrlKey || e.metaKey); }}
                          onDoubleClick={() => setPane('props')}>
                          <div className="dz-cell-bar">
                            <span className="dz-grip" draggable onDragStart={(e) => { e.stopPropagation(); startDrag(e, { kind: 'move', cellId: cell.id }); }} onDragEnd={endDrag} title="Arrastrar para mover">
                              <Icon name="grip" size={14} />{def?.label}{cell.source ? ` · ${cell.source}` : ''}{resize?.id === cell.id ? ` · ${span}/12${height ? ` · ${height}px` : ''}` : ''}
                            </span>
                            {isSel && primary === cell.id && (
                              <span className="dz-cell-actions">
                                <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Mover a la izquierda" aria-label="Mover a la izquierda" onClick={() => commit(ops.nudgeCell(pm, cell.id, 'left'))}><Icon name="left" size={14} /></button>
                                <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Mover a la derecha" aria-label="Mover a la derecha" onClick={() => commit(ops.nudgeCell(pm, cell.id, 'right'))}><Icon name="right" size={14} /></button>
                                <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Mover a la fila superior" aria-label="Mover arriba" onClick={() => commit(ops.nudgeCell(pm, cell.id, 'up'))}><Icon name="up" size={14} /></button>
                                <button type="button" className="ui-icon-btn ui-icon-btn-s" title="Mover a la fila inferior" aria-label="Mover abajo" onClick={() => commit(ops.nudgeCell(pm, cell.id, 'down'))}><Icon name="down" size={14} /></button>
                                <button type="button" className="ui-icon-btn ui-icon-btn-s dz-only-mobile" title="Propiedades" aria-label="Propiedades" onClick={() => setPane('props')}><Icon name="settings" size={14} /></button>
                                <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" title="Eliminar (Supr)" aria-label="Eliminar" onClick={(e) => { e.stopPropagation(); removeSel(); }}><Icon name="delete" size={14} /></button>
                              </span>
                            )}
                          </div>
                          <LiveComponent type={cell.type} props={cell.props} source={src} srcId={cell.source} semantic={semantic} palette={paletteArg} designer data={data} />
                          {isSel && <span className="dz-resize dz-resize-x" role="separator" aria-label="Arrastra para cambiar el ancho" onPointerDown={(e) => startResize(e, cell, 'x')} />}
                          {isSel && <span className="dz-resize dz-resize-y" role="separator" aria-label="Arrastra para cambiar el alto" onPointerDown={(e) => startResize(e, cell, 'y')} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {pm.rows.length > 0 && newRowZone(pm.rows.length)}
            </div>
          </div>
        </div>
      </section>

      <aside className="dz-props ui-card" aria-label="Propiedades">
        <PropertyPanel
          model={model}
          cells={selCells}
          dataSources={dataSources}
          onModel={commitModel}
          semantic={semantic}
          reports={reports}
          onCell={(patch) => commit(ops.updateCell(pm, primary, patch))}
          onCells={(patch, map) => {
            if (!map) return commit(ops.updateCells(pm, selection, patch));
            let m = pm;
            for (const c of selCells) m = ops.updateCell(m, c.id, map(c));
            commit(m);
          }}
          onRemove={removeSel}
          onDuplicate={duplicate}
          onArrange={() => commit(ops.arrangeInRow(pm, selection))}
        />
        {issues.length > 0 && (
          <div className="ui-msg ui-msg-warn pp-issues">
            <b>Avisos</b>
            <ul>{issues.map((i, k) => <li key={k}><button type="button" className="ui-link" onClick={() => setSelection([i.cellId])}>{i.msg}</button></li>)}</ul>
          </div>
        )}
      </aside>
    </div>
  );
}
