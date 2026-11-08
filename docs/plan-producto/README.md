# Plan de implementación: del prototipo al producto

Este documento ordena en fases el trabajo para llevar las funcionalidades del **prototipo** (este repositorio, React + RptLib) al **producto real** (backend .NET 10 con ABP y frontend Blazor).

> **Para quien implemente:** durante la implementación se tendrá acceso al código del prototipo. Cada fase indica qué ficheros del prototipo sirven de **especificación** y cuáles se pueden **reutilizar casi tal cual**. El prototipo es la referencia funcional (comportamiento, casos límite, mensajes); sus tests (`tests/*.test.js`) y e2e (`e2e/*.spec.js`) son la especificación ejecutable que hay que mantener en verde o portar.

---

## Índice

1. [Punto de partida](#1-punto-de-partida)
2. [Decisiones de arquitectura](#2-decisiones-de-arquitectura)
3. [Mapa prototipo → producto](#3-mapa-prototipo--producto)
4. [Fases](#4-fases)
   - [Fase 0 · Preparación y contratos](#fase-0--preparación-y-contratos)
   - [Fase 1 · RptLib como librería CSS/JS independiente](#fase-1--rptlib-como-librería-cssjs-independiente)
   - [Fase 2 · Modelo de dominio y API del informe (ABP)](#fase-2--modelo-de-dominio-y-api-del-informe-abp)
   - [Fase 3 · Motor de datos en servidor](#fase-3--motor-de-datos-en-servidor)
   - [Fase 4 · Visor de informes en Blazor](#fase-4--visor-de-informes-en-blazor)
   - [Fase 5 · SDK del diseñador (isla JS) y su envoltorio Blazor](#fase-5--sdk-del-diseñador-isla-js-y-su-envoltorio-blazor)
   - [Fase 6 · Diseñador de consultas y orígenes de datos](#fase-6--diseñador-de-consultas-y-orígenes-de-datos)
   - [Fase 7 · Pantalla de creación y edición](#fase-7--pantalla-de-creación-y-edición)
   - [Fase 8 · Listado de informes](#fase-8--listado-de-informes)
   - [Fase 9 · Dashboard personalizable](#fase-9--dashboard-personalizable)
   - [Fase 10 · Modelo semántico, analítica y paginados](#fase-10--modelo-semántico-analítica-y-paginados)
   - [Fase 11 · Exportación en servidor y envíos programados](#fase-11--exportación-en-servidor-y-envíos-programados)
   - [Fase 12 · Endurecimiento](#fase-12--endurecimiento)
5. [Dependencias entre fases](#5-dependencias-entre-fases)
6. [Riesgos principales](#6-riesgos-principales)
7. [Definición de terminado (todas las fases)](#7-definición-de-terminado-todas-las-fases)

---

## 1. Punto de partida

### Producto real (hoy)

| Área | Estado |
|---|---|
| Stack | Backend .NET 10 + ABP; frontend Blazor. |
| Creación de informes | Se sube un HTML y se definen consultas; el informe se genera con ellas. Sin diseñador visual de informe ni de consultas. |
| Librería de componentes | No existe como recurso separado: cada HTML lleva (o enlaza de forma ad hoc) su propio CSS/JS. |
| Páginas | 1) **Listado** de informes filtrado por permisos. 2) **Creación/edición** de informes. 3) **Dashboard** personalizable donde el usuario añade informes. |

### Prototipo (este repositorio)

| Área | Dónde está |
|---|---|
| Librería RptLib 1.2 (componentes, filtros, filtro cruzado, modelo semántico, analítica, paginados) | `lib-src/rptlib-1.2/*.js`, `public/lib/rptlib/<versión>/`, `scripts/build-rptlib.mjs`, `scripts/build-maps.mjs` |
| Modelo del informe ↔ HTML | `src/lib/htmlGenerator.js` |
| Operaciones sobre el modelo (insertar, mover, validar, renombrar orígenes) | `src/lib/modelOps.js` |
| Catálogo de componentes y esquema de propiedades | `src/lib/catalog.js` |
| Diseñador visual, panel de propiedades, Show Me, diseño automático, temas | `src/components/Designer.jsx`, `PropertyPanel.jsx`, `ShowMePanel.jsx`, `src/lib/autoLayout.js`, `showMe.js`, `themes.js`, `templates.js` |
| Editor visual de consultas, SQL → visual, editor SQL | `src/lib/queryBuilder.js`, `sqlToBuilder.js`, `src/components/QueryBuilder.jsx`, `SqlEditor.jsx`, `DataSourcesEditor.jsx` |
| Motor de consultas simulado (alasql), parámetros, campos calculados, orígenes derivados | `src/lib/sqlEngine.js`, `src/lib/reportData.js` |
| Modelo semántico (relaciones, medidas, jerarquías) | `src/components/SemanticEditor.jsx`, `lib-src/rptlib-1.2/10-semantic.js` |
| Vista previa aislada, parámetros, marcadores, exportación | `src/components/ReportFrame.jsx`, `ParamsBar.jsx`, `src/lib/exporters.js` |
| Historial, comparación, publicación | `src/lib/store.js`, `src/lib/diff.js`, `src/components/HistoryTab.jsx` |
| Páginas | `src/pages/ReportList.jsx`, `Wizard.jsx`, `ReportEditor.jsx`, `Viewer.jsx` |
| Análisis y decisiones de diseño | `docs/ANALISIS.md` |

Lo que el prototipo **simula** y el producto debe hacer de verdad: persistencia (`localStorage` en `store.js`), base de datos (JSON + alasql en `sqlEngine.js`), esquema y relaciones (deducidos por convención en `getSchema()`/`getRelations()`), permisos y compartición.

---

## 2. Decisiones de arquitectura

Conviene registrarlas como ADR en la Fase 0. Estas son las recomendaciones:

### 2.1 El modelo JSON es la fuente de verdad; el HTML es un artefacto

Igual que en el prototipo (`docs/ANALISIS.md`, §3): el diseñador edita un JSON (`pages → rows → cells → { type, source, props, span }`) y se genera el HTML declarativo (`data-rpt`, `data-source`, `data-props`) que pinta RptLib. El HTML **nunca** contiene SQL. Se mantiene el flujo de **HTML manual** (el actual del producto) como `Mode = Manual`.

### 2.2 Blazor para el «armazón», islas JS para los editores ricos

El diseñador de arrastrar y soltar, el lienzo del editor de consultas, CodeMirror y el panel de propiedades son ~3.000 líneas de interacción muy fina (arrastre, redimensionado, multiselección, táctil, deshacer). Reescribirlas en Blazor es caro y arriesgado.

**Recomendación:** empaquetar esos editores como un **SDK JS** (`rpt-designer`) que se monta en un `<div>` desde un componente Blazor mediante JS interop (`RptDesigner.mount(el, options) → handle`). Internamente puede seguir usando React (reutilizando el código del prototipo); para Blazor es una caja negra con una API pequeña.

| Lo hace Blazor (ABP) | Lo hace la isla JS |
|---|---|
| Rutas, menú, permisos, layout, formularios de metadatos (nombre, descripción, carpeta, permisos), guardar/publicar, listado, historial (lista), dashboard | Lienzo del diseñador, panel de propiedades, editor visual de consultas, editor SQL, editor del modelo semántico, comparación visual de versiones |
| Llama a los *Application Services* | Llama a la API solo a través de un **adaptador de host** que le inyecta Blazor (ver Fase 5) |

Alternativa (no recomendada para la primera entrega): reescritura completa en Blazor con interop solo para arrastrar/soltar y CodeMirror. Se puede abordar más adelante pantalla a pantalla si el equipo lo prefiere, usando el SDK como referencia.

> **Blazor Server:** el límite por defecto de mensaje de SignalR es 32 KB. El modelo de un informe grande lo supera. La isla no debe devolver el modelo completo por interop en cada cambio: mantiene el estado en JS, notifica solo `dirty`/`valid`, y al guardar envía la definición **directamente por HTTP** a la API (con el token/antiforgery de ABP) o la trocea. En Blazor WebAssembly el problema no existe, pero se mantiene la misma API para no depender del modo de hospedaje.

### 2.3 Las consultas se ejecutan y se generan en el servidor

- El servidor es la **autoridad**: genera el SQL del editor visual (dialecto real), valida, enlaza parámetros, aplica límites y ejecuta con un usuario de solo lectura.
- El cliente nunca envía SQL para ejecutar en el visor: envía el **id del informe/versión y valores de parámetros**. Solo en el editor (vista previa sin guardar) se envía la definición, y solo con un permiso específico.
- Las medidas del modelo semántico siguen evaluándose en RptLib sobre las filas del origen (como en el prototipo); la agregación en servidor para orígenes grandes se aborda en la Fase 12.

### 2.4 RptLib versionada e inmutable, servida por URL

`/lib/rptlib/<versión>/rptlib.{css,js}` con `Cache-Control: public, max-age=31536000, immutable`. Cada informe apunta a su versión (`model.libVersion`); publicar una versión nueva no cambia los informes existentes. Se conservan **todas** las versiones publicadas en el despliegue.

### 2.5 Aislamiento del informe

El informe se pinta en `<iframe sandbox="allow-scripts">` **sin** `allow-same-origin` (como `ReportFrame.jsx`). Consecuencia: el iframe tiene origen nulo, no envía cookies y no puede llamar a la API autenticada. Por eso los datos se **inyectan** en el HTML desde el servidor (`window.RPT_DATA`, ver `injectData()`), o se usa `rpt-data-url` con un **token firmado de corta duración**. La comunicación host ↔ informe es por `postMessage` (`rpt:ready`, `rpt:state`, `rpt:setState`, `rpt:collect`, `rpt:print`…).

### 2.6 Estructura propuesta de la solución

```
src/
  Xxx.Reporting.Domain.Shared/        # enums, constantes, localización (es, en…)
  Xxx.Reporting.Domain/               # entidades, repositorios, servicios de dominio (motor de datos)
  Xxx.Reporting.Application.Contracts/# DTOs, interfaces de app services, permisos
  Xxx.Reporting.Application/          # app services
  Xxx.Reporting.EntityFrameworkCore/  # DbContext, mapeos (columnas JSON), migraciones
  Xxx.Reporting.HttpApi/              # controladores (si se exponen además de los auto-API)
  Xxx.Reporting.Blazor/               # páginas y componentes (RCL), wwwroot con el SDK compilado
client/                               # workspace npm
  rptlib/                             # Fase 1: fuentes de la librería + build + tests
  rpt-designer/                       # Fase 5: SDK de editores (isla)
  shared-fixtures/                    # casos JSON compartidos entre tests JS y xUnit
```

Si el producto ya tiene un módulo de informes, se adapta a sus proyectos existentes; la separación por capas es la estándar de ABP.

---

## 3. Mapa prototipo → producto

| Prototipo | Producto | Estrategia |
|---|---|---|
| `lib-src/rptlib-1.2/`, `public/lib/rptlib/*` | `client/rptlib` → estáticos `/lib/rptlib/<v>/` | **Mover** y profesionalizar el build (Fase 1) |
| `htmlGenerator.js`, `modelOps.js`, `catalog.js`, `autoLayout.js`, `showMe.js`, `themes.js`, `templates.js`, `diff.js` | `client/rpt-designer/src/core` | **Reutilizar** casi tal cual (quitar dependencias de `store.js` y `import.meta.env`) |
| `Designer.jsx`, `PropertyPanel.jsx`, `ShowMePanel.jsx`, `SemanticEditor.jsx`, `QueryBuilder.jsx`, `SqlEditor.jsx`, `DataSourcesEditor.jsx`, `HtmlTab.jsx`, `LiveComponent.jsx` | `client/rpt-designer/src/ui` | **Reutilizar** dentro de la isla; sustituir llamadas a `store.js`/`sqlEngine.js` por el adaptador de host |
| `store.js` (localStorage) | Entidades ABP + app services + EF Core | **Reescribir** en C# (la API de `store.js` sirve de lista de casos de uso) |
| `sqlEngine.js` (alasql), `reportData.js` | Servicio de dominio `ReportDataEngine` en C# | **Portar**: orden de ejecución, dependencias, ciclos, parámetros, fechas relativas, campos calculados, subinformes |
| `queryBuilder.js` (`toSql`) | `QueryBuilderSqlGenerator` en C# por dialecto | **Portar** usando `tests/queryBuilder.test.js` como fixtures |
| `sqlToBuilder.js` | Parser de servidor (p. ej. `Microsoft.SqlServer.TransactSql.ScriptDom` si es SQL Server) | **Portar** con `tests/sqlToBuilder.test.js` como fixtures |
| `getSchema()` / `getRelations()` | Catálogo de datos: `INFORMATION_SCHEMA` + FKs reales + lista blanca | **Reescribir** |
| `ReportFrame.jsx`, `ParamsBar.jsx` | Componentes Blazor `ReportViewer`, `ReportParamsBar` + pequeño JS de puente `postMessage` | **Reescribir** en Blazor reutilizando el protocolo de mensajes |
| `exporters.js` (DOCX/XLSX en cliente) | Igual en cliente (Fases 4–10) y en servidor (Fase 11) | **Reutilizar** y luego **portar** |
| `ReportList.jsx`, `Wizard.jsx`, `ReportEditor.jsx`, `Viewer.jsx` | Páginas Blazor existentes | **Rediseñar** las páginas existentes con lo aprendido |
| `tests/*.test.js`, `e2e/*.spec.js` | Vitest en `client/*`, xUnit en .NET, Playwright contra Blazor | **Mantener / portar** |

---

## 4. Fases

Cada fase indica: objetivo, código del prototipo de referencia, tareas, entregables y criterios de aceptación. Las fases 1–4 ya aportan valor al producto actual (librería separada, motor de datos sólido, mejor visor) **antes** de tener el diseñador.

---

### Fase 0 · Preparación y contratos

**Objetivo:** fijar decisiones y contratos para que el resto de fases puedan avanzar en paralelo.

**Referencia en el prototipo:** `docs/ANALISIS.md`, `src/lib/htmlGenerator.js`, `src/lib/catalog.js`, `src/lib/store.js` (forma de `report` y de `snapshot`), `src/lib/reportData.js` (forma de `RPT_DATA`).

**Tareas**

1. Inventario del producto actual: entidad de informe, cómo se guardan HTML y consultas, conexiones a BD, motor/dialecto SQL, permisos existentes, modo de hospedaje Blazor (Server / WebAssembly / Web App), tema visual (LeptonX, Blazorise…), cómo se pinta hoy el dashboard.
2. Escribir ADR para las decisiones de la §2 (islas JS, ejecución en servidor, librería versionada, aislamiento, dialecto SQL objetivo).
3. Definir **JSON Schema versionado** (`schemaVersion`) de:
   - `ReportDefinition`: `model` (páginas, filas, celdas, tema, `paper`, `reportFilters`, `libVersion`), `dataSources[]` (id, nombre, `mode: sql|visual`, `sql`, `builder`, `fields[]`, `calculated[]`, conexión), `params[]`, `semantic`.
   - `RPT_DATA`: `{ sources: { id: { fields, rows } }, params, semantic, subreports, generatedAt }`.
   - Protocolo `postMessage` host ↔ informe (los mensajes existentes en `70-report.js` y `ReportFrame.jsx`).
4. Crear `client/shared-fixtures/` con ejemplos de definiciones (exportar las plantillas de `templates.js`: *Ventas*, *Equipo comercial*, *Inventario*) que usarán los tests de JS y de .NET.
5. Definir permisos ABP (borrador):
   - `Reporting.Reports` (ver), `.Create`, `.Edit`, `.Delete`, `.Publish`, `.ManageHistory`
   - `Reporting.Reports.EditSql` (escribir SQL libre; separado del editor visual)
   - `Reporting.DataCatalog.Manage` (conexiones, tablas expuestas)
   - `Reporting.Dashboard` (personalizar el propio)
6. Preparar el workspace `client/` (npm workspaces, Node LTS) y su integración en el pipeline de CI del producto.

**Entregables:** ADRs, JSON Schemas, fixtures, lista de permisos, CI con el workspace `client/` vacío compilando.

**Aceptación:** las plantillas del prototipo validan contra los JSON Schemas; el equipo ha aprobado los ADR.

---

### Fase 1 · RptLib como librería CSS/JS independiente

**Objetivo:** que la librería de componentes exista como recurso propio, versionado, probado y servido por URL desde el producto; utilizable ya por los informes HTML actuales.

**Referencia en el prototipo:** `lib-src/rptlib-1.2/*.js` (fuentes por módulos), `public/lib/rptlib/1.2.0/rptlib.css`, `public/lib/rptlib/1.2.0/maps/es.js`, `scripts/build-rptlib.mjs`, `scripts/build-maps.mjs`, `tests/rptlib.test.js`, README del prototipo (sección *Librería RptLib*: atributos, props y API).

**Tareas**

1. Mover las fuentes a `client/rptlib/src/` manteniendo los módulos (`00-core` … `70-report`) y el CSS.
2. Build profesional (esbuild o Rollup) que genere, por versión:
   - `rptlib.js` (IIFE sin dependencias, como hoy), `rptlib.min.js`, `rptlib.css`, `rptlib.min.css`, *source maps*.
   - `maps/es.js` (carga bajo demanda, ruta relativa a la del script, como `BASE` en `00-core.js`).
   - Hashes **SRI** (`integrity`) y un `manifest.json` (versión, ficheros, hashes, changelog).
   - Mantener el escape a ASCII (`\uXXXX`) que hace `build-rptlib.mjs` para no depender del *charset* del servidor.
3. **Versionado semántico** y política de inmutabilidad: una versión publicada no se modifica nunca; correcciones = nueva versión de parche. Script `release` que copia la salida a `.../wwwroot/lib/rptlib/<versión>/` y falla si la carpeta ya existe.
4. Publicación desde el producto: middleware/StaticFiles en el Host ABP para `/lib/rptlib/**` con `Cache-Control: immutable`, `Content-Type` correcto y CORS si se usa otro dominio/CDN. Opcional: publicar también en un CDN.
5. **Internacionalización** de la librería: extraer los textos fijos (menú «Ver datos», «Exportar CSV», narrativa, «Página X de Y»…) a un diccionario por idioma seleccionado con `<html lang>`; `es-ES` por defecto y `en` como segundo idioma.
6. **Alinear tokens visuales** (Fluent) con el tema del producto: variables CSS `--rpt-brand`, `--rpt-bg`, fuentes, radios; documentar cómo el host fija la marca del inquilino (ABP multi-tenant) sin tocar la librería.
7. Tests:
   - Unitarios (Vitest + jsdom): portar `tests/rptlib.test.js` y añadir uno por componente (render con fixtures).
   - **Regresión visual** (Playwright, capturas por componente y tema claro/oscuro) para detectar cambios entre versiones.
8. Documentación de la librería (`client/rptlib/README.md`): atributos `data-rpt`, props por componente, modelo semántico en el HTML, API JS, protocolo `postMessage`, tabla de compatibilidad por versión.
9. **Adopción en el producto actual**: en el flujo existente de «subir HTML», ofrecer una plantilla HTML base que enlace la librería (ver `MANUAL_SAMPLE_HTML` en `templates.js`) y un aviso si el HTML no la referencia (como hace `HtmlTab.jsx`). Los informes antiguos con CSS/JS embebido siguen funcionando sin cambios.

**Entregables:** paquete `client/rptlib`, versión `1.2.x` (o `2.0.0` si se rompen contratos) servida desde el producto, documentación, tests unitarios y visuales en CI.

**Aceptación:** un HTML manual que enlaza `/lib/rptlib/<v>/rptlib.css|js` con `RPT_DATA` inyectado se pinta igual que en el prototipo; las cabeceras de caché son `immutable`; publicar dos veces la misma versión falla.

---

### Fase 2 · Modelo de dominio y API del informe (ABP)

**Objetivo:** persistir la definición completa del informe, su historial inmutable y su estado de publicación, sustituyendo lo que hace `store.js`.

**Referencia en el prototipo:** `src/lib/store.js` (casos de uso: crear, guardar con nota, versiones, restaurar total o parcial, publicar/despublicar, etiquetar, duplicar, exportar/importar, bloques reutilizables, marcadores), `src/lib/diff.js`, `src/lib/modelOps.js` (`validateModel`).

**Tareas**

1. Ampliar la entidad existente de informe (agregado raíz `Report`, `FullAuditedAggregateRoot<Guid>`, `IMultiTenant`):
   - `Name`, `Description`, `Folder/Category`, `Mode` (`Manual` | `Designer`), `Status` (borrador/publicado), `LibVersion`.
   - Borrador actual: `Html` (solo en modo manual), `Model` (JSON), `DataSources` (JSON o entidad hija), `Params` (JSON), `Semantic` (JSON), `SchemaVersion`.
   - `PublishedVersionId`.
   - Columnas JSON en EF Core (`OwnsOne(...).ToJson()` o `nvarchar(max)` con conversor), según el proveedor de BD.
2. Entidad `ReportVersion` (inmutable): `Number`, `Note`, `Label`, `CreatedBy/At`, instantánea completa (`Mode`, `Html`, `Model`, `DataSources`, `Params`, `Semantic`, `LibVersion`). *Restaurar* crea una versión nueva (no reescribe el pasado), con restauración parcial por partes (`design`, `data`, `params`) como `restoreVersion()`.
3. Entidades auxiliares: `ReportBlock` (bloques reutilizables por usuario o compartidos), `ReportBookmark` (vistas guardadas: estado de filtros, nivel de profundización, página, parámetros; privadas o compartidas).
4. **Migración de datos** de los informes existentes: HTML subido → `Mode = Manual`; consultas actuales → `DataSources` con `mode: sql`; se crea la versión 1 con la nota «Migrado».
5. *Application Services* (`IReportAppService`, `IReportVersionAppService`, …): CRUD, `SaveAsync(id, definition, note)` (crea versión), `GetVersionsAsync`, `GetVersionAsync`, `RestoreAsync(id, versionId, parts)`, `PublishAsync(id, versionId)`, `UnpublishAsync`, `SetVersionLabelAsync`, `DuplicateAsync`, `ExportAsync(withHistory)` / `ImportAsync` (formato JSON compatible con el del prototipo).
6. **Validación en servidor** antes de guardar: JSON Schema; vínculos rotos (orígenes o campos inexistentes, medidas/jerarquías inexistentes: portar `validateModel()`); en modo `Designer` el HTML se **regenera en servidor** o se valida que el enviado corresponde al modelo (recomendado: el cliente envía el modelo y el servidor genera el HTML con un generador portado o con el mismo `htmlGenerator.js` ejecutado en un paso controlado; elegir en la Fase 0).
7. **Permisos**: comprobación por informe (los permisos existentes del listado) en todos los servicios; `EditSql` requerido para guardar orígenes en modo SQL o cambiar su SQL.
8. Concurrencia optimista (`ConcurrencyStamp` de ABP): si dos personas editan el mismo informe, el segundo guardado recibe conflicto y se le ofrece comparar.
9. Límite de versiones retenidas configurable (el prototipo usa 50) mediante *Settings* de ABP, sin borrar nunca la versión publicada ni las etiquetadas.
10. Tests xUnit de dominio y de aplicación (ABP test base) con los fixtures de la Fase 0.

**Entregables:** entidades, migraciones EF Core, app services, permisos, migración de informes existentes.

**Aceptación:** los casos de uso de `store.js` existen en la API; los informes existentes siguen viéndose; las versiones no se pueden modificar; restaurar crea una versión nueva.

---

### Fase 3 · Motor de datos en servidor

**Objetivo:** ejecutar los orígenes de datos de forma segura y producir `RPT_DATA`, sustituyendo `sqlEngine.js` (alasql) y `reportData.js`.

**Referencia en el prototipo:** `src/lib/sqlEngine.js` (`validateSql`, `sqlParams`, `sqlDependencies`, `executionOrder`, `resolveParams`, `resolveRelativeDate`, `presetRange`, `defaultParamValue`, `paramOptions`, `applyCalculated`, `inferFields`, `mergeFields`, `buildReportData`, `runDataSource`), `src/lib/reportData.js` (`buildFullData`: subinformes, prefijos y herencia de parámetros), `tests/core.test.js`, `tests/features.test.js`.

**Tareas**

1. **Catálogo de datos** (administración): conexiones (cadena cifrada, proveedor, usuario de solo lectura), esquemas/tablas/vistas **expuestos** (lista blanca), etiquetas amigables, relaciones reales (FKs de `INFORMATION_SCHEMA`) más relaciones manuales. Sustituye a `getSchema()`/`getRelations()`. Endpoint `GetSchemaAsync(connectionId)` filtrado por permisos para el editor.
2. **Validación de SQL** con parser real del dialecto (p. ej. `ScriptDom` para SQL Server): una sola sentencia `SELECT`; prohibidos DDL/DML, `EXEC`, `INTO`, `OPENROWSET`, servidores enlazados, comentarios con sentencias, etc.; solo tablas del catálogo expuesto. Nunca con expresiones regulares.
3. **Parámetros**: nombrados (`:p` en el prototipo → `@p` en el dialecto), siempre como `DbParameter` tipado, nunca concatenados; tipos `text`, `number`, `date` (fija o relativa: hoy, inicio de mes/año…), `list` (estática o desde consulta) y `daterange` (`:p_desde`/`:p_hasta`); parámetros opcionales (`(@p IS NULL OR …)`). Validar los valores recibidos contra su definición.
4. **Orígenes derivados** (`FROM origen.<id>`): resolver orden y ciclos como `executionOrder()`. Recomendado: componer como CTE cuando comparten conexión; si no, ejecutar en memoria con límite de filas.
5. **Campos calculados**: traducir la expresión a SQL (`SELECT q.*, <expr> AS <nombre> FROM (<consulta>) q`) validándola con el parser (solo funciones permitidas), o evaluarla en servidor sobre las filas. Mantener los mensajes de error del prototipo.
6. **Límites y protección**: timeout por consulta, máximo de filas (el prototipo usa 10.000) y de tamaño de respuesta, concurrencia por usuario, cancelación (`CancellationToken`).
7. **Inferencia y fusión de campos** (`inferFields`/`mergeFields`) a partir del esquema del `DataReader`: el usuario conserva etiquetas, tipos y formatos editados.
8. **Subinformes**: portar `buildFullData()` (prefijos `subN_`, herencia de parámetros homónimos, renombrado de medidas/jerarquías, protección contra ciclos) comprobando permisos sobre el informe enlazado.
9. Endpoints:
   - `POST /api/app/report-data/{reportId}` → `RPT_DATA` de la versión publicada (o del borrador si se tiene `Edit`), con valores de parámetros.
   - `POST /api/app/report-data/preview` → ejecuta una definición sin guardar (editor; requiere `Edit`, y `EditSql` si contiene SQL libre).
   - `POST /api/app/report-data/preview-source` → un único origen con sus dependencias (`runDataSource`), con tiempo de ejecución.
   - `GET /reports/{id}/render?v=...` → HTML del informe con `RPT_DATA` inyectado (ver 2.5), con cabeceras CSP.
10. **Caché** opcional por (versión, parámetros, usuario/inquilino) con caducidad configurable; invalidación al publicar.
11. **Auditoría**: registrar quién ejecuta qué origen, con qué parámetros y cuánto tarda (auditoría de ABP + log estructurado).
12. Seguridad por filas (preparación): punto de extensión `IReportDataFilterProvider` para inyectar filtros por usuario/inquilino (se completa en la Fase 12).
13. Tests: portar los casos de `tests/core.test.js` y `features.test.js` relativos a parámetros, fechas relativas, dependencias, ciclos y campos calculados; tests de integración con una BD de pruebas (Testcontainers) cargada con `src/data/sampledb.json` para comparar resultados con el prototipo.

**Entregables:** catálogo de datos, motor de ejecución, endpoints de datos y de renderizado.

**Aceptación:** las plantillas del prototipo, ejecutadas contra la BD de pruebas, producen `RPT_DATA` equivalente al del prototipo; ninguna consulta no-SELECT ni de tablas no expuestas pasa la validación; los parámetros nunca se concatenan.

---

### Fase 4 · Visor de informes en Blazor

**Objetivo:** un componente reutilizable para ver informes (listado, editor y dashboard) con parámetros, filtros, marcadores y exportación.

**Referencia en el prototipo:** `src/components/ReportFrame.jsx` (iframe sandbox, dispositivos, estado, marcadores, exportaciones), `src/components/ParamsBar.jsx`, `src/pages/Viewer.jsx`, `src/lib/exporters.js`, `lib-src/rptlib-1.2/70-report.js` (mensajes `rpt:*`), `e2e/app.spec.js`, `e2e/v3.spec.js`.

**Tareas**

1. Componente `ReportViewer` (Blazor) con parámetros `ReportId`, `VersionId?`, `InitialParams`, `InitialState`, `Height`, `ShowToolbar`, `Compact` (para el dashboard).
2. `<iframe sandbox="allow-scripts">` apuntando al endpoint `render` (o con `srcdoc` para el borrador en el editor). Sin `allow-same-origin`.
3. Módulo JS de puente (`reportBridge.js`, módulo ES cargado con `IJSObjectReference`): reenvía `rpt:ready`, `rpt:state`, `rpt:filters`, `rpt:collected` a .NET con `DotNetObjectReference`; expone `post(message)`. Filtrar `event.source` para aceptar solo mensajes del iframe propio.
4. `ReportParamsBar` (Blazor): genera los controles desde la definición de parámetros (texto, número, fecha, lista, rango con periodos predefinidos), «Aplicar» recarga los datos.
5. Barra de herramientas: filtros activos y «Quitar filtros», vista por dispositivo (escritorio/tablet/móvil), imprimir/PDF (`rpt:print`), exportar **Word/Excel** (de momento en cliente: `rpt:collect` + `exporters.js` empaquetado como módulo JS), pantalla completa.
6. **Marcadores/vistas guardadas** sobre la entidad `ReportBookmark`: guardar estado (`rpt:state`), aplicar (`rpt:setState`), compartir por enlace (`encodeView`/`decodeView`, o mejor un id de marcador en la URL).
7. Estados de carga, error por origen (los `errors` de `buildReportData`) y vacío; localización con ABP.
8. Usar el visor en la página de **listado** (vista del informe) y en el **dashboard** actual (sustituyendo el pintado actual) para validar el componente con usuarios reales.
9. Tests bUnit del componente y e2e Playwright (portar los escenarios de lectura de `e2e/app.spec.js`: filtros, filtro cruzado, ver datos, exportar CSV).

**Entregables:** `ReportViewer`, `ReportParamsBar`, puente JS, exportación cliente, marcadores.

**Aceptación:** un informe migrado (manual) y una plantilla del prototipo (diseñador) se ven en el listado y en el dashboard con parámetros, filtros, marcadores y exportación; el iframe no puede acceder a la sesión.

---

### Fase 5 · SDK del diseñador (isla JS) y su envoltorio Blazor

**Objetivo:** convertir los editores del prototipo en un paquete embebible, desacoplado de `localStorage` y de alasql.

**Referencia en el prototipo:** `src/components/Designer.jsx`, `PropertyPanel.jsx`, `LiveComponent.jsx`, `ShowMePanel.jsx`, `Icon.jsx`, `src/lib/modelOps.js`, `catalog.js`, `htmlGenerator.js`, `autoLayout.js`, `showMe.js`, `themes.js`, `templates.js`, `diff.js`, `src/styles.css`, `e2e/app.spec.js` y `e2e/mobile.spec.js` (escenarios de diseño).

**Tareas**

1. Crear `client/rpt-designer` (Vite en modo librería) con:
   - `core/`: los módulos de `src/lib` reutilizables (sin cambios funcionales). Sustituir `import.meta.env.BASE_URL` en `libBaseUrl()` por una opción `libBaseUrl` que pasa el host.
   - `ui/`: los componentes React de los editores.
   - `index.js`: API pública.
2. **API pública** (estable y documentada):
   ```js
   const handle = RptDesigner.mount(element, {
     view: 'design' | 'data' | 'semantic' | 'html' | 'compare',
     definition,            // ReportDefinition (JSON Schema de la Fase 0)
     host,                  // adaptador (ver abajo)
     locale, theme, readOnly, libBaseUrl, permissions: { editSql, ... }
   });
   handle.getDefinition();  handle.setDefinition(def);  handle.setView(v);
   handle.validate();       handle.undo(); handle.redo();  handle.destroy();
   handle.on('change' | 'dirty' | 'validation' | 'selection', fn);
   ```
3. **Adaptador de host** (sustituye `store.js` y `sqlEngine.js` en la isla): `getSchema(connectionId)`, `previewSource(ds, params)`, `previewReport(def, params)`, `listBlocks()/saveBlock()/deleteBlock()`, `listReports()` (para subinformes), `clipboard` (copiar/pegar entre informes; puede seguir usando `localStorage` del navegador), `parseSql(sql)` y `builderToSql(builder)` (llaman al servidor, Fase 6), `notify(msg)`.
4. Implementación del adaptador en el lado Blazor: un módulo JS que hace `fetch` a los app services de ABP (cabeceras de autenticación/antiforgery que ya use el producto) para evitar pasar datos grandes por interop (ver 2.2).
5. Componente Blazor `ReportDesignerHost` que monta la isla (`OnAfterRenderAsync`), recibe eventos (`dirty`, `validation`) mediante `DotNetObjectReference` y la desmonta en `DisposeAsync`.
6. **Estilos**: aislar el CSS del prototipo (`styles.css`, prefijo `ui-`) bajo un contenedor raíz (`.rpt-designer`) o Shadow DOM para que no choque con el tema de ABP, y mapear sus colores a los tokens del producto.
7. Localización: extraer textos de los componentes a recursos (`es`, `en`); el host pasa el idioma de ABP.
8. Mantener las capacidades del diseñador: paleta, arrastrar/soltar y tocar en móvil, redimensionar en 12 columnas, multiselección, alinear en fila, copiar/pegar, duplicar, deshacer/rehacer, vista por dispositivo, diseño automático, bloques, tema (marca, paleta, densidad, claro/oscuro, logo, temas JSON), avisos de vínculos rotos, Show Me, multipágina.
9. Tests: Vitest para `core/` (portar `tests/core.test.js` y `features.test.js`), Playwright de la isla sobre una página de pruebas con un adaptador simulado (los escenarios de `e2e/app.spec.js` y `e2e/mobile.spec.js`).

**Entregables:** paquete `rpt-designer` compilado en el `wwwroot` del proyecto Blazor, componente `ReportDesignerHost`, documentación de la API.

**Aceptación:** la isla funciona embebida en una página Blazor de pruebas con datos reales de la API; no queda ninguna referencia a `store.js`, `sqlEngine.js` ni alasql en el paquete.

---

### Fase 6 · Diseñador de consultas y orígenes de datos

**Objetivo:** editor visual de consultas y editor SQL sobre el esquema real, con la generación y la interpretación de SQL en servidor.

**Referencia en el prototipo:** `src/lib/queryBuilder.js` (`addTable`, uniones automáticas, `toggleColumn`, funciones de fecha, agregaciones, filtros por valor y por parámetro, `toSql`, `builderParams`), `src/lib/sqlToBuilder.js` (interpretación y motivos de `Unsupported`), `src/components/QueryBuilder.jsx`, `SqlEditor.jsx` (CodeMirror con autocompletado), `DataSourcesEditor.jsx` (campos, tipos, formatos, campos calculados, parámetros, renombrar orígenes), `tests/queryBuilder.test.js`, `tests/sqlToBuilder.test.js`.

**Tareas**

1. **Generación de SQL en servidor** (`QueryBuilderSqlGenerator`, C#): portar `toSql()` al dialecto del producto (comillas de identificadores, `TOP`/`OFFSET…FETCH` vs `LIMIT`, funciones de fecha año/mes/año-mes/trimestre, `DISTINCT`, alias, orden, filtros opcionales). El modelo `builder` se guarda en el origen; el SQL se regenera siempre en servidor al guardar y al ejecutar.
2. **SQL → visual en servidor**: portar `sqlToBuilder()` sobre el parser del dialecto, devolviendo el mismo `builder` o un motivo de no soportado (expresiones, `CASE`, `OR`, `HAVING`, subconsultas, `RIGHT JOIN`…). Verificación de equivalencia: ejecutar ambas consultas con `TOP n` y comparar, como hace el prototipo.
3. Fixtures compartidos: convertir `tests/queryBuilder.test.js` y `tests/sqlToBuilder.test.js` en casos JSON (`builder` → SQL esperado por dialecto) usados por xUnit.
4. En la isla: el lienzo del editor visual usa `host.getSchema()` (tablas expuestas, columnas tipadas, etiquetas, **relaciones reales** para uniones automáticas en lugar de la convención `<tabla>_id`); el SQL de solo lectura que se muestra viene de `host.builderToSql()` (con *debounce*).
5. CodeMirror con dialecto del producto y autocompletado de tablas/columnas del catálogo y de `origen.<id>`; validación en servidor al escribir (*debounce*) con mensajes del parser.
6. Gestión de orígenes: crear (visual/SQL), duplicar, renombrar con actualización de componentes y relaciones semánticas (`renameSource`, `renameSourceInSemantic`), selección de conexión, vista previa de resultados con tiempo de ejecución, edición de campos (etiqueta, tipo, formato), campos calculados.
7. Editor de parámetros: todos los tipos de la Fase 3, valores por defecto, lista desde consulta, periodos predefinidos.
8. Permisos en la UI: sin `EditSql` solo se ve el editor visual (el SQL generado en lectura); con él, se puede pasar a SQL manual.

**Entregables:** generador e intérprete SQL en servidor, editor de orígenes completo en la isla.

**Aceptación:** todos los casos de los tests del prototipo pasan en xUnit para el dialecto objetivo; un usuario sin `EditSql` puede crear un informe completo solo con el editor visual.

---

### Fase 7 · Pantalla de creación y edición

**Objetivo:** rehacer la página existente de creación/edición con asistente, pestañas y ciclo de vida, conservando la subida de HTML.

**Referencia en el prototipo:** `src/pages/Wizard.jsx` (galería de inicio: en blanco, desde los datos, plantillas, subir HTML; pasos información → orígenes → diseño → revisión), `src/pages/ReportEditor.jsx` (pestañas Vista previa / Diseño / Orígenes / Modelo / HTML / Historial, detección de cambios sin guardar, nota de versión, validación antes de guardar), `src/components/HtmlTab.jsx`, `HistoryTab.jsx`, `src/lib/diff.js`, `src/lib/templates.js`.

**Tareas**

1. **Asistente de creación** (Blazor, pasos con la isla en los pasos 2 y 3):
   1. Información: nombre, descripción, carpeta, permisos (los del producto).
   2. Orígenes de datos: isla en vista `data`.
   3. Diseño: galería de inicio (en blanco, **desde los datos** con `autoLayout`, plantillas, **subir HTML**) y la isla en vista `design`.
   4. Revisión: `ReportViewer` sobre el borrador + avisos de validación; crear.
2. **Editor** (Blazor) con pestañas; las pestañas Diseño, Orígenes, Modelo y HTML montan la isla con la vista correspondiente (una sola instancia, `handle.setView()`, para no perder deshacer/rehacer al cambiar de pestaña).
3. Pestaña **HTML**: en modo manual, subir/pegar/editar (flujo actual del producto); si el HTML contiene `rpt-model`, ofrecer «Abrir en el diseñador» (`parseModelFromHtml`); avisos de orígenes no definidos o de librería no referenciada (`sourcesUsedInHtml`). En modo diseñador, HTML generado en solo lectura con opción «Convertir a manual».
4. **Guardar** con nota de versión, validación en servidor (Fase 2) y control de concurrencia; aviso al salir con cambios sin guardar (`beforeunload` + `NavigationLock` de Blazor).
5. **Historial** (Blazor): lista de versiones con autor, fecha, nota y etiqueta; ver, descargar, etiquetar, **comparar dos versiones** (isla en vista `compare` usando `diffVersions`/`lineDiff`), **restaurar total o parcial**, publicar/despublicar.
6. Plantillas: guardarlas como datos (tabla `ReportTemplate` o recursos embebidos) en lugar de código, y permitir «Guardar como plantilla».
7. e2e: crear un informe con el asistente de punta a punta, editarlo, comparar versiones, restaurar y publicar.

**Entregables:** asistente y editor nuevos sustituyendo a la pantalla actual.

**Aceptación:** se puede crear un informe sin escribir HTML ni SQL; el flujo de subir HTML sigue funcionando igual que hoy; el historial cubre los casos de `HistoryTab.jsx`.

---

### Fase 8 · Listado de informes

**Objetivo:** mejorar la página existente de informes por permisos.

**Referencia en el prototipo:** `src/pages/ReportList.jsx` (buscador, filtros por modo/estado, orden, duplicar, exportar/importar).

**Tareas**

1. Mantener el filtrado por permisos actual y añadir: buscador (nombre/descripción), filtros por carpeta, modo (diseñador/manual), estado (borrador/publicado) y autor; orden por nombre o fecha; paginación en servidor.
2. Acciones según permisos: ver (Fase 4), editar, duplicar, eliminar, publicar, exportar/importar JSON (con o sin historial), **añadir al dashboard**.
3. Favoritos y recientes por usuario.
4. Miniaturas (opcional): captura generada en servidor al publicar (headless Chromium, Fase 11) o icono por tipo.
5. Indicadores: versión publicada, cambios sin publicar, fecha de última modificación.

**Aceptación:** un usuario solo ve y opera los informes a los que tiene permiso; la búsqueda y los filtros funcionan con cientos de informes.

---

### Fase 9 · Dashboard personalizable

**Objetivo:** pasar de «añadir informes» a un tablero flexible por usuario.

**Referencia en el prototipo:** rejilla de 12 columnas y redimensionado del diseñador (`Designer.jsx`, `modelOps.js`), `ReportFrame.jsx` (estado y marcadores), RptLib (`renderComponent()`, `setFilter()`, `getState()/setState()`).

**Tareas**

1. Entidad `UserDashboard` (uno o varios por usuario, con uno por defecto) con `Tiles[]`: posición/tamaño en rejilla, tipo (`report` | `visual`), referencia (informe, versión publicada o «siempre la última publicada»), parámetros, marcador aplicado, título propio.
2. Rejilla con arrastrar y redimensionar (biblioteca JS ligera o la lógica de rejilla de la isla) y modo edición/lectura; diseño adaptable a móvil.
3. Mosaico **informe**: `ReportViewer` en modo compacto con parámetros y marcador propios.
4. Mosaico **visual anclado** («anclar al dashboard» desde el menú de una tarjeta en el visor): guarda informe + id de celda + estado de filtros; se pinta solo ese componente con los datos del informe (endpoint de datos limitado a los orígenes que usa la celda).
5. Actualización: manual y periódica configurable por mosaico; indicador de «actualizado hace…».
6. Dashboards compartidos/predefinidos por rol (opcional): un administrador publica un dashboard base que los usuarios pueden clonar.
7. Respeto de permisos: si el usuario pierde acceso a un informe, el mosaico muestra un aviso en lugar de los datos.

**Aceptación:** el usuario compone, mueve y redimensiona mosaicos de informes y visuales, con parámetros propios, y el estado persiste entre sesiones y dispositivos.

---

### Fase 10 · Modelo semántico, analítica y paginados

**Objetivo:** habilitar en el producto las capacidades avanzadas de RptLib 1.2 que dependen del editor y del servidor.

**Referencia en el prototipo:** `src/components/SemanticEditor.jsx`, `lib-src/rptlib-1.2/10-semantic.js` (relaciones, medidas, jerarquías, selección asociativa), `40-chart.js` y `50-viz.js` (comparación temporal, líneas de referencia, previsión, anomalías, narrativa, mapas, cascada, embudo, treemap, calendario, bullet, Sankey, múltiplos pequeños), `60-tables.js` (agrupación, subtotales, sparklines), `70-report.js` (páginas, filtros de informe, `collect()`), `htmlGenerator.js` (`paperCss`, páginas, `data-rpt-filters`), `exporters.js`, `e2e/v3.spec.js`.

**Tareas**

1. Pestaña **Modelo** del editor (isla, vista `semantic`): relaciones entre orígenes con sugerencias, medidas con validación en vivo (`compileMeasure`), jerarquías, selección asociativa. Validar también en servidor al guardar (portar el analizador de medidas o ejecutarlo con un motor JS en servidor si se decide así en la Fase 0).
2. **Multipágina** y filtros a nivel de informe (sincronizados o por página).
3. **Paginados**: diseño de página (tamaño, orientación, márgenes, encabezado, pie, numeración, fecha), saltos de página, tablas agrupadas con subtotales, **subinformes** (ya soportados por el motor en la Fase 3; aquí la UI y los permisos).
4. Visualizaciones y analítica de 1.2 disponibles en la paleta y el panel de propiedades (si se han ido ocultando en fases previas para reducir alcance, se activan aquí).
5. Mapas: servir `maps/es.js` con la librería; documentar cómo añadir otros contornos.
6. Tests e2e: portar `e2e/v3.spec.js`.

**Aceptación:** la plantilla *Ventas 2025* del prototipo (3 páginas, modelo semántico, profundizar, comparación interanual, previsión, mapa, Sankey y tabla agrupada) se crea, guarda, publica y ve en el producto con el mismo resultado.

---

### Fase 11 · Exportación en servidor y envíos programados

**Objetivo:** generar PDF/Word/Excel sin navegador del usuario y enviar informes de forma programada.

**Referencia en el prototipo:** `src/lib/exporters.js` (estructura de DOCX y XLSX a partir de `collect()`), `lib-src/rptlib-1.2/70-report.js` (`collect()`), `htmlGenerator.js` (`paperCss`).

**Tareas**

1. Renderizado en servidor con **Playwright para .NET** (Chromium headless) sobre el endpoint `render`: PDF con `@page` (encabezado, pie, numeración) y ejecución de `RptLib.collect()` para obtener el contenido.
2. Generación DOCX (Open XML SDK) y XLSX (ClosedXML u Open XML) en C# portando la estructura de `buildDocx`/`buildXlsx` (encabezado/pie, KPI, gráficos como imagen, tablas con cabecera repetida, hoja de resumen, formatos numéricos, esquema, autofiltro, cabecera fija). Alternativa: ejecutar `exporters.js` dentro del Chromium headless y devolver el binario (menos código nuevo).
3. **Envíos programados** con *Background Jobs/Workers* de ABP (o Hangfire/Quartz si ya se usa): informe, parámetros (incluidas fechas relativas), formato, destinatarios, periodicidad; respetando los permisos del propietario o de cada destinatario.
4. **Alertas** (opcional): condición sobre una medida/loseta (p. ej. ventas < objetivo) que dispara un aviso.
5. Cola y límites de concurrencia de renderizado; almacenamiento temporal de ficheros (BLOB Storing de ABP).

**Aceptación:** un informe programado llega por correo en PDF/Excel con los parámetros resueltos en el momento del envío y coincide con lo que se ve en pantalla.

---

### Fase 12 · Endurecimiento

**Objetivo:** preparar el producto para volumen, seguridad y operación.

**Tareas**

1. **Rendimiento con orígenes grandes**: empujar agregaciones al servidor (consultas agregadas por visual según categoría/valores/filtros), paginación en servidor para tablas, muestreo para dispersión; mantener el modo actual (filas al cliente) para orígenes pequeños.
2. **Seguridad por filas** (completar el punto de extensión de la Fase 3) por usuario, rol o inquilino.
3. **Seguridad**: CSP del endpoint `render` (solo la librería y los datos; `img-src` controlado para logotipos), revisión de XSS en props (los textos de componentes y el logo), límites de tamaño de definiciones, *rate limiting* de los endpoints de datos, revisión de secretos de conexión.
4. **Accesibilidad** (WCAG 2.1 AA) de las páginas Blazor y de la isla; mantener lo que ya hace RptLib (resúmenes para lectores de pantalla, navegación con teclado).
5. **Observabilidad**: métricas de tiempo de consulta, tamaño de respuesta, errores por origen, uso por informe; panel de administración de «consultas lentas».
6. **Documentación** de usuario (crear informes, consultas, modelo semántico) y de administración (catálogo de datos, versiones de la librería, permisos).
7. Política de **actualización de librería**: asistente para mover informes a una versión nueva de RptLib con vista previa lado a lado y regresión visual.

---

## 5. Dependencias entre fases

```
Fase 0 ──► Fase 1 (RptLib) ───────────────┐
   │                                       ▼
   ├────► Fase 2 (dominio/API) ──► Fase 3 (motor de datos) ──► Fase 4 (visor) ──► Fase 8 (listado)
   │                                       │                         │            └► Fase 9 (dashboard)
   │                                       ▼                         ▼
   └────────────────────────────► Fase 5 (SDK isla) ──► Fase 6 (consultas) ──► Fase 7 (editor) ──► Fase 10
                                                                                                  └► Fase 11 ──► Fase 12
```

- La Fase 1 puede ir en paralelo con la 2 y la 3.
- La Fase 5 puede empezar tras la Fase 0 con un adaptador simulado; se conecta a la API cuando existan las Fases 2 y 3.
- Las Fases 8 y 9 solo necesitan el visor (Fase 4): pueden entregarse antes que el diseñador.

**Hitos sugeridos**

| Hito | Fases | Valor para el usuario |
|---|---|---|
| H1 · Base sólida | 0, 1, 2, 3 | Librería única y versionada; consultas seguras y parametrizadas; historial y publicación. |
| H2 · Lectura | 4, 8, 9 | Mejor visor (filtros, marcadores, exportación), listado y dashboard mejorados. |
| H3 · Autoría | 5, 6, 7 | Diseñador visual de informes y de consultas. |
| H4 · Avanzado | 10, 11, 12 | Modelo semántico, paginados, envíos programados, rendimiento y seguridad. |

---

## 6. Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Diferencias entre alasql (prototipo) y el dialecto real (funciones de fecha, `LIMIT`, comillas, tipos) | Generación/parsing en servidor por dialecto (Fase 6) y fixtures compartidos; BD de pruebas con `sampledb.json` para comparar resultados. |
| Mantener React dentro de un producto Blazor | Encapsularlo en el SDK con API pequeña; el resto del producto no depende de React; documentar en ADR la opción de reescritura progresiva. |
| Mensajes grandes por SignalR (Blazor Server) | Estado en la isla y guardado por HTTP (2.2). |
| Seguridad de SQL libre | Permiso `EditSql`, parser real, lista blanca de tablas, usuario de solo lectura, timeout y límites, auditoría. |
| Iframe sin `allow-same-origin` y autenticación | Datos inyectados en servidor o token firmado de corta duración; nunca relajar el sandbox. |
| Romper informes existentes al cambiar la librería | Versiones inmutables, `libVersion` por informe, regresión visual, migración solo bajo demanda. |
| Rendimiento con muchas filas en el cliente | Límite de filas desde la Fase 3 y agregación en servidor en la Fase 12. |
| Alcance de RptLib 1.2 muy amplio | Ocultar en la paleta componentes avanzados hasta la Fase 10 (la librería ya los soporta; solo es UI). |

---

## 7. Definición de terminado (todas las fases)

- Tests unitarios (Vitest / xUnit) y e2e (Playwright) de la funcionalidad, en CI y en verde; los casos portados del prototipo incluidos.
- Permisos ABP comprobados en servidor (nunca solo en la UI).
- Textos localizados (ABP localization en .NET/Blazor; diccionarios en la librería y en la isla).
- Accesible con teclado y lector de pantalla en lo nuevo.
- Funciona en escritorio y móvil.
- Documentación actualizada (este plan, README de `client/rptlib` y `client/rpt-designer`, ADRs).
- Sin regresiones en los informes existentes (manuales) del producto.
