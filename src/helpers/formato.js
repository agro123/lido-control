/**
 * Formatea un valor monetario como pesos colombianos: $167.622 (sin decimales).
 * @param {number|null|undefined} valor
 * @returns {string}
 */
export function formatearPesos(valor) {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) {
    return "—";
  }
  const entero = Math.round(Number(valor));
  const conPuntos = entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$${conPuntos}`;
}

/**
 * Formatea un valor de consumo (kWh o m³) sin decimales.
 * @param {number|null|undefined} valor
 * @returns {string}
 */
export function formatearConsumo(valor) {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) {
    return "—";
  }
  return String(Math.round(Number(valor)));
}

/**
 * Convierte un string de input a número o cadena vacía (para inputs controlados).
 * Solo permite dígitos (enteros no negativos).
 * @param {string} texto
 * @returns {string}
 */
export function normalizarInputNumerico(texto) {
  if (texto === "" || texto === null || texto === undefined) {
    return "";
  }
  const limpio = String(texto).replace(/[^\d]/g, "");
  return limpio;
}

/**
 * Convierte un valor de input a número; retorna null si está vacío.
 * @param {string|number} valor
 * @returns {number|null}
 */
export function aNumeroONull(valor) {
  if (valor === "" || valor === null || valor === undefined) {
    return null;
  }
  const num = Number(valor);
  return Number.isFinite(num) ? num : null;
}
