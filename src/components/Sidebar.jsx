import { VISTAS } from "../helpers/constantes";

/**
 * Barra lateral colapsable con navegación entre vistas.
 * @param {{
 *   vistaActiva: string,
 *   onCambiarVista: (vista: string) => void,
 *   colapsado: boolean,
 *   onAlternar: () => void,
 * }} props
 */
export default function Sidebar({ vistaActiva, onCambiarVista, colapsado, onAlternar }) {
  const items = [
    { id: VISTAS.REGISTRO, etiqueta: "Registro Mensual", icono: "📋" },
    { id: VISTAS.HISTORIAL, etiqueta: "Historial", icono: "📂" },
    { id: VISTAS.CONFIG, etiqueta: "Apartamentos", icono: "⚙️" },
  ];

  return (
    <aside
      className={`sidebar${colapsado ? " sidebar-colapsado" : ""}`}
      aria-label="Navegación principal"
    >
      <div className="sidebar-superior">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onAlternar}
          aria-expanded={!colapsado}
          aria-controls="sidebar-nav"
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
        >
          <span className="sidebar-toggle-icono" aria-hidden="true">
            {colapsado ? "»" : "«"}
          </span>
          <span className="sidebar-etiqueta">
            {colapsado ? "Expandir" : "Colapsar menú"}
          </span>
        </button>
      </div>

      <div className="sidebar-brand">
        <h1 className="sidebar-titulo">
          {colapsado ? "LC" : "Lido Control"}
        </h1>
        <p className="sidebar-subtitulo">Agua y Energía</p>
      </div>

      <nav id="sidebar-nav" className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-item${vistaActiva === item.id ? " sidebar-item-activo" : ""}`}
            onClick={() => onCambiarVista(item.id)}
            aria-current={vistaActiva === item.id ? "page" : undefined}
            title={item.etiqueta}
          >
            <span className="sidebar-icono" aria-hidden="true">
              {item.icono}
            </span>
            <span className="sidebar-etiqueta">{item.etiqueta}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
