import { MESES } from "./constantes";

/**
 * Calcula el mes y año inmediatamente anteriores a la fecha dada.
 * @param {string} mes - Nombre del mes en español (ej. "Marzo")
 * @param {number} anio
 * @returns {{ mes: string, anio: number } | null}
 */
export function obtenerMesAnioAnterior(mes, anio) {
  const indice = MESES.indexOf(mes);
  if (indice < 0 || !Number.isFinite(Number(anio))) {
    return null;
  }

  if (indice === 0) {
    return { mes: MESES[11], anio: Number(anio) - 1 };
  }

  return { mes: MESES[indice - 1], anio: Number(anio) };
}
