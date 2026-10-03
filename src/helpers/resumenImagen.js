import { openUrl } from "@tauri-apps/plugin-opener";
import { mostrarError, mostrarExito } from "../hooks/useToast";
import { formatearConsumo, formatearPesos } from "./formato";

function rectanguloRedondeado(contexto, x, y, ancho, alto, radio) {
  const radioSeguro = Math.min(radio, ancho / 2, alto / 2);
  contexto.beginPath();
  contexto.moveTo(x + radioSeguro, y);
  contexto.arcTo(x + ancho, y, x + ancho, y + alto, radioSeguro);
  contexto.arcTo(x + ancho, y + alto, x, y + alto, radioSeguro);
  contexto.arcTo(x, y + alto, x, y, radioSeguro);
  contexto.arcTo(x, y, x + ancho, y, radioSeguro);
  contexto.closePath();
}

/** Compara dos números: 1 si subió, -1 si bajó, 0 si quedó igual o no son válidos. */
function signoCambio(actual, anterior) {
  if (!Number.isFinite(actual) || !Number.isFinite(anterior)) return 0;
  if (actual > anterior) return 1;
  if (actual < anterior) return -1;
  return 0;
}

function formatearPorcentaje(porcentaje) {
  const texto = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(
    Math.abs(porcentaje),
  );
  return `${texto}%`;
}

