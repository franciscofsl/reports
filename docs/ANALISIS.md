# Análisis: asistente de creación de informes HTML

## 1. Situación actual y objetivo

**Hoy:** se crea un informe, se sube un HTML y se cargan orígenes de datos. El HTML es opaco: quien no sabe HTML no puede crear informes, cada informe lleva su propio CSS/JS embebido (pesado y con estilos dispares) y no hay forma guiada de vincular datos.

**Objetivo:** un asistente que guíe la creación completa (datos → diseño → revisión), con un editor visual de arrastrar y soltar basado en una **librería propia de componentes** (grids, losetas, indicadores, gráficos) con estilo **Fluent**, servida por URL, y manteniendo el historial de versiones y la carga manual de HTML.

## 2. Qué hacen productos similares

| Producto | Idea que aprovechamos |
|---|---|
| **DevExpress / Telerik / Stimulsoft Report Designer** | *Field List*: el origen de datos expone sus campos con tipo; arrastrar un campo crea un control vinculado. Los controles vinculados muestran visualmente su enlace. Campos calculados y parámetros se gestionan en el mismo panel. |
| **Power BI / Looker Studio** | Separación estricta *dataset* (consulta + esquema tipado) ↔ *visual* (solo mapea campos a roles: eje, valor, leyenda). Agregaciones las elige el visual, no la consulta. Parámetros/filtros a nivel de informe. |
| **Metabase / Grafana / Redash** | El usuario escribe SQL con **parámetros nombrados** (`{{anio}}`, `$var`) que el servidor sustituye de forma segura; vista previa inmediata de resultados; paneles sobre una rejilla de 12/24 columnas. |
| **Retool / Appsmith** | Paleta de componentes + lienzo en rejilla + panel de propiedades generado a partir de un esquema declarativo de cada componente. |
| **GrapesJS / Builder.io** | El editor trabaja sobre un **modelo JSON** y genera HTML; el HTML lleva el modelo para poder reabrirlo. |
| **Fluent UI Web Components** | Tokens de diseño (colores, radios, sombras, tipografía) para tema claro/oscuro coherente; distribución vía CDN sin framework. |

## 3. Recomendaciones de diseño (aplicadas en el prototipo)

1. **Modelo como fuente de verdad, HTML como artefacto.** El diseñador edita un JSON (`rows → cells → {type, source, props, span}`) y genera el HTML. El HTML incluye `<script type="application/json" id="rpt-model">` para poder reabrirlo en el editor, incluso si se descarga y se vuelve a subir.
2. **HTML declarativo y ligero.** Cada componente es un `div` con `data-rpt` (tipo), `data-source` (id del origen) y `data-props` (JSON). Sin lógica, sin estilos embebidos: un informe típico pesa ~5 KB.
3. **Librería versionada por URL** (`/lib/rptlib/1.0.0/rptlib.{js,css}`), servida como estático de la app (o CDN). Versión **inmutable** en la ruta: un informe antiguo sigue funcionando aunque salga la 2.0; se puede cachear indefinidamente (`Cache-Control: immutable`). El diseñador usa *la misma* librería para el lienzo (WYSIWYG real).
4. **Orígenes de datos tipados.** Cada origen = `id` + SQL + lista de campos `{name, label, type, format}`. Los tipos se **infieren** al ejecutar y el usuario los ajusta (etiqueta, tipo, formato: moneda, %, fecha…). El panel de propiedades solo ofrece campos compatibles (p. ej. series numéricas en gráficos).
5. **El SQL nunca viaja en el HTML.** El HTML solo referencia ids de orígenes. En producción el servidor ejecuta las consultas y entrega `RPT_DATA` (inyectado o vía `<meta name="rpt-data-url">`).
6. **Seguridad en consultas:** solo `SELECT` (validado con parser, no con regex), una sentencia por origen, **parámetros nombrados** (`:anio`) enviados como parámetros (nunca concatenados). En servidor: usuario de BD de solo lectura, timeout y límite de filas.
7. **Aislamiento de la vista previa:** el informe se renderiza en un `iframe sandbox="allow-scripts"` (sin `allow-same-origin`), así un HTML subido a mano no puede acceder a la sesión de la app.
8. **Historial inmutable:** cada guardado crea una versión (con nota opcional) que guarda HTML + modelo + orígenes + parámetros. *Restaurar* no reescribe el pasado: crea una versión nueva con el contenido antiguo.
9. **Validación de vínculos antes de guardar:** se avisa de componentes que usan orígenes o campos inexistentes (típico al renombrar una consulta).
10. **Coexistencia con el flujo manual:** se puede subir/pegar HTML en cualquier momento. Si el HTML contiene modelo, se puede volver al diseñador; si no, queda como «HTML manual» y se avisa de orígenes no definidos o de que no referencia la librería.
11. **Móvil y PC:** rejilla de 12 columnas que colapsa (1/4 → 1/2 → completo) por *media queries* y componentes que se adaptan por *container queries*. En el diseñador móvil, la paleta/lienzo/propiedades se convierten en pestañas, se añade «tocar para insertar» y botones de mover (el *drag & drop* HTML5 no funciona bien con pantallas táctiles).
12. **Accesibilidad:** roles ARIA en pestañas, paso a paso, tablas con `aria-sort`, foco visible, navegación por teclado en la paleta (Intro), atajos `Supr`, `Ctrl+Z/Y`.

