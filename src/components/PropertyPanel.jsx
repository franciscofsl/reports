import { PALETTE_NAMES, RULE_OPS, RULE_STYLES, SPANS, THEME_DEFAULTS, autoBind, byType } from '../lib/catalog.js';
import { LIB_VERSIONS } from '../lib/htmlGenerator.js';
import Icon from './Icon.jsx';

function FieldSelect({ fields, value, onChange, optional, numeric, id }) {
  const list = numeric ? fields.filter((f) => f.type === 'number') : fields;
  return (
    <select id={id} className="ui-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{optional ? '(ninguno)' : 'Elegir campo…'}</option>
      {list.map((f) => <option key={f.name} value={f.name}>{f.label || f.name} · {f.type}</option>)}
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

function RulesEditor({ fields, value = [], onChange }) {
  const upd = (i, patch) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="pp-rules">
      {value.map((r, i) => (
        <div key={i} className="pp-rule">
          <select className="ui-input" aria-label="Campo" value={r.field} onChange={(e) => upd(i, { field: e.target.value })}>
            {fields.map((f) => <option key={f.name} value={f.name}>{f.label || f.name}</option>)}
          </select>
          <select className="ui-input" aria-label="Condición" value={r.op} onChange={(e) => upd(i, { op: e.target.value })}>
            {RULE_OPS.map((o) => <option key={o} value={o}>{o === 'contains' ? 'contiene' : o}</option>)}
          </select>
          <input className="ui-input" aria-label="Valor" value={r.value ?? ''} onChange={(e) => upd(i, { value: e.target.value })} />
          <select className="ui-input" aria-label="Estilo" value={r.style} onChange={(e) => upd(i, { style: e.target.value })}>
            {RULE_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" aria-label="Quitar regla" onClick={() => onChange(value.filter((_, j) => j !== i))}><Icon name="delete" size={14} /></button>
        </div>
      ))}
      <button type="button" className="ui-btn ui-btn-subtle" disabled={!fields.length} onClick={() => onChange([...value, { field: (fields.find((f) => f.type === 'number') || fields[0]).name, op: '>', value: '', style: 'good' }])}>
        <Icon name="add" size={16} />Añadir regla
      </button>
    </div>
  );
}

function SpanPicker({ value, onChange }) {
  return (
    <div className="ui-field">
      <span>Ancho</span>
      <div className="ui-seg" role="radiogroup" aria-label="Ancho">
        {SPANS.map((s) => (
          <button key={s.value} type="button" role="radio" aria-checked={value === s.value} className={value === s.value ? 'is-on' : ''} onClick={() => onChange(s.value)}>{s.label}</button>
        ))}
      </div>
    </div>
  );
}

function ReportPanel({ model, onModel }) {
  const theme = { ...THEME_DEFAULTS, ...(model.theme || {}) };
  const setTheme = (patch) => onModel({ ...model, theme: { ...theme, ...patch } });
  const palettes = window.RptLib?.palettes || {};
  return (
    <div className="pp">
      <h3 className="pp-title"><Icon name="report" />Informe</h3>
      <label className="ui-field"><span>Título</span><input className="ui-input" value={model.title || ''} onChange={(e) => onModel({ ...model, title: e.target.value })} /></label>
      <label className="ui-field"><span>Subtítulo</span><input className="ui-input" value={model.subtitle || ''} onChange={(e) => onModel({ ...model, subtitle: e.target.value })} /></label>

      <h4>Tema</h4>
      <div className="ui-field">
        <label htmlFor="pp-brand">Color de marca</label>
        <span className="ui-inline">
          <input id="pp-brand" type="color" className="pp-color" value={theme.brand} onChange={(e) => setTheme({ brand: e.target.value })} />
          <input className="ui-input" aria-label="Color de marca (hex)" value={theme.brand} onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && setTheme({ brand: e.target.value })} />
        </span>
      </div>
      <div className="ui-field">
        <span>Paleta de gráficos</span>
        <div className="pp-palettes" role="radiogroup" aria-label="Paleta de gráficos">
          {PALETTE_NAMES.map((p) => (
            <button key={p.value} type="button" role="radio" aria-checked={theme.palette === p.value} className={`pp-palette ${theme.palette === p.value ? 'is-on' : ''}`} onClick={() => setTheme({ palette: p.value })} title={p.label}>
              <span className="pp-swatches">{(palettes[p.value] || []).slice(0, 5).map((c) => <i key={c} style={{ background: c }} />)}</span>
              <small>{p.label}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="ui-grid-2">
        <label className="ui-field"><span>Densidad</span>
          <select className="ui-input" value={theme.density} onChange={(e) => setTheme({ density: e.target.value })}>
            <option value="compact">Compacta</option><option value="normal">Normal</option><option value="comfortable">Amplia</option>
          </select>
        </label>
        <label className="ui-field"><span>Modo</span>
          <select className="ui-input" value={theme.mode} onChange={(e) => setTheme({ mode: e.target.value })}>
            <option value="auto">Según el sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option>
          </select>
        </label>
      </div>
      <label className="ui-field"><span>Logotipo (URL https o data:image)</span><input className="ui-input" placeholder="https://…/logo.svg" value={theme.logo} onChange={(e) => setTheme({ logo: e.target.value })} /></label>

      <h4>Librería</h4>
      <label className="ui-field"><span>Versión de RptLib</span>
        <select className="ui-input" value={model.libVersion} onChange={(e) => onModel({ ...model, libVersion: e.target.value })}>
          {LIB_VERSIONS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
        {model.libVersion !== LIB_VERSIONS[0].value && <small className="ui-hint">Este informe usa una versión anterior: filtros, menús y componentes nuevos no funcionarán al publicarlo.</small>}
      </label>
      <p className="ui-hint">Selecciona un componente para editarlo. <kbd>Mayús</kbd>/<kbd>Ctrl</kbd>+clic selecciona varios. Atajos: <kbd>Supr</kbd>, <kbd>Ctrl+C</kbd>/<kbd>V</kbd>/<kbd>D</kbd>, <kbd>Ctrl+Z</kbd>/<kbd>Y</kbd>, <kbd>Ctrl+A</kbd>.</p>
    </div>
  );
}

export default function PropertyPanel({ model, cells, dataSources, onModel, onCell, onCells, onRemove, onDuplicate, onArrange }) {
  if (!cells.length) return <ReportPanel model={model} onModel={onModel} />;

  if (cells.length > 1) {
    const span = cells.every((c) => c.span === cells[0].span) ? cells[0].span : null;
    return (
      <div className="pp">
        <div className="pp-head">
          <h3 className="pp-title"><Icon name="layout" />{cells.length} componentes</h3>
          <span>
            <button type="button" className="ui-icon-btn" title="Duplicar" onClick={onDuplicate}><Icon name="copy" /></button>
            <button type="button" className="ui-icon-btn ui-danger" title="Eliminar" onClick={onRemove}><Icon name="delete" /></button>
          </span>
        </div>
        <SpanPicker value={span} onChange={(s) => onCells({ span: s })} />
        <label className="ui-field"><span>Alto mínimo (px)</span><input className="ui-input" type="number" min="0" placeholder="Automático" onChange={(e) => onCells({ height: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
        <button type="button" className="ui-btn ui-btn-block" onClick={onArrange}><Icon name="layout" size={16} />Colocar en una fila con el mismo ancho</button>
        {(() => {
          const common = cells.every((c) => byType[c.type]?.needsSource);
          if (!common) return null;
          return (
            <label className="ui-field pp-source"><span><Icon name="db" size={14} /> Cambiar origen de todos</span>
              <select className="ui-input" value="" onChange={(e) => e.target.value && onCells({ source: e.target.value }, (c) => autoBind({ ...c, source: e.target.value }, dataSources.find((d) => d.id === e.target.value)))}>
                <option value="">Elegir…</option>
                {dataSources.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
              </select>
            </label>
          );
        })()}
        <ul className="pp-multi">{cells.map((c) => <li key={c.id}>{byType[c.type]?.label} <small>{c.props.title || c.props.label || c.props.text || ''}</small></li>)}</ul>
      </div>
    );
  }

  const cell = cells[0];
  const def = byType[cell.type];
  const ds = dataSources.find((d) => d.id === cell.source);
  const fields = ds?.fields || [];
  const setProp = (key, value) => onCell({ props: { ...cell.props, [key]: value } });

  return (
    <div className="pp">
      <div className="pp-head">
        <h3 className="pp-title"><Icon path={def.icon} />{def.label}</h3>
        <span>
          <button type="button" className="ui-icon-btn" title="Duplicar (Ctrl+D)" onClick={onDuplicate}><Icon name="copy" /></button>
          <button type="button" className="ui-icon-btn ui-danger" title="Eliminar (Supr)" onClick={onRemove}><Icon name="delete" /></button>
        </span>
      </div>
      {def.help && <p className="ui-hint">{def.help}</p>}

      <SpanPicker value={cell.span} onChange={(s) => onCell({ span: s })} />
      <label className="ui-field"><span>Alto mínimo (px)</span>
        <input className="ui-input" type="number" min="0" placeholder="Automático (o arrastra el borde inferior)" value={cell.height ?? ''} onChange={(e) => onCell({ height: e.target.value === '' ? undefined : Number(e.target.value) })} />
      </label>

      {def.needsSource && (
        <label className="ui-field pp-source">
          <span><Icon name="db" size={14} /> Origen de datos</span>
          <select className="ui-input" value={cell.source || ''} onChange={(e) => onCell(autoBind({ ...cell, source: e.target.value }, dataSources.find((d) => d.id === e.target.value)))}>
            <option value="">Sin vincular…</option>
            {dataSources.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
          </select>
          {!dataSources.length && <small className="ui-error">Define antes un origen de datos.</small>}
        </label>
      )}

      {def.props.map((p) => {
        const id = `pp-${cell.id}-${p.key}`;
        const v = cell.props[p.key];
        if (['field', 'fields', 'rules'].includes(p.type) && def.needsSource && !ds) return null;
        if (p.type === 'bool') {
          const checked = v === undefined ? !!p.default : !!v;
          return (
            <label key={p.key} className="ui-check">
              <input type="checkbox" checked={checked} onChange={(e) => setProp(p.key, e.target.checked)} /> {p.label}
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
            {p.type === 'field' && <FieldSelect id={id} fields={fields} value={v} optional={p.optional} numeric={p.numeric} onChange={(x) => setProp(p.key, x)} />}
            {p.type === 'fields' && <FieldsPicker fields={fields} value={v || []} numeric={p.numeric} onChange={(x) => setProp(p.key, x)} />}
            {p.type === 'rules' && <RulesEditor fields={fields} value={v || []} onChange={(x) => setProp(p.key, x)} />}
          </div>
        );
      })}
    </div>
  );
}