function listarConY(items) {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** Variación porcentual simple; null si no hay base de comparación (anterior = 0 o inválido). */
function variacionPorcentual(actual, anterior) {
  if (!Number.isFinite(actual) || !Number.isFinite(anterior) || anterior === 0) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

/** Separa un texto en líneas que no superen `anchoMaximo` con la fuente ya puesta en `contexto`. */
function envolverTexto(contexto, texto, anchoMaximo) {
  const palabras = texto.split(" ");
  const lineas = [];
  let actual = "";
  palabras.forEach((palabra) => {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && contexto.measureText(prueba).width > anchoMaximo) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  });
  if (actual) lineas.push(actual);
  return lineas;
}

/**
 * Frase de un componente del total ("el costo de energía subió 12%"), o null si ese componente
 * no se movió en la misma dirección que el total (para no listar algo que no explica el cambio).
 */
function fraseComponenteApartamento(sujeto, verboSube, verboBaja, actualValor, anteriorValor, direccion) {
  if (signoCambio(actualValor, anteriorValor) !== direccion) return null;
  const variacion = variacionPorcentual(actualValor, anteriorValor);
  const verbo = direccion > 0 ? verboSube : verboBaja;
  return variacion === null ? `${sujeto} ${verbo}` : `${sujeto} ${verbo} ${formatearPorcentaje(variacion)}`;
}

/** Convierte a número cada campo relevante (los inputs del borrador llegan como texto). */
function normalizarDatosApartamento(datos) {
  return {
    consumoEnergia: Number(datos?.consumoEnergia) || 0,
    tarifaEnergia: Number(datos?.tarifaEnergia) || 0,
    consumoAgua: Number(datos?.consumoAgua) || 0,
    tarifaAgua: Number(datos?.tarifaAgua) || 0,
    tarifaFija: Number(datos?.tarifaFija) || 0,
    totalAPagar: Number(datos?.totalAPagar) || 0,
  };
}

/**
 * Explica, para un apartamento, por qué subió o bajó su total frente al mes anterior.
 * Considera el consumo y el precio por separado (el consumo depende del apartamento; el precio
 * es el mismo para todo el edificio), más otros servicios. Solo menciona los factores que se
 * movieron en la misma dirección que el total, cada uno con su propio porcentaje.
 * @param {{ consumoEnergia: *, tarifaEnergia: *, consumoAgua: *, tarifaAgua: *, tarifaFija: *, totalAPagar: * }} actual
 * @param {{ consumoEnergia: *, tarifaEnergia: *, consumoAgua: *, tarifaAgua: *, tarifaFija: *, totalAPagar: * }|null} anterior
 * @returns {{ porcentaje: number, texto: string }|null}
 */
export function construirComparacionApartamento(actual, anterior) {
  if (!anterior || !Number.isFinite(Number(anterior.totalAPagar)) || !Number(anterior.totalAPagar)) {
    return null;
  }

  const datosActuales = normalizarDatosApartamento(actual);
  const datosAnteriores = normalizarDatosApartamento(anterior);

  const direccion = signoCambio(datosActuales.totalAPagar, datosAnteriores.totalAPagar);
  if (direccion === 0) {
    return { porcentaje: 0, texto: "El total de este apartamento se mantuvo igual al mes anterior." };
  }

  const porcentajeTotal = variacionPorcentual(datosActuales.totalAPagar, datosAnteriores.totalAPagar) ?? 0;

  const razones = [
    fraseComponenteApartamento("tu consumo de energía", "aumentó", "disminuyó", datosActuales.consumoEnergia, datosAnteriores.consumoEnergia, direccion),
    fraseComponenteApartamento("el precio de la energía", "subió", "bajó", datosActuales.tarifaEnergia, datosAnteriores.tarifaEnergia, direccion),
    fraseComponenteApartamento("tu consumo de agua", "aumentó", "disminuyó", datosActuales.consumoAgua, datosAnteriores.consumoAgua, direccion),
    fraseComponenteApartamento("el precio del agua", "subió", "bajó", datosActuales.tarifaAgua, datosAnteriores.tarifaAgua, direccion),
    fraseComponenteApartamento("otros servicios", "subieron", "bajaron", datosActuales.tarifaFija, datosAnteriores.tarifaFija, direccion),
  ].filter(Boolean);

  const frase = direccion > 0 ? "un aumento" : "una disminución";
  const porcentajeTexto = formatearPorcentaje(porcentajeTotal);

  const texto =
    razones.length === 0
      ? `Hubo ${frase} del ${porcentajeTexto} en el total frente al mes anterior.`
      : `Hubo ${frase} del ${porcentajeTexto} en el total porque ${listarConY(razones)}.`;

  return { porcentaje: porcentajeTotal, texto };
}

/**
 * Dibuja el resumen de pago de un apartamento en un canvas.
 * @param {{ periodo: string, nombre: string, apartamento: object, calculos: object, tarifaFija: number,
 *   comparacion?: { porcentaje: number, texto: string } | null }} datos
 * @returns {HTMLCanvasElement|null}
 */
function crearCanvasResumen({ periodo, nombre, apartamento, calculos, tarifaFija, comparacion }) {
  // Altura base (sin texto de comparación) y espacio que ocupa la caja de total, para no
  // mover ningún otro elemento cuando no hay mes anterior con que comparar.
  const ALTURA_BASE = 1240;
  const FIN_CAJA_TOTAL = 1095;
  const ESPACIO_CAJA_A_PIE_SIN_COMPARACION = 75;

  const medidor = document.createElement("canvas").getContext("2d");
  medidor.font = "500 26px Arial, sans-serif";
  const lineasComparacion = comparacion ? envolverTexto(medidor, comparacion.texto, 1610) : [];
  const alturaComparacion = lineasComparacion.length ? 35 + lineasComparacion.length * 34 + 15 : 0;
  const finPie = lineasComparacion.length
    ? FIN_CAJA_TOTAL + alturaComparacion
    : FIN_CAJA_TOTAL + ESPACIO_CAJA_A_PIE_SIN_COMPARACION;

  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = Math.max(ALTURA_BASE, finPie + 70);
  const contexto = canvas.getContext("2d");
  if (!contexto) return null;

  contexto.fillStyle = "#eef3f8";
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.fillStyle = "#1d4f7a";
  contexto.fillRect(0, 0, canvas.width, 205);
  contexto.fillStyle = "#ffffff";
  contexto.font = "700 54px Arial, sans-serif";
  contexto.fillText("Resumen de servicio públicos", 95, 90);
  contexto.font = "400 30px Arial, sans-serif";
  contexto.fillText(periodo, 95, 145);
  contexto.font = "700 38px Arial, sans-serif";
  contexto.fillText(nombre, 95, 185);

  const columnas = [95, 925];
  const secciones = [
    ["Energía", [["Lectura anterior", formatearConsumo(apartamento.energia?.lecturaAnterior)], ["Lectura actual", formatearConsumo(apartamento.energia?.lecturaActual)], ["Consumo", `${formatearConsumo(calculos.consumoEnergia)} kWh`], ["Total energía", formatearPesos(calculos.costoEnergia)]]],
    ["Acueducto y alcantarillado", [["Lectura anterior", formatearConsumo(apartamento.agua?.lecturaAnterior)], ["Lectura actual", formatearConsumo(apartamento.agua?.lecturaActual)], ["Consumo", `${formatearConsumo(calculos.consumoAgua)} m³`], ["Total agua", formatearPesos(calculos.costoAgua)]]],
  ];

  secciones.forEach(([titulo, filas], indice) => {
    const x = columnas[indice];
    contexto.fillStyle = "#ffffff";
    rectanguloRedondeado(contexto, x, 275, 780, 500, 26);
    contexto.fill();
    contexto.fillStyle = "#1d4f7a";
    contexto.font = "700 34px Arial, sans-serif";
    contexto.fillText(titulo, x + 42, 340);
    filas.forEach(([etiqueta, valor], fila) => {
      const y = 410 + (fila * 80);
      contexto.fillStyle = "#6c7c8c";
      contexto.font = "400 26px Arial, sans-serif";
      contexto.fillText(etiqueta, x + 42, y);
      contexto.fillStyle = "#17324d";
      contexto.font = "700 30px Arial, sans-serif";
      contexto.textAlign = "right";
      contexto.fillText(valor, x + 735, y);
      contexto.textAlign = "left";
      if (fila < filas.length - 1) {
        contexto.strokeStyle = "#dbe4ed";
        contexto.lineWidth = 2;
        contexto.beginPath();
        contexto.moveTo(x + 42, y + 28);
        contexto.lineTo(x + 735, y + 28);
        contexto.stroke();
      }
    });
  });

  contexto.fillStyle = "#123b5d";
  rectanguloRedondeado(contexto, 95, 865, 1610, 230, 28);
  contexto.fill();
  contexto.fillStyle = "#d9eaf7";
  contexto.font = "700 31px Arial, sans-serif";
  contexto.fillText("TOTAL A PAGAR", 150, 955);
  contexto.fillStyle = "#ffffff";
  contexto.font = "700 82px Arial, sans-serif";
  contexto.textAlign = "right";
  contexto.fillText(formatearPesos(calculos.totalAPagar), 1650, 1010);
  contexto.textAlign = "left";

  if (tarifaFija !== null && tarifaFija !== undefined && Number.isFinite(Number(tarifaFija))) {
    contexto.fillStyle = "#d9eaf7";
    contexto.font = "600 24px Arial, sans-serif";
    contexto.fillText(`+ Otros servicios ${formatearPesos(tarifaFija)}`, 150, 1048);
  }

  if (comparacion) {
    const sube = comparacion.porcentaje > 0;
    const baja = comparacion.porcentaje < 0;
    contexto.fillStyle = sube ? "#ffc9b8" : baja ? "#bdf0cb" : "#d9eaf7";
    contexto.font = "600 24px Arial, sans-serif";
    const etiqueta =
      comparacion.porcentaje === 0
        ? "Sin cambios frente al mes anterior"
        : `${sube ? "+" : "-"}${formatearPorcentaje(comparacion.porcentaje)} frente al mes anterior`;
    contexto.textAlign = "right";
    contexto.fillText(etiqueta, 1650, 1048);
    contexto.textAlign = "left";
  }

  let y = FIN_CAJA_TOTAL;

  if (lineasComparacion.length) {
    contexto.fillStyle = "#17324d";
    contexto.font = "500 26px Arial, sans-serif";
    lineasComparacion.forEach((linea, indice) => {
      contexto.fillText(linea, 95, y + 35 + indice * 34);
    });
    y += alturaComparacion;
  } else {
    y += ESPACIO_CAJA_A_PIE_SIN_COMPARACION - 23; // separación original hasta el texto del pie
  }

  contexto.fillStyle = "#66798b";
  contexto.font = "400 23px Arial, sans-serif";
  contexto.fillText("Comprobante generado desde Lido Control by CDM", 95, y + 23);
  return canvas;
}

function nombreBaseArchivo({ periodo, nombre }) {
  const nombreArchivo = nombre.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "");
  return `resumen-${nombreArchivo}-${periodo.toLowerCase().replace(/\s+/g, "-")}`;
}

