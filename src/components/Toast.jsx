import { cerrarToast, useToasts } from "../hooks/useToast";

/**
 * Avisos de éxito/error de toda la app: aparecen en la esquina superior izquierda
 * y se ocultan solos a los pocos segundos.
 */
export default function Toast() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;

  return (
    <div className="toast-contenedor" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tipo}`} role="status">
          <button
            type="button"
            className="toast-cerrar"
            onClick={() => cerrarToast(toast.id)}
            aria-label="Cerrar aviso"
          >
            ×
          </button>
          <strong>{toast.tipo === "error" ? "Error!" : "Éxito!"}</strong>
          <span>{toast.mensaje}</span>
        </div>
      ))}
    </div>
  );
}
