# Diseñador de informes HTML (prototipo)

Prototipo en React de un **asistente para crear informes HTML** con orígenes de datos SQL, un **editor visual de arrastrar y soltar** y una **librería propia de componentes** (estilo Fluent) servida por URL.

> Análisis de la idea, comparación con productos similares y recomendaciones: [`docs/ANALISIS.md`](docs/ANALISIS.md).

## Funcionalidades

- **Asistente** en 4 pasos: información → orígenes de datos → diseño (o subir HTML) → revisión con vista previa.
- **Orígenes de datos SQL**: consultas `SELECT` con parámetros `:nombre`, ejecución y vista previa, detección de campos y edición de tipo/etiqueta/formato, plantillas de consulta y explorador del esquema. En el prototipo se simula la BD con un JSON (`src/data/sampledb.json`) y [alasql](https://github.com/AlaSQL/alasql).
- **Diseñador**: paleta de componentes (título, texto, loseta, indicador KPI, gráfico, tabla), lienzo en rejilla de 12 columnas, arrastrar y soltar (o tocar para añadir en móvil), mover/redimensionar/duplicar, panel de propiedades con vinculación a origen y campos, deshacer/rehacer, avisos de vínculos rotos.
- **Librería RptLib** (`public/lib/rptlib/1.0.0/`): JS + CSS sin dependencias, publicada como estático versionado. El HTML generado solo enlaza la librería, sin estilos ni scripts embebidos (~5 KB por informe).
- **HTML manual**: subir/pegar/editar HTML; si contiene el modelo del diseñador se puede reabrir visualmente.
- **Historial**: cada guardado crea una versión; ver, descargar y **restaurar** cualquier copia.
- **Responsive**: móvil y escritorio (el diseñador se reorganiza en pestañas en pantallas pequeñas).

## Uso de la librería en un HTML propio

```html
<link rel="stylesheet" href="https://<host>/lib/rptlib/1.0.0/rptlib.css">
<script src="https://<host>/lib/rptlib/1.0.0/rptlib.js" defer></script>

<body class="rpt-body">
  <main class="rpt-report">
    <section class="rpt-row">
      <div class="rpt-col rpt-col-3" data-rpt="tile" data-source="pedidos"
           data-props='{"title":"Facturación","field":"importe","agg":"sum","format":"currency","icon":"money"}'></div>
      <div class="rpt-col rpt-col-9" data-rpt="chart" data-source="ventas_mes"
           data-props='{"type":"column","category":"mes","values":["importe"]}'></div>
    </section>
  </main>
</body>
```

Datos: `window.RPT_DATA = { sources: { <id>: { fields: [...], rows: [...] } } }` (lo inyecta la app) o `<meta name="rpt-data-url" content="...">` para que la librería los descargue.

| `data-rpt` | Props principales |
|---|---|
| `title` | `text`, `subtitle`, `level` |
| `text` | `content`, `card` |
| `tile` | `title`, `field`, `agg`, `format`, `icon`, `color`, `subtitle` |
| `kpi` | `label`, `field`, `agg`, `format`, `target` / `targetField`, `goodWhen` |
| `chart` | `type` (column, bar, line, area, donut, pie), `category`, `values[]`, `agg`, `sort`, `limit`, `stacked` |
| `grid` | `columns[]`, `pageSize`, `search`, `totals`, `sortBy`, `sortDir` |

Agregaciones: `sum`, `avg`, `count`, `countDistinct`, `min`, `max`, `first`. Formatos: `integer`, `number`, `currency`, `compact`, `compactCurrency`, `percent`, `date`.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/
npm run gen:data   # regenera la BD de ejemplo
```

## Despliegue en GitHub Pages

El workflow `.github/workflows/deploy.yml` construye y publica en Pages en cada push a `main` (o manualmente desde *Actions*). Requisito único: en *Settings → Pages* del repositorio, elegir **Source: GitHub Actions**.

La app usa rutas relativas (`base: './'`) y enrutado por hash, así que funciona en `https://<usuario>.github.io/<repo>/` sin configuración adicional. La librería queda publicada en `https://<usuario>.github.io/<repo>/lib/rptlib/1.0.0/`.

## Limitaciones del prototipo

- Persistencia en `localStorage` del navegador (en producción: API + BD).
- Consultas ejecutadas en el cliente sobre datos simulados (en producción: servidor con usuario de solo lectura).
