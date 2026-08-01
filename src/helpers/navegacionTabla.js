/**
 * Campos editables de la tabla de registro, en orden de izquierda a derecha.
 */
export const CAMPOS_EDITABLES_REGISTRO = [
  "lecturaAnteriorEnergia",
  "lecturaActualEnergia",
  "lecturaAnteriorAgua",
  "lecturaActualAgua",
];

/**
 * Enfoca un input de la grilla y selecciona su contenido (estilo Excel).
 * @param {HTMLElement|null} contenedor
 * @param {number} fila
 * @param {number} columna
 */
function enfocarCelda(contenedor, fila, columna) {
  if (!contenedor) return;

  const destino = contenedor.querySelector(
    `input[data-fila="${fila}"][data-columna="${columna}"]`,
  );

  if (!(destino instanceof HTMLInputElement)) {
    return;
  }

  destino.focus();
  destino.select();
}

/**
 * Navegación tipo Excel entre celdas de entrada de la tabla.
 * Flechas arriba/abajo cambian de fila; izquierda/derecha cambian de columna
 * cuando el cursor está al borde del texto.
 *
 * @param {KeyboardEvent} evento
 * @param {{
 *   contenedor: HTMLElement | null,
 *   fila: number,
 *   columna: number,
 *   totalFilas: number,
 *   totalColumnas: number,
 * }} opciones
 */
export function navegarCeldasConFlechas(evento, opciones) {
  const { contenedor, fila, columna, totalFilas, totalColumnas } = opciones;
  const tecla = evento.key;

  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(tecla)) {
    return;
  }

  const input = evento.currentTarget;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const inicio = input.selectionStart ?? 0;
  const fin = input.selectionEnd ?? 0;
  const longitud = input.value.length;
  const seleccionCompleta = inicio === 0 && fin === longitud && longitud > 0;
  const sinSeleccionParcial = inicio === fin;

  let nuevaFila = fila;
  let nuevaColumna = columna;
  let debeMover = false;

  if (tecla === "ArrowUp") {
    if (fila > 0) {
      nuevaFila = fila - 1;
      debeMover = true;
    }
  } else if (tecla === "ArrowDown" || tecla === "Enter") {
    if (fila < totalFilas - 1) {
      nuevaFila = fila + 1;
      debeMover = true;
    }
  } else if (tecla === "ArrowLeft") {
    // Solo salta de celda si el cursor está al inicio o hay selección completa
    if ((sinSeleccionParcial && inicio === 0) || seleccionCompleta) {
      if (columna > 0) {
        nuevaColumna = columna - 1;
        debeMover = true;
      } else if (fila > 0) {
        nuevaFila = fila - 1;
        nuevaColumna = totalColumnas - 1;
        debeMover = true;
      }
    }
  } else if (tecla === "ArrowRight") {
    // Solo salta de celda si el cursor está al final o hay selección completa
    if ((sinSeleccionParcial && fin === longitud) || seleccionCompleta) {
      if (columna < totalColumnas - 1) {
        nuevaColumna = columna + 1;
        debeMover = true;
      } else if (fila < totalFilas - 1) {
        nuevaFila = fila + 1;
        nuevaColumna = 0;
        debeMover = true;
      }
    }
  }

  if (!debeMover) {
    return;
  }

  evento.preventDefault();
  enfocarCelda(contenedor, nuevaFila, nuevaColumna);
}
