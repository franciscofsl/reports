import { useRef, useState } from 'react';
import { PALETTE_NAMES, REF_TYPES, RULE_OPS, RULE_STYLES, SPANS, THEME_DEFAULTS, autoBind, byType } from '../lib/catalog.js';
import { LIB_VERSIONS } from '../lib/htmlGenerator.js';
import { exportTheme, parseTheme } from '../lib/themes.js';
import Icon from './Icon.jsx';

/** Campos de un origen + medidas y jerarquías del modelo semántico. */
export function fieldOptions(ds, semantic, { numeric, measures, hierarchies } = {}) {
  const base = (ds?.fields || []).filter((f) => !numeric || f.type === 'number');
  const ms = measures ? (semantic?.measures || []).filter((m) => !m.source || m.source === ds?.id).map((m) => ({ name: `m:${m.name}`, label: m.label || m.name, type: 'medida', measure: true })) : [];
  const hs = hierarchies ? (semantic?.hierarchies || []).filter((h) => !h.source || h.source === ds?.id).map((h) => ({ name: `h:${h.name}`, label: h.label || h.name, type: 'jerarquía', hierarchy: true })) : [];
  return { base, ms, hs, all: [...base, ...ms, ...hs] };
}

function FieldSelect({ ds, semantic, value, onChange, prop, id }) {
  const { base, ms, hs } = fieldOptions(ds, semantic, prop);
  return (
    <select id={id} className="ui-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{prop.optional ? '(ninguno)' : 'Elegir…'}</option>
      <optgroup label="Campos">{base.map((f) => <option key={f.name} value={f.name}>{f.label || f.name} · {f.type}</option>)}</optgroup>
      {ms.length > 0 && <optgroup label="Medidas">{ms.map((f) => <option key={f.name} value={f.name}>ƒ {f.label}</option>)}</optgroup>}
      {hs.length > 0 && <optgroup label="Jerarquías (profundizar)">{hs.map((f) => <option key={f.name} value={f.name}>⇣ {f.label}</option>)}</optgroup>}
    </select>
  );
}

