import { useMemo } from 'react';
import { DATE_PRESETS, defaultParamValue, paramOptions } from '../lib/sqlEngine.js';

/** Controles para que el lector cambie los parámetros del informe. */
export default function ParamsBar({ params = [], values, onChange }) {
  const options = useMemo(() => Object.fromEntries(params.filter((p) => p.type === 'list').map((p) => [p.name, paramOptions(p)])), [params]);
  if (!params.length) return null;
  const set = (name, v) => onChange({ ...values, [name]: v });
  return params.map((p) => {
    const v = values[p.name] ?? defaultParamValue(p);
    const id = `param-${p.name}`;
    if (p.type === 'daterange') {
      const r = typeof v === 'object' && v ? v : defaultParamValue(p);
      return (
        <div key={p.name} className="ui-field ui-field-inline ui-param-range">
          <label htmlFor={id}>{p.label || p.name}</label>
          <select id={id} className="ui-input" value={r.preset || 'personalizado'} onChange={(e) => set(p.name, { ...r, preset: e.target.value })}>
            {DATE_PRESETS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          {r.preset === 'personalizado' && (
            <>
              <input className="ui-input" type="date" aria-label="Desde" value={r.from || ''} onChange={(e) => set(p.name, { ...r, from: e.target.value })} />
              <input className="ui-input" type="date" aria-label="Hasta" value={r.to || ''} onChange={(e) => set(p.name, { ...r, to: e.target.value })} />
            </>
          )}
        </div>
      );
    }
    if (p.type === 'list') {
      return (
        <label key={p.name} className="ui-field ui-field-inline">
          <span>{p.label || p.name}</span>
          <select id={id} className="ui-input" value={v ?? ''} onChange={(e) => set(p.name, e.target.value)}>
            {p.allowAll !== false && <option value="">(Todos)</option>}
            {(options[p.name] || []).map((o) => <option key={String(o)} value={o}>{String(o)}</option>)}
          </select>
        </label>
      );
    }
    return (
      <label key={p.name} className="ui-field ui-field-inline">
        <span>{p.label || p.name}</span>
        <input className="ui-input" type={p.type === 'number' ? 'number' : p.type === 'date' ? 'date' : 'text'} value={v ?? ''} onChange={(e) => set(p.name, e.target.value)} />
      </label>
    );
  });
}