## 4. Arquitectura propuesta para producción

```
┌───────────── App (React) ─────────────┐        ┌──────── API ────────┐       ┌─────┐
│ Asistente · Diseñador · Orígenes · HTML │──────▶│ /reports  (CRUD)     │──────▶│ BD  │
│ Historial · Vista previa (iframe)       │        │ /reports/:id/versions│       │ SQL │
└─────────────────────────────────────────┘        │ /reports/:id/data?p= │──────▶│(RO) │
             ▲                                     └──────────────────────┘       └─────┘
             │  <link>/<script> versionados
   CDN/estáticos: /lib/rptlib/<versión>/rptlib.{css,js}
```

- `POST /reports/:id/data` ejecuta los orígenes con los parámetros recibidos (validados contra su definición de tipo) y devuelve `{ sources: { id: { fields, rows } } }`.
- El visor publicado es: HTML guardado + `RPT_DATA` inyectado en servidor (una sola petición) o carga diferida vía `rpt-data-url`.
- Permisos por informe y por origen; registro de quién ejecuta qué consulta.

## 5. Iteración 2: mejoras incorporadas al prototipo

| Área | Implementado | Referencia en productos similares |
|---|---|---|
| Interactividad | Componente filtro (desplegable, chips, búsqueda, rango), **filtro cruzado** por nombre de campo, barra de filtros activos, ver detalle | Slicers y *cross-filtering* de Power BI; filtros de Metabase |
| Exportación | CSV (separador `;` y decimal `,` para Excel en español), PNG de gráficos, imprimir/PDF con CSS de impresión | Menú «…» de cada visual en Power BI / Looker Studio |
| Componentes | Gauge, combinado con eje secundario, dispersión, tabla dinámica con mapa de calor, sparkline y variación en losetas, formato condicional y barras de datos | Matriz y formato condicional de Power BI; tarjetas con tendencia de Grafana |
| Tema | Marca, paleta, densidad, claro/oscuro y logo vía atributos y variables CSS | Tokens de Fluent UI (accent, layer, density) |
| Diseñador | Redimensionar por bordes, multiselección, alinear en fila, copiar/pegar entre informes, vista por dispositivo, diseño automático, bloques reutilizables | Retool/Appsmith (grid + resize), *Quick insights* de Power BI |
| Consultas | **Editor visual de consultas** (tablas, uniones automáticas por FK, columnas, agregaciones, filtros con parámetros), CodeMirror con autocompletado, campos calculados, orígenes derivados (`origen.<id>`), parámetros de lista y rango de fechas relativos | Query builder de Metabase («Notebook»), diseñador de consultas de DevExpress/Stimulsoft, *calculated fields* de Looker Studio |
| Ciclo de vida | Publicar versión + visor, comparar versiones (SQL línea a línea), etiquetas, restauración parcial, exportar/importar JSON | Revisiones de Google Docs/Grafana, «Publish» de Power BI |
| Calidad | Vitest (motor SQL, query builder, operaciones del modelo, plantillas, diff) y Playwright e2e escritorio + móvil en CI; carga diferida (bundle inicial de ~1,1 MB a ~260 KB) | — |

