// Catálogo de componentes de la librería RptLib que ofrece el diseñador.
// Cada entrada declara sus propiedades para que el panel de propiedades se genere solo.

export const AGGREGATIONS = [
  { value: 'sum', label: 'Suma' },
  { value: 'avg', label: 'Media' },
  { value: 'count', label: 'Recuento' },
  { value: 'countDistinct', label: 'Recuento distinto' },
  { value: 'min', label: 'Mínimo' },
  { value: 'max', label: 'Máximo' },
  { value: 'first', label: 'Primero' },
];

const FORMAT_OPTS = [
  { value: '', label: 'Del campo' },
  { value: 'integer', label: 'Entero' },
  { value: 'number', label: 'Decimal' },
  { value: 'currency', label: 'Moneda' },
  { value: 'compact', label: 'Compacto' },
  { value: 'compactCurrency', label: 'Moneda compacta' },
  { value: 'percent', label: 'Porcentaje' },
];
const GOOD_WHEN = [{ value: 'higher', label: 'Mayor es mejor' }, { value: 'lower', label: 'Menor es mejor' }];
const opts = (list) => list.map((v) => ({ value: v, label: v }));

export const SPANS = [
  { value: 2, label: '1/6' },
  { value: 3, label: '1/4' },
  { value: 4, label: '1/3' },
  { value: 6, label: '1/2' },
  { value: 8, label: '2/3' },
  { value: 9, label: '3/4' },
  { value: 12, label: 'Todo' },
];

export const THEME_DEFAULTS = { brand: '#0f6cbd', palette: 'fluent', density: 'normal', mode: 'auto', logo: '' };
export const PALETTE_NAMES = [
  { value: 'fluent', label: 'Fluent (variada)' },
  { value: 'ocean', label: 'Océano (azules)' },
  { value: 'warm', label: 'Cálida' },
  { value: 'forest', label: 'Bosque (verdes)' },
  { value: 'mono', label: 'Monocromo' },
];