/** Convierte el canvas en un Blob (promesa). */
function canvasABlob(canvas, tipo, calidad) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo crear la imagen."))), tipo, calidad);
  });
}

/**
 * Descarga el resumen de un apartamento como JPG.
 * @param {{ periodo: string, nombre: string, apartamento: object, calculos: object, tarifaFija: number,
 *   comparacion?: { porcentaje: number, texto: string } | null }} datos
 */
export async function descargarFilaComoImagen(datos) {
  try {
    const canvas = crearCanvasResumen(datos);
    if (!canvas) return;
    const archivo = await canvasABlob(canvas, "image/jpeg", 0.96);
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = `${nombreBaseArchivo(datos)}.jpg`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(enlace.href);
    mostrarExito("Imagen guardada en descargas.");
  } catch (error) {
    console.error("No se pudo generar la imagen del resumen:", error);
    mostrarError("No se pudo generar la imagen del resumen.");
  }
}

/**
 * Normaliza un celular colombiano a formato internacional (57XXXXXXXXXX).
 * Acepta 10 dígitos (3XXXXXXXXX) o con prefijo 57. Devuelve null si no es válido o está vacío.
 * @param {string|null|undefined} texto
 * @returns {string|null}
 */
export function normalizarCelularColombia(texto) {
  const digitos = String(texto ?? "").replace(/\D/g, "");
  if (/^3\d{9}$/.test(digitos)) return `57${digitos}`;
  if (/^573\d{9}$/.test(digitos)) return digitos;
  return null;
}

