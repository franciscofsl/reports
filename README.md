# Diseñador de informes HTML (prototipo)

Prototipo en React de un **asistente para crear informes HTML** con orígenes de datos SQL (simulados), un **editor visual de arrastrar y soltar**, un **editor visual de consultas** y una **librería propia de componentes** (estilo Fluent) servida por URL.

> Análisis, comparación con productos similares y recomendaciones: [`docs/ANALISIS.md`](docs/ANALISIS.md).

## Funcionalidades

### Asistente
- 4 pasos: información → orígenes de datos → diseño (o subir HTML) → revisión con vista previa.
- Galería de inicio: en blanco, **desde los datos** (diseño automático), plantillas *Ventas*, *Equipo comercial* e *Inventario*, o **subir HTML** (flujo clásico).

### Orígenes de datos
- **Editor visual de consultas**: arrastra tablas al lienzo; las relaciones `<tabla>_id → <tabla>.id` se unen solas, o une dos columnas con un clic en sus conectores (unión interna/izquierda). Marca columnas, elige función (año, mes, año-mes…), agregación, alias y orden; añade filtros por valor o por parámetro (opcionales con «ignorar si vacío»), DISTINCT y límite. Genera el SQL al momento.
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

### Ciclo de vida
- **Historial**: cada guardado crea una versión; ver, descargar, **etiquetar**, **comparar dos versiones** (componentes, SQL línea a línea, parámetros, tema) y **restaurar total o parcialmente** (diseño, orígenes o parámetros).
- **Borrador / publicado**: publica una versión y compártela con el **visor** (`#/view/<id>`).
- Listado con **buscador**, filtros por modo/estado y orden; **exportar/importar** informes (JSON con historial).
- HTML manual: subir/pegar/editar; si contiene el modelo del diseñador, se puede reabrir visualmente.

## Librería RptLib

Versiones publicadas como estáticos **inmutables** (`public/lib/rptlib/<versión>/`): `1.0.0` (inicial) y `1.1.0` (actual). Cada informe apunta a la suya, así que los informes antiguos no cambian al publicar una versión nueva; se pueden actualizar desde el panel *Informe → Librería*.

```html
<html lang="es-ES" data-rpt-palette="ocean" style="--rpt-brand:#8764b8">
<link rel="stylesheet" href="https://<host>/lib/rptlib/1.1.0/rptlib.css">
<script src="https://<host>/lib/rptlib/1.1.0/rptlib.js" defer></script>

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

API: `RptLib.render()`, `renderComponent()`, `setFilter()`, `clearFilters()`, `getFilters()`, `onFilters(fn)`, `exportCsv()`. El host puede enviar `postMessage({type:'rpt:print'|'rpt:clearFilters'|'rpt:setFilters'})`.

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
