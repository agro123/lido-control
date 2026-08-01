# Lido Control

Aplicación de escritorio para gestionar el consumo mensual de **agua** y **energía** de un edificio con varios apartamentos.

## Requisitos

- Node.js 18+
- Rust (stable) y Cargo
- Dependencias de Tauri v2 para su sistema operativo ([guía oficial](https://tauri.app/start/prerequisites/))

## Desarrollo

```bash
npm install
npm run tauri dev
```

Si en Fedora/Wayland la ventana no abre (error de WebKit), pruebe:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 GDK_BACKEND=x11 npm run tauri dev
```

## Compilar

```bash
npm run tauri build
```

En Fedora genera `.rpm` / `.deb`. El ejecutable queda en `src-tauri/target/release/lido-control`.

### Instalador para Windows (sin tener Windows)

El repositorio incluye un workflow de GitHub Actions que compila el instalador NSIS (`.exe`) en la nube:

1. Ve a **Actions** → **Build Windows** → **Run workflow**
2. Cuando termine, descarga el artefacto `lido-control-windows-nsis`

También se ejecuta automáticamente en cada push a `main`/`master`.

Los datos se guardan en `data.json` dentro del directorio de datos de la aplicación (`appDataDir` de Tauri). Ese archivo **no** se versiona en git.

## Funciones

- Registro mensual de lecturas con cálculo automático de consumos y costos
- Historial con filtros y exportación a Excel (`.xlsx`)
- Configuración de apartamentos (agregar, renombrar, eliminar)