/**
 * Abre WhatsApp (app de escritorio y, si no está instalada, WhatsApp Web).
 * Con teléfono abre el chat de ese número; sin teléfono, deja elegir el contacto.
 */
async function abrirWhatsApp(telefono) {
  try {
    await openUrl(telefono ? `whatsapp://send?phone=${telefono}` : "whatsapp://send");
  } catch {
    await openUrl(telefono ? `https://wa.me/${telefono}` : "https://web.whatsapp.com/");
  }
}

/**
 * Copia el resumen como imagen al portapapeles y abre WhatsApp para pegarla (Ctrl+V).
 * WhatsApp no permite adjuntar archivos desde un enlace, por eso el usuario pega la imagen.
 * Si no se puede copiar, descarga la imagen para adjuntarla a mano.
 * @param {{ periodo: string, nombre: string, apartamento: object, calculos: object, tarifaFija: number, telefono?: string|null,
 *   comparacion?: { porcentaje: number, texto: string } | null }} datos
 */
export async function compartirResumenPorWhatsApp({ telefono, ...datos }) {
  const canvas = crearCanvasResumen(datos);
  if (!canvas) return;
  const numero = normalizarCelularColombia(telefono);

  let copiada = false;
  try {
    // La promesa dentro del ClipboardItem conserva el gesto del usuario mientras se genera la imagen.
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": canvasABlob(canvas, "image/png") }),
    ]);
    copiada = true;
  } catch (error) {
    console.error("No se pudo copiar la imagen:", error);
    await descargarFilaComoImagen(datos);
  }

  try {
    await abrirWhatsApp(numero);
  } catch (error) {
    console.error("No se pudo abrir WhatsApp:", error);
    mostrarError("No se pudo abrir WhatsApp. Ábralo manualmente y adjunte la imagen.");
    return;
  }

  const destino = numero ? `el chat de ${datos.nombre}` : "el contacto de su elección";
  mostrarExito(
    copiada
      ? `Imagen copiada. En WhatsApp abra ${destino} y presione Ctrl+V para pegarla.`
      : `WhatsApp abierto. La imagen se descargó: adjúntela en ${destino}.`,
  );
}

/* ---------- Resumen de todo el edificio (para el dueño) ---------- */
/* signoCambio, formatearPorcentaje, listarConY y envolverTexto están definidos arriba,
   junto a construirComparacionApartamento, y se reutilizan aquí. */

/**
 * Suma las cifras de todos los apartamentos para un conjunto de filas ya calculadas.
 * @param {{ filas: Array<{ calculos: object }>, tarifaEnergia: *, tarifaAgua: *, tarifaFija: * }} datos
 */
