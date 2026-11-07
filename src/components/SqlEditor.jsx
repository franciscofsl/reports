import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { sql, StandardSQL } from '@codemirror/lang-sql';
import { getSchema } from '../lib/sqlEngine.js';

const theme = EditorView.theme({
  '&': { fontSize: '13px', border: '1px solid var(--rpt-stroke)', borderBottomColor: 'var(--rpt-fg-3)', borderRadius: '4px', background: 'var(--rpt-surface)', color: 'var(--rpt-fg)' },
  '&.cm-focused': { outline: 'none', borderBottom: '2px solid var(--rpt-brand)' },
  '.cm-content': { fontFamily: 'ui-monospace, "Cascadia Code", Consolas, Menlo, monospace', caretColor: 'var(--rpt-fg)' },
  '.cm-gutters': { background: 'var(--rpt-surface-2)', color: 'var(--rpt-fg-3)', border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { background: 'color-mix(in srgb, var(--rpt-brand) 6%, transparent)' },
  '.cm-tooltip': { background: 'var(--rpt-surface)', color: 'var(--rpt-fg)', border: '1px solid var(--rpt-stroke)', borderRadius: '4px' },
  '.cm-tooltip-autocomplete ul li[aria-selected]': { background: 'var(--rpt-brand)', color: '#fff' },
  '.cm-scroller': { minHeight: 'var(--sql-min-h, 160px)' },
});

/** Editor SQL con resaltado y autocompletado de tablas, columnas y orígenes (origen.<id>). */
const SqlEditor = forwardRef(function SqlEditor({ value, onChange, onRun, readOnly = false, origins = [], minHeight = 160, ariaLabel = 'Consulta SQL' }, ref) {
  const host = useRef(null);
  const view = useRef(null);
  const cb = useRef({ onChange, onRun });
  cb.current = { onChange, onRun };
  const langConf = useRef(new Compartment());
  const roConf = useRef(new Compartment());

  const schemaFor = (orig) => {
    const s = {};
    for (const t of getSchema()) s[t.name] = t.columns.map((c) => c.name);
    const o = {};
    for (const d of orig) o[d.id] = (d.fields || []).map((f) => f.name);
    if (orig.length) s.origen = o;
    return s;
  };

  useEffect(() => {
    const state = EditorState.create({
      doc: value || '',
      extensions: [
        basicSetup,
        keymap.of([{ key: 'Mod-Enter', run: () => { cb.current.onRun?.(); return true; } }]),
        langConf.current.of(sql({ dialect: StandardSQL, schema: schemaFor(origins), upperCaseKeywords: true })),
        roConf.current.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
        theme,
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
        EditorView.updateListener.of((u) => { if (u.docChanged) cb.current.onChange?.(u.state.doc.toString()); }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current });
    return () => view.current.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = view.current;
    if (v && value !== v.state.doc.toString()) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value || '' } });
  }, [value]);

  const originsKey = origins.map((o) => `${o.id}:${(o.fields || []).length}`).join('|');
  useEffect(() => {
    view.current?.dispatch({ effects: langConf.current.reconfigure(sql({ dialect: StandardSQL, schema: schemaFor(origins), upperCaseKeywords: true })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originsKey]);
  useEffect(() => {
    view.current?.dispatch({ effects: roConf.current.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]) });
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    insert(text) {
      const v = view.current;
      if (!v) return;
      const { from, to } = v.state.selection.main;
      v.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
      v.focus();
    },
    focus() { view.current?.focus(); },
  }));

  return <div ref={host} className="sql-editor" style={{ '--sql-min-h': `${minHeight}px` }} />;
});

export default SqlEditor;
