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

export const SPANS = [
  { value: 3, label: '1/4' },
  { value: 4, label: '1/3' },
  { value: 6, label: '1/2' },
  { value: 8, label: '2/3' },
  { value: 9, label: '3/4' },
  { value: 12, label: 'Completo' },
];

export const CATALOG = [
  {
    type: 'title',
    group: 'Texto',
    label: 'Título',
    description: 'Encabezado de sección',
    icon: 'M5 5h14M12 5v14',
    span: 12,
    needsSource: false,
    defaults: { text: 'Nueva sección', subtitle: '' },
    props: [
      { key: 'text', label: 'Texto', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'level', label: 'Nivel', type: 'select', options: [{ value: 'h2', label: 'Grande' }, { value: 'h3', label: 'Mediano' }] },
    ],
  },
  {
    type: 'text',
    group: 'Texto',
    label: 'Texto',
    description: 'Párrafo o nota',
    icon: 'M4 6h16M4 10h16M4 14h10M4 18h13',
    span: 12,
    needsSource: false,
    defaults: { content: 'Escribe aquí un comentario para el lector.', card: true },
    props: [
      { key: 'content', label: 'Contenido', type: 'textarea' },
      { key: 'card', label: 'Mostrar como tarjeta', type: 'bool' },
    ],
  },
  {
    type: 'tile',
    group: 'Indicadores',
    label: 'Loseta',
    description: 'Valor destacado con icono',
    icon: 'M4 5h16v14H4z M8 12h3',
    span: 3,
    needsSource: true,
    defaults: { title: 'Total', agg: 'sum', icon: 'chart', color: 'brand' },
    props: [
      { key: 'title', label: 'Etiqueta', type: 'text' },
      { key: 'field', label: 'Campo', type: 'field' },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'subtitle', label: 'Texto inferior', type: 'text' },
      { key: 'icon', label: 'Icono', type: 'select', options: ['money', 'cart', 'people', 'box', 'chart', 'check', 'alert', 'clock', 'star'].map((v) => ({ value: v, label: v })) },
      { key: 'color', label: 'Color', type: 'select', options: ['brand', 'green', 'red', 'orange', 'purple', 'teal', 'pink', 'yellow'].map((v) => ({ value: v, label: v })) },
    ],
  },
  {
    type: 'kpi',
    group: 'Indicadores',
    label: 'Indicador (KPI)',
    description: 'Valor frente a objetivo',
    icon: 'M4 18 9 12l4 3 7-9',
    span: 4,
    needsSource: true,
    defaults: { label: 'Indicador', agg: 'sum', goodWhen: 'higher' },
    props: [
      { key: 'label', label: 'Etiqueta', type: 'text' },
      { key: 'field', label: 'Campo', type: 'field' },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'target', label: 'Objetivo (valor fijo)', type: 'number' },
      { key: 'targetField', label: 'u objetivo desde campo', type: 'field', optional: true },
      { key: 'goodWhen', label: 'Es bueno cuando', type: 'select', options: [{ value: 'higher', label: 'Mayor que objetivo' }, { value: 'lower', label: 'Menor que objetivo' }] },
      { key: 'caption', label: 'Nota (sin objetivo)', type: 'text' },
    ],
  },
  {
    type: 'chart',
    group: 'Gráficos',
    label: 'Gráfico',
    description: 'Columnas, barras, líneas, área, donut',
    icon: 'M5 19V11M10 19V6M15 19v-5M20 19V9',
    span: 6,
    needsSource: true,
    defaults: { title: 'Gráfico', type: 'column', agg: 'sum', values: [] },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'type', label: 'Tipo', type: 'select', options: [
        { value: 'column', label: 'Columnas' }, { value: 'bar', label: 'Barras horizontales' }, { value: 'line', label: 'Líneas' },
        { value: 'area', label: 'Área' }, { value: 'donut', label: 'Donut' }, { value: 'pie', label: 'Tarta' },
      ] },
      { key: 'category', label: 'Categoría (eje X / porciones)', type: 'field' },
      { key: 'values', label: 'Valores (series)', type: 'fields', numeric: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'sort', label: 'Orden', type: 'select', options: [{ value: '', label: 'Como viene' }, { value: 'desc', label: 'Valor desc.' }, { value: 'asc', label: 'Valor asc.' }, { value: 'label', label: 'Categoría' }] },
      { key: 'limit', label: 'Máx. categorías', type: 'number' },
      { key: 'stacked', label: 'Apilado (columnas)', type: 'bool' },
      { key: 'multicolor', label: 'Multicolor (barras)', type: 'bool' },
      { key: 'height', label: 'Alto (px)', type: 'number' },
    ],
  },
  {
    type: 'grid',
    group: 'Datos',
    label: 'Tabla (grid)',
    description: 'Tabla con búsqueda, orden y paginación',
    icon: 'M4 5h16v14H4z M4 10h16 M4 15h16 M10 5v14',
    span: 12,
    needsSource: true,
    defaults: { title: 'Detalle', pageSize: 10, search: true, totals: false, columns: [] },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'columns', label: 'Columnas (vacío = todas)', type: 'fields' },
      { key: 'pageSize', label: 'Filas por página', type: 'number' },
      { key: 'sortBy', label: 'Ordenar por', type: 'field', optional: true },
      { key: 'sortDir', label: 'Dirección', type: 'select', options: [{ value: 'asc', label: 'Ascendente' }, { value: 'desc', label: 'Descendente' }] },
      { key: 'search', label: 'Caja de búsqueda', type: 'bool' },
      { key: 'totals', label: 'Fila de totales', type: 'bool' },
    ],
  },
];

export const byType = Object.fromEntries(CATALOG.map((c) => [c.type, c]));

let seq = 0;
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function newCell(type, sourceId) {
  const def = byType[type];
  return {
    id: uid('c'),
    span: def.span,
    type,
    source: def.needsSource ? sourceId || '' : '',
    props: structuredClone(def.defaults),
  };
}

/** Rellena automáticamente campos razonables al vincular un origen. */
export function autoBind(cell, ds) {
  if (!ds || !ds.fields?.length) return cell;
  const names = new Set(ds.fields.map((f) => f.name));
  const nums = ds.fields.filter((f) => f.type === 'number' && !/^id$|_id$/.test(f.name));
  const cats = [...ds.fields.filter((f) => f.type === 'string'), ...ds.fields.filter((f) => f.type === 'date' || f.type === 'boolean')];
  const p = { ...cell.props };
  // Quita referencias a campos que no existen en el nuevo origen.
  for (const k of ['field', 'category', 'targetField', 'sortBy']) if (p[k] && !names.has(p[k])) delete p[k];
  for (const k of ['values', 'columns']) if (Array.isArray(p[k])) p[k] = p[k].filter((n) => names.has(n));
  if ((cell.type === 'tile' || cell.type === 'kpi') && !p.field && nums[0]) p.field = nums[nums.length - 1].name;
  if (cell.type === 'chart') {
    if (!p.category && cats[0]) p.category = cats[0].name;
    if (!(p.values && p.values.length) && nums[0]) p.values = [nums[0].name];
  }
  return { ...cell, props: p };
}
