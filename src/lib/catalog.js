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

export const THEME_DEFAULTS = { brand: '#0f6cbd', palette: 'fluent', density: 'normal', mode: 'auto', logo: '', colors: [], font: '', background: '' };
export const PALETTE_NAMES = [
  { value: 'fluent', label: 'Fluent (variada)' },
  { value: 'ocean', label: 'Océano (azules)' },
  { value: 'warm', label: 'Cálida' },
  { value: 'forest', label: 'Bosque (verdes)' },
  { value: 'mono', label: 'Monocromo' },
  { value: 'custom', label: 'Personalizada (tema JSON)' },
];

const COMPARE = [{ value: '', label: 'Sin comparación' }, { value: 'prev', label: 'vs periodo anterior' }, { value: 'yoy', label: 'vs mismo periodo del año anterior' }];
const GRAINS = [{ value: 'month', label: 'Mes' }, { value: 'quarter', label: 'Trimestre' }, { value: 'year', label: 'Año' }, { value: 'day', label: 'Día' }];
const hasCmp = (p) => !!p.compare;
const timeCompareProps = [
  { key: 'compare', label: 'Comparación temporal', type: 'select', options: COMPARE },
  { key: 'dateField', label: 'Campo de fecha', type: 'field', when: hasCmp },
  { key: 'grain', label: 'Periodo', type: 'select', options: GRAINS, when: hasCmp },
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
    type: 'narrative', group: 'Texto', label: 'Narrativa automática', description: 'Texto que se escribe solo con los datos', icon: 'M4 6h10M4 10h16M4 14h12M4 18h8 M18 15l2 2 3-4', span: 12, needsSource: true,
    defaults: { title: 'Resumen', agg: 'sum' },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'field', label: 'Medida a describir', type: 'field', measures: true, numeric: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'label', label: 'Nombre en el texto (opcional)', type: 'text' },
      { key: 'timeField', label: 'Evolución por (tiempo)', type: 'field', optional: true },
      { key: 'grain', label: 'Agrupar fechas por', type: 'select', options: [{ value: '', label: 'Valor tal cual' }, ...GRAINS], when: (p) => !!p.timeField },
      { key: 'category', label: 'Desglose por (categoría)', type: 'field', optional: true },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
    ],
    help: 'Genera frases con el total, la evolución, el principal causante del cambio, el reparto y los valores inusuales. Se actualiza con los filtros.',
  },
  {
    type: 'filter', group: 'Interacción', label: 'Filtro', description: 'Desplegable, chips, búsqueda o rango', icon: 'M4 5h16l-6 8v6l-4-2v-4z', span: 3, needsSource: true,
    defaults: { mode: 'select' },
    props: [
      { key: 'field', label: 'Campo a filtrar', type: 'field' },
      { key: 'label', label: 'Etiqueta', type: 'text' },
      { key: 'mode', label: 'Tipo', type: 'select', options: [{ value: 'select', label: 'Desplegable' }, { value: 'multi', label: 'Chips (selección múltiple)' }, { value: 'search', label: 'Búsqueda de texto' }, { value: 'range', label: 'Rango (número/fecha)' }] },
      { key: 'part', label: 'Para fechas, filtrar por', type: 'select', options: [{ value: '', label: 'Valor exacto' }, { value: 'year', label: 'Año' }, { value: 'quarter', label: 'Trimestre' }, { value: 'month', label: 'Mes' }] },
      { key: 'sync', label: 'Sincronizar en todas las páginas', type: 'bool', default: true },
      { key: 'placeholder', label: 'Texto de ayuda', type: 'text' },
    ],
    help: 'Filtra los componentes cuyos orígenes tengan el mismo campo o estén relacionados en el modelo semántico.',
  },
  {
    type: 'tile', group: 'Indicadores', label: 'Loseta', description: 'Valor destacado con tendencia y comparación', icon: 'M4 5h16v14H4z M8 12h3', span: 3, needsSource: true,
    defaults: { title: 'Total', agg: 'sum', icon: 'chart', color: 'brand' },
    props: [
      { key: 'title', label: 'Etiqueta', type: 'text' },
      { key: 'field', label: 'Campo o medida', type: 'field', measures: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS, when: (p) => !String(p.field || '').startsWith('m:') },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'subtitle', label: 'Texto inferior', type: 'text' },
      ...timeCompareProps,
      { key: 'trendField', label: 'Tendencia por (sparkline)', type: 'field', optional: true },
      { key: 'goodWhen', label: 'Variación', type: 'select', options: GOOD_WHEN },
      { key: 'icon', label: 'Icono', type: 'select', options: [{ value: '', label: '(ninguno)' }, ...opts(['money', 'cart', 'people', 'box', 'chart', 'check', 'alert', 'clock', 'star', 'target'])] },
      { key: 'color', label: 'Color', type: 'select', options: opts(['brand', 'green', 'red', 'orange', 'purple', 'teal', 'pink', 'yellow']) },
    ],
  },
  {
    type: 'kpi', group: 'Indicadores', label: 'Indicador (KPI)', description: 'Valor frente a objetivo y periodo', icon: 'M4 18 9 12l4 3 7-9', span: 4, needsSource: true,
    defaults: { label: 'Indicador', agg: 'sum', goodWhen: 'higher' },
    props: [
      { key: 'label', label: 'Etiqueta', type: 'text' },
      { key: 'field', label: 'Campo o medida', type: 'field', measures: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS, when: (p) => !String(p.field || '').startsWith('m:') },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'target', label: 'Objetivo (valor fijo)', type: 'number' },
      { key: 'targetField', label: 'u objetivo desde campo', type: 'field', optional: true, measures: true },
      ...timeCompareProps,
      { key: 'goodWhen', label: 'Es bueno cuando', type: 'select', options: GOOD_WHEN },
      { key: 'caption', label: 'Nota (sin objetivo)', type: 'text' },
    ],
  },
  {
    type: 'gauge', group: 'Indicadores', label: 'Gauge', description: 'Velocímetro con objetivo', icon: 'M4 16a8 8 0 0 1 16 0 M12 16l4-5', span: 4, needsSource: true,
    defaults: { title: 'Cumplimiento', agg: 'sum', goodWhen: 'higher' },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'field', label: 'Campo o medida', type: 'field', measures: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS, when: (p) => !String(p.field || '').startsWith('m:') },
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
        { value: 'waterfall', label: 'Cascada' }, { value: 'funnel', label: 'Embudo' },
      ] },
      { key: 'category', label: 'Categoría o jerarquía (eje X)', type: 'field', hierarchies: true },
      { key: 'values', label: 'Valores (campos o medidas)', type: 'fields', numeric: true, measures: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'sort', label: 'Orden', type: 'select', options: [{ value: '', label: 'Automático' }, { value: 'desc', label: 'Valor desc.' }, { value: 'asc', label: 'Valor asc.' }, { value: 'label', label: 'Categoría' }] },
      { key: 'limit', label: 'Máx. categorías', type: 'number' },
      { key: 'compare', label: 'Comparación temporal (categorías de fecha)', type: 'select', options: COMPARE, section: 'Analítica' },
      { key: 'refLines', label: 'Líneas de referencia', type: 'refLines', section: 'Analítica', when: (p) => !['donut', 'pie', 'bar', 'funnel'].includes(p.type) },
      { key: 'forecast', label: 'Previsión (nº de periodos)', type: 'number', section: 'Analítica', when: (p) => ['line', 'area', 'column', 'combo'].includes(p.type || 'column') },
      { key: 'anomalies', label: 'Marcar valores inusuales', type: 'bool', section: 'Analítica', when: (p) => ['line', 'area', 'column', 'combo'].includes(p.type || 'column') },
      { key: 'splitBy', label: 'Múltiplos pequeños: repetir por', type: 'field', optional: true, section: 'Analítica' },
      { key: 'splitLimit', label: 'Máx. paneles', type: 'number', section: 'Analítica', when: (p) => !!p.splitBy },
      { key: 'stacked', label: 'Apilado (columnas)', type: 'bool', when: (p) => (p.type || 'column') === 'column' },
      { key: 'y2', label: 'Eje secundario para líneas', type: 'bool', when: (p) => p.type === 'combo' },
      { key: 'multicolor', label: 'Multicolor (barras)', type: 'bool', when: (p) => p.type === 'bar' },
      { key: 'total', label: 'Barra de total', type: 'bool', default: true, when: (p) => p.type === 'waterfall' },
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
    type: 'map', group: 'Avanzados', label: 'Mapa', description: 'Coropletas por comunidad o provincia', icon: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14', span: 6, needsSource: true,
    defaults: { title: 'Mapa', geo: 'es-comunidades', agg: 'sum' },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'geo', label: 'Mapa', type: 'select', options: [{ value: 'es-comunidades', label: 'España · comunidades' }, { value: 'es-provincias', label: 'España · provincias' }] },
      { key: 'field', label: 'Campo de lugar (nombre)', type: 'field' },
      { key: 'value', label: 'Valor', type: 'field', numeric: true, measures: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'crossFilter', label: 'Clic filtra el informe', type: 'bool', default: true },
    ],
  },
  {
    type: 'treemap', group: 'Avanzados', label: 'Treemap', description: 'Proporciones anidadas', icon: 'M4 4h16v16H4z M12 4v16 M12 12h8 M4 14h8', span: 6, needsSource: true,
    defaults: { title: 'Treemap', agg: 'sum' },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'category', label: 'Categoría', type: 'field' },
      { key: 'group', label: 'Agrupar por (opcional)', type: 'field', optional: true },
      { key: 'value', label: 'Valor', type: 'field', numeric: true, measures: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'height', label: 'Alto (px)', type: 'number' },
    ],
  },
  {
    type: 'calendar', group: 'Avanzados', label: 'Calendario', description: 'Mapa de calor por día', icon: 'M4 6h16v14H4z M4 10h16 M8 4v4 M16 4v4', span: 12, needsSource: true,
    defaults: { title: 'Actividad diaria', agg: 'sum', years: 1 },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'dateField', label: 'Campo de fecha', type: 'field' },
      { key: 'value', label: 'Valor', type: 'field', numeric: true, measures: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'years', label: 'Años a mostrar', type: 'number' },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
    ],
  },
  {
    type: 'bullet', group: 'Avanzados', label: 'Bullet', description: 'Real frente a objetivo por categoría', icon: 'M4 8h16 M4 16h16 M4 8h10 M17 6v4', span: 6, needsSource: true,
    defaults: { title: 'Real vs objetivo', agg: 'sum', ranges: [60, 90], goodWhen: 'higher' },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'category', label: 'Categoría', type: 'field' },
      { key: 'value', label: 'Valor', type: 'field', numeric: true, measures: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'target', label: 'Objetivo (fijo)', type: 'number' },
      { key: 'targetField', label: 'u objetivo desde campo', type: 'field', numeric: true, optional: true, measures: true },
      { key: 'ranges', label: 'Bandas (% del objetivo)', type: 'numlist' },
      { key: 'goodWhen', label: 'Es bueno cuando', type: 'select', options: GOOD_WHEN },
      { key: 'limit', label: 'Máx. categorías', type: 'number' },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
    ],
  },
  {
    type: 'sankey', group: 'Avanzados', label: 'Sankey', description: 'Flujos entre categorías', icon: 'M4 6h3 M4 18h3 M17 6h3 M17 14h3 M7 6c5 0 5 8 10 8 M7 18c5 0 5-12 10-12', span: 12, needsSource: true,
    defaults: { title: 'Flujos', agg: 'sum', levels: [] },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'levels', label: 'Niveles (en orden, 2 o 3)', type: 'fields' },
      { key: 'value', label: 'Valor', type: 'field', numeric: true, measures: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'height', label: 'Alto (px)', type: 'number' },
    ],
  },
  {
    type: 'waterfall', group: 'Avanzados', label: 'Cascada', description: 'Contribuciones acumuladas', icon: 'M4 20V14h3v6 M9 14V9h3v5 M14 9V5h3v4 M19 20V5', span: 6, needsSource: true,
    defaults: { title: 'Cascada', agg: 'sum', values: [], total: true },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'category', label: 'Categoría', type: 'field' },
      { key: 'values', label: 'Valor', type: 'fields', numeric: true, measures: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'sort', label: 'Orden', type: 'select', options: [{ value: '', label: 'Como viene' }, { value: 'desc', label: 'Valor desc.' }, { value: 'label', label: 'Categoría' }] },
      { key: 'total', label: 'Barra de total', type: 'bool', default: true },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
    ],
  },
  {
    type: 'funnel', group: 'Avanzados', label: 'Embudo', description: 'Etapas y conversión', icon: 'M3 5h18l-6 7v7l-6-2v-5z', span: 6, needsSource: true,
    defaults: { title: 'Embudo', agg: 'count', values: [] },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'category', label: 'Etapa', type: 'field' },
      { key: 'values', label: 'Valor', type: 'fields', numeric: true, measures: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
    ],
  },
  {
    type: 'grid', group: 'Datos', label: 'Tabla (grid)', description: 'Agrupaciones, subtotales, iconos y sparklines', icon: 'M4 5h16v14H4z M4 10h16 M4 15h16 M10 5v14', span: 12, needsSource: true,
    defaults: { title: 'Detalle', pageSize: 10, search: true, totals: false, columns: [] },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'columns', label: 'Columnas (vacío = todas)', type: 'fields' },
      { key: 'pageSize', label: 'Filas por página', type: 'number', when: (p) => !(p.groupBy || []).length },
      { key: 'sortBy', label: 'Ordenar por', type: 'field', optional: true },
      { key: 'sortDir', label: 'Dirección', type: 'select', options: [{ value: 'asc', label: 'Ascendente' }, { value: 'desc', label: 'Descendente' }] },
      { key: 'groupBy', label: 'Agrupar por (hasta 2 niveles)', type: 'fields', max: 2, section: 'Agrupación' },
      { key: 'subtotals', label: 'Subtotales por grupo', type: 'bool', default: true, section: 'Agrupación', when: (p) => !!(p.groupBy || []).length },
      { key: 'groupPageBreak', label: 'Salto de página por grupo (impresión)', type: 'bool', section: 'Agrupación', when: (p) => !!(p.groupBy || []).length },
      { key: 'search', label: 'Caja de búsqueda', type: 'bool', default: true },
      { key: 'totals', label: 'Fila de totales', type: 'bool' },
      { key: 'filterField', label: 'Clic en fila filtra por', type: 'field', optional: true },
      { key: 'databars', label: 'Barras de datos en', type: 'fields', numeric: true, section: 'Formato' },
      { key: 'rules', label: 'Formato condicional (colores, iconos, semáforos)', type: 'rules', section: 'Formato' },
      { key: 'sparklines', label: 'Columnas de tendencia (sparklines)', type: 'sparklines', section: 'Formato' },
    ],
  },
  {
    type: 'pivot', group: 'Datos', label: 'Tabla dinámica', description: 'Filas × columnas con totales y mapa de calor', icon: 'M4 4h16v16H4z M4 9h16 M9 4v16', span: 6, needsSource: true,
    defaults: { title: 'Tabla dinámica', agg: 'sum', totals: true, heatmap: true },
    props: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'rows', label: 'Filas', type: 'field' },
      { key: 'cols', label: 'Columnas', type: 'field', optional: true },
      { key: 'value', label: 'Valor', type: 'field', numeric: true, measures: true },
      { key: 'agg', label: 'Agregación', type: 'select', options: AGGREGATIONS },
      { key: 'format', label: 'Formato', type: 'select', options: FORMAT_OPTS },
      { key: 'totals', label: 'Totales', type: 'bool', default: true },
      { key: 'heatmap', label: 'Mapa de calor', type: 'bool' },
    ],
  },
  {
    type: 'subreport', group: 'Composición', label: 'Subinforme', description: 'Incrusta otro informe', icon: 'M4 4h16v16H4z M8 8h8v8H8z', span: 12, needsSource: false,
    defaults: { title: '' },
    props: [
      { key: 'report', label: 'Informe', type: 'report' },
      { key: 'title', label: 'Título (opcional)', type: 'text' },
    ],
    help: 'Muestra los componentes de otro informe con sus propios orígenes. Hereda los parámetros con el mismo nombre y responde a los filtros por campos comunes.',
  },
  {
    type: 'pagebreak', group: 'Composición', label: 'Salto de página', description: 'Fuerza página nueva al imprimir', icon: 'M4 12h3 M10 12h4 M17 12h3 M6 4h12v5H6z M6 15h12v5H6z', span: 12, needsSource: false,
    defaults: {},
    props: [],
    help: 'Solo afecta a la impresión y a la exportación a PDF/Word.',
  },
];

