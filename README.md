# Diseñador de informes HTML (prototipo)

Prototipo en React de un **asistente para crear informes HTML** con orígenes de datos SQL (simulados), un **editor visual de arrastrar y soltar**, un **editor visual de consultas** y una **librería propia de componentes** (estilo Fluent) servida por URL.

> Análisis, comparación con productos similares y recomendaciones: [`docs/ANALISIS.md`](docs/ANALISIS.md).

## Funcionalidades

### Asistente
- 4 pasos: información → orígenes de datos → diseño (o subir HTML) → revisión con vista previa.
- Galería de inicio: en blanco, **desde los datos** (diseño automático), plantillas *Ventas*, *Equipo comercial* e *Inventario*, o **subir HTML** (flujo clásico).

### Orígenes de datos
- **Editor visual de consultas**: arrastra tablas al lienzo; las relaciones `<tabla>_id → <tabla>.id` se unen solas, o une dos columnas con un clic en sus conectores (unión interna/izquierda). Marca columnas, elige función (año, mes, año-mes…), agregación, alias y orden; añade filtros por valor o por parámetro (opcionales con «ignorar si vacío»), DISTINCT y límite. Genera el SQL al momento.
- **De SQL al editor visual**: al cambiar de pestaña, la consulta SQL se interpreta y se dibuja en el lienzo (tablas, uniones, columnas, funciones, agregaciones, filtros con valores o parámetros, orden y límite). Se comprueba que la consulta regenerada devuelve los mismos datos; si usa algo que el editor visual no representa (expresiones aritméticas, `CASE`, `OR`, `HAVING`, subconsultas, `RIGHT JOIN`, orígenes derivados…) se queda en SQL y explica el motivo.
- **Editor SQL** (CodeMirror) con resaltado y autocompletado de tablas, columnas y orígenes; solo `SELECT` (validado con parser).
- **Orígenes derivados**: `SELECT … FROM origen.<id>` reutiliza el resultado de otro origen (orden de ejecución y ciclos resueltos automáticamente).
- **Campos calculados** sin tocar el SQL (`importe / pedidos`, `CASE WHEN …`).
- **Parámetros**: texto, número, fecha (fija o relativa: hoy, inicio de mes/año…), **lista de valores** (estática o desde una consulta) y **rango de fechas** con periodos predefinidos (`:p_desde` / `:p_hasta`).
- Detección de campos y edición de etiqueta, tipo y formato. Renombrar un origen actualiza componentes y orígenes que lo usan.
- La BD se simula con un JSON (`src/data/sampledb.json`) y [alasql](https://github.com/AlaSQL/alasql).

### Diseñador
- Paleta: título, texto, **filtro**, loseta, KPI, **gauge**, gráfico (columnas, barras, líneas, área, **combinado**, donut, tarta), **dispersión**, tabla y **tabla dinámica**.
- Arrastrar y soltar (o tocar en móvil), **redimensionar arrastrando los bordes** (ancho en 12 columnas y alto), **multiselección** (Mayús/Ctrl+clic, Ctrl+A), colocar varios en una fila, **copiar/pegar** (también entre informes), duplicar, deshacer/rehacer.
- **Vista por dispositivo** (escritorio, tablet, móvil) en el lienzo y en la vista previa.
- **Diseño automático** a partir de los datos y **bloques reutilizables** (guardar una fila y reutilizarla).
- **Tema** del informe: color de marca, paleta de gráficos, densidad, claro/oscuro y logotipo.
- Avisos de vínculos rotos (orígenes o campos inexistentes).

### Lectura del informe (RptLib 1.1)
- **Filtros** (desplegable, chips, búsqueda, rango) y **filtro cruzado**: clic en una barra, porción, punto o fila filtra el resto del informe; barra de filtros activos.
- **Menú de cada tarjeta**: ver datos (tabla accesible), ver detalle (filas), **exportar CSV** (Excel), **exportar PNG**, ampliar.
- **Formato condicional** en tablas (colores por umbral, barras de datos), losetas con **sparkline y variación**.
- **Imprimir / PDF** con estilos de impresión. Accesibilidad: resumen de cada gráfico para lectores de pantalla y navegación con teclado por sus elementos.

### Modelo semántico (pestaña «Modelo»)
- **Relaciones entre orígenes**: un filtro viaja por ellas a otros orígenes aunque los campos se llamen distinto (p. ej. un clic en el mapa de `historico.comunidad` filtra `pedidos` mediante `historico.id → pedidos.id`); admite cadenas de varias relaciones y sugiere relaciones candidatas.
- **Medidas reutilizables** con un lenguaje propio: `SUM`, `AVG`, `MIN`, `MAX`, `MEDIAN`, `COUNT(*)`, `COUNT(DISTINCT x)`, condiciones `SUM(x WHERE estado = 'Entregado')`, `TOTAL(expr)` para «% sobre el total», `DIVIDE`, `ROUND`, `ABS` y aritmética. Se validan al escribir y se usan en cualquier visual (`m:<nombre>`).
- **Jerarquías y profundizar**: año → trimestre → mes → día (o campos propios); clic para bajar de nivel y migas para subir (`h:<nombre>`).
- **Selección asociativa** (estilo Qlik): lo excluido se muestra en gris en lugar de desaparecer.

### Exploración y analítica
- **Informes multipágina** con pestañas; los filtros se sincronizan entre páginas (o se limitan a la suya) y hay **filtros a nivel de informe** en un panel que no ocupa el lienzo.
- **Vistas guardadas (marcadores)**: guardan filtros, nivel de profundización, página y parámetros; se aplican con un clic y se comparten por **enlace** (`#/view/<id>?v=…`).
- **Comparación temporal** (vs periodo anterior o mismo periodo del año pasado) en gráficos, losetas y KPI; **líneas de referencia** (media, mediana, mín., máx., objetivo, tendencia); **previsión** con intervalo de confianza; **detección de anomalías**; **narrativa automática** que describe total, evolución, causante del cambio, reparto y valores inusuales.
- **Nuevas visualizaciones**: mapa de coropletas de España (comunidades y provincias), cascada, embudo, treemap, calendario de calor, bullet, Sankey y **múltiplos pequeños**; **iconos y semáforos** en el formato condicional y **sparklines** en tablas (también desde otro origen).
- **Show Me**: eliges campos o medidas y propone los visuales más adecuados, con vista previa.
- **Temas JSON** importables y exportables, compatibles con los temas de Power BI (`dataColors`, `tableAccent`, `background`, fuente).

### Informes paginados y exportación
- **Diseño de página**: tamaño (A4/A3/Carta), orientación, márgenes, encabezado, pie, «Página X de Y» y fecha de impresión; **saltos de página** (componente y por grupo); la cabecera de tabla se repite en cada página y al imprimir las tablas muestran todas sus filas.
- **Tablas agrupadas** (hasta dos niveles) con subtotales plegables y **subinformes** (incrusta otro informe con sus orígenes; hereda parámetros homónimos y responde a los filtros).
- **Exportación**: PDF (impresión con el diseño de página), **Word (.docx)** con encabezado/pie, numeración, KPI, gráficos como imagen y tablas con cabecera repetida, y **Excel (.xlsx)** con hoja de resumen, imágenes y una hoja por tabla con formatos numéricos, agrupación en esquema, totales, autofiltro y cabecera fija.

### Ciclo de vida
- **Historial**: cada guardado crea una versión; ver, descargar, **etiquetar**, **comparar dos versiones** (componentes, SQL línea a línea, parámetros, tema) y **restaurar total o parcialmente** (diseño, orígenes o parámetros).
- **Borrador / publicado**: publica una versión y compártela con el **visor** (`#/view/<id>`).
- Listado con **buscador**, filtros por modo/estado y orden; **exportar/importar** informes (JSON con historial).
- HTML manual: subir/pegar/editar; si contiene el modelo del diseñador, se puede reabrir visualmente.

## Librería RptLib

Versiones publicadas como estáticos **inmutables** (`public/lib/rptlib/<versión>/`): `1.0.0`, `1.1.0` y `1.2.0` (actual). La 1.2.0 se construye desde los módulos de `lib-src/rptlib-1.2/` (`npm run build:lib`, se ejecuta también antes de `npm run build`) y carga bajo demanda los contornos de los mapas (`maps/es.js`, generados con `npm run build:maps` a partir de es-atlas / IGN). Cada informe apunta a la suya, así que los informes antiguos no cambian al publicar una versión nueva; se pueden actualizar desde el panel *Informe → Librería*.

```html
<html lang="es-ES" data-rpt-palette="ocean" style="--rpt-brand:#8764b8">
<link rel="stylesheet" href="https://<host>/lib/rptlib/1.2.0/rptlib.css">
<script src="https://<host>/lib/rptlib/1.2.0/rptlib.js" defer></script>

<body class="rpt-body">
  <main class="rpt-report">
    <section class="rpt-row">
      <div class="rpt-col rpt-col-3" data-rpt="filter" data-source="pedidos" data-props='{"field":"region","mode":"multi"}'></div>
      <div class="rpt-col rpt-col-9" data-rpt="chart" data-source="pedidos"
           data-props='{"type":"column","category":"mes","values":["importe"]}'></div>
    </section>
  </main>
</body>
```

Datos: `window.RPT_DATA = { sources: { <id>: { fields: [...], rows: [...] } } }` (lo inyecta la app) o `<meta name="rpt-data-url" content="...">`. Tema: `data-rpt-theme` (light/dark), `data-rpt-palette` (fluent, ocean, warm, forest, mono), `data-rpt-density` (compact/comfortable) y `--rpt-brand`.

| `data-rpt` | Props principales |
|---|---|
| `title`, `text` | `text`, `subtitle`, `level` / `content`, `card` |
| `filter` | `field`, `label`, `mode` (select, multi, search, range) |
| `tile` | `title`, `field`, `agg`, `format`, `icon`, `color`, `trendField`, `goodWhen` |
| `kpi` | `label`, `field`, `agg`, `format`, `target` / `targetField`, `goodWhen` |
| `gauge` | `title`, `field`, `agg`, `target`, `min`, `max`, `goodWhen` |
| `chart` | `type` (column, bar, line, area, combo, donut, pie), `category`, `values[]`, `agg`, `sort`, `limit`, `stacked`, `y2`, `crossFilter` |
| `scatter` | `x`, `y`, `size`, `color`, `label` |
| `grid` | `columns[]`, `pageSize`, `search`, `totals`, `sortBy`, `filterField`, `databars[]`, `rules[]` |
| `pivot` | `rows`, `cols`, `value`, `agg`, `totals`, `heatmap` |
| `map` | `geo` (es-comunidades, es-provincias), `field`, `value`, `agg` |
| `treemap` | `category`, `group`, `value`, `agg` |
| `calendar` | `dateField`, `value`, `agg`, `years` |
| `bullet` | `category`, `value`, `target` / `targetField`, `ranges[]` |
| `sankey` | `levels[]`, `value`, `agg` |
| `waterfall`, `funnel` | `category`, `values[]`, `agg` |
| `narrative` | `field`, `agg`, `timeField`, `grain`, `category` |
| `subreport` | `report` (id del informe) |

Opciones de 1.2 en gráficos: `category: "h:<jerarquía>"`, `values: ["m:<medida>"]`, `compare` (prev, yoy), `refLines[]`, `forecast`, `anomalies`, `splitBy`. En losetas y KPI: `compare`, `dateField`, `grain`. En tablas: `groupBy[]`, `subtotals`, `groupPageBreak`, `sparklines[]`. En filtros: `part` (year, quarter, month), `sync`.

Modelo semántico en el HTML: `<script type="application/json" id="rpt-semantic">{ "relations": [...], "measures": [...], "hierarchies": [...], "associative": false }</script>`. Páginas: `<section class="rpt-page" data-page="id" data-title="Nombre">`. Filtros del informe: atributo `data-rpt-filters` en `.rpt-report`.

API: `RptLib.render()`, `renderComponent()`, `setFilter()`, `clearFilters()`, `getFilters()`, `getState()`/`setState()`, `onFilters(fn)`, `compileMeasure()`, `collect()`, `exportCsv()`. El host puede enviar `postMessage({type:'rpt:print'|'rpt:clearFilters'|'rpt:setFilters'|'rpt:setState'|'rpt:collect'})` y recibe `rpt:ready`, `rpt:state` y `rpt:collected`.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitarios (Vitest)
npm run build      # genera dist/
npm run test:e2e   # tests e2e (Playwright, escritorio y móvil; requiere build)
npm run gen:data   # regenera la BD de ejemplo
```

## Despliegue en GitHub Pages

`.github/workflows/deploy.yml` ejecuta los tests, construye y publica en Pages en cada push a `main`. `ci.yml` ejecuta tests unitarios, build y e2e en cada PR. Requisito: *Settings → Pages → Source: GitHub Actions*.

## Limitaciones del prototipo

- Persistencia en `localStorage` del navegador (informes, historial, bloques).
- Consultas ejecutadas en el cliente sobre datos simulados. El visor «compartido» funciona en el mismo navegador.
