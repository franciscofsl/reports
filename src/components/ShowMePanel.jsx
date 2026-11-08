import { useMemo, useState } from 'react';
import { byType } from '../lib/catalog.js';
import { suggestVisuals } from '../lib/showMe.js';
import { fieldOptions } from './PropertyPanel.jsx';
import Icon from './Icon.jsx';
import LiveComponent from './LiveComponent.jsx';

/** «Show Me»: elige campos y el sistema sugiere el visual más adecuado, con vista previa. */
export default function ShowMePanel({ dataSources, data, semantic, onAdd, palette }) {
  const [open, setOpen] = useState(false);
  const [srcId, setSrcId] = useState(dataSources[0]?.id || '');
  const [picked, setPicked] = useState([]);
  const ds = dataSources.find((d) => d.id === srcId) || dataSources[0];
  const { base, ms } = fieldOptions(ds, semantic, { measures: true });
  const source = ds ? data.sources[ds.id] : null;
  const suggestions = useMemo(() => {
    if (!ds || !picked.length) return [];
    const fs = picked.map((n) => [...base, ...ms].find((f) => f.name === n)).filter(Boolean);
    return suggestVisuals(fs, source?.rows || []);
  }, [ds, picked, base, ms, source]);
  if (!dataSources.length) return null;
  const toggle = (n) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  return (
    <div className="showme">
      <button type="button" className="ui-btn ui-btn-block" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="search" size={16} />Sugerir visual (Show Me)</button>
      {open && (
        <div className="showme-body">
          <label className="ui-field"><span>Origen</span>
            <select className="ui-input" value={ds?.id || ''} onChange={(e) => { setSrcId(e.target.value); setPicked([]); }}>
              {dataSources.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <p className="ui-hint">Marca los campos o medidas que quieres ver:</p>
          <ul className="pp-fields showme-fields">
            {[...base, ...ms].map((f) => (
              <li key={f.name}><label><input type="checkbox" checked={picked.includes(f.name)} onChange={() => toggle(f.name)} /> {f.measure ? 'ƒ ' : ''}{f.label || f.name} <small>{f.type}</small></label></li>
            ))}
          </ul>
          {picked.length > 0 && !suggestions.length && <p className="ui-hint">No hay sugerencias para esta combinación.</p>}
          <ol className="showme-list">
            {suggestions.map((sg, i) => (
              <li key={`${sg.type}-${i}`} className="showme-item">
                <div className="showme-head"><b>{byType[sg.type]?.label}{sg.props.type ? ` · ${sg.props.type}` : ''}</b>{i === 0 && <span className="ui-badge ui-badge-brand">Recomendado</span>}</div>
                <small>{sg.reason}</small>
                <div className="showme-preview" aria-hidden="true"><LiveComponent type={sg.type} props={{ ...sg.props, height: 120, title: '' }} source={source} srcId={ds.id} semantic={semantic} palette={palette} designer /></div>
                <button type="button" className="ui-btn ui-btn-subtle" onClick={() => onAdd({ ...sg, source: ds.id })}><Icon name="add" size={14} />Añadir al lienzo</button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
