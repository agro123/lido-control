/** Constantes compartidas de la aplicación. */

/** Nombres de los 12 meses en español (Colombia). */
export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Años disponibles en los selectores (2024–2050). */
export const ANIOS = Array.from({ length: 2050 - 2024 + 1 }, (_, i) => 2024 + i);

/** Vistas de la aplicación (navegación por estado, sin rutas URL). */
export const VISTAS = {
  REGISTRO: "registro",
  HISTORIAL: "historial",
  CONFIG: "config",
};
