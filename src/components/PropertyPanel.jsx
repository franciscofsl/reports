import { autoBind, byType, SPANS } from '../lib/catalog.js';
import Icon from './Icon.jsx';

function FieldSelect({ fields, value, onChange, optional, id }) {
  return (
    <select id={id} className="ui-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{optional ? '(ninguno)' : 'Elegir campo…'}</option>
      {fields.map((f) => <option key={f.name} value={f.name}>{f.label || f.name} · {f.type}</option>)}
    </select>
  );
}

function FieldsPicker({ fields, value = [], onChange, numeric }) {
  const list = numeric ? fields.filter((f) => f.type === 'number') : fields;
  const toggle = (name) => onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  const move = (name, d) => {
    const i = value.indexOf(name);
    const j = i + d;
    if (i < 0 || j < 0 || j >= value.length) return;
    const v = [...value];
    [v[i], v[j]] = [v[j], v[i]];
    onChange(v);
  };
  if (!list.length) return <p className="ui-hint">El origen no tiene campos{numeric ? ' numéricos' : ''}. Ejecuta la consulta en «Orígenes de datos».</p>;
  const ordered = [...value.filter((v) => list.some((f) => f.name === v)).map((v) => list.find((f) => f.name === v)), ...list.filter((f) => !value.includes(f.name))];
  return (
    <ul className="pp-fields">
      {ordered.map((f) => {
        const on = value.includes(f.name);
        return (
          <li key={f.name}>
            <label><input type="checkbox" checked={on} onChange={() => toggle(f.name)} /> {f.label || f.name} <small>{f.type}</small></label>
            {on && value.length > 1 && (
              <span className="pp-order">
                <button type="button" className="ui-icon-btn ui-icon-btn-s" onClick={() => move(f.name, -1)} aria-label={`Subir ${f.name}`}><Icon name="up" size={14} /></button>
                <button type="button" className="ui-icon-btn ui-icon-btn-s" onClick={() => move(f.name, 1)} aria-label={`Bajar ${f.name}`}><Icon name="down" size={14} /></button>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function PropertyPanel({ model, cell, dataSources, onModel, onCell, onRemove, onDuplicate }) {
  if (!cell) {
    return (
      <div className="pp">
        <h3 className="pp-title"><Icon name="report" />Informe</h3>
        <label className="ui-field"><span>Título</span><input className="ui-input" value={model.title || ''} onChange={(e) => onModel({ ...model, title: e.target.value })} /></label>
        <label className="ui-field"><span>Subtítulo</span><input className="ui-input" value={model.subtitle || ''} onChange={(e) => onModel({ ...model, subtitle: e.target.value })} /></label>
        <label className="ui-field"><span>Versión de la librería</span><input className="ui-input" value={model.libVersion} readOnly /></label>
        <p className="ui-hint">Selecciona un componente del lienzo para editar sus propiedades y vincularlo a un origen de datos. Arrastra componentes desde la paleta o tócalos para añadirlos.</p>
        <p className="ui-hint">Atajos: <kbd>Supr</kbd> elimina, <kbd>Ctrl+Z</kbd> deshace, <kbd>Ctrl+Y</kbd> rehace.</p>
      </div>
    );
  }
  const def = byType[cell.type];
  const ds = dataSources.find((d) => d.id === cell.source);
  const fields = ds?.fields || [];
  const setProp = (key, value) => onCell({ props: { ...cell.props, [key]: value } });

  return (
    <div className="pp">
      <div className="pp-head">
        <h3 className="pp-title"><Icon path={def.icon} />{def.label}</h3>
        <span>
          <button type="button" className="ui-icon-btn" title="Duplicar" onClick={onDuplicate}><Icon name="copy" /></button>
          <button type="button" className="ui-icon-btn ui-danger" title="Eliminar" onClick={onRemove}><Icon name="delete" /></button>
        </span>
      </div>

      <div className="ui-field">
        <span>Ancho</span>
        <div className="ui-seg" role="radiogroup" aria-label="Ancho">
          {SPANS.map((s) => (
            <button key={s.value} type="button" role="radio" aria-checked={cell.span === s.value} className={cell.span === s.value ? 'is-on' : ''} onClick={() => onCell({ span: s.value })}>{s.label}</button>
          ))}
        </div>
      </div>

      {def.needsSource && (
        <label className="ui-field pp-source">
          <span><Icon name="db" size={14} /> Origen de datos</span>
          <select className="ui-input" value={cell.source || ''} onChange={(e) => {
            const next = { ...cell, source: e.target.value };
            onCell(autoBind(next, dataSources.find((d) => d.id === e.target.value)));
          }}>
            <option value="">Sin vincular…</option>
            {dataSources.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
          </select>
          {!dataSources.length && <small className="ui-error">Define antes un origen de datos.</small>}
        </label>
      )}

      {def.props.map((p) => {
        const id = `pp-${cell.id}-${p.key}`;
        const v = cell.props[p.key];
        if ((p.type === 'field' || p.type === 'fields') && def.needsSource && !ds) return null;
        if (p.type === 'bool') {
          return (
            <label key={p.key} className="ui-check">
              <input type="checkbox" checked={v !== false && v != null && !!v} onChange={(e) => setProp(p.key, e.target.checked)} /> {p.label}
            </label>
          );
        }
        return (
          <div key={p.key} className="ui-field">
            <label htmlFor={id}>{p.label}</label>
            {p.type === 'text' && <input id={id} className="ui-input" value={v || ''} onChange={(e) => setProp(p.key, e.target.value)} />}
            {p.type === 'textarea' && <textarea id={id} className="ui-input" rows={4} value={v || ''} onChange={(e) => setProp(p.key, e.target.value)} />}
            {p.type === 'number' && <input id={id} className="ui-input" type="number" value={v ?? ''} onChange={(e) => setProp(p.key, e.target.value === '' ? '' : Number(e.target.value))} />}
            {p.type === 'select' && (
              <select id={id} className="ui-input" value={v ?? ''} onChange={(e) => setProp(p.key, e.target.value)}>
                {p.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {p.type === 'field' && <FieldSelect id={id} fields={fields} value={v} optional={p.optional} onChange={(x) => setProp(p.key, x)} />}
            {p.type === 'fields' && <FieldsPicker fields={fields} value={v || []} numeric={p.numeric} onChange={(x) => setProp(p.key, x)} />}
          </div>
        );
      })}
    </div>
  );
}
