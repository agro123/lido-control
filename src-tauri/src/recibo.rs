//! Extracción de datos de un recibo escaneado (PDF) usando la API de Gemini (Google AI Studio).
//!
//! Configuración (variables de entorno, ver `.env.example`):
//! - `GEMINI_API_KEY`: clave de Google AI Studio (obligatoria).
//! - `GEMINI_MODEL`: modelo a usar (opcional, por defecto `gemini-2.5-flash-lite`).
//!
//! Las variables se leen del entorno del proceso y, si no están, de un archivo `.env`
//! (en desarrollo: en la raíz del proyecto; instalada: en el directorio de datos de la app).

use serde::{Deserialize, Serialize};
use std::fs;
use serde_json::{json, Value};
use std::path::PathBuf;
use tauri::Manager;

const MODELO_POR_DEFECTO: &str = "gemini-2.5-flash-lite";

/// Máximo de lecturas de PDF por mes calendario (controla el gasto de la API).
const MAX_USOS_MENSUALES: u32 = 3;
const ARCHIVO_USO: &str = "uso_pdf.json";

const INSTRUCCIONES: &str = "\
Eres un extractor de datos de recibos de servicios públicos colombianos (energía, acueducto y \
alcantarillado) que vienen escaneados como imagen. Lee ÚNICAMENTE la primera página del documento \
y devuelve estos valores:

- totalEnergia: sección ENERGÍA, fila \"TOTAL\" (valor en pesos).
- consumoKwh: sección ENERGÍA, fila \"Valor consumo energía\", columna \"Cantidad\".
- totalAcueducto: sección ACUEDUCTO, fila \"Total\" (valor en pesos).
- totalAlcantarillado: sección ALCANTARILLADO, fila \"Total\" (valor en pesos).
- consumoM3Agua: sección ACUEDUCTO, fila \"Valor consumo\", columna \"Cantidad M3\".
- serviciosVarios: sección \"TOTAL A PAGAR ESTE MES\", fila \"SubTotal Otros Servicios + AP + TS + IVA\" \
(valor en pesos).

Reglas: devuelve números enteros planos, sin símbolo $ y sin separadores de miles. Ignora por \
completo los decimales: no los redondees, simplemente descártalos (por ejemplo \"1.234.567,50\" se \
devuelve como 1234567). Si un valor no aparece o no es legible, devuelve null; no lo adivines ni lo \
calcules.";

/// Valores extraídos del recibo. Los nombres coinciden con los campos que usa el frontend.
#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatosRecibo {
    pub total_energia: Option<f64>,
    pub consumo_kwh: Option<f64>,
    pub total_acueducto: Option<f64>,
    pub total_alcantarillado: Option<f64>,
    pub consumo_m3_agua: Option<f64>,
    pub servicios_varios: Option<f64>,
}

/// Contador de lecturas del mes en curso, persistido en `uso_pdf.json` (directorio de datos).
#[derive(Debug, Default, Serialize, Deserialize)]
struct UsoMensual {
    /// Mes al que corresponde el contador, formato `AAAA-MM`.
    mes: String,
    usados: u32,
}

/// Estado de uso que se muestra en la interfaz.
#[derive(Debug, Serialize)]
pub struct EstadoUso {
    pub usados: u32,
    pub maximo: u32,
}

fn ruta_uso(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo obtener el directorio de datos: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("No se pudo crear el directorio de datos: {e}"))?;
    Ok(dir.join(ARCHIVO_USO))
}

/// Lee el contador; si es de otro mes (o no existe/está dañado) empieza en cero.
fn leer_uso(app: &tauri::AppHandle) -> Result<UsoMensual, String> {
    let mes_actual = chrono::Local::now().format("%Y-%m").to_string();
    let guardado = fs::read_to_string(ruta_uso(app)?)
        .ok()
        .and_then(|t| serde_json::from_str::<UsoMensual>(&t).ok());
    Ok(match guardado {
        Some(uso) if uso.mes == mes_actual => uso,
        _ => UsoMensual { mes: mes_actual, usados: 0 },
    })
}

fn guardar_uso(app: &tauri::AppHandle, uso: &UsoMensual) -> Result<(), String> {
    let texto = serde_json::to_string(uso).map_err(|e| e.to_string())?;
    fs::write(ruta_uso(app)?, texto).map_err(|e| format!("No se pudo guardar el contador de uso: {e}"))
}