function FieldsPicker({ ds, semantic, value = [], onChange, prop }) {
  const { all: list } = fieldOptions(ds, semantic, { numeric: prop.numeric, measures: prop.measures });
  const toggle = (name) => {
    if (value.includes(name)) return onChange(value.filter((v) => v !== name));
    onChange(prop.max && value.length >= prop.max ? [...value.slice(1), name] : [...value, name]);
  };
  const move = (name, d) => {
    const i = value.indexOf(name);
    const j = i + d;
    if (i < 0 || j < 0 || j >= value.length) return;
    const v = [...value];
    [v[i], v[j]] = [v[j], v[i]];
    onChange(v);
  };
  if (!list.length) return <p className="ui-hint">El origen no tiene campos{prop.numeric ? ' numéricos' : ''}. Ejecuta la consulta en «Orígenes de datos».</p>;
  const ordered = [...value.filter((v) => list.some((f) => f.name === v)).map((v) => list.find((f) => f.name === v)), ...list.filter((f) => !value.includes(f.name))];
  return (
    <ul className="pp-fields">
      {ordered.map((f) => {
        const on = value.includes(f.name);
        return (
          <li key={f.name}>
            <label><input type="checkbox" checked={on} onChange={() => toggle(f.name)} /> {f.measure ? 'ƒ ' : ''}{f.label || f.name} <small>{f.type}</small></label>
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
      <button type="button" className="ui-btn ui-btn-subtle" disabled={!fields.length} onClick={() => onChange([...value, { field: (fields.find((f) => f.type === 'number') || fields[0]).name, op: '>', value: '', style: 'dot-good' }])}>
        <Icon name="add" size={16} />Añadir regla
      </button>
    </div>
  );
}

function RefLinesEditor({ value = [], onChange }) {
  const upd = (i, patch) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="pp-rules">
      {value.map((r, i) => (
        <div key={i} className="pp-ref">
          <select className="ui-input" aria-label="Tipo de línea" value={r.type} onChange={(e) => upd(i, { type: e.target.value })}>
            {REF_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {r.type === 'target' && <input className="ui-input" type="number" aria-label="Valor objetivo" placeholder="Valor" value={r.value ?? ''} onChange={(e) => upd(i, { value: e.target.value })} />}
          <input className="ui-input" aria-label="Etiqueta de la línea" placeholder="Etiqueta" value={r.label || ''} onChange={(e) => upd(i, { label: e.target.value })} />
          <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" aria-label="Quitar línea" onClick={() => onChange(value.filter((_, j) => j !== i))}><Icon name="delete" size={14} /></button>
        </div>
      ))}
      <button type="button" className="ui-btn ui-btn-subtle" onClick={() => onChange([...value, { type: value.length ? 'target' : 'avg' }])}><Icon name="add" size={16} />Añadir línea</button>
    </div>
  );
}

function SparklinesEditor({ fields: ownFields, dataSources = [], ownId, value = [], onChange }) {
  const upd = (i, patch) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const fieldsFor = (s) => (s.source ? dataSources.find((d) => d.id === s.source)?.fields || [] : ownFields);
  const sel = (i, k, label, list) => (
    <select className="ui-input" aria-label={label} value={value[i][k] || ''} onChange={(e) => upd(i, { [k]: e.target.value })}>
      <option value="">{label}…</option>
      {list.map((f) => <option key={f.name} value={f.name}>{f.label || f.name}</option>)}
    </select>
  );
  return (
    <div className="pp-rules">
      {value.map((s, i) => (
        <div key={i} className="pp-rule">
          <select className="ui-input" aria-label="Origen de la serie" value={s.source || ''} onChange={(e) => upd(i, { source: e.target.value || undefined, time: '', value: '' })}>
            <option value="">Mismo origen</option>
            {dataSources.filter((d) => d.id !== ownId).map((d) => <option key={d.id} value={d.id}>Serie desde {d.id}</option>)}
          </select>
          {sel(i, 'key', 'Por cada', ownFields)}
          {sel(i, 'time', 'Eje de tiempo', fieldsFor(s))}
          {sel(i, 'value', 'Valor', fieldsFor(s).filter((f) => f.type === 'number'))}
          <input className="ui-input" aria-label="Título de la columna" placeholder="Título" value={s.label || ''} onChange={(e) => upd(i, { label: e.target.value })} />
          <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" aria-label="Quitar sparkline" onClick={() => onChange(value.filter((_, j) => j !== i))}><Icon name="delete" size={14} /></button>
        </div>
      ))}
      <button type="button" className="ui-btn ui-btn-subtle" disabled={!ownFields.length} onClick={() => onChange([...value, { key: ownFields.find((f) => f.type === 'string')?.name || '', time: ownFields.find((f) => /mes|fecha/.test(f.name))?.name || '', value: ownFields.filter((f) => f.type === 'number').pop()?.name || '', label: 'Tendencia', agg: 'sum' }])}>
        <Icon name="add" size={16} />Añadir columna de tendencia
      </button>
      <p className="ui-hint">Para cada fila dibuja la evolución del valor de las filas con el mismo «Por cada» (del mismo origen o de otro, enlazando por ese campo).</p>
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

function download(name, obj) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function ReportPanel({ model, onModel, dataSources }) {
  const theme = { ...THEME_DEFAULTS, ...(model.theme || {}) };
  const setTheme = (patch) => onModel({ ...model, theme: { ...theme, ...patch } });
  const palettes = window.RptLib?.palettes || {};
  const fileRef = useRef(null);
  const [msg, setMsg] = useState(null);
  const paper = model.paper || null;
  const setPaper = (patch) => onModel({ ...model, paper: { size: 'A4', orientation: 'portrait', margin: 15, pageNumbers: true, ...(paper || {}), ...patch } });
  const filters = model.reportFilters || [];
  const setFilters = (list) => onModel({ ...model, reportFilters: list });

  const importTheme = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const { theme: t, warnings } = parseTheme(await f.text());
      onModel({ ...model, theme: { ...theme, ...t } });
      setMsg({ ok: true, text: `Tema «${t.name}» aplicado.${warnings.length ? ` ${warnings.join(' ')}` : ''}` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  return (
    <div className="pp">
      <h3 className="pp-title"><Icon name="report" />Informe</h3>
      <label className="ui-field"><span>Título</span><input className="ui-input" value={model.title || ''} onChange={(e) => onModel({ ...model, title: e.target.value })} /></label>
      <label className="ui-field"><span>Subtítulo</span><input className="ui-input" value={model.subtitle || ''} onChange={(e) => onModel({ ...model, subtitle: e.target.value })} /></label>

      <h4>Filtros del informe</h4>
      <p className="ui-hint">Aparecen en el botón «Filtros» de la cabecera, sin ocupar sitio en el lienzo, y afectan a todas las páginas.</p>
      {filters.map((f, i) => {
        const ds = dataSources.find((d) => d.id === f.source);
        const upd = (patch) => setFilters(filters.map((x, j) => (j === i ? { ...x, ...patch } : x)));
        return (
          <div key={i} className="pp-rule">
            <select className="ui-input" aria-label="Origen del filtro" value={f.source} onChange={(e) => upd({ source: e.target.value, field: '' })}>
              {dataSources.map((d) => <option key={d.id} value={d.id}>{d.id}</option>)}
            </select>
            <select className="ui-input" aria-label="Campo del filtro" value={f.field} onChange={(e) => upd({ field: e.target.value, label: ds?.fields.find((x) => x.name === e.target.value)?.label || e.target.value })}>
              <option value="">Campo…</option>
              {(ds?.fields || []).map((x) => <option key={x.name} value={x.name}>{x.label || x.name}</option>)}
            </select>
            <select className="ui-input" aria-label="Tipo de filtro" value={f.mode || 'select'} onChange={(e) => upd({ mode: e.target.value })}>
              <option value="select">Desplegable</option><option value="multi">Chips</option><option value="search">Búsqueda</option><option value="range">Rango</option>
            </select>
            <select className="ui-input" aria-label="Parte de la fecha" value={f.part || ''} onChange={(e) => upd({ part: e.target.value || undefined })}>
              <option value="">Valor exacto</option><option value="year">Año</option><option value="quarter">Trimestre</option><option value="month">Mes</option>
            </select>
            <button type="button" className="ui-icon-btn ui-icon-btn-s ui-danger" aria-label="Quitar filtro del informe" onClick={() => setFilters(filters.filter((_, j) => j !== i))}><Icon name="delete" size={14} /></button>
          </div>
        );
      })}
      <button type="button" className="ui-btn ui-btn-subtle" disabled={!dataSources.length} onClick={() => setFilters([...filters, { source: dataSources[0].id, field: '', mode: 'select' }])}><Icon name="add" size={16} />Añadir filtro del informe</button>

      <h4>Tema</h4>
      <div className="ui-actions">
        <button type="button" className="ui-btn ui-btn-subtle" onClick={() => fileRef.current.click()}><Icon name="upload" size={16} />Importar JSON</button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importTheme} />
        <button type="button" className="ui-btn ui-btn-subtle" onClick={() => download('tema-informe.json', exportTheme(theme, palettes))}><Icon name="download" size={16} />Exportar</button>
      </div>
      <p className="ui-hint">Admite el formato propio y temas de Power BI (dataColors, tableAccent, background, textClasses).</p>
      {msg && <div className={`ui-msg ${msg.ok ? 'ui-msg-ok' : 'ui-msg-error'}`}>{msg.text}</div>}
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
          {PALETTE_NAMES.filter((p) => p.value !== 'custom' || theme.colors?.length).map((p) => (
            <button key={p.value} type="button" role="radio" aria-checked={theme.palette === p.value} className={`pp-palette ${theme.palette === p.value ? 'is-on' : ''}`} onClick={() => setTheme({ palette: p.value })} title={p.label}>
              <span className="pp-swatches">{(p.value === 'custom' ? theme.colors : palettes[p.value] || []).slice(0, 6).map((c) => <i key={c} style={{ background: c }} />)}</span>
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
      <label className="ui-field"><span>Fuente (CSS)</span><input className="ui-input" placeholder="p. ej. Segoe UI, sans-serif" value={theme.font || ''} onChange={(e) => setTheme({ font: e.target.value })} /></label>
      <label className="ui-field"><span>Logotipo (URL https o data:image)</span><input className="ui-input" placeholder="https://…/logo.svg" value={theme.logo} onChange={(e) => setTheme({ logo: e.target.value })} /></label>

      <h4>Diseño de página (imprimir / PDF / Word)</h4>
      <label className="ui-check"><input type="checkbox" checked={!!paper} onChange={(e) => onModel({ ...model, paper: e.target.checked ? { size: 'A4', orientation: 'portrait', margin: 15, pageNumbers: true, header: model.title || '', footer: '' } : null })} /> Definir página</label>
      {paper && (
        <>
          <div className="ui-grid-2">
            <label className="ui-field"><span>Tamaño</span>
              <select className="ui-input" value={paper.size} onChange={(e) => setPaper({ size: e.target.value })}><option value="A4">A4</option><option value="A3">A3</option><option value="Letter">Carta</option></select>
            </label>
            <label className="ui-field"><span>Orientación</span>
              <select className="ui-input" value={paper.orientation} onChange={(e) => setPaper({ orientation: e.target.value })}><option value="portrait">Vertical</option><option value="landscape">Horizontal</option></select>
            </label>
          </div>
          <label className="ui-field"><span>Márgenes (mm)</span><input className="ui-input" type="number" min="5" max="40" value={paper.margin} onChange={(e) => setPaper({ margin: Number(e.target.value) })} /></label>
          <label className="ui-field"><span>Encabezado</span><input className="ui-input" value={paper.header || ''} onChange={(e) => setPaper({ header: e.target.value })} /></label>
          <label className="ui-field"><span>Pie de página</span><input className="ui-input" value={paper.footer || ''} onChange={(e) => setPaper({ footer: e.target.value })} /></label>
          <label className="ui-check"><input type="checkbox" checked={paper.pageNumbers !== false} onChange={(e) => setPaper({ pageNumbers: e.target.checked })} /> Numerar páginas («Página X de Y»)</label>
          <label className="ui-check"><input type="checkbox" checked={!!paper.showDate} onChange={(e) => setPaper({ showDate: e.target.checked })} /> Fecha de impresión en la cabecera</label>
        </>
      )}

      <h4>Librería</h4>
      <label className="ui-field"><span>Versión de RptLib</span>
        <select className="ui-input" value={model.libVersion} onChange={(e) => onModel({ ...model, libVersion: e.target.value })}>
          {LIB_VERSIONS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
        {model.libVersion !== LIB_VERSIONS[0].value && <small className="ui-hint">Este informe usa una versión anterior: las funciones nuevas no funcionarán al publicarlo.</small>}
      </label>
      <p className="ui-hint">Selecciona un componente para editarlo. <kbd>Mayús</kbd>/<kbd>Ctrl</kbd>+clic selecciona varios. Atajos: <kbd>Supr</kbd>, <kbd>Ctrl+C</kbd>/<kbd>V</kbd>/<kbd>D</kbd>, <kbd>Ctrl+Z</kbd>/<kbd>Y</kbd>, <kbd>Ctrl+A</kbd>.</p>
    </div>
  );
}

export default function PropertyPanel({ model, cells, dataSources, semantic, reports = [], onModel, onCell, onCells, onRemove, onDuplicate, onArrange }) {
  if (!cells.length) return <ReportPanel model={model} onModel={onModel} dataSources={dataSources} />;

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
        {cells.every((c) => byType[c.type]?.needsSource) && (
          <label className="ui-field pp-source"><span><Icon name="db" size={14} /> Cambiar origen de todos</span>
            <select className="ui-input" value="" onChange={(e) => e.target.value && onCells({ source: e.target.value }, (c) => autoBind({ ...c, source: e.target.value }, dataSources.find((d) => d.id === e.target.value)))}>
              <option value="">Elegir…</option>
              {dataSources.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
            </select>
          </label>
        )}
        <ul className="pp-multi">{cells.map((c) => <li key={c.id}>{byType[c.type]?.label} <small>{c.props.title || c.props.label || c.props.text || ''}</small></li>)}</ul>
      </div>
    );
  }

  const cell = cells[0];
  const def = byType[cell.type];
  const ds = dataSources.find((d) => d.id === cell.source);
  const fields = ds?.fields || [];
  const setProp = (key, value) => onCell({ props: { ...cell.props, [key]: value } });
  let lastSection = null;

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
        if (p.when && !p.when(cell.props)) return null;
        const id = `pp-${cell.id}-${p.key}`;
        const v = cell.props[p.key];
        if (['field', 'fields', 'rules', 'sparklines'].includes(p.type) && def.needsSource && !ds) return null;
        const header = p.section && p.section !== lastSection ? <h4 key={`s-${p.section}`}>{p.section}</h4> : null;
        lastSection = p.section || lastSection;
        let control;
        if (p.type === 'bool') {
          const checked = v === undefined ? !!p.default : !!v;
          control = <label className="ui-check"><input type="checkbox" checked={checked} onChange={(e) => setProp(p.key, e.target.checked)} /> {p.label}</label>;
        } else {
          control = (
            <div className="ui-field">
              <label htmlFor={id}>{p.label}</label>
              {p.type === 'text' && <input id={id} className="ui-input" value={v || ''} onChange={(e) => setProp(p.key, e.target.value)} />}
              {p.type === 'textarea' && <textarea id={id} className="ui-input" rows={4} value={v || ''} onChange={(e) => setProp(p.key, e.target.value)} />}
              {p.type === 'number' && <input id={id} className="ui-input" type="number" value={v ?? ''} onChange={(e) => setProp(p.key, e.target.value === '' ? '' : Number(e.target.value))} />}
              {p.type === 'numlist' && <input id={id} className="ui-input" placeholder="60, 90" value={(v || []).join(', ')} onChange={(e) => setProp(p.key, e.target.value.split(/[,;\s]+/).map(Number).filter((n) => !isNaN(n) && n > 0))} />}
              {p.type === 'select' && (
                <select id={id} className="ui-input" value={v ?? ''} onChange={(e) => setProp(p.key, e.target.value)}>
                  {p.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              {p.type === 'report' && (
                <select id={id} className="ui-input" value={v || ''} onChange={(e) => setProp(p.key, e.target.value)}>
                  <option value="">Elegir informe…</option>
                  {reports.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              )}
              {p.type === 'field' && <FieldSelect id={id} ds={ds} semantic={semantic} value={v} prop={p} onChange={(x) => setProp(p.key, x)} />}
              {p.type === 'fields' && <FieldsPicker ds={ds} semantic={semantic} value={v || []} prop={p} onChange={(x) => setProp(p.key, x)} />}
              {p.type === 'rules' && <RulesEditor fields={fields} value={v || []} onChange={(x) => setProp(p.key, x)} />}
              {p.type === 'refLines' && <RefLinesEditor value={v || []} onChange={(x) => setProp(p.key, x)} />}
              {p.type === 'sparklines' && <SparklinesEditor fields={fields} dataSources={dataSources} ownId={ds?.id} value={v || []} onChange={(x) => setProp(p.key, x)} />}
            </div>
          );
        }
        return <div key={p.key}>{header}{control}</div>;
      })}
    </div>
  );
}