export const CATALOG = [
  {
    type: 'title', group: 'Texto', label: 'Título', description: 'Encabezado de sección', icon: 'M5 5h14M12 5v14', span: 12, needsSource: false,
    defaults: { text: 'Nueva sección', subtitle: '' },
    props: [
      { key: 'text', label: 'Texto', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'level', label: 'Nivel', type: 'select', options: [{ value: 'h2', label: 'Grande' }, { value: 'h3', label: 'Mediano' }] },
    ],
  },
  {
    type: 'text', group: 'Texto', label: 'Texto', description: 'Párrafo o nota', icon: 'M4 6h16M4 10h16M4 14h10M4 18h13', span: 12, needsSource: false,
    defaults: { content: 'Escribe aquí un comentario para el lector.', card: true },
    props: [
      { key: 'content', label: 'Contenido', type: 'textarea' },
      { key: 'card', label: 'Mostrar como tarjeta', type: 'bool' },
    ],
  },
  {
    type: 'filter', group: 'Interacción', label: 'Filtro', description: 'Desplegable, chips, búsqueda o rango', icon: 'M4 5h16l-6 8v6l-4-2v-4z', span: 3, needsSource: true,
    defaults: { mode: 'select' },
    props: [
      { key: 'field', label: 'Campo a filtrar', type: 'field' },
      { key: 'label', label: 'Etiqueta', type: 'text' },
      { key: 'mode', label: 'Tipo', type: 'select', options: [{ value: 'select', label: 'Desplegable' }, { value: 'multi', label: 'Chips (selección múltiple)' }, { value: 'search', label: 'Búsqueda de texto' }, { value: 'range', label: 'Rango (número/fecha)' }] },
      { key: 'placeholder', label: 'Texto de ayuda', type: 'text' },
    ],
    help: 'Filtra todos los componentes cuyos orígenes tengan un campo con el mismo nombre.',
  },
  {
    type: 'tile', group: 'Indicadores', label: 'Loseta', description: 'Valor destacado con icono y tendencia', icon: 'M4 5h16v14H4z M8 12h3', span: 3, needsSource: true,
    defaults: { title: 'Total', agg: 'sum', icon: 'chart', color: 'brand' },
    props: [
      { key: 'title', label: 'Etiqueta', type: 'text' },
      { key: 'field', label: 'Campo', type: 'field' },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'subtitle', label: 'Texto inferior', type: 'text' },
      { key: 'trendField', label: 'Tendencia por (sparkline)', type: 'field', optional: true },
      { key: 'goodWhen', label: 'Variación', type: 'select', options: GOOD_WHEN },
      { key: 'icon', label: 'Icono', type: 'select', options: [{ value: '', label: '(ninguno)' }, ...opts(['money', 'cart', 'people', 'box', 'chart', 'check', 'alert', 'clock', 'star', 'target'])] },
      { key: 'color', label: 'Color', type: 'select', options: opts(['brand', 'green', 'red', 'orange', 'purple', 'teal', 'pink', 'yellow']) },
    ],
  },
  {
    type: 'kpi', group: 'Indicadores', label: 'Indicador (KPI)', description: 'Valor frente a objetivo', icon: 'M4 18 9 12l4 3 7-9', span: 4, needsSource: true,
    defaults: { label: 'Indicador', agg: 'sum', goodWhen: 'higher' },
    props: [
      { key: 'label', label: 'Etiqueta', type: 'text' },
      { key: 'field', label: 'Campo', type: 'field' },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'target', label: 'Objetivo (valor fijo)', type: 'number' },
      { key: 'targetField', label: 'u objetivo desde campo', type: 'field', optional: true },
      { key: 'goodWhen', label: 'Es bueno cuando', type: 'select', options: GOOD_WHEN },
      { key: 'caption', label: 'Nota (sin objetivo)', type: 'text' },
    ],
  },
  {
    type: 'gauge', group: 'Indicadores', label: 'Gauge', description: 'Velocímetro con objetivo', icon: 'M4 16a8 8 0 0 1 16 0 M12 16l4-5', span: 4, needsSource: true,
    defaults: { title: 'Cumplimiento', agg: 'sum', goodWhen: 'higher' },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'field', label: 'Campo', type: 'field' },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'target', label: 'Objetivo', type: 'number' },
      { key: 'min', label: 'Mínimo', type: 'number' },
      { key: 'max', label: 'Máximo (vacío = automático)', type: 'number' },
      { key: 'goodWhen', label: 'Es bueno cuando', type: 'select', options: GOOD_WHEN },
    ],
  },
  {
    type: 'chart', group: 'Gráficos', label: 'Gráfico', description: 'Columnas, barras, líneas, área, donut, combinado', icon: 'M5 19V11M10 19V6M15 19v-5M20 19V9', span: 6, needsSource: true,
    defaults: { title: 'Gráfico', type: 'column', agg: 'sum', values: [] },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'type', label: 'Tipo', type: 'select', options: [
        { value: 'column', label: 'Columnas' }, { value: 'bar', label: 'Barras horizontales' }, { value: 'line', label: 'Líneas' },
        { value: 'area', label: 'Área' }, { value: 'combo', label: 'Combinado (barras + líneas)' }, { value: 'donut', label: 'Donut' }, { value: 'pie', label: 'Tarta' },
      ] },
      { key: 'category', label: 'Categoría (eje X / porciones)', type: 'field' },
      { key: 'values', label: 'Valores (series)', type: 'fields', numeric: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'sort', label: 'Orden', type: 'select', options: [{ value: '', label: 'Como viene' }, { value: 'desc', label: 'Valor desc.' }, { value: 'asc', label: 'Valor asc.' }, { value: 'label', label: 'Categoría' }] },
      { key: 'limit', label: 'Máx. categorías', type: 'number' },
      { key: 'stacked', label: 'Apilado (columnas)', type: 'bool' },
      { key: 'y2', label: 'Eje secundario para líneas (combinado)', type: 'bool' },
      { key: 'multicolor', label: 'Multicolor (barras)', type: 'bool' },
      { key: 'crossFilter', label: 'Clic filtra el informe', type: 'bool', default: true },
      { key: 'height', label: 'Alto del gráfico (px)', type: 'number' },
    ],
  },
  {
    type: 'scatter', group: 'Gráficos', label: 'Dispersión', description: 'Relación entre dos medidas', icon: 'M6 17h.01M10 12h.01M14 15h.01M17 8h.01M8 8h.01M4 20h16', span: 6, needsSource: true,
    defaults: { title: 'Dispersión' },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'x', label: 'Eje X', type: 'field', numeric: true },
      { key: 'y', label: 'Eje Y', type: 'field', numeric: true },
      { key: 'size', label: 'Tamaño del punto', type: 'field', numeric: true, optional: true },
      { key: 'color', label: 'Color por', type: 'field', optional: true },
      { key: 'label', label: 'Etiqueta (tooltip)', type: 'field', optional: true },
      { key: 'crossFilter', label: 'Clic filtra el informe', type: 'bool', default: true },
      { key: 'height', label: 'Alto del gráfico (px)', type: 'number' },
    ],
  },
  {
    type: 'grid', group: 'Datos', label: 'Tabla (grid)', description: 'Búsqueda, orden, paginación y formato condicional', icon: 'M4 5h16v14H4z M4 10h16 M4 15h16 M10 5v14', span: 12, needsSource: true,
    defaults: { title: 'Detalle', pageSize: 10, search: true, totals: false, columns: [] },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'columns', label: 'Columnas (vacío = todas)', type: 'fields' },
      { key: 'pageSize', label: 'Filas por página', type: 'number' },
      { key: 'sortBy', label: 'Ordenar por', type: 'field', optional: true },
      { key: 'sortDir', label: 'Dirección', type: 'select', options: [{ value: 'asc', label: 'Ascendente' }, { value: 'desc', label: 'Descendente' }] },
      { key: 'search', label: 'Caja de búsqueda', type: 'bool', default: true },
      { key: 'totals', label: 'Fila de totales', type: 'bool' },
      { key: 'filterField', label: 'Clic en fila filtra por', type: 'field', optional: true },
      { key: 'databars', label: 'Barras de datos en', type: 'fields', numeric: true },
      { key: 'rules', label: 'Formato condicional', type: 'rules' },
    ],
  },
  {
    type: 'pivot', group: 'Datos', label: 'Tabla dinámica', description: 'Filas × columnas con totales y mapa de calor', icon: 'M4 4h16v16H4z M4 9h16 M9 4v16', span: 6, needsSource: true,
    defaults: { title: 'Tabla dinámica', agg: 'sum', totals: true, heatmap: true },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'rows', label: 'Filas', type: 'field' },
      { key: 'cols', label: 'Columnas', type: 'field', optional: true },
      { key: 'value', label: 'Valor', type: 'field', numeric: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'totals', label: 'Totales', type: 'bool', default: true },
      { key: 'heatmap', label: 'Mapa de calor', type: 'bool' },
    ],
  },
];

