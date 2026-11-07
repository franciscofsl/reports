import { LIB_VERSION } from './htmlGenerator.js';

const THEME = { brand: '#0f6cbd', palette: 'fluent', density: 'normal', mode: 'auto', logo: '' };

export const QUERY_SNIPPETS = [
  {
    name: 'Ventas por mes', id: 'ventas_mes',
    sql: `SELECT SUBSTRING(fecha, 1, 7) AS mes,
       SUM(importe) AS importe,
       COUNT(*) AS pedidos
FROM pedidos
WHERE estado <> 'Cancelado' AND YEAR(fecha) = :anio
GROUP BY SUBSTRING(fecha, 1, 7)
ORDER BY mes`,
    fields: [
      { name: 'mes', label: 'Mes', type: 'string', format: '' },
      { name: 'importe', label: 'Importe', type: 'number', format: 'currency' },
      { name: 'pedidos', label: 'Pedidos', type: 'number', format: 'integer' },
    ],
  },
  {
    name: 'Ventas por región', id: 'ventas_region',
    sql: `SELECT c.region, SUM(p.importe) AS importe, COUNT(*) AS pedidos
FROM pedidos p
JOIN clientes c ON p.cliente_id = c.id
WHERE p.estado <> 'Cancelado' AND YEAR(p.fecha) = :anio
GROUP BY c.region
ORDER BY importe DESC`,
    fields: [
      { name: 'region', label: 'Región', type: 'string', format: '' },
      { name: 'importe', label: 'Importe', type: 'number', format: 'currency' },
      { name: 'pedidos', label: 'Pedidos', type: 'number', format: 'integer' },
    ],
  },
  {
    name: 'Top productos', id: 'top_productos',
    sql: `SELECT pr.nombre AS producto, pr.categoria, c.region,
       SUM(l.cantidad) AS unidades, SUM(l.importe) AS importe
FROM lineas_pedido l
JOIN productos pr ON l.producto_id = pr.id
JOIN pedidos p ON l.pedido_id = p.id
JOIN clientes c ON p.cliente_id = c.id
WHERE p.estado <> 'Cancelado' AND YEAR(p.fecha) = :anio
GROUP BY pr.nombre, pr.categoria, c.region`,
    fields: [
      { name: 'producto', label: 'Producto', type: 'string', format: '' },
      { name: 'categoria', label: 'Categoría', type: 'string', format: '' },
      { name: 'region', label: 'Región', type: 'string', format: '' },
      { name: 'unidades', label: 'Unidades', type: 'number', format: 'integer' },
      { name: 'importe', label: 'Importe', type: 'number', format: 'currency' },
    ],
  },
  {
    name: 'Detalle de pedidos', id: 'pedidos',
    sql: `SELECT p.id, p.fecha, SUBSTRING(p.fecha, 1, 7) AS mes,
       c.nombre AS cliente, c.region, c.segmento,
       e.nombre AS comercial, p.estado, p.importe
FROM pedidos p
JOIN clientes c ON p.cliente_id = c.id
JOIN empleados e ON p.empleado_id = e.id
WHERE YEAR(p.fecha) = :anio
ORDER BY p.fecha DESC`,
    fields: [
      { name: 'id', label: 'Nº pedido', type: 'number', format: 'integer' },
      { name: 'fecha', label: 'Fecha', type: 'date', format: 'date' },
      { name: 'mes', label: 'Mes', type: 'string', format: '' },
      { name: 'cliente', label: 'Cliente', type: 'string', format: '' },
      { name: 'region', label: 'Región', type: 'string', format: '' },
      { name: 'segmento', label: 'Segmento', type: 'string', format: '' },
      { name: 'comercial', label: 'Comercial', type: 'string', format: '' },
      { name: 'estado', label: 'Estado', type: 'string', format: '' },
      { name: 'importe', label: 'Importe', type: 'number', format: 'currency' },
    ],
  },
  {
    name: 'Clientes', id: 'clientes',
    sql: `SELECT id, nombre, segmento, region, ciudad, alta, activo
FROM clientes
ORDER BY nombre`,
    fields: [],
  },
  {
    name: 'Ventas por comercial', id: 'ventas_comercial',
    sql: `SELECT e.nombre AS comercial, e.region,
       e.objetivo_mensual * 12 AS objetivo,
       SUM(p.importe) AS ventas, COUNT(*) AS pedidos
FROM pedidos p
JOIN empleados e ON p.empleado_id = e.id
WHERE p.estado <> 'Cancelado' AND YEAR(p.fecha) = :anio
GROUP BY e.nombre, e.region, e.objetivo_mensual`,
    fields: [
      { name: 'comercial', label: 'Comercial', type: 'string', format: '' },
      { name: 'region', label: 'Región', type: 'string', format: '' },
      { name: 'objetivo', label: 'Objetivo anual', type: 'number', format: 'currency' },
      { name: 'ventas', label: 'Ventas', type: 'number', format: 'currency' },
      { name: 'pedidos', label: 'Pedidos', type: 'number', format: 'integer' },
    ],
  },
];