function resumirEdificioDesdeFilas({ filas, tarifaEnergia, tarifaAgua, tarifaFija }) {
  const consumoEnergia = filas.reduce((acc, f) => acc + (Number(f.calculos.consumoEnergia) || 0), 0);
  const costoEnergia = filas.reduce((acc, f) => acc + (Number(f.calculos.costoEnergia) || 0), 0);
  const consumoAgua = filas.reduce((acc, f) => acc + (Number(f.calculos.consumoAgua) || 0), 0);
  const costoAgua = filas.reduce((acc, f) => acc + (Number(f.calculos.costoAgua) || 0), 0);
  const totalServiciosVarios = (Number(tarifaFija) || 0) * filas.length;
  return {
    consumoEnergia,
    costoEnergia,
    tarifaEnergia: Number(tarifaEnergia) || 0,
    consumoAgua,
    costoAgua,
    tarifaAgua: Number(tarifaAgua) || 0,
    totalServiciosVarios,
    totalAPagar: costoEnergia + costoAgua + totalServiciosVarios,
  };
}

/** Igual que `resumirEdificioDesdeFilas`, pero a partir de un registro ya guardado (mes anterior). */
function resumirEdificioDesdeRegistro(registro) {
  if (!registro || !(registro.apartamentos || []).length) return null;
  const filas = registro.apartamentos.map((apto) => ({
    calculos: {
      consumoEnergia: apto.energia?.consumo,
      costoEnergia: apto.energia?.costo,
      consumoAgua: apto.agua?.consumo,
      costoAgua: apto.agua?.costo,
    },
  }));
  return resumirEdificioDesdeFilas({
    filas,
    tarifaEnergia: registro.tarifaEnergia,
    tarifaAgua: registro.tarifaAgua,
    tarifaFija: registro.tarifaFija,
  });
}

/**
 * Explica, en una frase, por qué subió o bajó el costo total frente al mes anterior.
 * Considera cada variable por separado: consumo y precio de energía, consumo y precio de
 * agua, y servicios varios. Solo menciona las que se movieron en la misma dirección que el total.
 */
function construirComparacionEdificio(actual, anterior) {
  if (!anterior || !anterior.totalAPagar) return null;

  const direccion = signoCambio(actual.totalAPagar, anterior.totalAPagar);
  const porcentaje =
    ((actual.totalAPagar - anterior.totalAPagar) / Math.abs(anterior.totalAPagar)) * 100;

  if (direccion === 0) {
    return { porcentaje: 0, texto: "El costo total del edificio se mantuvo igual al mes anterior." };
  }

  const factores = [
    [signoCambio(actual.consumoEnergia, anterior.consumoEnergia), "el consumo de energía aumentó", "el consumo de energía disminuyó"],
    [signoCambio(actual.tarifaEnergia, anterior.tarifaEnergia), "el precio de la energía aumentó", "el precio de la energía disminuyó"],
    [signoCambio(actual.consumoAgua, anterior.consumoAgua), "el consumo de agua aumentó", "el consumo de agua disminuyó"],
    [signoCambio(actual.tarifaAgua, anterior.tarifaAgua), "el precio del agua aumentó", "el precio del agua disminuyó"],
    [signoCambio(actual.totalServiciosVarios, anterior.totalServiciosVarios), "los servicios varios aumentaron", "los servicios varios disminuyeron"],
  ];

  const razones = factores
    .filter(([signo]) => signo === direccion)
    .map(([, sube, baja]) => (direccion > 0 ? sube : baja));

  const frase = direccion > 0 ? "un aumento" : "una disminución";
  const porcentajeTexto = formatearPorcentaje(porcentaje);

  const texto =
    razones.length === 0
      ? `Hubo ${frase} del ${porcentajeTexto} en el costo total frente al mes anterior.`
      : `Hubo ${frase} del ${porcentajeTexto} en el costo total porque ${listarConY(razones)}.`;

  return { porcentaje, texto };
}

/**
 * Construye los datos de la imagen-resumen de todo el edificio, comparando con el mes
 * anterior cuando existe.
 * @param {{ periodo: string, filas: Array<{ nombre: string, calculos: object, totalAPagar?: * }>,
 *   tarifaEnergia: *, tarifaAgua: *, tarifaFija: *, registroAnterior?: object|null }} datos
 */
