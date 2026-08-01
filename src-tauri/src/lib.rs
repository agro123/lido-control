use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// Estructura inicial de data.json cuando el archivo aún no existe.
const DATA_INICIAL: &str = r#"{
  "apartamentos": [
    { "id": 1, "nombre": "Apto Cindy" },
    { "id": 2, "nombre": "Apto Daniel" },
    { "id": 3, "nombre": "Apto Jeferson" },
    { "id": 4, "nombre": "Apto Edison" }
  ],
  "registros": []
}"#;

/// Obtiene la ruta completa de data.json dentro del directorio de datos de la app.
fn ruta_data_json(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo obtener el directorio de datos: {e}"))?;

    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("No se pudo crear el directorio de datos: {e}"))?;
    }

    Ok(dir.join("data.json"))
}

/// Lee el archivo data.json completo como string.
/// Si no existe, lo crea con la estructura inicial y lo devuelve.
#[tauri::command]
async fn read_data(app: tauri::AppHandle) -> Result<String, String> {
    let ruta = ruta_data_json(&app)?;

    if !ruta.exists() {
        fs::write(&ruta, DATA_INICIAL)
            .map_err(|e| format!("No se pudo crear data.json: {e}"))?;
        return Ok(DATA_INICIAL.to_string());
    }

    fs::read_to_string(&ruta).map_err(|e| format!("No se pudo leer data.json: {e}"))
}

/// Escribe el archivo data.json completo desde un string JSON.
#[tauri::command]
async fn write_data(app: tauri::AppHandle, content: String) -> Result<(), String> {
    // Validar que el contenido sea JSON válido antes de sobrescribir,
    // para no corromper el archivo con datos inválidos.
    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("El contenido no es JSON válido: {e}"))?;

    let ruta = ruta_data_json(&app)?;
    fs::write(&ruta, content).map_err(|e| format!("No se pudo escribir data.json: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_data, write_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