const snip = (id, extra = {}) => {
  const s = QUERY_SNIPPETS.find((q) => q.id === id);
  return { id: s.id, name: s.name, mode: 'sql', sql: s.sql, fields: structuredClone(s.fields), calculated: [], ...extra };
};

export function salesTemplate() {
  return {
    params: [{ name: 'anio', label: 'Año', type: 'number', default: 2025 }],
    dataSources: [snip('pedidos'), snip('top_productos')],
    model: {
      libVersion: LIB_VERSION, theme: { ...THEME },
      title: 'Cuadro de mando de ventas',
      subtitle: 'Filtra por región, estado o comercial; haz clic en los gráficos para filtrar el resto',
      rows: [
        { id: 'r0', cells: [
          { id: 'f1', span: 6, type: 'filter', source: 'pedidos', props: { field: 'region', label: 'Región', mode: 'multi' } },
          { id: 'f2', span: 3, type: 'filter', source: 'pedidos', props: { field: 'estado', label: 'Estado', mode: 'select' } },
          { id: 'f3', span: 3, type: 'filter', source: 'pedidos', props: { field: 'comercial', label: 'Comercial', mode: 'select' } },
        ] },
        { id: 'r1', cells: [
          { id: 'c1', span: 3, type: 'tile', source: 'pedidos', props: { title: 'Facturación', field: 'importe', agg: 'sum', format: 'compactCurrency', icon: 'money', color: 'brand', trendField: 'mes', goodWhen: 'higher' } },
          { id: 'c2', span: 3, type: 'tile', source: 'pedidos', props: { title: 'Pedidos', field: 'id', agg: 'count', format: 'integer', icon: 'cart', color: 'teal', subtitle: 'Todos los estados' } },
          { id: 'c3', span: 3, type: 'tile', source: 'pedidos', props: { title: 'Clientes', field: 'cliente', agg: 'countDistinct', format: 'integer', icon: 'people', color: 'purple' } },
          { id: 'c4', span: 3, type: 'tile', source: 'pedidos', props: { title: 'Ticket medio', field: 'importe', agg: 'avg', format: 'currency', icon: 'star', color: 'orange' } },
        ] },
        { id: 'r2', cells: [
          { id: 'c5', span: 8, type: 'chart', source: 'pedidos', props: { title: 'Facturación mensual', type: 'column', category: 'mes', values: ['importe'], agg: 'sum', sort: 'label' } },
          { id: 'c6', span: 4, type: 'chart', source: 'pedidos', props: { title: 'Reparto por región', type: 'donut', category: 'region', values: ['importe'], agg: 'sum' } },
        ] },
        { id: 'r3', cells: [
          { id: 'c7', span: 4, type: 'gauge', source: 'pedidos', props: { title: 'Facturación vs objetivo anual', field: 'importe', agg: 'sum', format: 'currency', target: 4000000, goodWhen: 'higher' } },
          { id: 'c8', span: 8, type: 'chart', source: 'top_productos', props: { title: 'Top productos por importe', type: 'bar', category: 'producto', values: ['importe'], agg: 'sum', sort: 'desc', limit: 8 } },
        ] },
        { id: 'r4', cells: [
          { id: 'c9', span: 12, type: 'grid', source: 'pedidos', props: {
            title: 'Pedidos', columns: ['id', 'fecha', 'cliente', 'region', 'comercial', 'estado', 'importe'], pageSize: 10, search: true, totals: true, sortBy: 'fecha', sortDir: 'desc',
            filterField: 'region', databars: ['importe'],
            rules: [{ field: 'estado', op: '=', value: 'Cancelado', style: 'bad' }, { field: 'estado', op: '=', value: 'Pendiente', style: 'warn' }, { field: 'importe', op: '>', value: 20000, style: 'bold' }],
          } },
        ] },
      ],
    },
  };
}