export function construirResumenEdificio({ periodo, filas, tarifaEnergia, tarifaAgua, tarifaFija, registroAnterior }) {
  const actual = resumirEdificioDesdeFilas({ filas, tarifaEnergia, tarifaAgua, tarifaFija });
  const anterior = resumirEdificioDesdeRegistro(registroAnterior);

  return {
    periodo,
    filas: filas.map((f) => ({
      nombre: f.nombre,
      consumoEnergia: f.calculos.consumoEnergia ?? 0,
      costoEnergia: f.calculos.costoEnergia ?? 0,
      consumoAgua: f.calculos.consumoAgua ?? 0,
      costoAgua: f.calculos.costoAgua ?? 0,
      totalAPagar: (f.totalAPagar ?? f.calculos.totalAPagar) || 0,
    })),
    totalServiciosVarios: actual.totalServiciosVarios,
    totalAPagar: actual.totalAPagar,
    comparacion: anterior ? construirComparacionEdificio(actual, anterior) : null,
  };
}

const ANCHO_CANVAS_EDIFICIO = 1800;
const MARGEN_X_EDIFICIO = 90;
const ALTURA_CABECERA_EDIFICIO = 195;
const ESPACIO_TRAS_CABECERA = 40;
const ALTURA_ENCABEZADO_TABLA = 56;
const ALTURA_FILA_EDIFICIO = 58;
const ESPACIO_TRAS_TABLA = 26;
const ALTURA_NOTA_SERVICIOS = 50;
const ALTURA_CAJA_TOTAL_EDIFICIO = 220;
const ESPACIO_TRAS_CAJA = 20;
const ALTURA_LINEA_EXPLICACION = 36;
const ESPACIO_SUPERIOR_EXPLICACION = 34;
const ALTURA_FOOTER_EDIFICIO = 60;

/** Columnas de la tabla por apartamento (ancho en px; sumadas dan el ancho del contenido). */
function columnasTablaEdificio() {
  const anchoContenido = ANCHO_CANVAS_EDIFICIO - MARGEN_X_EDIFICIO * 2;
  const anchos = [420, 190, 260, 170, 260, 320];
  let x = MARGEN_X_EDIFICIO;
  const titulos = ["Apartamento", "Energía (kWh)", "Costo energía", "Agua (m³)", "Costo agua", "Total apto."];
  const columnas = anchos.map((ancho, indice) => {
    const columna = { x, ancho, titulo: titulos[indice], alinear: indice === 0 ? "left" : "right" };
    x += ancho;
    return columna;
  });
  return { columnas, anchoContenido };
}

function dibujarFilaTablaEdificio(ctx, columnas, y, altura, valores) {
  const padding = 18;
  columnas.forEach((columna, indice) => {
    ctx.textAlign = columna.alinear;
    const x = columna.alinear === "left" ? columna.x + padding : columna.x + columna.ancho - padding;
    ctx.fillText(String(valores[indice]), x, y + altura / 2 + 9);
  });
  ctx.textAlign = "left";
}

/**
 * Dibuja el resumen de todo el edificio (todos los apartamentos) en un canvas.
 * @param {{ periodo: string, filas: Array, totalServiciosVarios: number, totalAPagar: number,
 *   comparacion: { porcentaje: number, texto: string } | null }} datos
 * @returns {HTMLCanvasElement|null}
 */