export const byType = Object.fromEntries(CATALOG.map((c) => [c.type, c]));
export const RULE_OPS = ['>', '>=', '<', '<=', '=', '!=', 'contains'];
export const RULE_STYLES = [
  { value: 'good', label: 'Texto verde' }, { value: 'bad', label: 'Texto rojo' }, { value: 'warn', label: 'Texto naranja' },
  { value: 'brand', label: 'Texto de marca' }, { value: 'bold', label: 'Negrita' }, { value: 'good-bg', label: 'Fondo verde' }, { value: 'bad-bg', label: 'Fondo rojo' },
  { value: 'dot-good', label: '● Semáforo verde' }, { value: 'dot-warn', label: '● Semáforo ámbar' }, { value: 'dot-bad', label: '● Semáforo rojo' },
  { value: 'icon-up', label: '▲ Flecha arriba' }, { value: 'icon-down', label: '▼ Flecha abajo' }, { value: 'icon-flat', label: '▬ Estable' },
  { value: 'flag', label: '⚑ Bandera' }, { value: 'star', label: '★ Estrella' },
];
export const REF_TYPES = [
  { value: 'avg', label: 'Media' }, { value: 'median', label: 'Mediana' }, { value: 'min', label: 'Mínimo' }, { value: 'max', label: 'Máximo' },
  { value: 'target', label: 'Objetivo (valor)' }, { value: 'trend', label: 'Tendencia lineal' },
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
  const keep = (n) => names.has(n) || /^[mh]:/.test(n);
  for (const k of ['field', 'category', 'targetField', 'sortBy', 'trendField', 'dateField', 'timeField', 'splitBy', 'group', 'x', 'y', 'size', 'color', 'label', 'rows', 'cols', 'value', 'filterField']) if (p[k] && !keep(p[k]) && !(k === 'color' && cell.type !== 'scatter') && !(k === 'label' && cell.type !== 'scatter')) delete p[k];
  for (const k of ['values', 'columns', 'databars', 'levels', 'groupBy']) if (Array.isArray(p[k])) p[k] = p[k].filter(keep);
  if (Array.isArray(p.sparklines)) p.sparklines = p.sparklines.filter((x) => names.has(x.key) && names.has(x.time) && names.has(x.value));
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
  const dateF = ds.fields.find((f) => f.type === 'date');
  if (['map', 'treemap'].includes(cell.type)) {
    const geo = ds.fields.find((f) => /comunidad|provincia|region/i.test(f.name) && f.type === 'string');
    if (!p.field && cell.type === 'map') p.field = (geo || cats[0])?.name;
    if (!p.category && cell.type === 'treemap') p.category = (geo || cats[0])?.name;
    if (!p.value && lastNum) p.value = lastNum;
  }
  if (cell.type === 'calendar') { if (!p.dateField && dateF) p.dateField = dateF.name; if (!p.value && lastNum) p.value = lastNum; }
  if (cell.type === 'bullet') { if (!p.category && cats[0]) p.category = cats[0].name; if (!p.value && lastNum) p.value = lastNum; }
  if (cell.type === 'sankey') { if (!(p.levels && p.levels.length)) p.levels = cats.filter((f) => f.type === 'string').slice(0, 2).map((f) => f.name); if (!p.value && lastNum) p.value = lastNum; }
  if (cell.type === 'waterfall' || cell.type === 'funnel') { if (!p.category && cats[0]) p.category = cats[0].name; if (!(p.values && p.values.length) && (lastNum || ds.fields[0])) p.values = [lastNum || ds.fields[0].name]; }
  if (cell.type === 'narrative') { if (!p.field && lastNum) p.field = lastNum; if (!p.category && cats[0]) p.category = cats.find((f) => f.type === 'string')?.name; }
  if (cell.type === 'pivot') {
    if (!p.rows && cats[0]) p.rows = cats[0].name;
    if (!p.cols && cats[1]) p.cols = cats[1].name;
    if (!p.value && lastNum) p.value = lastNum;
  }
  return { ...cell, props: p };
}
