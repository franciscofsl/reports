import { LIB_VERSION } from './htmlGenerator.js';

export const QUERY_SNIPPETS = [
  {
    name: 'Ventas por mes',
    id: 'ventas_mes',
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
    name: 'Ventas por región',
    id: 'ventas_region',
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
    name: 'Top productos',
    id: 'top_productos',
    sql: `SELECT pr.nombre AS producto, pr.categoria,
       SUM(l.cantidad) AS unidades, SUM(l.importe) AS importe
FROM lineas_pedido l
JOIN productos pr ON l.producto_id = pr.id
JOIN pedidos p ON l.pedido_id = p.id
WHERE p.estado <> 'Cancelado' AND YEAR(p.fecha) = :anio
GROUP BY pr.nombre, pr.categoria
ORDER BY importe DESC`,
    fields: [
      { name: 'producto', label: 'Producto', type: 'string', format: '' },
      { name: 'categoria', label: 'Categoría', type: 'string', format: '' },
      { name: 'unidades', label: 'Unidades', type: 'number', format: 'integer' },
      { name: 'importe', label: 'Importe', type: 'number', format: 'currency' },
    ],
  },
  {
    name: 'Detalle de pedidos',
    id: 'pedidos',
    sql: `SELECT p.id, p.fecha, c.nombre AS cliente, c.region,
       e.nombre AS comercial, p.estado, p.importe
FROM pedidos p
JOIN clientes c ON p.cliente_id = c.id
JOIN empleados e ON p.empleado_id = e.id
WHERE YEAR(p.fecha) = :anio
ORDER BY p.fecha DESC`,
    fields: [
      { name: 'id', label: 'Nº pedido', type: 'number', format: 'integer' },
      { name: 'fecha', label: 'Fecha', type: 'date', format: 'date' },
      { name: 'cliente', label: 'Cliente', type: 'string', format: '' },
      { name: 'region', label: 'Región', type: 'string', format: '' },
      { name: 'comercial', label: 'Comercial', type: 'string', format: '' },
      { name: 'estado', label: 'Estado', type: 'string', format: '' },
      { name: 'importe', label: 'Importe', type: 'number', format: 'currency' },
    ],
  },
  {
    name: 'Clientes',
    id: 'clientes',
    sql: `SELECT id, nombre, segmento, region, ciudad, alta, activo
FROM clientes
ORDER BY nombre`,
    fields: [],
  },
];

const snip = (id) => {
  const s = QUERY_SNIPPETS.find((q) => q.id === id);
  return { id: s.id, name: s.name, sql: s.sql, fields: structuredClone(s.fields) };
};

export function salesTemplate() {
  return {
    params: [{ name: 'anio', label: 'Año', type: 'number', default: 2025 }],
    dataSources: [snip('pedidos'), snip('ventas_mes'), snip('ventas_region'), snip('top_productos')],
    model: {
      libVersion: LIB_VERSION,
      title: 'Cuadro de mando de ventas',
      subtitle: 'Pedidos, facturación y productos del año seleccionado',
      rows: [
        {
          id: 'r1',
          cells: [
            { id: 'c1', span: 3, type: 'tile', source: 'pedidos', props: { title: 'Facturación', field: 'importe', agg: 'sum', format: 'compactCurrency', icon: 'money', color: 'brand', subtitle: 'Todos los estados' } },
            { id: 'c2', span: 3, type: 'tile', source: 'pedidos', props: { title: 'Pedidos', field: 'id', agg: 'count', format: 'integer', icon: 'cart', color: 'teal' } },
            { id: 'c3', span: 3, type: 'tile', source: 'pedidos', props: { title: 'Clientes', field: 'cliente', agg: 'countDistinct', format: 'integer', icon: 'people', color: 'purple' } },
            { id: 'c4', span: 3, type: 'tile', source: 'pedidos', props: { title: 'Ticket medio', field: 'importe', agg: 'avg', format: 'currency', icon: 'star', color: 'orange' } },
          ],
        },
        {
          id: 'r2',
          cells: [
            { id: 'c5', span: 8, type: 'chart', source: 'ventas_mes', props: { title: 'Facturación mensual', type: 'column', category: 'mes', values: ['importe'], agg: 'sum', sort: 'label' } },
            { id: 'c6', span: 4, type: 'chart', source: 'ventas_region', props: { title: 'Reparto por región', type: 'donut', category: 'region', values: ['importe'], agg: 'sum' } },
          ],
        },
        {
          id: 'r3',
          cells: [
            { id: 'c7', span: 4, type: 'kpi', source: 'ventas_mes', props: { label: 'Facturación vs objetivo anual', field: 'importe', agg: 'sum', format: 'currency', target: 4000000, goodWhen: 'higher' } },
            { id: 'c8', span: 8, type: 'chart', source: 'top_productos', props: { title: 'Top productos por importe', type: 'bar', category: 'producto', values: ['importe'], agg: 'sum', sort: 'desc', limit: 8 } },
          ],
        },
        {
          id: 'r4',
          cells: [
            { id: 'c9', span: 12, type: 'grid', source: 'pedidos', props: { title: 'Pedidos', columns: ['id', 'fecha', 'cliente', 'region', 'comercial', 'estado', 'importe'], pageSize: 10, search: true, totals: true, sortBy: 'fecha', sortDir: 'desc' } },
          ],
        },
      ],
    },
  };
}

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
    <header class="rpt-report-header"><h1>Informe escrito a mano</h1><p>Usa data-rpt / data-source / data-props</p></header>
    <section class="rpt-row">
      <div class="rpt-col rpt-col-6" data-rpt="chart" data-source="ventas_region" data-props='{"title":"Ventas por región","type":"pie","category":"region","values":["importe"]}'></div>
      <div class="rpt-col rpt-col-6" data-rpt="grid" data-source="ventas_region" data-props='{"title":"Detalle","search":false,"totals":true}'></div>
    </section>
  </main>
</body>
</html>
`;
