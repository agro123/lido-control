/**
 * Calcula el consumo a partir de lecturas del medidor.
 * @param {number|string} lecturaAnterior
 * @param {number|string} lecturaActual
 * @returns {number|null} consumo o null si alguna lectura no es válida
 */
export function calcularConsumo(lecturaAnterior, lecturaActual) {
  // Cadena vacía no es 0: Number("") === 0 y daría consumos/errores falsos
  if (
    lecturaAnterior === "" ||
    lecturaActual === "" ||
    lecturaAnterior === null ||
    lecturaActual === null ||
    lecturaAnterior === undefined ||
    lecturaActual === undefined
  ) {
    return null;
  }

  const anterior = Number(lecturaAnterior);
  const actual = Number(lecturaActual);
  if (!Number.isFinite(anterior) || !Number.isFinite(actual)) {
    return null;
  }
  return actual - anterior;
}

/**
 * Calcula el costo = consumo × tarifa.
 * @param {number|null} consumo
 * @param {number|string} tarifa
 * @returns {number|null}
 */
export function calcularCosto(consumo, tarifa) {
  if (consumo === null || consumo === undefined) {
    return null;
  }
  const tarifaNum = Number(tarifa);
  if (!Number.isFinite(tarifaNum)) {
    return null;
  }
  return consumo * tarifaNum;
}

/**
 * Total a pagar = costo energía + costo agua + tarifa fija.
 * @param {number|null} costoEnergia
 * @param {number|null} costoAgua
 * @param {number|string} tarifaFija
 * @returns {number|null}
 */
export function calcularTotalAPagar(costoEnergia, costoAgua, tarifaFija) {
  if (costoEnergia === null || costoAgua === null) {
    return null;
  }
  const fija = Number(tarifaFija);
  if (!Number.isFinite(fija)) {
    return null;
  }
  return costoEnergia + costoAgua + fija;
}

/**
 * Indica si la lectura actual es menor que la anterior.
 * No marca error si la lectura actual (o la anterior) está vacía.
 * @param {number|string} lecturaAnterior
 * @param {number|string} lecturaActual
 * @returns {boolean}
 */
export function tieneLecturaInvalida(lecturaAnterior, lecturaActual) {
  if (
    lecturaActual === "" ||
    lecturaActual === null ||
    lecturaActual === undefined ||
    lecturaAnterior === "" ||
    lecturaAnterior === null ||
    lecturaAnterior === undefined
  ) {
    return false;
  }

  const anterior = Number(lecturaAnterior);
  const actual = Number(lecturaActual);
  if (!Number.isFinite(anterior) || !Number.isFinite(actual)) {
    return false;
  }
  return actual < anterior;
}

/**
 * Calcula todos los valores derivados de un apartamento en el formulario.
 * @param {object} fila - lecturas del apartamento
 * @param {{ tarifaEnergia: *, tarifaAgua: *, tarifaFija: * }} tarifas
 */
export function calcularFilaApartamento(fila, tarifas) {
  const consumoEnergia = calcularConsumo(fila.lecturaAnteriorEnergia, fila.lecturaActualEnergia);
  const costoEnergia = calcularCosto(consumoEnergia, tarifas.tarifaEnergia);
  const consumoAgua = calcularConsumo(fila.lecturaAnteriorAgua, fila.lecturaActualAgua);
  const costoAgua = calcularCosto(consumoAgua, tarifas.tarifaAgua);
  const totalAPagar = calcularTotalAPagar(costoEnergia, costoAgua, tarifas.tarifaFija);

  const energiaInvalida = tieneLecturaInvalida(
    fila.lecturaAnteriorEnergia,
    fila.lecturaActualEnergia,
  );
  const aguaInvalida = tieneLecturaInvalida(fila.lecturaAnteriorAgua, fila.lecturaActualAgua);

  return {
    consumoEnergia,
    costoEnergia,
    consumoAgua,
    costoAgua,
    totalAPagar,
    energiaInvalida,
    aguaInvalida,
  };
}