### Editor visual de consultas: decisiones

- **El modelo visual es la fuente de verdad** cuando el origen está en modo visual; el SQL se regenera en cada cambio y se muestra en solo lectura. Pasar a SQL manual es posible en cualquier momento; volver al visual sustituye el SQL (no se intenta interpretar SQL arbitrario, igual que Metabase con sus *native queries*).
- **Uniones por convención** (`<tabla>_id → <tabla>.id`) al soltar una tabla relacionada; el resto se crea uniendo columnas con dos clics (funciona igual con ratón y táctil).
- **Filtros incompletos se ignoran** con aviso en lugar de producir `= ''`; los parámetros opcionales generan `(:p IS NULL OR …)`.
- **Mismo motor** para visual y SQL: lo que se ve en la vista previa es exactamente lo que se ejecutaría.

## 6. Iteración 3: modelo semántico, analítica y paginados

| Área | Implementado | Referencia |
|---|---|---|
| Relaciones | Grafo de relaciones entre orígenes; el filtro se traduce a claves y viaja por caminos de hasta 4 saltos (además de la relación implícita por nombre de campo) | Relaciones del modelo de Power BI, *explores* de Looker |
| Medidas | Lenguaje de expresiones propio evaluado por grupo, con `TOTAL()` para porcentajes, condiciones `WHERE`, división segura; validación en vivo | DAX (`CALCULATE`, `DIVIDE`), medidas LookML |
| Jerarquías | Niveles por campo o por parte de fecha; profundizar por visual con migas; el último nivel filtra el informe | Drill down de Power BI / Tableau |
| Exploración | Páginas con filtros sincronizados o locales, panel de filtros de informe, marcadores con enlace que codifica el estado, selección asociativa | Bookmarks y *sync slicers* de Power BI; modelo asociativo de Qlik |
| Analítica | Comparación prev/YoY, líneas de referencia, previsión lineal con intervalo del 95 %, anomalías (z robusta sobre residuos), narrativa automática | Panel de análisis de Power BI/Tableau, *Smart narrative* |
| Visualizaciones | Mapa (contornos IGN cargados bajo demanda), cascada, embudo, treemap squarified, calendario, bullet, Sankey, múltiplos pequeños, iconos/semáforos, sparklines | Visuales estándar de Power BI y Tableau |
| Autor | Show Me por reglas (tipo de campo, cardinalidad, tiempo, geografía, etapas) con vista previa; temas JSON compatibles con Power BI | «Show Me» de Tableau, temas de Power BI |
| Paginados | `@page` con márgenes, cabecera, pie, numeración y fecha; saltos por componente y por grupo; tablas agrupadas con subtotales; subinformes; exportación DOCX/XLSX a partir del contenido real del informe | SSRS, Stimulsoft, Crystal Reports |

Decisiones:

- **Una sola fuente de verdad para exportar**: la librería, dentro del informe, recopila lo que el lector ve (filtros aplicados, imágenes de los gráficos, valores reales de las tablas y grupos) y la app genera los ficheros. Así Word, Excel y PDF coinciden con la pantalla.
- **Medidas evaluadas en el cliente sobre las filas del visual**: en producción conviene empujar la agregación al servidor para orígenes grandes (ver siguientes pasos).
- **Mapas como recurso estático versionado** junto a la librería (≈190 KB, solo se descarga si el informe tiene un mapa).

## 7. Siguientes pasos (fuera del alcance del prototipo)

- Backend real: ejecución de consultas y agregaciones en servidor, permisos, seguridad por filas, envíos programados y alertas.
- Diff visual (lado a lado) entre versiones del diseño.
- Pruebas de regresión visual de cada versión de RptLib.
