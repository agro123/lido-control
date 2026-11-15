# Graph Report - lido-control  (2026-11-14)

## Corpus Check
- Corpus is ~16,475 words - fits in a single context window. You may not need a graph.

## Summary
- 279 nodes · 595 edges · 15 communities (10 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.91)
- Token cost: 44,278 input · 0 output

## Community Hubs (Navigation)
- Historial and Calculations
- Summary Images and WhatsApp
- Monthly Registration UI
- App Shell and Apartment Config
- NPM Dependencies
- Gemini Receipt Extraction
- Windows CI Workflow
- Tauri Config
- Data Layer and Persistence
- Tauri Capabilities
- Project Docs Overview
- Cargo Package
- Windows NSIS Build

## God Nodes (most connected - your core abstractions)
1. `RegistroMensual()` - 39 edges
2. `Historial()` - 23 edges
3. `mostrarExito()` - 21 edges
4. `mostrarError()` - 21 edges
5. `ModalDetalle()` - 16 edges
6. `calcularFilaApartamento()` - 13 edges
7. `construirComparacionApartamento()` - 13 edges
8. `compartirResumenPorWhatsApp()` - 13 edges
9. `compartirResumenEdificioPorWhatsApp()` - 13 edges
10. `construirResumenEdificio()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Increase/decrease explanation text` --implements--> `construirComparacionEdificio()`  [INFERRED]
  segunda funcionalidad.md → src/helpers/resumenImagen.js
- `Single data.json persistence` --references--> `read_data()`  [EXTRACTED]
  CLAUDE.md → src-tauri/src/lib.rs
- `Single data.json persistence` --references--> `write_data()`  [EXTRACTED]
  CLAUDE.md → src-tauri/src/lib.rs
- `3 PDF reads per month cap` --references--> `estado_uso_recibo()`  [EXTRACTED]
  CLAUDE.md → src-tauri/src/recibo.rs
- `WhatsApp sharing via clipboard` --references--> `compartirResumenPorWhatsApp()`  [EXTRACTED]
  CLAUDE.md → src/helpers/resumenImagen.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Building summary image share** — src_helpers_resumenimagen_construirresumenedificio, src_helpers_resumenimagen_construircomparacionedificio, src_helpers_resumenimagen_compartirresumenedificioporwhatsapp [EXTRACTED 1.00]
- **Persistence flow** — src_app, src_hooks_usedata, src_tauri_src_lib_read_data, src_tauri_src_lib_write_data [EXTRACTED 1.00]
- **Receipt PDF extraction flow** — src_components_registromensual_manejarcargapdf, src_helpers_recibopdf, src_tauri_src_recibo_extraer_datos_recibo [EXTRACTED 1.00]

## Communities (15 total, 5 thin omitted)

### Community 0 - "Historial and Calculations"
Cohesion: 0.11
Nodes (39): Historial Excel export, aplanarRegistros(), buscarRegistroAnterior(), calcularTotalRegistro(), calcularVariacionPorcentual(), CampoDetalle(), CampoReciboDetalle(), CAMPOS_RECIBO (+31 more)

### Community 1 - "Summary Images and WhatsApp"
Cohesion: 0.12
Nodes (33): Building-wide summary image for owner, Increase/decrease explanation text, datosResumenEdificio(), datosResumen(), datosResumenEdificio(), formatearConsumo(), formatearPesos(), abrirWhatsApp() (+25 more)

### Community 2 - "Monthly Registration UI"
Cohesion: 0.12
Nodes (27): actualizarLectura(), crearFilaConMesAnterior(), crearFilaVacia(), formatearFechaActual(), obtenerMesAnioActual(), RegistroMensual(), actualizarCampo(), actualizarTarifasDesdeRecibo() (+19 more)

### Community 3 - "App Shell and Apartment Config"
Cohesion: 0.15
Nodes (21): react, App(), celularValido(), ConfigApartamentos(), guardarEdicion(), manejarAgregar(), manejarEliminar(), manejarGuardarDueno() (+13 more)

### Community 4 - "NPM Dependencies"
Cohesion: 0.09
Nodes (26): dependencies, react@^19.1.0, react-dom@^19.1.0, @tauri-apps/api@^2, @tauri-apps/plugin-opener@^2, xlsx@^0.18.5, devDependencies, @tauri-apps/cli@^2 (+18 more)

### Community 5 - "Gemini Receipt Extraction"
Cohesion: 0.13
Nodes (16): Gemini .env setup (GEMINI_API_KEY, GEMINI_MODEL), manejarCargaPdf, ARCHIVO_USO, cargar_env(), DatosRecibo, estado_uso_recibo(), EstadoUso, extraer_datos_recibo() (+8 more)

### Community 6 - "Windows CI Workflow"
Cohesion: 0.07
Nodes (26): runs-on, steps, GITHUB_TOKEN, jobs, build-windows, name, on, push (+18 more)

### Community 7 - "Tauri Config"
Cohesion: 0.11
Nodes (17): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+9 more)

### Community 8 - "Data Layer and Persistence"
Cohesion: 0.17
Nodes (10): Data model (registro), DATOS_VACIOS, eliminarRegistro, guardarApartamentos, guardarRegistro, normalizarDatos(), DATA_INICIAL, read_data() (+2 more)

### Community 9 - "Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

## Knowledge Gaps
- **10 isolated node(s):** `lido-control`, `Data model (registro)`, `guardarRegistro`, `eliminarRegistro`, `guardarApartamentos` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 88 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App Shell and Apartment Config` to `Historial and Calculations`, `Data Layer and Persistence`, `Monthly Registration UI`, `NPM Dependencies`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **What connects `lido-control`, `Data model (registro)`, `guardarRegistro` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Historial and Calculations` be split into smaller, more focused modules?**
  _Cohesion score 0.1091753774680604 - nodes in this community are weakly interconnected._
- **Why does `Gemini receipt PDF extraction` connect `Gemini Receipt Extraction` to `Monthly Registration UI`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `Summary Images and WhatsApp` be split into smaller, more focused modules?**
  _Cohesion score 0.12375533428165007 - nodes in this community are weakly interconnected._
- **Why does `RegistroMensual()` connect `Monthly Registration UI` to `Historial and Calculations`, `Summary Images and WhatsApp`, `App Shell and Apartment Config`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Should `Monthly Registration UI` be split into smaller, more focused modules?**
  _Cohesion score 0.11596638655462185 - nodes in this community are weakly interconnected._