export function salesTeamTemplate() {
  return {
    params: [{ name: 'anio', label: 'Año', type: 'number', default: 2025 }],
    dataSources: [
      snip('ventas_comercial', { calculated: [{ name: 'cumplimiento', label: 'Cumplimiento', expr: 'ventas / objetivo', type: 'number', format: 'percent' }] }),
      snip('pedidos'),
    ],
    model: {
      libVersion: LIB_VERSION, theme: { ...THEME, brand: '#8764b8', palette: 'warm' },
      title: 'Equipo comercial',
      subtitle: 'Ventas frente a objetivo por comercial',
      rows: [
        { id: 'r0', cells: [{ id: 'f1', span: 12, type: 'filter', source: 'ventas_comercial', props: { field: 'region', label: 'Región', mode: 'multi' } }] },
        { id: 'r1', cells: [
          { id: 'k1', span: 4, type: 'tile', source: 'ventas_comercial', props: { title: 'Ventas', field: 'ventas', agg: 'sum', format: 'compactCurrency', icon: 'money', color: 'purple' } },
          { id: 'k2', span: 4, type: 'tile', source: 'ventas_comercial', props: { title: 'Objetivo', field: 'objetivo', agg: 'sum', format: 'compactCurrency', icon: 'target', color: 'orange' } },
          { id: 'k3', span: 4, type: 'gauge', source: 'ventas_comercial', props: { title: 'Cumplimiento medio', field: 'cumplimiento', agg: 'avg', format: 'percent', target: 1, min: 0, max: 2, goodWhen: 'higher' } },
        ] },
        { id: 'r2', cells: [
          { id: 'g1', span: 7, type: 'chart', source: 'ventas_comercial', props: { title: 'Ventas vs objetivo', type: 'combo', category: 'comercial', values: ['ventas', 'objetivo'], agg: 'sum', sort: 'desc' } },
          { id: 'g2', span: 5, type: 'scatter', source: 'ventas_comercial', props: { title: 'Objetivo vs ventas', x: 'objetivo', y: 'ventas', size: 'pedidos', color: 'region', label: 'comercial' } },
        ] },
        { id: 'r3', cells: [
          { id: 't1', span: 6, type: 'grid', source: 'ventas_comercial', props: { title: 'Ranking', columns: ['comercial', 'region', 'ventas', 'objetivo', 'cumplimiento'], sortBy: 'cumplimiento', sortDir: 'desc', search: false, totals: false, pageSize: 10,
            rules: [{ field: 'cumplimiento', op: '>=', value: 1, style: 'good-bg' }, { field: 'cumplimiento', op: '<', value: 0.8, style: 'bad' }], databars: ['ventas'], filterField: 'comercial' } },
          { id: 't2', span: 6, type: 'pivot', source: 'pedidos', props: { title: 'Pedidos por comercial y estado', rows: 'comercial', cols: 'estado', value: 'importe', agg: 'sum', format: 'compactCurrency', totals: true, heatmap: true } },
        ] },
      ],
    },
  };
}