/// Devuelve cuántas lecturas de PDF se han hecho este mes.
#[tauri::command]
pub async fn estado_uso_recibo(app: tauri::AppHandle) -> Result<EstadoUso, String> {
    let uso = leer_uso(&app)?;
    Ok(EstadoUso { usados: uso.usados, maximo: MAX_USOS_MENSUALES })
}

impl DatosRecibo {
    /// Descarta la parte decimal de cada valor (sin redondear), por si el modelo la devuelve.
    fn sin_decimales(self) -> Self {
        let entero = |v: Option<f64>| v.map(f64::trunc);
        Self {
            total_energia: entero(self.total_energia),
            consumo_kwh: entero(self.consumo_kwh),
            total_acueducto: entero(self.total_acueducto),
            total_alcantarillado: entero(self.total_alcantarillado),
            consumo_m3_agua: entero(self.consumo_m3_agua),
            servicios_varios: entero(self.servicios_varios),
        }
    }
}

/// Carga `.env` desde el directorio de datos de la app y desde el directorio actual (o superiores).
/// Las variables ya definidas en el entorno del proceso tienen prioridad.
fn cargar_env(app: &tauri::AppHandle) {
    if let Ok(dir) = app.path().app_data_dir() {
        let _ = dotenvy::from_path(dir.join(".env"));
    }
    let _ = dotenvy::dotenv();
}

fn leer_config(app: &tauri::AppHandle) -> Result<(String, String), String> {
    cargar_env(app);

    let clave = std::env::var("GEMINI_API_KEY")
        .ok()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .ok_or_else(|| {
            let ubicacion: PathBuf = app
                .path()
                .app_data_dir()
                .map(|d| d.join(".env"))
                .unwrap_or_else(|_| PathBuf::from(".env"));
            format!(
                "Falta la variable GEMINI_API_KEY. Defínala en un archivo .env (ver .env.example) \
                 en la raíz del proyecto o en {}.",
                ubicacion.display()
            )
        })?;

    let modelo = std::env::var("GEMINI_MODEL")
        .ok()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .unwrap_or_else(|| MODELO_POR_DEFECTO.to_string());

    Ok((clave, modelo))
}

/// Envía el PDF (en base64) a Gemini y devuelve los valores encontrados en la primera página.
#[tauri::command]
pub async fn extraer_datos_recibo(
    app: tauri::AppHandle,
    pdf_base64: String,
) -> Result<DatosRecibo, String> {
    let (clave, modelo) = leer_config(&app)?;

    let mut uso = leer_uso(&app)?;
    if uso.usados >= MAX_USOS_MENSUALES {
        return Err(format!(
            "Ya se usaron las {MAX_USOS_MENSUALES} lecturas de recibo permitidas este mes. \
             Ingrese los datos a mano o espere al próximo mes."
        ));
    }

    let numero = json!({ "type": "NUMBER", "nullable": true });
    let cuerpo = json!({
        "contents": [{
            "parts": [
                { "text": INSTRUCCIONES },
                { "inline_data": { "mime_type": "application/pdf", "data": pdf_base64 } }
            ]
        }],
        "generationConfig": {
            "temperature": 0,
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "totalEnergia": numero,
                    "consumoKwh": numero,
                    "totalAcueducto": numero,
                    "totalAlcantarillado": numero,
                    "consumoM3Agua": numero,
                    "serviciosVarios": numero
                }
            }
        }
    });

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent"
    );

    let respuesta = reqwest::Client::new()
        .post(url)
        .header("x-goog-api-key", clave)
        .json(&cuerpo)
        .send()
        .await
        .map_err(|e| format!("No se pudo conectar con Gemini: {e}"))?;

    let estado = respuesta.status();
    let valor: Value = respuesta
        .json()
        .await
        .map_err(|e| format!("Respuesta de Gemini no válida: {e}"))?;

    if !estado.is_success() {
        let detalle = valor["error"]["message"].as_str().unwrap_or("error desconocido");
        return Err(format!("Gemini respondió {estado}: {detalle}"));
    }

    let texto = valor["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or("Gemini no devolvió datos para este documento.")?;

    // Gemini respondió correctamente: la lectura cuenta aunque la interpretación falle después.
    uso.usados += 1;
    guardar_uso(&app, &uso)?;

    let datos = serde_json::from_str::<DatosRecibo>(texto)
        .map_err(|e| format!("No se pudieron interpretar los datos de Gemini: {e}"))?;
    Ok(datos.sin_decimales())
}
