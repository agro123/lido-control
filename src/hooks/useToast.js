import { useEffect, useState } from "react";

/** Tiempo que un aviso permanece visible antes de desaparecer solo. */
const DURACION_MS = 5000;

let contador = 0;
let toasts = [];
const escuchas = new Set();

function notificar() {
  escuchas.forEach((escucha) => escucha(toasts));
}

/** Quita un aviso de la lista (por cierre manual o por vencimiento). */
export function cerrarToast(id) {
  toasts = toasts.filter((toast) => toast.id !== id);
  notificar();
}

function agregarToast(tipo, mensaje) {
  const id = ++contador;
  toasts = [...toasts, { id, tipo, mensaje }];
  notificar();
  setTimeout(() => cerrarToast(id), DURACION_MS);
}

/** Muestra un aviso de éxito en la esquina superior izquierda por unos segundos. */
export function mostrarExito(mensaje) {
  agregarToast("exito", mensaje);
}

/** Muestra un aviso de error en la esquina superior izquierda por unos segundos. */
export function mostrarError(mensaje) {
  agregarToast("error", mensaje);
}

/** Hook interno: suscribe al componente que dibuja los avisos activos. */
export function useToasts() {
  const [lista, setLista] = useState(toasts);

  useEffect(() => {
    escuchas.add(setLista);
    return () => escuchas.delete(setLista);
  }, []);

  return lista;
}
