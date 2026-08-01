import { useState } from "react";

/**
 * Configuración de apartamentos: listar, agregar, renombrar y eliminar.
 */
export default function ConfigApartamentos({ apartamentos, guardarApartamentos }) {
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  /** Agrega un apartamento con solo el nombre. */
  async function manejarAgregar(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");

    const nombre = nombreNuevo.trim();
    if (!nombre) {
      setError("Escriba el nombre del apartamento.");
      return;
    }

    const maxId = apartamentos.reduce((max, a) => Math.max(max, a.id), 0);
    const actualizados = [...apartamentos, { id: maxId + 1, nombre }];
    const ok = await guardarApartamentos(actualizados, []);
    if (ok) {
      setNombreNuevo("");
      setMensaje(`Apartamento "${nombre}" agregado.`);
    } else {
      setError("No se pudo agregar el apartamento.");
    }
  }

  /** Inicia la edición del nombre de un apartamento. */
  function iniciarEdicion(apto) {
    setEditandoId(apto.id);
    setNombreEdicion(apto.nombre);
    setError("");
    setMensaje("");
  }

  /** Guarda el nuevo nombre del apartamento en edición. */
  async function guardarEdicion(aptoId) {
    const nombre = nombreEdicion.trim();
    if (!nombre) {
      setError("El nombre no puede quedar vacío.");
      return;
    }

    const actualizados = apartamentos.map((a) =>
      a.id === aptoId ? { ...a, nombre } : a,
    );
    const ok = await guardarApartamentos(actualizados, []);
    if (ok) {
      setEditandoId(null);
      setNombreEdicion("");
      setMensaje("Nombre actualizado.");
    } else {
      setError("No se pudo renombrar el apartamento.");
    }
  }

  /**
   * Elimina un apartamento y sus registros históricos asociados.
   * @param {{ id: number, nombre: string }} apto
   */
  async function manejarEliminar(apto) {
    const confirmar = window.confirm(
      `¿Eliminar "${apto.nombre}"?\n\nADVERTENCIA: Se perderán todos sus registros históricos de consumo.`,
    );
    if (!confirmar) return;

    const actualizados = apartamentos.filter((a) => a.id !== apto.id);
    if (actualizados.length === 0) {
      setError("Debe quedar al menos un apartamento.");
      return;
    }

    const ok = await guardarApartamentos(actualizados, [apto.id]);
    if (ok) {
      setMensaje(`Apartamento "${apto.nombre}" eliminado.`);
      if (editandoId === apto.id) {
        setEditandoId(null);
      }
    } else {
      setError("No se pudo eliminar el apartamento.");
    }
  }

  return (
    <section className="pagina">
      <header className="pagina-encabezado">
        <h2>Configuración de Apartamentos</h2>
        <p>Agregue, renombre o elimine apartamentos del edificio.</p>
      </header>

      <div className="tarjeta">
        <h3 className="seccion-titulo">Agregar apartamento</h3>
        <form className="form-fila form-agregar" onSubmit={manejarAgregar}>
          <label className="campo campo-flex">
            <span className="campo-etiqueta">Nombre</span>
            <input
              type="text"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="Ej: Apto 5 — Familia Pérez"
              maxLength={80}
            />
          </label>
          <div className="campo campo-accion">
            <span className="campo-etiqueta campo-etiqueta-invisible">Acción</span>
            <button type="submit" className="btn btn-primario">
              Agregar apartamento
            </button>
          </div>
        </form>
        {error && (
          <p className="campo-error" role="alert">
            {error}
          </p>
        )}
        {mensaje && (
          <p className="mensaje-exito" role="status">
            {mensaje}
          </p>
        )}
      </div>

      <div className="tarjeta">
        <h3 className="seccion-titulo">Apartamentos actuales ({apartamentos.length})</h3>
        <ul className="lista-apartamentos">
          {apartamentos.map((apto) => (
            <li key={apto.id} className="item-apartamento">
              {editandoId === apto.id ? (
                <div className="edicion-apartamento">
                  <input
                    type="text"
                    value={nombreEdicion}
                    onChange={(e) => setNombreEdicion(e.target.value)}
                    maxLength={80}
                    aria-label={`Nuevo nombre para ${apto.nombre}`}
                  />
                  <button
                    type="button"
                    className="btn btn-primario btn-pequeno"
                    onClick={() => guardarEdicion(apto.id)}
                  >
                    Guardar nombre
                  </button>
                  <button
                    type="button"
                    className="btn btn-secundario btn-pequeno"
                    onClick={() => setEditandoId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <span className="nombre-apartamento">
                    <strong>#{apto.id}</strong> {apto.nombre}
                  </span>
                  <div className="acciones-apartamento">
                    <button
                      type="button"
                      className="btn btn-secundario btn-pequeno"
                      onClick={() => iniciarEdicion(apto)}
                    >
                      Renombrar
                    </button>
                    <button
                      type="button"
                      className="btn btn-peligro btn-pequeno"
                      onClick={() => manejarEliminar(apto)}
                    >
                      🗑 Eliminar
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
