# Plan de implementación: del prototipo al producto

Este documento ordena en fases el trabajo para llevar las funcionalidades del **prototipo** (este repositorio, React + RptLib) al **producto real**: backend .NET 10 con ABP, frontend **Blazor WebAssembly** y base de datos **SQL Server**.

> **Para quien implemente:** durante la implementación se tendrá acceso al código del prototipo. Cada fase indica qué ficheros del prototipo sirven de **especificación** y cuáles se **portan** o **reutilizan**. El prototipo es la referencia funcional (comportamiento, casos límite, mensajes, estilos y organización de pantallas). Sus tests (`tests/*.test.js`) y e2e (`e2e/*.spec.js`) son la especificación ejecutable que hay que portar.

### Condiciones del producto que guían el plan

| Condición | Consecuencia en el plan |
|---|---|
| Ya existe JS/CSS de informes, pero se **pega dentro del HTML generado** | La Fase 1 empieza extrayendo ese código tal cual a una librería versionada, migra los informes para que la **enlacen** y después la unifica con RptLib. |
| **Fundanet.Arco son librerías que se distribuyen como paquetes NuGet**; la solución incluye **Samples** para probarlas en local | La parte ABP de Analytics **no crea proyectos por capa**: se añade a los proyectos (y paquetes NuGet) que ya existen en `Fundanet.Arco`, en carpetas y espacios de nombres `Analytics`. No tiene host propio. Las únicas excepciones son los dos proyectos **agnósticos a ABP** de la fila siguiente. Cada fase se prueba y se demuestra en **Samples**, que es también donde corren los e2e y la comparación visual. Ver [Distribución como NuGet y Samples](#211-distribución-como-nuget-y-samples). |
| **El código Blazor va en un proyecto aparte, agnóstico a ABP** (sin dependencias de ABP) | Dos proyectos nuevos sin ABP: `Fundanet.Arco.Analytics.Blazor` (RCL con todos los componentes, la hoja de estilos, los módulos JS y la librería CSS/JS) y `Fundanet.Arco.Analytics.Shared` (tipos comunes de servidor y Blazor: definición del informe, DTOs y la lógica compartida). Los componentes hablan con el backend a través de **interfaces propias**; la implementación con ABP (proxies HTTP, permisos, localización, menú, páginas con ruta) vive en los proyectos existentes de Arco. Ver [Blazor agnóstico a ABP](#212-blazor-agnóstico-a-abp). |
| **SQL Server** | Dialecto T-SQL en todo el plan: `@parámetros`, `TOP`/`OFFSET…FETCH`, `[identificadores]`, `DATEPART`/`EOMONTH`. Validación con el analizador oficial de T-SQL (ScriptDom). |
| **Mínimas dependencias** | En el navegador, **ninguna librería JS de terceros salvo CodeMirror** (necesario para que el editor SQL sea igual que el del prototipo); fuera React, alasql y docx/exceljs. En .NET, solo paquetes de Microsoft. Ver la [política de dependencias](#27-política-de-dependencias). |
| **Blazor WebAssembly** | El diseñador se hace **en Blazor**, con módulos JS pequeños y propios solo para lo que Blazor no puede hacer (arrastre con puntero, pintar los componentes con arco-analytics, `postMessage`). La lógica del modelo se porta a una **biblioteca C# compartida** entre el servidor y el cliente WASM. |
| **El diseñador y el resto de componentes deben ser tal cual el prototipo** | **Paridad total** de aspecto, organización, comportamiento y funciones: se porta 1:1 el marcado (mismos elementos, clases, ARIA e iconos) y se reutiliza `src/styles.css` literal. Nada se simplifica ni se recorta. Ver [Paridad con el prototipo](#210-paridad-con-el-prototipo). |
| **Librería corporativa de controles** | Las pantallas replican **tal cual** los estilos y la organización del prototipo. Donde ya hay controles corporativos maquetados para lo mismo, se usan esos. La alineación final se hace en la [Fase 14](#fase-14--revisión-visual-con-la-librería-corporativa). |

### Nombres

| Elemento | Nombre |
|---|---|
| Solución | `Fundanet.Arco` (librerías NuGet + `Samples`) |
| Analytics en el código | Proyectos nuevos agnósticos a ABP: `Fundanet.Arco.Analytics.Shared` y `Fundanet.Arco.Analytics.Blazor`. Parte ABP: carpeta `Analytics/` y espacio de nombres `Fundanet.Arco.Analytics.*` **dentro de los proyectos existentes** de `Fundanet.Arco` (reparto en 2.9) |
| Librería CSS/JS de informes | **arco-analytics**: `arco-analytics.css` y `arco-analytics.js`, publicadas dentro del paquete `Fundanet.Arco.Analytics.Blazor` (`wwwroot/arco-analytics/<versión>/`) y servidas en `/_content/Fundanet.Arco.Analytics.Blazor/arco-analytics/<versión>/` (URL base configurable); fuentes en `client/arco-analytics/` |
| API JS global | `window.ArcoAnalytics` (en el prototipo, `window.RptLib`) |
| Permisos ABP | `ArcoAnalytics.*` |

En este documento, **RptLib** se refiere siempre a la librería del **prototipo** (`lib-src/rptlib-1.2/`), que es la base de arco-analytics.

---

## Índice

1. [Punto de partida](#1-punto-de-partida)
2. [Decisiones de arquitectura](#2-decisiones-de-arquitectura)
3. [Mapa prototipo → producto](#3-mapa-prototipo--producto)
4. [Fases](#4-fases)
   - [Fase 0 · Inventario, contratos y decisiones](#fase-0--inventario-contratos-y-decisiones)
   - [Fase 1 · Librería de informes separada (CSS/JS)](#fase-1--librería-de-informes-separada-cssjs)
   - [Fase 2 · Proyecto Shared (`Fundanet.Arco.Analytics.Shared`)](#fase-2--proyecto-shared-fundanetarcoanalyticsshared)
   - [Fase 3 · Modelo de dominio y API del informe (ABP)](#fase-3--modelo-de-dominio-y-api-del-informe-abp)
   - [Fase 4 · Motor de datos en SQL Server](#fase-4--motor-de-datos-en-sql-server)
   - [Fase 5 · Visor de informes y exportación](#fase-5--visor-de-informes-y-exportación)
   - [Fase 6 · Diseñador visual del informe (Blazor)](#fase-6--diseñador-visual-del-informe-blazor)
   - [Fase 7 · Diseñador de consultas y orígenes de datos](#fase-7--diseñador-de-consultas-y-orígenes-de-datos)
   - [Fase 8 · Pantalla de creación y edición](#fase-8--pantalla-de-creación-y-edición)
   - [Fase 9 · Listado de informes](#fase-9--listado-de-informes)
   - [Fase 10 · Dashboard personalizable](#fase-10--dashboard-personalizable)
   - [Fase 11 · Modelo semántico, analítica y paginados](#fase-11--modelo-semántico-analítica-y-paginados)
   - [Fase 12 · Envíos programados](#fase-12--envíos-programados)
   - [Fase 13 · Endurecimiento](#fase-13--endurecimiento)
   - [Fase 14 · Revisión visual con la librería corporativa](#fase-14--revisión-visual-con-la-librería-corporativa)
5. [Dependencias entre fases e hitos](#5-dependencias-entre-fases-e-hitos)
6. [Riesgos principales](#6-riesgos-principales)
7. [Definición de terminado (todas las fases)](#7-definición-de-terminado-todas-las-fases)

---

## 1. Punto de partida

### Producto real (hoy)

| Área | Estado |
|---|---|
| Stack | .NET 10 + ABP, Blazor WebAssembly, SQL Server, librería corporativa de controles. |
| Creación de informes | Se sube un HTML y se definen consultas; el informe se genera con ellas. Sin diseñador visual de informe ni de consultas. |
| JS/CSS de informes | **Existe**, pero al generar el informe se **pega dentro del HTML** (cada informe lleva su copia: pesado, sin caché, sin versiones; arreglar un fallo obliga a regenerar los informes). |
| Páginas | 1) **Listado** de informes filtrado por permisos. 2) **Creación/edición**. 3) **Dashboard** personalizable donde el usuario añade informes. |

### Prototipo (este repositorio)

| Área | Dónde está |
|---|---|
| Librería RptLib 1.2 (componentes, filtros, filtro cruzado, modelo semántico, analítica, paginados) | `lib-src/rptlib-1.2/*.js`, `public/lib/rptlib/1.2.0/`, `scripts/build-rptlib.mjs` (concatenación con Node, sin dependencias), `public/lib/rptlib/1.2.0/maps/es.js` |
| Modelo del informe ↔ HTML | `src/lib/htmlGenerator.js` |
| Operaciones sobre el modelo (insertar, mover, validar, renombrar orígenes) | `src/lib/modelOps.js` |
| Catálogo de componentes y esquema de propiedades | `src/lib/catalog.js` |
| Diseñador, panel de propiedades, Show Me, diseño automático, temas, plantillas | `src/components/Designer.jsx`, `PropertyPanel.jsx`, `ShowMePanel.jsx`, `LiveComponent.jsx`, `src/lib/autoLayout.js`, `showMe.js`, `themes.js`, `templates.js` |
| Editor visual de consultas, SQL → visual, editor SQL | `src/lib/queryBuilder.js`, `sqlToBuilder.js`, `src/components/QueryBuilder.jsx`, `SqlEditor.jsx`, `DataSourcesEditor.jsx` |
| Motor de consultas simulado (alasql), parámetros, campos calculados, orígenes derivados, subinformes | `src/lib/sqlEngine.js`, `src/lib/reportData.js` |
| Modelo semántico | `src/components/SemanticEditor.jsx`, `lib-src/rptlib-1.2/10-semantic.js` |
| Vista previa aislada, parámetros, marcadores, exportación | `src/components/ReportFrame.jsx`, `ParamsBar.jsx`, `src/lib/exporters.js` |
| Historial, comparación, publicación | `src/lib/store.js`, `src/lib/diff.js`, `src/components/HistoryTab.jsx` |
| Páginas | `src/pages/ReportList.jsx`, `Wizard.jsx`, `ReportEditor.jsx`, `Viewer.jsx` |
| Estilos de la aplicación (pantallas, no informes) | `src/styles.css` (prefijos `ui-`, `dz-`…) |
| Análisis y decisiones de diseño | `docs/ANALISIS.md` |

Lo que el prototipo **simula** y el producto debe hacer de verdad: persistencia (`localStorage` en `store.js`), base de datos (JSON + alasql), esquema y relaciones (deducidos por convención en `getSchema()`/`getRelations()`), permisos y compartición.

---

## 2. Decisiones de arquitectura

Se registran como ADR en la Fase 0.

### 2.1 El modelo JSON es la fuente de verdad; el HTML es un artefacto

Igual que en el prototipo (`docs/ANALISIS.md`, §3): el diseñador edita un JSON (`pages → rows → cells → { type, source, props, span }`) y se genera un HTML declarativo (`data-rpt`, `data-source`, `data-props`) que pinta la librería. El HTML **nunca** contiene SQL ni el código de la librería: solo la **enlaza**. El flujo actual de subir HTML se mantiene como `Mode = Manual`.

### 2.2 Diseñador en Blazor WebAssembly con módulos JS mínimos

Con WebAssembly, C# se ejecuta en el navegador, la interop con JS es en proceso y no hay límites de SignalR. Eso hace viable el diseñador en Blazor sin arrastrar React. Todo lo de esta tabla vive en el proyecto agnóstico `Fundanet.Arco.Analytics.Blazor` (2.12):

| En Blazor (C#) | En módulos JS propios (ES modules, sin dependencias) |
|---|---|
| Todo el estado del editor (modelo, selección, deshacer/rehacer), panel de propiedades generado desde el catálogo, editor de orígenes, parámetros, modelo semántico, historial, asistente, listado, dashboard | `rptCanvas.js`: arrastre, soltar y redimensionar con eventos de puntero (ratón y táctil). Solo emite **intenciones** («mover celda X a fila Y, posición Z», «ancho = 6»); el modelo lo cambia C#. |
| Validaciones, generación de HTML y de SQL (vía `Fundanet.Arco.Analytics.Shared`) | `rptLive.js`: pinta cada componente del lienzo con `ArcoAnalytics.renderComponent()`, como `LiveComponent.jsx` (WYSIWYG real con la misma librería). |
| Llamadas al backend a través de las interfaces del proyecto agnóstico (2.12); la implementación ABP usa los proxies HTTP | `rptQueryCanvas.js`: posiciones de las tablas y líneas SVG de las uniones del editor visual de consultas. |
| | `rptSqlEditor.js`: envoltorio del editor SQL con **CodeMirror 6**, con la misma configuración que `SqlEditor.jsx` (`basicSetup`, `lang-sql`, `Mod-Enter` para ejecutar, autocompletado de tablas, columnas y orígenes). |
| | `reportBridge.js`: `postMessage` con el iframe del informe. `download.js`: descargar ficheros. |

Cada módulo JS debe ser pequeño (orientativo: menos de 300 líneas) y no contener lógica de negocio: esa vive en C# y tiene tests.

### 2.3 Proyecto Shared: tipos comunes de servidor y Blazor

El proyecto `Fundanet.Arco.Analytics.Shared` (`net10.0`, **sin dependencias**: ni ABP ni paquetes de terceros) contiene los **tipos comunes** de servidor y Blazor y la lógica que ambos necesitan:

- **Tipos**: la definición del informe (`ReportDefinition` y sus partes), `RptData`, y los **DTOs** que cruzan la frontera servidor ↔ cliente (informe, versión, resumen para el listado, marcador, bloque, dashboard, esquema del catálogo, peticiones de datos y exportación, `PagedResult<T>`, errores por origen). Así los app services de ABP y las interfaces del proyecto Blazor usan **los mismos DTOs**, sin duplicarlos ni mapearlos.
- **Lógica compartida**: la definición del informe, el catálogo de componentes, las operaciones sobre el modelo, la validación, el generador de HTML, el generador de T-SQL del editor visual, la resolución de parámetros y fechas relativas y la comparación de versiones. La usan:

- el **cliente WASM** (desde `Fundanet.Arco.Analytics.Blazor`): respuesta inmediata en el editor (SQL generado al momento, validación, HTML de la vista previa);
- el **servidor** (referenciado desde los proyectos ABP de Arco, p. ej. `Domain.Shared`): autoridad. Regenera el HTML y el SQL al guardar y al ejecutar; nunca se fía de lo que envía el cliente.

Tiene que ser un proyecto propio porque los componentes agnósticos no pueden referenciar `Domain.Shared` ni `Application.Contracts` (dependen de ABP) y el servidor no debería depender de un proyecto de interfaz. Los DTOs de Shared no heredan de las clases base de ABP (`EntityDto`, `PagedResultDto`…); si la parte ABP las necesita, las usa solo en su lado. Lo que necesita dependencias pesadas o acceso a datos (ScriptDom, ADO.NET, Open XML) **solo** está en el servidor, para no engordar la descarga WASM.

### 2.4 Las consultas se ejecutan en el servidor

- El visor envía el **id del informe/versión y valores de parámetros**, nunca SQL.
- El editor puede pedir una vista previa de una definición sin guardar, solo con permiso de edición (y `EditSql` si contiene SQL libre).
- Validación con ScriptDom (solo `SELECT`, solo tablas expuestas), `SqlParameter` tipados, usuario de BD de solo lectura, timeout y límite de filas.
- Las medidas del modelo semántico siguen evaluándose en la librería sobre las filas del origen (como en el prototipo); la agregación en servidor para orígenes grandes llega en la Fase 13.

### 2.5 Librería de informes versionada e inmutable

`/_content/Fundanet.Arco.Analytics.Blazor/arco-analytics/<versión>/arco-analytics.{css,js}` con `Cache-Control: public, max-age=31536000, immutable`. Cada informe apunta a su versión (`model.libVersion`); publicar una versión nueva no cambia los informes existentes.

- **Todas las versiones de la librería viajan en cada versión del paquete** Blazor de `Fundanet.Arco`: una aplicación que actualiza el NuGet sigue sirviendo las versiones que usan sus informes antiguos. CI comprueba que las carpetas de versiones ya publicadas no cambian (hashes del `manifest.json`).
- **El HTML guardado no lleva la URL física.** Referencia la librería de forma lógica (`arco-analytics:<versión>/arco-analytics.css`) y el endpoint de renderizado, la vista previa y la descarga la resuelven con `ArcoAnalyticsOptions.LibraryBaseUrl` (por defecto la ruta `_content` de arriba, respetando el `PathBase` de la aplicación; se puede apuntar a un CDN). Así el mismo informe funciona en cualquier aplicación que use Arco.

### 2.6 Aislamiento del informe

El informe se pinta en `<iframe sandbox="allow-scripts">` **sin** `allow-same-origin` (como `ReportFrame.jsx`). El iframe tiene origen nulo y no puede usar el token de la aplicación WASM, así que los datos se **inyectan** en el HTML desde el servidor (`window.RPT_DATA`, ver `injectData()`) o se descargan con un **token firmado de un solo uso y corta duración** (`<meta name="rpt-data-url">`). La comunicación host ↔ informe es por `postMessage` (`rpt:ready`, `rpt:state`, `rpt:setState`, `rpt:collect`, `rpt:print`…).

### 2.7 Política de dependencias

| Ámbito | Permitido | Evitado (y su sustituto) |
|---|---|---|
| JS en el navegador (librería e informes) | Nada de terceros: JS propio | — |
| JS en el navegador (aplicación) | Módulos JS propios. **Única excepción: CodeMirror 6** (los paquetes que ya usa el prototipo, versión fija, empaquetados en un solo fichero local en `wwwroot`, sin CDN) para que el editor SQL sea idéntico | React → Blazor con marcado 1:1; alasql → servidor; `docx`/`exceljs` → exportación en servidor |
| .NET servidor | Lo que ya trae la plantilla de ABP; `Microsoft.Data.SqlClient` (ADO.NET, sin Dapper); `Microsoft.SqlServer.TransactSql.ScriptDom` (validar y analizar T-SQL); `DocumentFormat.OpenXml` (Word/Excel) | Dapper, ClosedXML, generadores de PDF de terceros |
| Transitivas para quien consume los paquetes de `Fundanet.Arco` | Al no haber proyectos propios, las dependencias nuevas llegan a **todas** las aplicaciones que usan el paquete donde se añaden. Por eso: nada nuevo en `Domain.Shared`, `Domain`, `Blazor`, `Analytics.Shared` ni `Analytics.Blazor` (este último solo depende de `Analytics.Shared` y del framework de Blazor: `Microsoft.AspNetCore.Components.Web`, más `Microsoft.Extensions.Localization.Abstractions` si se usa `IStringLocalizer`); ScriptDom solo en el proyecto de infraestructura SQL Server (`EntityFrameworkCore`, que ya trae `SqlClient`); Open XML solo en `Application`. Se anotan en el `CHANGELOG` |  |
| .NET cliente WASM | Lo que ya trae ABP + `Fundanet.Arco.Analytics.Shared` + `Fundanet.Arco.Analytics.Blazor` (sin ABP) | Paquetes de componentes de terceros (se usa la librería corporativa) |
| Solo desarrollo y CI | Node (scripts de build sin paquetes, como `build-rptlib.mjs`); runner de tests JS (`node:test`, o Vitest + jsdom si hace falta DOM); xUnit y bUnit; Playwright para e2e | — |
| Opcional, decisión aparte | Chromium headless para PDF en servidor (solo si se necesitan envíos programados en PDF, Fase 12) | Por defecto: PDF con la impresión del navegador |

Cualquier dependencia nueva requiere un ADR breve: motivo, alternativa propia descartada y tamaño.

### 2.8 Estilos de las pantallas

- `src/styles.css` se copia **literal** como hoja global de Analytics (activo estático de la RCL agnóstica: `_content/Fundanet.Arco.Analytics.Blazor/arco-analytics/app/arco-analytics-app.css`). Para que no choque con la librería corporativa, sus reglas se acotan a un contenedor raíz (`.arco-analytics-app …`) de forma mecánica, sin cambiar valores, y se fijan sus variables en ese contenedor. No se reescriben en `*.razor.css`: así el resultado es idéntico y las diferencias con el prototipo se ven con un `diff`.
- Los componentes Razor generan **el mismo marcado** que los JSX (ver 2.10), así que esa hoja aplica sin cambios.
- Donde ya existe un control corporativo maquetado **para exactamente lo mismo** (botones, pestañas, diálogos, campos de formulario…), se usa ese control, siempre que no cambie el comportamiento ni la organización de la pantalla.
- Se mantiene una lista de «estilos del prototipo pendientes de revisión» que se resuelve en la Fase 14.
- Los **informes** (lo que pinta la librería en el iframe) tienen su propio tema (Fase 1); no dependen de la librería corporativa.

### 2.9 Reparto en los proyectos de `Fundanet.Arco`

Analytics **no tiene un proyecto por capa**. Hay **dos proyectos nuevos agnósticos a ABP** y el resto se añade a los proyectos que ya existen, en una carpeta `Analytics/` con espacio de nombres `Fundanet.Arco.Analytics.*`. Los nombres de los proyectos existentes son los habituales de ABP; en la Fase 0 se sustituyen por los reales de `Fundanet.Arco`.

**Proyectos nuevos (sin ABP)**

| Proyecto | Contenido | Dependencias |
|---|---|---|
| `Fundanet.Arco.Analytics.Shared` | Tipos comunes de servidor y Blazor (definición del informe, DTOs) y lógica compartida: catálogo, operaciones, HTML, T-SQL del editor visual, parámetros, diff (2.3). | Ninguna |
| `Fundanet.Arco.Analytics.Blazor` (RCL) | **Todos** los componentes Razor (visor, barra de parámetros, diseñador, panel de propiedades, orígenes, editor de consultas, editor SQL, modelo, historial, asistente, editor, listado, dashboard), interfaces del backend y de la plataforma (2.12), `wwwroot/arco-analytics/app/` (hoja `arco-analytics-app.css`, módulos JS propios y CodeMirror empaquetado) y `wwwroot/arco-analytics/<versión>/` (**todas** las versiones de la librería, inmutables). | `Analytics.Shared` y el framework de Blazor |

**Proyectos existentes (con ABP)**

| Proyecto existente (orientativo) | Qué se añade en `Analytics/` |
|---|---|
| `Fundanet.Arco.Domain.Shared` | Referencia a `Analytics.Shared`. Enums, constantes, `ArcoAnalyticsDbProperties`, recursos de localización. |
| `Fundanet.Arco.Domain` | Entidades (`Report`, `ReportVersion`, `ReportBlock`, `ReportBookmark`, `UserDashboard`…), repositorios (interfaces), servicios de dominio y abstracciones del motor de datos (`IReportQueryExecutor`, `IReportSqlValidator`, `IAnalyticsConnectionProvider`, `IReportDataFilterProvider`). |
| `Fundanet.Arco.Application.Contracts` | Interfaces de app services **con los DTOs de `Analytics.Shared`**, permisos (`ArcoAnalytics.*`), *settings*. |
| `Fundanet.Arco.Application` | App services, exportación Word/Excel con Open XML. |
| `Fundanet.Arco.EntityFrameworkCore` | Mapeos de las entidades (llamados desde la configuración de `DbContext` que ya expone Arco), repositorios EF y la **infraestructura SQL Server** del motor: ejecución ADO.NET, validación con ScriptDom, lectura del catálogo (`sys.*`). |
| `Fundanet.Arco.HttpApi` | Controladores: render del informe con token, datos, exportación (si no basta con los controladores automáticos de ABP). |
| `Fundanet.Arco.HttpApi.Client` | Proxies HTTP para el cliente WASM. |
| `Fundanet.Arco.Blazor` (RCL) | Referencia a `Analytics.Blazor`. **Adaptadores ABP** de las interfaces de 2.12 (proxies HTTP, permisos, localización, avisos, navegación) y **páginas con ruta** (`@page`, `[Authorize]`, layout de ABP) que solo envuelven los componentes agnósticos. |
| `Fundanet.Arco.Blazor.WebAssembly` (si existe) | Registro de los adaptadores y de los servicios del cliente, menú. |
| Proyectos de test existentes | Carpetas `Analytics/` con los tests xUnit de la parte ABP. Los proyectos agnósticos tienen sus propios tests (`Fundanet.Arco.Analytics.Shared.Tests`, `Fundanet.Arco.Analytics.Blazor.Tests` con bUnit y backend falso), también sin ABP; fixtures JSON compartidos en `test/fixtures/analytics/`. |
| `Samples` | Host y cliente WASM de pruebas con Analytics activado (2.11); e2e Playwright y comparación visual. |

Fuera de los proyectos .NET: `client/arco-analytics/` (fuentes de la librería CSS/JS, scripts de build y tests; el *release* copia a `Fundanet.Arco.Analytics.Blazor/wwwroot/arco-analytics/<versión>/`).

En la Fase 0 se confirma también la **topología de despliegue** (cliente WASM servido por el mismo host que la API o por separado): el endpoint de render y la librería deben quedar en el mismo origen o, si no, `LibraryBaseUrl` apunta al origen que sirve la RCL y se habilita CORS para esa ruta (necesario por los atributos `integrity`).

Si `Fundanet.Arco` ya tiene código de informes (el que hoy pega el JS/CSS en el HTML), Analytics lo **evoluciona en el mismo sitio**: se mueve a las carpetas `Analytics/` y lo que cambie de forma incompatible va en una versión mayor de los paquetes con su guía de actualización.

### 2.10 Paridad con el prototipo

El diseñador y el resto de componentes (asistente, editor, orígenes de datos, editor visual de consultas, editor SQL, modelo semántico, Show Me, panel de propiedades, temas, historial y comparación, visor, barra de parámetros, marcadores, listado) deben quedar **tal cual el prototipo**: mismo aspecto, misma organización, mismo comportamiento y mismas funciones. Cambiar de React a Blazor es un detalle de implementación que el usuario no debe notar.

**Cómo se consigue**

1. **Port 1:1 de cada componente**: un componente Razor por cada componente JSX (`Designer.jsx` → `Designer.razor`…), con los mismos elementos HTML, clases CSS, atributos `aria-*`/`role`, textos, iconos (los trazados SVG de `Icon.jsx` copiados tal cual) y orden. Cada `useState`/`useEffect` se traduce a estado y ciclo de vida de Blazor; cada manejador de eventos, a su equivalente (o a un módulo JS cuando Blazor no llega: puntero, arrastre, foco, portapapeles).
2. **CSS literal** (2.8).
3. **Mismos comportamientos finos**: atajos de teclado, foco, deshacer/rehacer, arrastre y redimensionado (ratón y táctil), «tocar para insertar», multiselección, menús emergentes que se cierran con `Esc` o clic fuera, avisos y mensajes, estados vacíos y de error, adaptación a móvil (pestañas paleta/lienzo/propiedades).
4. **Mismas funciones**: todo lo que lista el README del prototipo está disponible en el producto **desde la fase que porta esa pantalla**; no se ocultan componentes de la paleta ni propiedades para reducir alcance.
5. **Única diferencia permitida**: lo que el prototipo simula (datos de ejemplo, `localStorage`, alasql) se sustituye por lo real (API, SQL Server), y los controles corporativos ya maquetados para lo mismo (2.8).

**Cómo se comprueba**

- **Lista de paridad** (`docs/paridad.md`, Fase 0): una línea por funcionalidad del README del prototipo y por componente JSX, con la fase que la porta y su estado. Una fase no se cierra con elementos pendientes de su alcance.
- **e2e portados con los mismos selectores**: como el marcado es el mismo, `e2e/app.spec.js`, `e2e/v3.spec.js` y `e2e/mobile.spec.js` se portan casi mecánicamente (cambia la navegación y los datos, no los selectores).
- **Comparación visual lado a lado**: Playwright abre el prototipo (`npm run build` + `vite preview`) y **Samples** con el mismo fixture, en escritorio y móvil, y compara capturas de cada pantalla y estado relevante (paleta, lienzo con selección, panel de propiedades de cada tipo de componente, editor de consultas, historial…). Las diferencias aceptadas (controles corporativos) se registran.

### 2.11 Distribución como NuGet y Samples

**Analytics dentro de las librerías reutilizables**

- **Sin módulos ABP nuevos**: los servicios, mapeos, permisos y menús de Analytics se registran desde las clases de módulo que ya tiene cada proyecto de `Fundanet.Arco`.
- **Activable**: como todas las aplicaciones que usan Arco recibirán Analytics al actualizar, se controla con una *feature* de ABP (`ArcoAnalytics.Enabled`, por aplicación o inquilino) que muestra u oculta menú y páginas y habilita los endpoints.
- **Base de datos**: los mapeos de Analytics se incluyen en la configuración de `DbContext` que ya expone Arco; cada aplicación genera sus migraciones al actualizar (las tablas aparecen aunque la *feature* esté apagada). Prefijo de tablas y esquema según las convenciones de Arco (`ArcoAnalyticsDbProperties`).
- **Configuración** con `ArcoAnalyticsOptions`: `LibraryBaseUrl`, filas máximas, timeout, tamaño máximo de respuesta, caducidad del token de renderizado, caché.
- **Puntos de extensión** (interfaces con implementación por defecto que la aplicación puede sustituir): conexiones de datos (`IAnalyticsConnectionProvider`), seguridad por filas (`IReportDataFilterProvider`), destinos de envío (Fase 12). Las páginas ABP que envuelven los componentes se pueden reemplazar con el mecanismo de ABP, y los componentes agnósticos se pueden usar directamente en otra página.
- Permisos, *settings*, localización (es, en) y menú definidos en Arco; la aplicación solo los concede o personaliza.
- Middleware `app.UseArcoAnalyticsAssets()` que añade `Cache-Control: immutable`, `charset` y `nosniff` a la ruta de la librería (los activos estáticos de las RCL los sirve la aplicación con `MapStaticAssets`/`UseStaticFiles`).
- **Versionado de paquetes** SemVer, independiente del de la librería CSS/JS. Un cambio incompatible en la API pública, en el esquema de BD o en el formato de la definición supone versión mayor, entrada en el `CHANGELOG` y guía de actualización (`docs/upgrade/<versión>.md`). Para cada hito se publican versiones `-preview.N`.
- **Migraciones de datos** (p. ej. pasar de JS/CSS pegado a enlazado, Fase 1; adaptar la entidad de informe, Fase 3) se entregan dentro de Arco como tareas de datos idempotentes que la aplicación ejecuta al actualizar (contribuidor de *data seed* o tarea en segundo plano), documentadas en la guía de actualización.

**Samples**

- En cada fase, Samples incorpora lo nuevo y sirve de demostración: host y cliente WASM con Arco referenciado **por proyecto** y la *feature* de Analytics activada, SQL Server local (LocalDB o contenedor) con `src/data/sampledb.json` cargado y las plantillas del prototipo (*Ventas*, *Equipo comercial*, *Inventario*) sembradas como informes.
- Incluye también informes «antiguos» con el JS/CSS pegado para probar la migración de la Fase 1.
- Los e2e portados del prototipo y la comparación visual lado a lado (2.10) se ejecutan contra Samples en CI.
- Además, una prueba de humo consume los **paquetes NuGet empaquetados** (no las referencias de proyecto) para detectar fallos de empaquetado: activos estáticos que faltan, dependencias transitivas, versiones de la librería no incluidas.

### 2.12 Blazor agnóstico a ABP

`Fundanet.Arco.Analytics.Blazor` no referencia ningún paquete `Volo.*` ni ningún proyecto de Arco con ABP. Todo lo que necesita de fuera lo pide mediante **interfaces definidas en el propio proyecto**, que la aplicación implementa. En Arco, la implementación usa ABP; otra aplicación podría implementarlas sin ABP.

**Interfaces del backend** (asíncronas, con los tipos y DTOs de `Analytics.Shared`, nunca DTOs de ABP):

| Interfaz | Casos de uso (los de `store.js` y `sqlEngine.js` del prototipo) |
|---|---|
| `IReportStore` | Listar con filtros y paginación, obtener, crear, guardar con nota, duplicar, eliminar, exportar/importar. |
| `IReportHistoryStore` | Versiones, ver, etiquetar, restaurar total o parcial, publicar/despublicar. |
| `IReportDataService` | Datos de un informe publicado, vista previa de una definición, vista previa de un origen, URL de renderizado de un solo uso, exportación Word/Excel. |
| `IDataCatalogService` | Conexiones, esquema (tablas, columnas, relaciones), SQL → visual, validación de SQL. |
| `IBlockStore`, `IBookmarkStore`, `IDashboardStore`, `ITemplateStore` | Bloques reutilizables, marcadores, dashboards de usuario, plantillas. |

**Interfaces de plataforma:**

| Interfaz | Para qué |
|---|---|
| `IAnalyticsAuthorization` | Qué puede hacer el usuario (crear, editar, editar SQL, publicar, borrar…). Los componentes solo ocultan o deshabilitan; la comprobación real sigue en el servidor. |
| `IStringLocalizer<AnalyticsResource>` (abstracciones de Microsoft) | Textos. El recurso y sus traducciones viven en el proyecto agnóstico; la parte ABP puede enlazarlo con su sistema de localización. |
| `IAnalyticsNotifier` | Avisos, confirmaciones y errores (en Arco, con los diálogos y notificaciones de ABP/corporativos). |
| `IAnalyticsNavigation` | Rutas entre pantallas (abrir editor, visor, volver al listado), porque las rutas las definen las páginas de la aplicación. |
| `AnalyticsUiOptions` | `LibraryBaseUrl` de la librería, idioma, tema, límites de la interfaz. |

**Reglas**

- Los componentes agnósticos **no tienen `@page`** ni atributos de autorización: son componentes con parámetros (`<ReportListView>`, `<ReportEditorView>`, `<ReportViewer>`, `<DashboardView>`…). Las páginas con ruta, el layout y el menú están en la parte ABP.
- Registro con una extensión propia: `services.AddArcoAnalyticsBlazor(options => …)`; la parte ABP llama además a `AddArcoAnalyticsAbpAdapters()` (o equivalente) para registrar sus implementaciones.
- **Controles corporativos**: en la Fase 0 se comprueba si la librería corporativa depende de ABP. Si no depende, el proyecto agnóstico puede usarla donde corresponda (2.8). Si depende, el proyecto agnóstico usa el marcado del prototipo y, si hace falta, expone `RenderFragment` para que la parte ABP inyecte los controles corporativos.
- CI falla si `Fundanet.Arco.Analytics.Shared` o `Fundanet.Arco.Analytics.Blazor` acaban referenciando ABP, directa o transitivamente (comprobación del grafo de dependencias en el build).
- Los tests bUnit y la comparación visual con el prototipo pueden ejecutarse sobre una página de pruebas con **implementaciones falsas** de las interfaces, sin ABP ni base de datos; Samples sigue siendo la prueba de integración completa.

---

## 3. Mapa prototipo → producto

| Prototipo | Producto | Estrategia |
|---|---|---|
| JS/CSS existente del producto (pegado en el HTML) | `client/arco-analytics` → versión `0.9.0` | **Extraer tal cual** (Fase 1) |
| `lib-src/rptlib-1.2/`, `public/lib/rptlib/1.2.0/` | `client/arco-analytics` → versión `1.0.0` unificada | **Mover y unificar** con el código existente (Fase 1) |
| `htmlGenerator.js`, `modelOps.js`, `catalog.js`, `diff.js`, `autoLayout.js`, `showMe.js`, `themes.js`, `templates.js` | `Fundanet.Arco.Analytics.Shared` (C#) | **Portar** a C# con sus tests como fixtures (Fase 2) |
| `queryBuilder.js` (`toSql`, `builderParams`) | `Fundanet.Arco.Analytics.Shared` → generador T-SQL | **Portar** (Fases 2 y 7) |
| `sqlEngine.js`: parámetros, fechas relativas, `executionOrder`, `inferFields`, `mergeFields` | `Fundanet.Arco.Analytics.Shared` (lo puro) + `Domain` (ejecución) | **Portar** (Fases 2 y 4) |
| `sqlEngine.js`: alasql, `validateSql` | ADO.NET + ScriptDom en servidor | **Reescribir** (Fase 4) |
| `sqlToBuilder.js` | Servicio de servidor con ScriptDom | **Portar** (Fase 7) |
| `reportData.js` (`buildFullData`, subinformes) | `Domain` → `ReportDataEngine` | **Portar** (Fase 4) |
| `getSchema()` / `getRelations()` | Catálogo de datos (`sys.tables`, `sys.columns`, `sys.foreign_keys`) + lista blanca | **Reescribir** (Fase 4) |
| `store.js` | Interfaces de `Analytics.Blazor` (2.12) implementadas con entidades ABP + app services + EF Core | **Reescribir** (la API de `store.js` es la lista de casos de uso) (Fase 3) |
| `Designer.jsx`, `PropertyPanel.jsx`, `ShowMePanel.jsx`, `LiveComponent.jsx` | Componentes de `Analytics.Blazor` + `rptCanvas.js` + `rptLive.js` | **Portar 1:1 a Blazor** (Fase 6) |
| `QueryBuilder.jsx`, `SqlEditor.jsx`, `DataSourcesEditor.jsx` | Componentes de `Analytics.Blazor` + `rptQueryCanvas.js` + `rptSqlEditor.js` (CodeMirror) | **Portar 1:1 a Blazor** (Fase 7) |
| `SemanticEditor.jsx` | Componente Blazor | **Portar 1:1 a Blazor** (Fase 11) |
| `ReportFrame.jsx`, `ParamsBar.jsx`, `Viewer.jsx` | `ReportViewer`, `ReportParamsBar` + `reportBridge.js` | **Portar 1:1 a Blazor** (Fase 5) |
| `exporters.js` (docx/exceljs en el cliente) | Open XML SDK en servidor a partir de `collect()` | **Portar** la estructura (Fase 5) |
| `ReportList.jsx`, `Wizard.jsx`, `ReportEditor.jsx`, `HistoryTab.jsx`, `HtmlTab.jsx` | Páginas Blazor existentes | **Rehacer** como en el prototipo, 1:1 (Fases 8 y 9) |
| `src/styles.css` | Hoja global de Analytics, copiada literal y acotada a `.arco-analytics-app` | **Copiar** (2.8) y revisar en la Fase 14 |
| `src/components/Icon.jsx` | Componente `Icon.razor` con los mismos trazados SVG | **Copiar** |
| `tests/*.test.js` | xUnit (`Analytics.Shared.Tests` y carpetas `Analytics/` de los tests existentes), bUnit (`Analytics.Blazor.Tests`) y tests JS de la librería | **Portar** |
| `e2e/*.spec.js` | Playwright contra la aplicación Blazor | **Portar** |

---

## 4. Fases

Cada fase indica objetivo, referencia en el prototipo, tareas, entregables y criterio de aceptación. Las fases 1–5 ya aportan valor al producto actual (librería enlazada en lugar de pegada, consultas seguras, mejor visor, exportación) **antes** de tener el diseñador.

---

### Fase 0 · Inventario, contratos y decisiones

**Objetivo:** conocer lo que ya hay y fijar los contratos para que el resto de fases puedan avanzar en paralelo.

**Referencia en el prototipo:** `docs/ANALISIS.md`, `src/lib/htmlGenerator.js`, `src/lib/catalog.js`, `src/lib/store.js` (forma de `report` y de la instantánea de versión), `src/lib/reportData.js` (forma de `RPT_DATA`).

**Tareas**

1. **Inventario del JS/CSS existente** del producto:
   - Dónde vive el código y cómo lo pega hoy la generación (plantilla, marcadores, concatenación).
   - Qué componentes y atributos/clases usa el HTML de los informes, qué API JS expone, cómo recibe los datos.
   - Qué informes existentes lo llevan **sin modificar** y cuáles tienen la copia pegada **editada a mano** (comparar por hash del bloque pegado).
   - Qué funcionalidades usan de verdad los informes en producción.
2. **Matriz de compatibilidad** entre el código existente y RptLib 1.2: (a) presente en ambos; (b) solo en el existente; (c) solo en RptLib. Para (a), anotar si el marcado/API difiere.
3. **Convenciones de `Fundanet.Arco`**: estructura de los módulos existentes, *pipeline* de empaquetado y publicación NuGet, cómo están montados Samples (host, cliente WASM, BD), prefijos de tablas y versiones. Analytics debe seguirlas.
4. Inventario del resto del producto: entidad de informe, cómo se guardan HTML y consultas, conexiones a SQL Server, permisos, cómo se pinta hoy el dashboard, controles disponibles en la librería corporativa (para mapear cada pantalla del prototipo a controles corporativos o a CSS portado).
5. ADR de las decisiones de la §2 (diseñador en Blazor con módulos JS mínimos, proyecto Shared, ejecución en servidor, librería versionada, aislamiento, política de dependencias, estilos).
6. **JSON Schema versionado** (`schemaVersion`) de:
   - `ReportDefinition`: `model` (páginas, filas, celdas, tema, `paper`, `reportFilters`, `libVersion`), `dataSources[]` (id, nombre, `mode: sql|visual`, `sql`, `builder`, `fields[]`, `calculated[]`, conexión), `params[]`, `semantic`.
   - `RPT_DATA`: `{ sources: { id: { fields, rows } }, params, semantic, subreports, generatedAt }`.
   - Protocolo `postMessage` host ↔ informe (los mensajes de `70-report.js` y `ReportFrame.jsx`).
7. Crear `test/fixtures/analytics/` con: las plantillas de `templates.js` (*Ventas*, *Equipo comercial*, *Inventario*) exportadas como JSON (`libVersion` → `1.0.0`), casos de `tests/*.test.js` convertidos a JSON (entrada → salida esperada) y `src/data/sampledb.json` como datos de prueba.
8. Permisos ABP (borrador):
   - `ArcoAnalytics.Reports` (ver), `.Create`, `.Edit`, `.Delete`, `.Publish`, `.ManageHistory`
   - `ArcoAnalytics.Reports.EditSql` (SQL libre; separado del editor visual)
   - `ArcoAnalytics.DataCatalog.Manage` (conexiones y tablas expuestas)
   - `ArcoAnalytics.Dashboard` (personalizar el propio)

**Entregables:** inventario y matriz de compatibilidad, reparto definitivo en los proyectos existentes y topología de despliegue (2.9), proyectos `Fundanet.Arco.Analytics.Shared` y `Fundanet.Arco.Analytics.Blazor` creados con la comprobación de «sin ABP» en CI, carpetas `Analytics/` creadas, *feature* `ArcoAnalytics.Enabled`, Samples con Analytics activado, dependencia ABP o no de la librería corporativa (2.12), mapa pantalla → controles corporativos, **lista de paridad** (`docs/paridad.md`, ver 2.10) y la prueba de comparación visual lado a lado preparada, ADR, JSON Schemas, fixtures, permisos.

**Aceptación:** las plantillas del prototipo validan contra los JSON Schemas; se sabe qué informes existentes llevan el código pegado sin modificar.

---

### Fase 1 · Librería de informes separada (CSS/JS)

**Objetivo:** que el código de informes deje de pegarse en el HTML: una librería propia, versionada, probada y servida por URL, primero con el código actual sin cambios y después unificada con RptLib.

**Referencia en el prototipo:** `lib-src/rptlib-1.2/*.js`, `public/lib/rptlib/1.2.0/rptlib.css`, `public/lib/rptlib/1.2.0/maps/es.js` (ya generado; no hace falta volver a ejecutar `build-maps.mjs`), `scripts/build-rptlib.mjs`, `tests/rptlib.test.js`, README del prototipo (sección *Librería RptLib*), `src/components/HtmlTab.jsx` (avisos de librería no referenciada).

**1A · Extraer el código existente tal cual (versión `0.9.0`)**

1. Llevar el JS/CSS que hoy se pega a `client/arco-analytics/legacy/` **sin cambios funcionales** y publicarlo en la RCL `Fundanet.Arco.Analytics.Blazor` como `wwwroot/arco-analytics/0.9.0/arco-analytics.{css,js}` (servido en `/_content/Fundanet.Arco.Analytics.Blazor/arco-analytics/0.9.0/`).
2. Middleware `UseArcoAnalyticsAssets()` y opción `LibraryBaseUrl` (2.5 y 2.11), probados en Samples y en la prueba de humo con el paquete NuGet.
3. Cambiar la generación del informe: en lugar de pegar el código, añadir `<link rel="stylesheet" href="arco-analytics:0.9.0/arco-analytics.css">` y `<script src="arco-analytics:0.9.0/arco-analytics.js" defer></script>`, que se resuelven a la URL real al renderizar (2.5).
4. **Migración de informes existentes**: tarea de datos idempotente incluida en Arco, que cada aplicación ejecuta al actualizar el paquete (2.11):
   - Si el bloque pegado coincide (hash) con el código de `0.9.0`, se sustituye por los enlaces.
   - Si se editó a mano, se deja como está y se marca «Revisar» en el listado (se resuelve a mano).
   - Se crea una versión con la nota «Librería enlazada» (cuando exista el historial; si la migración va antes de la Fase 3, se guarda copia del HTML original).
5. Comprobación: capturas Playwright de los informes antiguos de Samples (y de una muestra de informes reales de una aplicación) antes y después de migrar; deben ser idénticas.
6. Guía de actualización para las aplicaciones que consumen el paquete.

**1B · Librería unificada (versión `1.0.0`)**

1. Fuentes en `client/arco-analytics/src/` con los módulos de RptLib 1.2 (`00-core` … `70-report`) más lo que solo tiene el código existente (casos (b) de la matriz), portado a esos módulos.
2. Si el marcado de los informes existentes difiere del de RptLib (casos (a) con diferencias), añadir un módulo `05-compat.js` que traduzca el marcado antiguo, para que un informe pueda pasar de `0.9.0` a `1.0.0` sin reescribirse. Si no compensa, documentarlo y dejar esos informes en `0.9.0`.
3. **Nombre**: ficheros `arco-analytics.css` y `arco-analytics.js`, cabecera `/*! arco-analytics <versión> */` y API global `window.ArcoAnalytics` (en lugar de `window.RptLib`). Los prefijos del formato del HTML (`data-rpt`, clases `rpt-`, variables `--rpt-*`, `window.RPT_DATA`, mensajes `rpt:*`) se mantienen como en el prototipo por paridad y para portar los tests sin cambios. Si se quieren renombrar (p. ej. a `aa-`), se decide en un ADR de la Fase 0 y se hace en `1.0.0`, antes de que exista ningún informe del diseñador.
4. Build con un script de Node **sin paquetes**, como `build-rptlib.mjs`: concatena módulos, escapa lo no ASCII (`\uXXXX`), genera `arco-analytics.js` y `arco-analytics.css`, calcula hashes **SRI** (`crypto` de Node) y escribe un `manifest.json` (versión, ficheros, hashes, cambios). Minificar solo si compensa; si se hace, que sea con una herramienta de desarrollo, nunca en runtime.
5. El script `release` copia la salida a `Fundanet.Arco.Analytics.Blazor/wwwroot/arco-analytics/<versión>/` y **falla si la carpeta ya existe**: una versión publicada no se modifica; una corrección es una versión de parche. El paquete NuGet se publica con su propio SemVer (2.11).
6. Incluir `maps/es.js` (carga bajo demanda, ruta relativa al script como `BASE` en `00-core.js`).
7. **Internacionalización**: sacar los textos fijos (menú «Ver datos», «Exportar CSV», narrativa, «Página X de Y»…) a un diccionario por idioma, elegido con `<html lang>`; `es-ES` por defecto.
8. **Tema de los informes**: mantener el de RptLib (variables `--rpt-brand`, `--rpt-bg`, paletas, densidad, claro/oscuro) y documentar cómo fija el host la marca del inquilino.
9. Tests: unitarios (portar `tests/rptlib.test.js` y uno por componente con los fixtures) y regresión visual con Playwright por componente y tema.
10. Documentación `client/arco-analytics/README.md`: atributos `data-rpt`, props por componente, modelo semántico en el HTML, API JS, protocolo `postMessage`, cambios entre `0.9.0` y `1.0.0`.

**Entregables:** `0.9.0` dentro del paquete `Fundanet.Arco.Analytics.Blazor`, tarea de migración y Samples migrado; `1.0.0` unificada, documentada y con tests; cambio en la generación para no volver a pegar código.

**Aceptación:** ningún informe nuevo lleva el código pegado; los migrados se ven igual; publicar dos veces la misma versión falla; las plantillas del prototipo se pintan con `1.0.0` igual que con RptLib 1.2.

---

### Fase 2 · Proyecto Shared (`Fundanet.Arco.Analytics.Shared`)

**Objetivo:** portar a C# la lógica pura del prototipo para usarla en el servidor y en el cliente WASM, con los tests del prototipo como especificación.

**Referencia en el prototipo:** `src/lib/catalog.js`, `modelOps.js`, `htmlGenerator.js`, `diff.js`, `autoLayout.js`, `showMe.js`, `themes.js`, `templates.js`, `queryBuilder.js`, las funciones puras de `sqlEngine.js` (`resolveParams`, `resolveRelativeDate`, `presetRange`, `defaultParamValue`, `sqlParams`, `sqlDependencies`, `executionOrder`, `inferFields`, `mergeFields`, `humanize`), `tests/core.test.js`, `features.test.js`, `queryBuilder.test.js`.

**Tareas**

1. Proyecto `Fundanet.Arco.Analytics.Shared` (`net10.0`, sin `PackageReference` ni referencias a ABP), compatible con WASM (sin E/S, sin reflexión que impida el *trimming*; serialización con `System.Text.Json` y *source generators*).
2. **Tipos** (`record`) de `ReportDefinition`, `ReportModel`, `Page`, `Row`, `Cell`, `Theme`, `Paper`, `DataSource`, `QueryBuilderModel`, `ParamDef`, `SemanticModel`, `RptData`, conformes al JSON Schema de la Fase 0. Las props de cada celda como `JsonObject` (el catálogo define su forma).
3. **Catálogo** (`catalog.js`): tipos de componente, grupos, iconos, valores por defecto, `span`, esquema de propiedades (`text`, `select`, `field`, `fields`, `bool`, `when`…), agregaciones, formatos. Es lo que usa Blazor para generar el panel de propiedades.
4. **Operaciones sobre el modelo** (`modelOps.js`): insertar, mover, mover con teclado, actualizar, duplicar, borrar (simples y múltiples), alinear en fila, pegar, filas, páginas, `renameSource`, `renameSourceInSemantic`, `sourceUsage`, `validateModel`. Inmutables (devuelven un modelo nuevo) para que deshacer/rehacer sea una pila de modelos.
5. **Generador de HTML** (`htmlGenerator.js`): `GenerateHtml` (mismos escapes, `data-props` con comillas simples, `rpt-model` y `rpt-semantic` embebidos, `paperCss`, atributos de tema, enlaces a `libVersion`), `ParseModelFromHtml` y `SourcesUsedInHtml` (análisis sencillo y acotado a `rpt-model` y `data-source`; sin analizador HTML de terceros).
6. **Generador T-SQL del editor visual** (`queryBuilder.js` → `TSqlBuilder`): `[tabla].[columna]`, alias, uniones `INNER`/`LEFT`, funciones de fecha (año → `YEAR()`, mes → `MONTH()`, año-mes → `FORMAT(x,'yyyy-MM')` o `CONVERT(char(7), x, 126)`, trimestre → `DATEPART(QUARTER, x)`), agregaciones, `GROUP BY` automático, filtros por valor y por parámetro (`@p`, opcionales con `(@p IS NULL OR …)`), `DISTINCT`, `ORDER BY`, límite con `TOP (n)`.
7. **Parámetros**: definiciones, valores por defecto, fechas relativas, periodos predefinidos, `daterange` (`@p_desde`/`@p_hasta`), detección de parámetros y de dependencias `origen.<id>` en un SQL, orden de ejecución con ciclos.
8. **Comparación de versiones** (`diff.js`): diferencias de componentes, SQL línea a línea, parámetros y tema.
9. **Diseño automático, Show Me, temas JSON (compatibles con Power BI) y plantillas** (`autoLayout.js`, `showMe.js`, `themes.js`, `templates.js`).
10. Tests xUnit (`Fundanet.Arco.Analytics.Shared.Tests`) con los fixtures de `test/fixtures/analytics/`. Para el HTML, comparar con el que genera el prototipo para las plantillas (normalizando la URL de la librería).

**Entregables:** `Fundanet.Arco.Analytics.Shared` con tests, referenciado desde la parte ABP del servidor y desde `Fundanet.Arco.Analytics.Blazor`.

**Aceptación:** todos los casos portados de `tests/core.test.js`, `features.test.js` y `queryBuilder.test.js` pasan; el HTML generado para las plantillas equivale al del prototipo; el ensamblado funciona en WASM.

---

### Fase 3 · Modelo de dominio y API del informe (ABP)

**Objetivo:** persistir la definición completa, el historial inmutable y la publicación, sustituyendo `store.js`.

**Referencia en el prototipo:** `src/lib/store.js` (crear, guardar con nota, versiones, restaurar total o parcial, publicar/despublicar, etiquetar, duplicar, exportar/importar, bloques reutilizables, marcadores), `src/lib/diff.js`, `src/lib/modelOps.js` (`validateModel`).

**Tareas**

1. Ampliar la entidad de informe existente (agregado `Report`, `FullAuditedAggregateRoot<Guid>`, `IMultiTenant` si aplica): `Name`, `Description`, `Folder`, `Mode` (`Manual` | `Designer`), `Status`, `LibVersion`, `NeedsReview` (de la migración de la Fase 1); borrador: `Html` (solo modo manual), `Definition` (JSON: modelo, orígenes, parámetros, semántica), `SchemaVersion`; `PublishedVersionId`. JSON en columnas `nvarchar(max)` (con `ISJSON` si se quiere) o mapeo JSON de EF Core.
2. `ReportVersion` (inmutable): `Number`, `Note`, `Label`, `CreatorId`, `CreationTime`, instantánea (`Mode`, `Html`, `Definition`, `LibVersion`). *Restaurar* crea una versión nueva, también parcial por partes (`design`, `data`, `params`), como `restoreVersion()`.
3. `ReportBlock` (bloques reutilizables, del usuario o compartidos) y `ReportBookmark` (vistas guardadas: filtros, nivel de profundización, página, parámetros; privadas o compartidas).
4. **Migración** de los informes existentes (tarea de datos incluida en Arco, 2.11): HTML → `Mode = Manual`; consultas actuales → orígenes `mode: sql`; versión 1 «Migrado». Los mapeos EF van en la configuración de `DbContext` que ya expone Arco; las migraciones de esquema las genera cada aplicación (y Samples).
5. *Application services*: CRUD, `SaveAsync(id, definition, note)` (crea versión), `GetVersionsAsync`, `GetVersionAsync`, `RestoreAsync(id, versionId, parts)`, `PublishAsync`, `UnpublishAsync`, `SetVersionLabelAsync`, `DuplicateAsync`, `ExportAsync(withHistory)` / `ImportAsync` (JSON compatible con el del prototipo).
6. **Validación en servidor** al guardar: JSON Schema (validador propio sencillo sobre los tipos de `Fundanet.Arco.Analytics.Shared`, sin paquete externo), `validateModel` de `Fundanet.Arco.Analytics.Shared`, y en modo `Designer` el **HTML se regenera en servidor** con `GenerateHtml` (se ignora el que mande el cliente).
7. Permisos por informe (los que ya filtran el listado) en todos los servicios; `EditSql` para crear o cambiar SQL libre.
8. Concurrencia optimista con `ConcurrencyStamp`: el segundo guardado recibe conflicto y se le ofrece comparar.
9. Retención de versiones configurable con *Settings* de ABP (el prototipo usa 50), sin borrar nunca la publicada ni las etiquetadas.
10. Tests xUnit de dominio y aplicación (base de tests de ABP).
11. Definir en `Fundanet.Arco.Analytics.Blazor` las interfaces `IReportStore` e `IReportHistoryStore` (2.12) y sus adaptadores ABP en `Fundanet.Arco.Blazor` sobre los proxies de estos app services.

**Aceptación:** los casos de uso de `store.js` existen en la API; los informes existentes se siguen viendo; las versiones no se pueden modificar; restaurar crea una versión nueva.

---

### Fase 4 · Motor de datos en SQL Server

**Objetivo:** ejecutar los orígenes de forma segura y producir `RPT_DATA`, sustituyendo alasql.

**Referencia en el prototipo:** `src/lib/sqlEngine.js` (`validateSql`, `applyCalculated`, `runQuery`, `buildReportData`, `runDataSource`), `src/lib/reportData.js` (`buildFullData`), `tests/core.test.js`, `features.test.js`.

**Tareas**

1. **Catálogo de datos** (administración): conexiones (cadena cifrada, usuario de solo lectura), esquemas/tablas/vistas **expuestos** (lista blanca), etiquetas amigables, relaciones leídas de `sys.foreign_keys` más relaciones manuales. Sustituye a `getSchema()`/`getRelations()`. `GetSchemaAsync(connectionId)` filtrado por permisos para el editor.
2. **Validación** (en el proyecto `EntityFrameworkCore`, 2.9) con `Microsoft.SqlServer.TransactSql.ScriptDom` (un `TSqlFragmentVisitor`): una sola sentencia; solo `SELECT` (con CTE permitidas); prohibido `INSERT/UPDATE/DELETE/MERGE`, DDL, `EXEC`, `SELECT INTO`, `OPENROWSET`/`OPENQUERY`/`OPENDATASOURCE`, nombres de 3–4 partes hacia otras BD o servidores vinculados, variables de tabla, `WAITFOR`; solo objetos del catálogo expuesto. Nunca con expresiones regulares.
3. **Parámetros**: el editor usa `@nombre` (en el prototipo `:nombre`; la migración de definiciones del prototipo lo convierte). Siempre `SqlParameter` con `SqlDbType` según la definición; valores validados contra su tipo. Listas (`IN`) con un parámetro por valor o `STRING_SPLIT`/tabla de valores.
4. **Orígenes derivados** (`FROM origen.<id>`): al ejecutar, se componen como **CTE** (`WITH [id] AS (…)`) en el orden de `executionOrder` de `Fundanet.Arco.Analytics.Shared`. Si un origen usa otra conexión, se rechaza (o se ejecuta en memoria con límite, si se decide en la Fase 0).
5. **Campos calculados**: se traducen a SQL envolviendo la consulta (`SELECT q.*, <expr> AS [nombre] FROM (<consulta>) q`), validando la expresión con ScriptDom (solo operadores, `CASE`, funciones de una lista blanca). Mismos mensajes de error que el prototipo.
6. **Ejecución** (en el proyecto `EntityFrameworkCore`, 2.9) con ADO.NET (`SqlConnection`, `SqlCommand`, `SqlDataReader`): `CommandTimeout`, máximo de filas (el prototipo usa 10.000; con `TOP` exterior o cortando la lectura), tamaño máximo de respuesta, `CancellationToken`, `ApplicationIntent=ReadOnly` si hay réplica de lectura.
7. **Campos**: tipos a partir del esquema del `SqlDataReader` y fusión con los editados por el usuario (`mergeFields` de `Fundanet.Arco.Analytics.Shared`).
8. **Subinformes**: portar `buildFullData()` (prefijos `subN_`, herencia de parámetros homónimos, renombrado de medidas/jerarquías, protección contra ciclos) comprobando permisos sobre el informe enlazado.
9. Endpoints:
   - `POST /api/app/report-data/{reportId}` → `RPT_DATA` de la versión publicada (o del borrador con `Edit`) con valores de parámetros.
   - `POST /api/app/report-data/preview` → definición sin guardar (requiere `Edit`, y `EditSql` si hay SQL libre).
   - `POST /api/app/report-data/preview-source` → un origen con sus dependencias y tiempo de ejecución (`runDataSource`).
   - `POST /api/app/report-render/{reportId}` → devuelve un **token firmado de un solo uso**; `GET /reports/render/{token}` → HTML con `RPT_DATA` inyectado y cabeceras CSP (ver 2.6). Así el iframe sandbox no necesita el token de la app.
10. Caché opcional en memoria/distribuida de ABP por (versión, parámetros, usuario/inquilino), invalidada al publicar.
11. **Auditoría**: quién ejecuta qué origen, con qué parámetros y cuánto tarda (auditoría de ABP + log estructurado).
12. Punto de extensión de seguridad por filas `IReportDataFilterProvider` (se completa en la Fase 13).
13. Tests: unitarios de validación (consultas permitidas y prohibidas) e integración contra la **SQL Server local de Samples** (LocalDB o contenedor; la misma en CI) cargada con `src/data/sampledb.json`, comparando resultados con los del prototipo.

**Aceptación:** las plantillas del prototipo, ejecutadas contra la BD de pruebas, producen `RPT_DATA` equivalente; ninguna consulta que no sea `SELECT` o que toque tablas no expuestas pasa la validación; los parámetros nunca se concatenan.

---

### Fase 5 · Visor de informes y exportación

**Objetivo:** componente Blazor reutilizable para ver informes (listado, editor y dashboard) con parámetros, filtros, marcadores y exportación sin dependencias en el cliente.

**Referencia en el prototipo:** `src/components/ReportFrame.jsx`, `ParamsBar.jsx`, `src/pages/Viewer.jsx`, `src/lib/exporters.js` (estructura de Word y Excel), `lib-src/rptlib-1.2/70-report.js` (mensajes `rpt:*` y `collect()`), `e2e/app.spec.js`, `e2e/v3.spec.js`.

**Tareas**

1. `ReportViewer` (en `Fundanet.Arco.Analytics.Blazor`, sin ABP) con `ReportId`, `VersionId?`, `InitialParams`, `InitialState`, `Height`, `ShowToolbar`, `Compact` (dashboard). Organización de la barra igual que `ReportFrame.jsx`, con controles corporativos donde existan.
2. `<iframe sandbox="allow-scripts">` con la URL de un solo uso (Fase 4) o `srcdoc` para el borrador del editor (HTML de `Fundanet.Arco.Analytics.Shared` + datos de `preview`).
3. `reportBridge.js` (módulo ES propio): escucha `message`, acepta solo `event.source === iframe.contentWindow`, reenvía `rpt:ready`, `rpt:state`, `rpt:filters`, `rpt:collected` a .NET (`DotNetObjectReference`) y expone `post(message)`.
4. `ReportParamsBar`: controles generados desde la definición (texto, número, fecha, lista, rango con periodos predefinidos); «Aplicar» recarga.
5. Barra: filtros activos y «Quitar filtros», vista por dispositivo (escritorio/tablet/móvil), imprimir/PDF (`rpt:print`, impresión del navegador con `@page`), pantalla completa.
6. **Exportación Word/Excel en servidor**: el visor pide `rpt:collect` (contenido real: filtros aplicados, imágenes de gráficos, valores de tablas y grupos) y lo envía a `POST /api/app/report-export/{docx|xlsx}`; el servidor genera el fichero con **Open XML SDK** portando la estructura de `buildDocx`/`buildXlsx` (encabezado/pie, numeración, KPI, gráficos como imagen, tablas con cabecera repetida; hoja de resumen, formatos numéricos, esquema por grupos, totales, autofiltro, cabecera fija). `download.js` descarga el resultado. CSV ya lo hace la librería.
7. **Marcadores** sobre `ReportBookmark`: guardar (`rpt:state`), aplicar (`rpt:setState`), compartir por enlace con el id del marcador.
8. Estados de carga, error por origen y vacío; textos localizados con ABP.
9. Interfaces `IReportDataService`, `IBookmarkStore`, `IAnalyticsAuthorization`, `IAnalyticsNotifier` (2.12) y sus adaptadores ABP. Usar el visor en el **listado** y en el **dashboard actual** desde ya, para validarlo con usuarios reales.
10. Tests bUnit y e2e Playwright (escenarios de lectura de `e2e/app.spec.js`: filtros, filtro cruzado, ver datos, exportar).

**Aceptación:** un informe migrado (manual) y una plantilla del prototipo se ven en el listado y en el dashboard con parámetros, filtros, marcadores y exportación a PDF/Word/Excel/CSV; el iframe no puede acceder a la sesión; el visor es igual que el del prototipo (comparación visual, 2.10).

---

### Fase 6 · Diseñador visual del informe (Blazor)

**Objetivo:** el diseñador de arrastrar y soltar en Blazor, con la misma organización y estilos que el prototipo.

**Referencia en el prototipo:** `src/components/Designer.jsx` (paleta, lienzo, filas, arrastre con puntero, redimensionado, multiselección, atajos, dispositivos, bloques, diseño automático), `PropertyPanel.jsx`, `LiveComponent.jsx`, `ShowMePanel.jsx`, `Icon.jsx`, `src/styles.css`, `e2e/app.spec.js` y `e2e/mobile.spec.js`.

**Tareas**

1. Componentes en `Fundanet.Arco.Analytics.Blazor` (sin ABP) con la estructura del prototipo: `DesignerPalette`, `DesignerCanvas` (páginas → filas → celdas), `PropertyPanel`, `ShowMePanel`, `ThemePanel`, `BlocksPanel`. En móvil, paleta/lienzo/propiedades como pestañas, como en el prototipo.
2. **Estado del editor en C#**: modelo inmutable de `Fundanet.Arco.Analytics.Shared`, selección (simple y múltiple), pila de deshacer/rehacer, portapapeles (en `localStorage` del navegador para copiar/pegar entre informes, vía interop mínima).
3. `rptCanvas.js`: arrastrar desde la paleta y entre filas, «tocar para insertar» en móvil, redimensionar por los bordes (ancho en 12 columnas y alto); calcula el destino y llama a .NET con la intención; .NET aplica `moveCell`/`insertCell`/`updateCell` y vuelve a pintar.
4. `rptLive.js`: carga la librería de la versión del informe en la página de la aplicación y pinta cada celda con `ArcoAnalytics.renderComponent(el, type, props, source, { interactive: false, … })` y los datos de la vista previa. Es código propio y las props se escapan en la librería; si se prefiere aislar, pintar el lienzo dentro de un iframe del mismo origen.
5. **Panel de propiedades** generado desde el catálogo de `Fundanet.Arco.Analytics.Shared` (tipos de control, `when`, campos compatibles según tipo, medidas y jerarquías), con controles corporativos donde existan.
6. Atajos de teclado (`Supr`, `Ctrl+Z/Y`, `Ctrl+C/V`, `Ctrl+A`, flechas), vista por dispositivo, diseño automático, bloques reutilizables (`ReportBlock`), tema (marca, paleta, densidad, claro/oscuro, logotipo, importar/exportar tema JSON), Show Me, avisos de vínculos rotos, multipágina.
7. **Toda la paleta y todas las propiedades del catálogo** desde esta fase (texto, filtros, losetas, KPI, gauge, gráficos, dispersión, tablas, tabla dinámica, mapa, cascada, embudo, treemap, calendario, bullet, Sankey, narrativa, subinforme…), con las mismas opciones del panel que en el prototipo.
8. Estilos y marcado según 2.8 y 2.10; los controles corporativos usados se anotan en la lista de revisión de la Fase 14.
9. Tests bUnit (panel de propiedades, atajos, deshacer), e2e Playwright portando los escenarios de diseño de `e2e/app.spec.js` y `e2e/mobile.spec.js`, y comparación visual con el prototipo (2.10).

**Aceptación:** el diseñador es indistinguible del del prototipo (comparación visual y e2e portados en verde); las plantillas se reproducen con ratón, teclado y táctil; la lógica de modelo está en C# y tiene tests.

---

### Fase 7 · Diseñador de consultas y orígenes de datos

**Objetivo:** editor visual de consultas y editor SQL sobre el esquema real de SQL Server.

**Referencia en el prototipo:** `src/lib/queryBuilder.js`, `src/lib/sqlToBuilder.js` (interpretación y motivos de no soportado), `src/components/QueryBuilder.jsx`, `SqlEditor.jsx`, `DataSourcesEditor.jsx` (campos, tipos, formatos, campos calculados, parámetros, renombrar orígenes), `tests/queryBuilder.test.js`, `tests/sqlToBuilder.test.js`.

**Tareas**

1. **Editor visual** (Blazor + `rptQueryCanvas.js`): arrastrar tablas del catálogo al lienzo, uniones automáticas por las **FK reales** (`sys.foreign_keys`) y uniones manuales con dos clics en los conectores, columnas con función de fecha, agregación, alias y orden, filtros por valor o por parámetro (opcionales «ignorar si vacío»), `DISTINCT` y límite. El T-SQL de solo lectura se genera **en el cliente** con `Fundanet.Arco.Analytics.Shared` (al momento) y el servidor lo regenera al guardar y al ejecutar.
2. **T-SQL → visual** en servidor (`POST /api/app/query/parse`): portar `sqlToBuilder()` sobre el árbol de ScriptDom; devuelve el `builder` o el motivo de no soportado (expresiones, `CASE`, `OR`, `HAVING`, subconsultas, `RIGHT JOIN`, orígenes derivados…). Comprobación de equivalencia ejecutando ambas consultas con `TOP (n)` y comparando, como el prototipo.
3. Fixtures: los casos de `tests/sqlToBuilder.test.js` reescritos en T-SQL para xUnit.
4. **Editor SQL igual que el del prototipo**: CodeMirror 6 con la configuración de `SqlEditor.jsx` (`basicSetup`, `lang-sql` con dialecto `MSSQL`, `Mod-Enter` para ejecutar, autocompletado de tablas, columnas del catálogo y `origen.<id>`, inserción de fragmentos de `QUERY_SNIPPETS`), envuelto en `rptSqlEditor.js` y un componente Blazor. Además, validación en servidor con *debounce* mostrando el error de ScriptDom.
5. **Gestión de orígenes**: crear (visual/SQL), duplicar, renombrar actualizando componentes y relaciones semánticas, elegir conexión, vista previa con tiempo de ejecución (`preview-source`), edición de campos (etiqueta, tipo, formato) y campos calculados.
6. **Editor de parámetros**: todos los tipos de la Fase 4, valores por defecto, lista estática o desde consulta, periodos predefinidos.
7. Permisos en la UI: sin `EditSql` solo editor visual (el SQL generado se ve en solo lectura); con él, se puede pasar a SQL manual.

**Aceptación:** los casos portados de los tests del prototipo pasan en T-SQL; un usuario sin `EditSql` crea un informe completo solo con el editor visual.

---

### Fase 8 · Pantalla de creación y edición

**Objetivo:** rehacer la página existente de creación/edición con asistente, pestañas y ciclo de vida, conservando la subida de HTML.

**Referencia en el prototipo:** `src/pages/Wizard.jsx` (galería: en blanco, desde los datos, plantillas, subir HTML; pasos información → orígenes → diseño → revisión), `src/pages/ReportEditor.jsx` (pestañas Vista previa / Diseño / Orígenes / Modelo / HTML / Historial, cambios sin guardar, nota de versión), `src/components/HtmlTab.jsx`, `HistoryTab.jsx`.

**Tareas**

Las pantallas son componentes agnósticos (`<ReportWizardView>`, `<ReportEditorView>`) en `Fundanet.Arco.Analytics.Blazor`; la parte ABP aporta las páginas con ruta que los envuelven.

1. **Asistente** (organización de `Wizard.jsx`): 1) información (nombre, descripción, carpeta, permisos); 2) orígenes (Fase 7); 3) diseño: galería (en blanco, **desde los datos** con diseño automático, plantillas, **subir HTML**) y diseñador (Fase 6); 4) revisión con `ReportViewer` sobre el borrador y avisos de validación.
2. **Editor** con las pestañas del prototipo. El estado del borrador vive en un servicio *scoped* del cliente para no perder deshacer/rehacer al cambiar de pestaña.
3. Pestaña **HTML**: en modo manual, subir/pegar/editar (flujo actual); si el HTML contiene `rpt-model`, «Abrir en el diseñador» (`ParseModelFromHtml`); avisos de orígenes no definidos o de librería no enlazada (y si lleva código pegado, ofrecer sustituirlo por el enlace). En modo diseñador, HTML generado en solo lectura con «Convertir a manual».
4. **Guardar** con nota, validación en servidor y control de concurrencia; aviso al salir con cambios (`NavigationLock` de Blazor).
5. **Historial**: versiones con autor, fecha, nota y etiqueta; ver, descargar, etiquetar, **comparar dos versiones** (diff de `Fundanet.Arco.Analytics.Shared`), **restaurar total o parcial**, publicar/despublicar.
6. Plantillas como datos (`ReportTemplate`) y «Guardar como plantilla».
7. e2e: crear con el asistente de punta a punta, editar, comparar, restaurar y publicar.

**Aceptación:** se crea un informe sin escribir HTML ni SQL; subir HTML sigue funcionando como hoy (pero enlazando la librería); el historial cubre los casos de `HistoryTab.jsx`.

---

### Fase 9 · Listado de informes

**Objetivo:** mejorar la página existente de informes por permisos.

**Referencia en el prototipo:** `src/pages/ReportList.jsx`.

**Tareas**

1. Componente agnóstico `<ReportListView>` (página ABP que lo envuelve). Mantener el filtrado por permisos y añadir buscador, filtros (carpeta, modo, estado, autor, «Revisar» de la migración de la Fase 1), orden y paginación en servidor.
2. Acciones según permisos: ver (Fase 5), editar, duplicar, eliminar, publicar, exportar/importar JSON, **añadir al dashboard**.
3. Favoritos y recientes por usuario.
4. Indicadores: versión publicada, cambios sin publicar, última modificación, versión de librería.

**Aceptación:** cada usuario solo ve y opera lo que su permiso le deja; búsqueda y filtros funcionan con cientos de informes.

---

### Fase 10 · Dashboard personalizable

**Objetivo:** pasar de «añadir informes» a un tablero flexible por usuario.

**Referencia en el prototipo:** rejilla de 12 columnas y redimensionado del diseñador (`Designer.jsx`, `modelOps.js`; reutilizar `rptCanvas.js`), `ReportFrame.jsx` (estado y marcadores), arco-analytics (`renderComponent()`, `getState()/setState()`).

**Tareas**

1. `UserDashboard` (uno o varios por usuario, uno por defecto) con mosaicos: posición/tamaño en rejilla, tipo (`report` | `visual`), referencia (informe, versión fija o «última publicada»), parámetros, marcador, título.
2. Componente agnóstico `<DashboardView>` sobre `IDashboardStore` (página ABP que lo envuelve). Rejilla en modo edición/lectura con `rptCanvas.js` (sin librería de rejilla de terceros); adaptable a móvil.
3. Mosaico **informe**: `ReportViewer` compacto con parámetros y marcador propios.
4. Mosaico **visual anclado** («Anclar al dashboard» desde el menú de una tarjeta): guarda informe + celda + estado de filtros; se pinta solo ese componente con los orígenes que usa.
5. Actualización manual y periódica por mosaico, con «actualizado hace…».
6. Dashboards base por rol que el usuario puede clonar (opcional).
7. Si el usuario pierde el permiso sobre un informe, el mosaico muestra un aviso.

**Aceptación:** el usuario compone, mueve y redimensiona mosaicos con parámetros propios, y el estado persiste entre sesiones y dispositivos.

---

### Fase 11 · Modelo semántico, analítica y paginados

**Objetivo:** habilitar en el producto las capacidades avanzadas de la librería que dependen del editor.

**Referencia en el prototipo:** `src/components/SemanticEditor.jsx`, `lib-src/rptlib-1.2/10-semantic.js` (relaciones, medidas, jerarquías, selección asociativa, `compileMeasure`), `40-chart.js`, `50-viz.js`, `60-tables.js`, `70-report.js`, `htmlGenerator.js` (`paperCss`, páginas, `data-rpt-filters`), `e2e/v3.spec.js`.

**Tareas**

1. Pestaña **Modelo** en Blazor: relaciones con sugerencias, medidas con validación en vivo, jerarquías, selección asociativa. Portar el analizador de medidas de `10-semantic.js` a `Fundanet.Arco.Analytics.Shared` (validación en cliente y en servidor); la evaluación sigue en la librería.
2. **Multipágina** y filtros de informe (sincronizados o por página).
3. **Paginados**: diseño de página (tamaño, orientación, márgenes, encabezado, pie, numeración, fecha), saltos de página, tablas agrupadas con subtotales, subinformes (motor ya en la Fase 4).
4. Comprobar de punta a punta la analítica de la librería (comparación temporal, líneas de referencia, previsión, anomalías, narrativa, múltiplos pequeños) con medidas y jerarquías del modelo; la paleta y el panel ya están completos desde la Fase 6.
5. e2e: portar `e2e/v3.spec.js`.

**Aceptación:** la plantilla *Ventas 2025* del prototipo (3 páginas, modelo semántico, profundizar, comparación interanual, previsión, mapa, Sankey y tabla agrupada) se crea, guarda, publica y ve con el mismo resultado.

---

### Fase 12 · Envíos programados

**Objetivo:** enviar informes de forma programada.

**Tareas**

1. Programaciones con *Background Workers/Jobs* de ABP: informe, parámetros (incluidas fechas relativas resueltas al enviar), formato, destinatarios, periodicidad; con los permisos del propietario o de cada destinatario.
2. **Excel** (y Word sin gráficos) sin navegador: generar con Open XML a partir de `RPT_DATA` y del modelo (tablas, KPI, agrupaciones), reutilizando el código de la Fase 5.
3. **PDF y gráficos como imagen**: necesitan un navegador en servidor (Chromium headless). Es la única dependencia pesada del plan y requiere ADR. Alternativa sin dependencias: enviar un enlace al informe con los parámetros y adjuntar Excel.
4. Alertas (opcional): condición sobre una medida que dispara un aviso.
5. Cola y concurrencia de generación; ficheros temporales con BLOB Storing de ABP.

**Aceptación:** un informe programado llega con los parámetros resueltos en el momento del envío y sus datos coinciden con los de pantalla.

---

### Fase 13 · Endurecimiento

**Tareas**

1. **Rendimiento**: empujar agregaciones a SQL Server (consulta agregada por visual según categoría, valores y filtros), paginación en servidor para tablas grandes, muestreo para dispersión; mantener el modo actual (filas al cliente) para orígenes pequeños. Revisar el tamaño de la descarga WASM (*trimming*, carga diferida del ensamblado del diseñador).
2. **Seguridad por filas** (completar `IReportDataFilterProvider`) por usuario, rol o inquilino; valorar *Row-Level Security* nativa de SQL Server con `SESSION_CONTEXT`.
3. **Seguridad**: CSP del endpoint de render (solo la librería y los datos; `img-src` controlado para logotipos), XSS en props de texto y logo, límites de tamaño de definiciones, *rate limiting* de datos y exportación, secretos de conexión.
4. **Accesibilidad** (WCAG 2.1 AA) de las pantallas y del lienzo; mantener lo que ya hace la librería.
5. **Observabilidad**: tiempo de consulta, tamaño de respuesta, errores por origen, uso por informe; panel de «consultas lentas».
6. **Actualización de librería**: asistente para pasar informes de `0.9.0` a `1.x` (o entre versiones `1.x`) con vista previa lado a lado y regresión visual.
7. Documentación de usuario y de administración.

---

### Fase 14 · Revisión visual con la librería corporativa

**Objetivo:** alinear con la librería corporativa lo que se portó tal cual desde el prototipo. Es una revisión **visual**: no cambia la organización de las pantallas ni el comportamiento ni las funciones.

**Tareas**

1. Recorrer la lista de «estilos del prototipo pendientes de revisión» (2.8) pantalla a pantalla: listado, asistente, editor (diseño, orígenes, consultas, modelo, HTML, historial), visor y dashboard.
2. Para cada caso: sustituir por un control corporativo existente, proponer un control nuevo a la librería corporativa (paleta de componentes, lienzo, editor de consultas, panel de propiedades…) o mantener el estilo propio documentado.
3. Eliminar CSS portado que quede sin uso; unificar tokens (colores, espaciado, tipografía) con los corporativos.
4. Revisar el tema de los informes (librería en el iframe) frente a la identidad corporativa y, si procede, publicar una versión de la librería con los nuevos tokens (sin cambiar los informes existentes, que siguen en su versión).
5. Regresión visual de las pantallas antes y después.

**Aceptación:** la lista de revisión está vacía (cada elemento resuelto o documentado como excepción).

---

## 5. Dependencias entre fases e hitos

```
Fase 0 ─┬─► Fase 1 (librería: 1A ya, 1B después)
        ├─► Fase 2 (Shared) ─┬─► Fase 3 (dominio/API) ─► Fase 4 (motor SQL Server) ─► Fase 5 (visor) ─┬─► Fase 9 (listado)
        │                    │                                                                     └─► Fase 10 (dashboard)
        │                    └─► Fase 6 (diseñador) ──► Fase 7 (consultas) ──► Fase 8 (editor) ──► Fase 11 ─► Fase 12 ─► Fase 13 ─► Fase 14
```

- La **Fase 1A** (extraer y enlazar el código existente) se puede hacer nada más terminar el inventario: es el cambio de más valor inmediato y de menor riesgo.
- Las Fases 1B, 2 y 3 pueden ir en paralelo.
- La Fase 6 puede empezar en cuanto exista `Fundanet.Arco.Analytics.Shared`, con datos de prueba; se conecta a la API cuando estén las Fases 3 y 4.
- Las Fases 9 y 10 solo necesitan el visor (Fase 5): pueden entregarse antes que el diseñador.

Cada hito se publica como versiones `-preview.N` de los paquetes y la versión estable sale al terminarlo.

| Hito | Fases | Valor para el usuario |
|---|---|---|
| H1 · Base sólida | 0, 1, 2, 3, 4 | Librería enlazada y versionada (no pegada); consultas seguras y parametrizadas; historial y publicación. |
| H2 · Lectura | 5, 9, 10 | Visor con filtros, marcadores y exportación; listado y dashboard mejorados. |
| H3 · Autoría | 6, 7, 8 | Diseñador visual de informes y de consultas. |
| H4 · Avanzado | 11, 12, 13 | Modelo semántico, paginados, envíos programados, rendimiento y seguridad. |
| H5 · Acabado | 14 | Pantallas alineadas con la librería corporativa. |

---

## 6. Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Informes existentes con el código pegado y **editado a mano** | Detección por hash; esos informes no se migran automáticamente y se marcan «Revisar». |
| Diferencias entre el código existente y RptLib (marcado, API) | Matriz de compatibilidad (Fase 0), `0.9.0` intacta para los existentes y `05-compat.js` para facilitar el paso a `1.0.0`. |
| Diferencias entre alasql (prototipo) y T-SQL | Generación y análisis en T-SQL con fixtures; BD de pruebas con `sampledb.json` para comparar resultados. |
| Portar a Blazor la interacción del diseñador (arrastre, táctil, redimensionado) | Toda la lógica en C# probada; el JS de puntero se porta del de `Designer.jsx`; e2e del prototipo (escritorio y móvil) portados desde el principio. |
| Divergencias entre el prototipo y el port a Blazor | Port 1:1 de marcado y CSS literal, lista de paridad, e2e con los mismos selectores y comparación visual lado a lado en CI (2.10). |
| CodeMirror como dependencia | Versión fija empaquetada en local (sin CDN), envuelta en un único módulo para poder cambiarla sin tocar el resto. |
| Tamaño de la descarga WASM | `Analytics.Shared` no tiene dependencias; ScriptDom y Open XML solo en servidor; carga diferida del ensamblado del diseñador. |
| Fallos de empaquetado NuGet (activos estáticos, versiones de la librería, dependencias transitivas) | Prueba de humo con los paquetes empaquetados en CI y comprobación de hashes de las versiones de la librería. |
| Que se cuele una dependencia de ABP en los proyectos agnósticos | Comprobación del grafo de dependencias en CI; tests bUnit con implementaciones falsas, sin ABP. |
| Analytics llega a todas las aplicaciones que usan Arco (tablas, dependencias, tamaño) | *Feature* `ArcoAnalytics.Enabled`, dependencias nuevas solo en los proyectos de servidor adecuados, `CHANGELOG` y guía de actualización. |
| Cambios incompatibles para las aplicaciones que consumen Arco | SemVer, versiones `-preview` por hito, `CHANGELOG`, guías de actualización y tareas de migración de datos idempotentes. |
| Seguridad del SQL libre | `EditSql`, ScriptDom, lista blanca, usuario de solo lectura, timeout y límites, auditoría. |
| Iframe sin `allow-same-origin` y autenticación | Datos inyectados con token de un solo uso; nunca relajar el sandbox. |
| PDF programado necesita navegador en servidor | Decisión aparte con ADR; alternativa con enlace + Excel. |
| Estilos replicados que divergen de la librería corporativa | Lista de revisión desde el primer día y Fase 14 dedicada. |

---

## 7. Definición de terminado (todas las fases)

- Tests xUnit/bUnit (y de la librería JS) y e2e Playwright de la funcionalidad, en CI y en verde, con los casos portados del prototipo.
- Permisos ABP comprobados en servidor (nunca solo en la UI).
- `Fundanet.Arco.Analytics.Shared` y `Fundanet.Arco.Analytics.Blazor` sin dependencias de ABP (comprobación de CI en verde).
- Ninguna dependencia nueva fuera de la [política](#27-política-de-dependencias) sin ADR.
- Textos localizados (ABP en .NET/Blazor; diccionarios en la librería).
- Accesible con teclado y lector de pantalla en lo nuevo; funciona en escritorio y móvil.
- **Paridad con el prototipo** (2.10): lista de paridad al día, e2e portados y comparación visual sin diferencias no registradas.
- Estilos: controles corporativos solo donde ya existan para lo mismo; anotados en la lista de revisión de la Fase 14.
- Samples actualizado con la funcionalidad y la prueba de humo con los paquetes NuGet en verde.
- API pública, esquema de BD y formato de la definición sin cambios incompatibles fuera de una versión mayor; `CHANGELOG` y guía de actualización al día.
- Documentación actualizada (este plan, README de los paquetes y de `client/arco-analytics`, ADR).
- Sin regresiones en los informes existentes.
