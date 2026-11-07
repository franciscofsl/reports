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

## 5. Siguientes pasos sugeridos

- Filtros interactivos y *cross-filtering* entre componentes (clic en una porción del donut filtra la tabla).
- Campos calculados y agregaciones en servidor para orígenes grandes (no traer miles de filas al navegador).
- Editor SQL con resaltado/autocompletado (Monaco/CodeMirror) y explorador del esquema real.
- Exportación a PDF/Excel, programación de envíos.
- Diff visual entre versiones del historial.
- Tests de regresión visual de la librería (cada versión publicada debe renderizar igual los informes existentes).