function crearCanvasResumenEdificio({ periodo, filas, totalServiciosVarios, totalAPagar, comparacion }) {
  const { columnas, anchoContenido } = columnasTablaEdificio();
  const alturaTabla = ALTURA_ENCABEZADO_TABLA + (filas.length + 1) * ALTURA_FILA_EDIFICIO;

  const medidor = document.createElement("canvas").getContext("2d");
  medidor.font = "500 26px Arial, sans-serif";
  const lineasExplicacion = comparacion
    ? envolverTexto(medidor, comparacion.texto, anchoContenido - 10)
    : [];
  const alturaExplicacion = lineasExplicacion.length
    ? ESPACIO_SUPERIOR_EXPLICACION + lineasExplicacion.length * ALTURA_LINEA_EXPLICACION + 10
    : 0;

  const alturaCanvas =
    ALTURA_CABECERA_EDIFICIO +
    ESPACIO_TRAS_CABECERA +
    alturaTabla +
    ESPACIO_TRAS_TABLA +
    ALTURA_NOTA_SERVICIOS +
    ALTURA_CAJA_TOTAL_EDIFICIO +
    ESPACIO_TRAS_CAJA +
    alturaExplicacion +
    ALTURA_FOOTER_EDIFICIO;

  const canvas = document.createElement("canvas");
  canvas.width = ANCHO_CANVAS_EDIFICIO;
  canvas.height = alturaCanvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#eef3f8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Encabezado
  ctx.fillStyle = "#1d4f7a";
  ctx.fillRect(0, 0, canvas.width, ALTURA_CABECERA_EDIFICIO);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 50px Arial, sans-serif";
  ctx.fillText("Resumen servicios públicos", MARGEN_X_EDIFICIO, 85);
  ctx.font = "400 28px Arial, sans-serif";
  ctx.fillText(periodo, MARGEN_X_EDIFICIO, 140);
  ctx.font = "400 23px Arial, sans-serif";
  ctx.fillText(`${filas.length} apartamento(s)`, MARGEN_X_EDIFICIO, 178);

  let y = ALTURA_CABECERA_EDIFICIO + ESPACIO_TRAS_CABECERA;
  const inicioTabla = y;

  // Encabezado de la tabla
  ctx.fillStyle = "#1d4f7a";
  ctx.fillRect(MARGEN_X_EDIFICIO, y, anchoContenido, ALTURA_ENCABEZADO_TABLA);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 24px Arial, sans-serif";
  dibujarFilaTablaEdificio(ctx, columnas, y, ALTURA_ENCABEZADO_TABLA, columnas.map((c) => c.titulo));
  y += ALTURA_ENCABEZADO_TABLA;

  // Filas de apartamentos
  ctx.font = "600 26px Arial, sans-serif";
  filas.forEach((fila, indice) => {
    ctx.fillStyle = indice % 2 === 0 ? "#ffffff" : "#f3f7fb";
    ctx.fillRect(MARGEN_X_EDIFICIO, y, anchoContenido, ALTURA_FILA_EDIFICIO);
    ctx.fillStyle = "#17324d";
    dibujarFilaTablaEdificio(ctx, columnas, y, ALTURA_FILA_EDIFICIO, [
      fila.nombre,
      formatearConsumo(fila.consumoEnergia),
      formatearPesos(fila.costoEnergia),
      formatearConsumo(fila.consumoAgua),
      formatearPesos(fila.costoAgua),
      formatearPesos(fila.totalAPagar),
    ]);
    y += ALTURA_FILA_EDIFICIO;
  });

  // Fila de totales
  const sumar = (campo) => filas.reduce((acc, f) => acc + (Number(f[campo]) || 0), 0);
  ctx.fillStyle = "#dfe9f3";
  ctx.fillRect(MARGEN_X_EDIFICIO, y, anchoContenido, ALTURA_FILA_EDIFICIO);
  ctx.fillStyle = "#1d4f7a";
  ctx.font = "700 26px Arial, sans-serif";
  dibujarFilaTablaEdificio(ctx, columnas, y, ALTURA_FILA_EDIFICIO, [
    "TOTALES",
    formatearConsumo(sumar("consumoEnergia")),
    formatearPesos(sumar("costoEnergia")),
    formatearConsumo(sumar("consumoAgua")),
    formatearPesos(sumar("costoAgua")),
    formatearPesos(sumar("totalAPagar")),
  ]);
  y += ALTURA_FILA_EDIFICIO;

  ctx.strokeStyle = "#c7d4e2";
  ctx.lineWidth = 2;
  ctx.strokeRect(MARGEN_X_EDIFICIO, inicioTabla, anchoContenido, alturaTabla);

  y += ESPACIO_TRAS_TABLA;

  // Nota: los servicios varios ya están incluidos en el total de cada apartamento.
  ctx.fillStyle = "#5d6b7a";
  ctx.font = "italic 400 23px Arial, sans-serif";
  ctx.fillText(
    `Cada total ya incluye su parte de servicios varios del mes: ${formatearPesos(totalServiciosVarios)} en total.`,
    MARGEN_X_EDIFICIO,
    y + 28,
  );
  y += ALTURA_NOTA_SERVICIOS;

  // Caja de total general
  rectanguloRedondeado(ctx, MARGEN_X_EDIFICIO, y, anchoContenido, ALTURA_CAJA_TOTAL_EDIFICIO, 28);
  ctx.fillStyle = "#123b5d";
  ctx.fill();
  ctx.fillStyle = "#d9eaf7";
  ctx.font = "700 31px Arial, sans-serif";
  ctx.fillText("TOTAL A PAGAR", MARGEN_X_EDIFICIO + 50, y + 85);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 76px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(formatearPesos(totalAPagar), MARGEN_X_EDIFICIO + anchoContenido - 50, y + 150);
  ctx.textAlign = "left";

  if (comparacion) {
    const sube = comparacion.porcentaje > 0;
    const baja = comparacion.porcentaje < 0;
    ctx.fillStyle = sube ? "#ffc9b8" : baja ? "#bdf0cb" : "#d9eaf7";
    ctx.font = "700 28px Arial, sans-serif";
    const etiqueta =
      comparacion.porcentaje === 0
        ? "Sin cambios frente al mes anterior"
        : `${sube ? "+" : "-"}${formatearPorcentaje(comparacion.porcentaje)} frente al mes anterior`;
    ctx.textAlign = "right";
    ctx.fillText(etiqueta, MARGEN_X_EDIFICIO + anchoContenido - 50, y + 190);
    ctx.textAlign = "left";
  }

  y += ALTURA_CAJA_TOTAL_EDIFICIO + ESPACIO_TRAS_CAJA;

  // Explicación del aumento/disminución
  if (lineasExplicacion.length) {
    ctx.fillStyle = "#17324d";
    ctx.font = "500 26px Arial, sans-serif";
    lineasExplicacion.forEach((linea, indice) => {
      ctx.fillText(linea, MARGEN_X_EDIFICIO, y + ESPACIO_SUPERIOR_EXPLICACION + indice * ALTURA_LINEA_EXPLICACION);
    });
    y += alturaExplicacion;
  }

  // Pie
  ctx.fillStyle = "#66798b";
  ctx.font = "400 23px Arial, sans-serif";
  ctx.fillText("Comprobante generado desde Lido Control by CDM", MARGEN_X_EDIFICIO, y + 30);

  return canvas;
}

