# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Lido Control: Tauri v2 desktop app (React 19 + Vite, plain JavaScript, no TypeScript) that tracks monthly water and electricity consumption for the apartments of a building and computes what each tenant pays. The UI is in Spanish (Colombia) and is meant for a non-technical elderly user, so keep it simple, with large text. Code identifiers, comments and JSDoc are also in Spanish; follow that. `prompt_agente_app_servicios.md` is the original spec (Spanish) the app was built from.

## Commands

```bash
npm install
npm run tauri dev      # full app (Vite on fixed port 1420 + Rust shell)
npm run dev            # frontend only in a browser — Tauri `invoke` calls will fail, so data never loads
npm run tauri build    # bundles deb/rpm/nsis; binary at src-tauri/target/release/lido-control
```

On Fedora/Wayland, if the window doesn't open: `WEBKIT_DISABLE_DMABUF_RENDERER=1 GDK_BACKEND=x11 npm run tauri dev`.

There are no tests and no linter configured. `.github/workflows/build-windows.yml` builds the Windows NSIS installer on push to main/master and via manual dispatch.

## Architecture

**Persistence is a single JSON file, owned by two Rust commands.** `src-tauri/src/lib.rs` exposes `read_data` and `write_data` for storage, which read and write the whole `data.json` in Tauri's `appDataDir`. Rust only validates that the content is valid JSON and seeds the default four apartments when the file is missing. There is no fs plugin. `data.json` is gitignored.

**All business logic lives in the frontend.** Rust never computes anything; its only other job is `extraer_datos_recibo` (`src-tauri/src/recibo.rs`), which sends a receipt PDF to the Gemini API (structured JSON output, first page only) so the API key stays out of the JS bundle. It reads `GEMINI_API_KEY` / `GEMINI_MODEL` from the process env, then `.env` in the project root or the app data dir (see `.env.example`; `.env` is gitignored). Rust also enforces a cap of 3 PDF reads per calendar month (`MAX_USOS_MENSUALES`), counted in `uso_pdf.json` in the app data dir (separate from `data.json`) and exposed to the UI via `estado_uso_recibo`. The frontend side is `src/helpers/reciboPdf.js` plus `manejarCargaPdf` in `RegistroMensual.jsx`, which only overwrites the fields Gemini could read. Changing the data shape means updating `normalizarDatos` in `src/hooks/useData.js` (which repairs legacy records, e.g. assigns ids), the seed in `lib.rs`, and `DATOS_VACIOS` in `useData.js`; the seeds are duplicated.

**State flow.** `src/hooks/useData.js` is the only data layer. It holds `{ apartamentos, registros }`, and every mutation (`guardarRegistro`, `eliminarRegistro`, `guardarApartamentos`) rewrites the entire file and then updates state. `App.jsx` calls `useData()` once and passes data and callbacks down as props to three views (`RegistroMensual`, `Historial`, `ConfigApartamentos`). Navigation is a `useState` (`VISTAS` in `helpers/constantes.js`), with no router.

**Data model.** A `registro` is one month (`mes` as a Spanish month name + numeric `anio`, unique per pair, with a UUID `id`). It holds the tariffs (`tarifaEnergia`, `tarifaAgua`, `tarifaFija`), a `recibo` object with the raw bill totals the tariffs are derived from, and an `apartamentos[]` array with per-apartment `energia` / `agua` (`lecturaAnterior`, `lecturaActual`, `consumo`, `costo`) and `totalAPagar`. Deleting an apartment in the config view also strips it from all existing registros and drops registros left empty.

**Calculations** are pure functions in `src/helpers/calculos.js`. Tariffs are derived from the bill: water = (sewer + aqueduct) / m³, energy = total / kWh, fixed = misc services / number of apartments. Consumption = current − previous reading, `total = energy cost + water cost + fixed tariff`. Empty strings must yield `null`, not 0 (`Number("") === 0`); preserve that distinction. `RegistroMensual` prefills each previous reading from the prior month's current reading (`helpers/fechas.js`).

**Large components.** `RegistroMensual.jsx` (~900 lines) and `Historial.jsx` (~450 lines) hold most of the UI. `Historial.jsx` also contains the `.xlsx` export (SheetJS). The per-apartment summary image is drawn manually on a `<canvas>` in `src/helpers/resumenImagen.js` (layout numbers are hard-coded), shared by Historial and RegistroMensual: JPG download, or WhatsApp sharing, which copies the PNG to the clipboard and opens `whatsapp://send?phone=57…` (WhatsApp can't attach files from a link, so the user pastes with Ctrl+V; falls back to wa.me / web.whatsapp.com). The optional per-apartment `telefono` (10-digit Colombian mobile) is edited in ConfigApartamentos; the custom URL schemes are allow-listed in `src-tauri/capabilities/default.json`. Table keyboard navigation (Excel-like arrows/Enter across `data-fila` / `data-columna` inputs) is in `helpers/navegacionTabla.js`.

**Messages** follow one rule everywhere: form guidance (what's wrong or what to do next, e.g. "Complete todos los campos de lecturas antes de guardar.") stays inline, near the relevant field — in `RegistroMensual` that's the single `mensajeAyuda` paragraph next to mes/año (priority: row-validation > `aviso` state > the "Recuerde actualizar las tarifas" reminder); in `ConfigApartamentos` it's the `error` state under the form. One-off action outcomes (saved/deleted/added, or a failure) go through `src/hooks/useToast.js` (`mostrarExito`/`mostrarError`, module-level store, no context) and render as auto-dismissing toasts top-left via `<Toast />` (mounted once in `App.jsx`). `resumenImagen.js` calls `mostrarExito`/`mostrarError` itself rather than taking a callback.

Styling is one plain CSS file, `src/styles/global.css`; there is no CSS framework or UI library.
