import { useState } from "react";
import Sidebar from "./components/Sidebar";
import RegistroMensual from "./components/RegistroMensual";
import Historial from "./components/Historial";
import ConfigApartamentos from "./components/ConfigApartamentos";
import Toast from "./components/Toast";
import { useData } from "./hooks/useData";
import { VISTAS } from "./helpers/constantes";
import "./styles/global.css";

/**
 * Contenedor principal: carga datos, navegación por estado y vistas.
 */
function App() {
  const [vistaActiva, setVistaActiva] = useState(VISTAS.REGISTRO);
  const [menuColapsado, setMenuColapsado] = useState(false);
  const {
    datos,
    cargando,
    error,
    guardarRegistro,
    eliminarRegistro,
    guardarApartamentos,
    guardarTelefonoDueno,
    buscarRegistro,
  } = useData();

  if (cargando || !datos) {
    return (
      <div className="pantalla-carga">
        <p>Cargando datos…</p>
      </div>
    );
  }

  return (
    <div className={`layout${menuColapsado ? " layout-menu-colapsado" : ""}`}>
      <Toast />
      <Sidebar
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        colapsado={menuColapsado}
        onAlternar={() => setMenuColapsado((prev) => !prev)}
      />

      <main className="contenido">
        {error && (
          <div className="banner-error" role="alert">
            {error}
          </div>
        )}

        {vistaActiva === VISTAS.REGISTRO && (
          <RegistroMensual
            apartamentos={datos.apartamentos}
            buscarRegistro={buscarRegistro}
            guardarRegistro={guardarRegistro}
            telefonoDueno={datos.telefonoDueno}
          />
        )}

        {vistaActiva === VISTAS.HISTORIAL && (
          <Historial
            registros={datos.registros}
            apartamentos={datos.apartamentos}
            eliminarRegistro={eliminarRegistro}
            guardarRegistro={guardarRegistro}
            telefonoDueno={datos.telefonoDueno}
          />
        )}

        {vistaActiva === VISTAS.CONFIG && (
          <ConfigApartamentos
            apartamentos={datos.apartamentos}
            guardarApartamentos={guardarApartamentos}
            telefonoDueno={datos.telefonoDueno}
            guardarTelefonoDueno={guardarTelefonoDueno}
          />
        )}
      </main>
    </div>
  );
}

export default App;