function nombreBaseArchivoEdificio(periodo) {
  return `resumen-edificio-${periodo.toLowerCase().replace(/\s+/g, "-")}`;
}

/**
 * Descarga el resumen de todo el edificio como JPG.
 * @param {{ periodo: string, filas: Array, totalServiciosVarios: number, totalAPagar: number,
 *   comparacion: object|null }} datos
 */
export async function descargarResumenEdificioComoImagen(datos) {
  try {
    const canvas = crearCanvasResumenEdificio(datos);
    if (!canvas) return;
    const archivo = await canvasABlob(canvas, "image/jpeg", 0.96);
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = `${nombreBaseArchivoEdificio(datos.periodo)}.jpg`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(enlace.href);
    mostrarExito("Imagen guardada en descargas.");
  } catch (error) {
    console.error("No se pudo generar la imagen del edificio:", error);
    mostrarError("No se pudo generar la imagen del edificio.");
  }
}

/**
 * Copia el resumen de todo el edificio como imagen y abre WhatsApp en el chat del dueño
 * (o sin chat elegido, si no hay número configurado en Apartamentos).
 * @param {{ periodo: string, filas: Array, totalServiciosVarios: number, totalAPagar: number,
 *   comparacion: object|null, telefonoDueno?: string|null }} datos
 */
export async function compartirResumenEdificioPorWhatsApp({ telefonoDueno, ...datos }) {
  const canvas = crearCanvasResumenEdificio(datos);
  if (!canvas) return;
  const numero = normalizarCelularColombia(telefonoDueno);

  let copiada = false;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": canvasABlob(canvas, "image/png") }),
    ]);
    copiada = true;
  } catch (error) {
    console.error("No se pudo copiar la imagen:", error);
    await descargarResumenEdificioComoImagen(datos);
  }

  try {
    await abrirWhatsApp(numero);
  } catch (error) {
    console.error("No se pudo abrir WhatsApp:", error);
    mostrarError("No se pudo abrir WhatsApp. Ábralo manualmente y adjunte la imagen.");
    return;
  }

  const destino = numero ? "el chat del dueño del edificio" : "el contacto de su elección";
  mostrarExito(
    copiada
      ? `Imagen copiada. En WhatsApp abra ${destino} y presione Ctrl+V para pegarla.`
      : `WhatsApp abierto. La imagen se descargó: adjúntela en ${destino}.`,
  );
}
