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
 * Calcula la tarifa de agua a partir de los valores del recibo.
 * @param {number|string} costoAlcantarillado
 * @param {number|string} costoAcueducto
 * @param {number|string} totalM3Consumidos
 * @returns {number|null}
 */
export function calcularTarifaAgua(costoAlcantarillado, costoAcueducto, totalM3Consumidos) {
  const total = Number(costoAlcantarillado) + Number(costoAcueducto);
  const totalM3 = Number(totalM3Consumidos);
  if (!Number.isFinite(total) || !Number.isFinite(totalM3) || totalM3 === 0) {
    return null;
  }
  return total / totalM3;
}

/**
 * Calcula la tarifa de energía a partir del total del recibo y el total de kWh consumidos.
 * @param {number|string} totalEnergiaRecibo
 * @param {number|string} totalKwhConsumidos
 * @returns {number|null}
 */
export function calcularTarifaEnergia(totalEnergiaRecibo, totalKwhConsumidos) {
  const total = Number(totalEnergiaRecibo);
  const totalKwh = Number(totalKwhConsumidos);
  if (!Number.isFinite(total) || !Number.isFinite(totalKwh) || totalKwh === 0) {
    return null;
  }
  return total / totalKwh;
}

/**
 * Calcula la tarifa fija a partir de los servicios varios y la cantidad de apartamentos.
 * @param {number|string} serviciosVarios
 * @param {number|string} cantidadApartamentos
 * @returns {number|null}
 */
export function calcularTarifaFija(serviciosVarios, cantidadApartamentos) {
  const totalServicios = Number(serviciosVarios);
  const cantidad = Number(cantidadApartamentos);
  if (!Number.isFinite(totalServicios) || !Number.isFinite(cantidad) || cantidad === 0) {
    return null;
  }
  return totalServicios / cantidad;
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
