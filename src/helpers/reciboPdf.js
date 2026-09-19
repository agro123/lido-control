import { invoke } from "@tauri-apps/api/core";

/** Tamaño máximo del PDF (Gemini admite hasta ~20 MB por solicitud incluyendo el base64). */
const TAMANO_MAXIMO_BYTES = 14 * 1024 * 1024;

/**
 * Lee un archivo como base64 (sin el prefijo `data:...;base64,`).
 * @param {File} archivo
 * @returns {Promise<string>}
 */
function leerComoBase64(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
    lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
    lector.readAsDataURL(archivo);
  });
}

/**
 * Envía la primera página de un recibo PDF a Gemini (vía Rust) y devuelve los valores leídos.
 * Cada valor es un número, o null si no se encontró.
 * @param {File} archivo
 * @returns {Promise<{ totalEnergia: number|null, consumoKwh: number|null, totalAcueducto: number|null,
 *   totalAlcantarillado: number|null, consumoM3Agua: number|null, serviciosVarios: number|null }>}
 */
export async function extraerDatosRecibo(archivo) {
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    throw new Error("El PDF es demasiado grande (máximo 14 MB).");
  }
  const pdfBase64 = await leerComoBase64(archivo);
  return invoke("extraer_datos_recibo", { pdfBase64 });
}

/**
 * Lecturas de PDF usadas este mes y máximo permitido (el conteo lo lleva Rust).
 * @returns {Promise<{ usados: number, maximo: number }>}
 */
export function obtenerUsoRecibo() {
  return invoke("estado_uso_recibo");
}