export const byType = Object.fromEntries(CATALOG.map((c) => [c.type, c]));
export const RULE_OPS = ['>', '>=', '<', '<=', '=', '!=', 'contains'];
export const RULE_STYLES = [
  { value: 'good', label: 'Verde' }, { value: 'bad', label: 'Rojo' }, { value: 'warn', label: 'Naranja' },
  { value: 'brand', label: 'Marca' }, { value: 'bold', label: 'Negrita' }, { value: 'good-bg', label: 'Fondo verde' }, { value: 'bad-bg', label: 'Fondo rojo' },
];

let seq = 0;
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function newCell(type, sourceId) {
  const def = byType[type];
  return { id: uid('c'), span: def.span, type, source: def.needsSource ? sourceId || '' : '', props: structuredClone(def.defaults) };
}

const isId = (f) => /^id$|_id$/.test(f.name);

/** Rellena automáticamente campos razonables al vincular un origen y limpia los que ya no existen. */
export function autoBind(cell, ds) {
  if (!ds || !ds.fields?.length) return cell;
  const names = new Set(ds.fields.map((f) => f.name));
  const nums = ds.fields.filter((f) => f.type === 'number' && !isId(f));
  const cats = [...ds.fields.filter((f) => f.type === 'string'), ...ds.fields.filter((f) => f.type === 'date' || f.type === 'boolean')];
  const p = { ...cell.props };
  for (const k of ['field', 'category', 'targetField', 'sortBy', 'trendField', 'x', 'y', 'size', 'color', 'label', 'rows', 'cols', 'value', 'filterField']) if (p[k] && !names.has(p[k])) delete p[k];
  for (const k of ['values', 'columns', 'databars']) if (Array.isArray(p[k])) p[k] = p[k].filter((n) => names.has(n));
  if (Array.isArray(p.rules)) p.rules = p.rules.filter((r) => names.has(r.field));
  const lastNum = nums[nums.length - 1]?.name;
  if (['tile', 'kpi', 'gauge'].includes(cell.type) && !p.field && lastNum) p.field = lastNum;
  if (cell.type === 'chart') {
    if (!p.category && cats[0]) p.category = cats[0].name;
    if (!(p.values && p.values.length) && nums[0]) p.values = [nums[nums.length - 1].name];
  }
  if (cell.type === 'filter' && !p.field) p.field = (ds.fields.find((f) => f.type === 'string' && !isId(f)) || cats[0])?.name;
  if (cell.type === 'scatter') {
    if (!p.x && nums[0]) p.x = nums[0].name;
    if (!p.y && nums[1]) p.y = nums[1].name;
    if (!p.color && cats[0]) p.color = cats[0].name;
  }
  if (cell.type === 'pivot') {
    if (!p.rows && cats[0]) p.rows = cats[0].name;
    if (!p.cols && cats[1]) p.cols = cats[1].name;
    if (!p.value && lastNum) p.value = lastNum;
  }
  return { ...cell, props: p };
}