export function inventoryTemplate() {
  return {
    params: [{ name: 'periodo', label: 'Periodo de ventas', type: 'daterange', default: 'ultimos_12_meses' }],
    dataSources: [
      { id: 'productos', name: 'Productos', mode: 'sql', sql: 'SELECT id, nombre, categoria, precio, stock\nFROM productos\nWHERE stock IS NOT NULL', fields: [
        { name: 'id', label: 'Id', type: 'number', format: 'integer' }, { name: 'nombre', label: 'Producto', type: 'string', format: '' },
        { name: 'categoria', label: 'Categoría', type: 'string', format: '' }, { name: 'precio', label: 'Precio', type: 'number', format: 'currency' },
        { name: 'stock', label: 'Stock', type: 'number', format: 'integer' }, { name: 'valor_stock', label: 'Valor del stock', type: 'number', format: 'currency', calculated: true },
      ], calculated: [{ name: 'valor_stock', label: 'Valor del stock', expr: 'precio * stock', type: 'number', format: 'currency' }] },
      { id: 'vendidos', name: 'Unidades vendidas', mode: 'sql', sql: `SELECT l.producto_id, SUM(l.cantidad) AS unidades
FROM lineas_pedido l
JOIN pedidos p ON l.pedido_id = p.id
WHERE p.estado <> 'Cancelado' AND p.fecha BETWEEN :periodo_desde AND :periodo_hasta
GROUP BY l.producto_id`, fields: [], calculated: [] },
      { id: 'rotacion', name: 'Rotación (derivado)', mode: 'sql', sql: `SELECT pr.nombre, pr.categoria, pr.stock, v.unidades, pr.valor_stock
FROM origen.productos pr
LEFT JOIN origen.vendidos v ON v.producto_id = pr.id`, fields: [
        { name: 'nombre', label: 'Producto', type: 'string', format: '' }, { name: 'categoria', label: 'Categoría', type: 'string', format: '' },
        { name: 'stock', label: 'Stock', type: 'number', format: 'integer' }, { name: 'unidades', label: 'Unidades vendidas', type: 'number', format: 'integer' },
        { name: 'valor_stock', label: 'Valor del stock', type: 'number', format: 'currency' }, { name: 'cobertura', label: 'Meses de cobertura', type: 'number', format: 'number', calculated: true },
      ], calculated: [{ name: 'cobertura', label: 'Meses de cobertura', expr: 'ROUND(stock / (unidades / 12), 1)', type: 'number', format: 'number' }] },
    ],
    model: {
      libVersion: LIB_VERSION, theme: { ...THEME, brand: '#107c10', palette: 'forest' },
      title: 'Inventario',
      subtitle: 'Stock, valor y rotación de productos físicos',
      rows: [
        { id: 'r0', cells: [
          { id: 'f1', span: 4, type: 'filter', source: 'rotacion', props: { field: 'categoria', label: 'Categoría', mode: 'multi' } },
          { id: 'f2', span: 4, type: 'filter', source: 'rotacion', props: { field: 'nombre', label: 'Producto', mode: 'search' } },
          { id: 'f3', span: 4, type: 'filter', source: 'rotacion', props: { field: 'stock', label: 'Stock entre', mode: 'range' } },
        ] },
        { id: 'r1', cells: [
          { id: 'k1', span: 4, type: 'tile', source: 'rotacion', props: { title: 'Unidades en stock', field: 'stock', agg: 'sum', format: 'integer', icon: 'box', color: 'green' } },
          { id: 'k2', span: 4, type: 'tile', source: 'rotacion', props: { title: 'Valor del stock', field: 'valor_stock', agg: 'sum', format: 'compactCurrency', icon: 'money', color: 'teal' } },
          { id: 'k3', span: 4, type: 'kpi', source: 'rotacion', props: { label: 'Cobertura media (meses)', field: 'cobertura', agg: 'avg', format: 'number', target: 6, goodWhen: 'lower' } },
        ] },
        { id: 'r2', cells: [
          { id: 'g1', span: 4, type: 'chart', source: 'rotacion', props: { title: 'Valor por categoría', type: 'pie', category: 'categoria', values: ['valor_stock'], agg: 'sum' } },
          { id: 'g2', span: 8, type: 'chart', source: 'rotacion', props: { title: 'Stock vs unidades vendidas', type: 'column', category: 'nombre', values: ['stock', 'unidades'], agg: 'sum', sort: 'desc' } },
        ] },
        { id: 'r3', cells: [
          { id: 't1', span: 12, type: 'grid', source: 'rotacion', props: { title: 'Productos', columns: ['nombre', 'categoria', 'stock', 'unidades', 'cobertura', 'valor_stock'], sortBy: 'cobertura', sortDir: 'asc', search: true, totals: true, pageSize: 10,
            rules: [{ field: 'stock', op: '<', value: 100, style: 'bad' }, { field: 'cobertura', op: '<', value: 2, style: 'warn' }], databars: ['valor_stock'] } },
        ] },
      ],
    },
  };
}

export const TEMPLATES = [
  { id: 'sales', name: 'Ventas', description: 'Filtros, losetas con tendencia, gráficos con filtro cruzado, gauge y tabla con formato condicional.', icon: 'report', build: salesTemplate },
  { id: 'team', name: 'Equipo comercial', description: 'Ventas vs objetivo, gráfico combinado, dispersión, ranking y tabla dinámica.', icon: 'people', build: salesTeamTemplate },
  { id: 'inventory', name: 'Inventario', description: 'Campos calculados, origen derivado, rango de fechas y filtros de búsqueda y rango.', icon: 'box', build: inventoryTemplate },
];

export const MANUAL_SAMPLE_HTML = (lib) => `<!doctype html>
<html lang="es-ES">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Informe manual</title>
  <link rel="stylesheet" href="${lib}rptlib.css">
  <script src="${lib}rptlib.js" defer></script>
</head>
<body class="rpt-body">
  <main class="rpt-report">
    <header class="rpt-report-header"><div><h1>Informe escrito a mano</h1><p>Usa data-rpt / data-source / data-props</p></div></header>
    <section class="rpt-row">
      <div class="rpt-col rpt-col-6" data-rpt="chart" data-source="ventas_region" data-props='{"title":"Ventas por región","type":"pie","category":"region","values":["importe"]}'></div>
      <div class="rpt-col rpt-col-6" data-rpt="grid" data-source="ventas_region" data-props='{"title":"Detalle","search":false,"totals":true,"filterField":"region"}'></div>
    </section>
  </main>
</body>
</html>
`;
