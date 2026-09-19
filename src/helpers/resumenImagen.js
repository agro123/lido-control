import { openUrl } from "@tauri-apps/plugin-opener";
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

/**
 * Dibuja el resumen de pago de un apartamento en un canvas.
 * @returns {HTMLCanvasElement|null}
 */
function crearCanvasResumen({ periodo, nombre, apartamento, calculos, tarifaFija }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = 1240;
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

  contexto.fillStyle = "#66798b";
  contexto.font = "400 23px Arial, sans-serif";
  contexto.fillText("Comprobante generado desde Lido Control by CDM", 95, 1170);
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
 * @param {{ periodo: string, nombre: string, apartamento: object, calculos: object, tarifaFija: number, onMensaje?: (texto: string) => void }} datos
 */
export async function descargarFilaComoImagen({ onMensaje = () => {}, ...datos }) {
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
  onMensaje("Imagen guardada en descargas");
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
 * @param {{ periodo: string, nombre: string, apartamento: object, calculos: object, tarifaFija: number, telefono?: string|null, onMensaje?: (texto: string) => void }} datos
 */
export async function compartirResumenPorWhatsApp({ telefono, onMensaje = () => {}, ...datos }) {
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
    await descargarFilaComoImagen({ ...datos });
  }

  try {
    await abrirWhatsApp(numero);
  } catch (error) {
    console.error("No se pudo abrir WhatsApp:", error);
    onMensaje("No se pudo abrir WhatsApp. Ábralo manualmente y adjunte la imagen.");
    return;
  }

  const destino = numero ? `el chat de ${datos.nombre}` : "el contacto de su elección";
  onMensaje(
    copiada
      ? `Imagen copiada. En WhatsApp abra ${destino} y presione Ctrl+V para pegarla.`
      : `WhatsApp abierto. La imagen se descargó: adjúntela en ${destino}.`,
  );
}
