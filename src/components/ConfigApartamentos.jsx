import { useState } from "react";
import { normalizarInputNumerico } from "../helpers/formato";
import { mostrarError, mostrarExito } from "../hooks/useToast";

/** Un celular colombiano: 10 dígitos que empiezan por 3. Vacío es válido (WhatsApp sin número). */
function celularValido(texto) {
  return texto === "" || /^3\d{9}$/.test(texto);
}

const MENSAJE_CELULAR = "El WhatsApp debe tener 10 dígitos y empezar por 3 (ej: 3001234567).";

/**
 * Configuración de apartamentos: listar, agregar, renombrar y eliminar.
 */
export default function ConfigApartamentos({
  apartamentos,
  guardarApartamentos,
  telefonoDueno,
  guardarTelefonoDueno,
}) {
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [telefonoNuevo, setTelefonoNuevo] = useState("");
  const [telefonoEdicion, setTelefonoEdicion] = useState("");
  const [telefonoDuenoInput, setTelefonoDuenoInput] = useState(telefonoDueno || "");
  const [errorDueno, setErrorDueno] = useState("");
  const [guardandoDueno, setGuardandoDueno] = useState(false);
  const [error, setError] = useState("");

  /** Guarda el número de WhatsApp del dueño del edificio. */
  async function manejarGuardarDueno(evento) {
    evento.preventDefault();
    setErrorDueno("");

    if (!celularValido(telefonoDuenoInput)) {
      setErrorDueno(MENSAJE_CELULAR);
      return;
    }

    setGuardandoDueno(true);
    const ok = await guardarTelefonoDueno(telefonoDuenoInput);
    setGuardandoDueno(false);
    if (ok) mostrarExito("Número del dueño guardado.");
    else mostrarError("No se pudo guardar el número del dueño.");
  }

  /** Agrega un apartamento con solo el nombre. */
  async function manejarAgregar(evento) {
    evento.preventDefault();
    setError("");

    const nombre = nombreNuevo.trim();
    if (!nombre) {
      setError("Escriba el nombre del apartamento.");
      return;
    }

    if (!celularValido(telefonoNuevo)) {
      setError(MENSAJE_CELULAR);
      return;
    }

    const maxId = apartamentos.reduce((max, a) => Math.max(max, a.id), 0);
    const actualizados = [
      ...apartamentos,
      { id: maxId + 1, nombre, ...(telefonoNuevo ? { telefono: telefonoNuevo } : {}) },
    ];
    const ok = await guardarApartamentos(actualizados, []);
    if (ok) {
      setNombreNuevo("");
      setTelefonoNuevo("");
      mostrarExito(`Apartamento "${nombre}" agregado.`);
    } else {
      mostrarError("No se pudo agregar el apartamento.");
    }
  }

  /** Inicia la edición del nombre de un apartamento. */
  function iniciarEdicion(apto) {
    setEditandoId(apto.id);
    setNombreEdicion(apto.nombre);
    setTelefonoEdicion(apto.telefono || "");
    setError("");
  }

  /** Guarda el nuevo nombre del apartamento en edición. */
  async function guardarEdicion(aptoId) {
    const nombre = nombreEdicion.trim();
    if (!nombre) {
      setError("El nombre no puede quedar vacío.");
      return;
    }

    if (!celularValido(telefonoEdicion)) {
      setError(MENSAJE_CELULAR);
      return;
    }

    const actualizados = apartamentos.map((a) => {
      if (a.id !== aptoId) return a;
      const { telefono: _anterior, ...resto } = a;
      return { ...resto, nombre, ...(telefonoEdicion ? { telefono: telefonoEdicion } : {}) };
    });
    const ok = await guardarApartamentos(actualizados, []);
    if (ok) {
      setEditandoId(null);
      setNombreEdicion("");
      setTelefonoEdicion("");
      mostrarExito("Apartamento actualizado.");
    } else {
      mostrarError("No se pudo actualizar el apartamento.");
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
      mostrarError("Debe quedar al menos un apartamento.");
      return;
    }

    const ok = await guardarApartamentos(actualizados, [apto.id]);
    if (ok) {
      mostrarExito(`Apartamento "${apto.nombre}" eliminado.`);
      if (editandoId === apto.id) {
        setEditandoId(null);
      }
    } else {
      mostrarError("No se pudo eliminar el apartamento.");
    }
  }

  return (
    <section className="pagina">
      <header className="pagina-encabezado">
        <h2>Configuración de Apartamentos</h2>
        <p>Agregue, edite (nombre y WhatsApp) o elimine apartamentos del edificio.</p>
      </header>

      <div className="tarjeta">
        <h3 className="seccion-titulo">Dueño del edificio</h3>
        <p className="texto-ayuda">
          A este número de WhatsApp se envía el resumen mensual de todo el edificio.
        </p>
        <form className="form-fila form-dueno" onSubmit={manejarGuardarDueno}>
          <label className="campo">
            <span className="campo-etiqueta">WhatsApp del dueño</span>
            <input
              type="text"
              inputMode="numeric"
              value={telefonoDuenoInput}
              onChange={(e) => setTelefonoDuenoInput(normalizarInputNumerico(e.target.value).slice(0, 10))}
              placeholder="3001234567"
            />
          </label>
          <div className="campo campo-accion">
            <span className="campo-etiqueta campo-etiqueta-invisible">Acción</span>
            <button type="submit" className="btn btn-primario" disabled={guardandoDueno}>
              {guardandoDueno ? "Guardando…" : "Guardar número"}
            </button>
          </div>
        </form>
        {errorDueno && (
          <p className="campo-error" role="alert">
            {errorDueno}
          </p>
        )}
      </div>

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
          <label className="campo">
            <span className="campo-etiqueta">WhatsApp (opcional)</span>
            <input
              type="text"
              inputMode="numeric"
              value={telefonoNuevo}
              onChange={(e) => setTelefonoNuevo(normalizarInputNumerico(e.target.value).slice(0, 10))}
              placeholder="3001234567"
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
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input-telefono"
                    value={telefonoEdicion}
                    onChange={(e) =>
                      setTelefonoEdicion(normalizarInputNumerico(e.target.value).slice(0, 10))
                    }
                    placeholder="WhatsApp: 3001234567"
                    aria-label={`WhatsApp de ${apto.nombre}`}
                  />
                  <button
                    type="button"
                    className="btn btn-primario btn-pequeno"
                    onClick={() => guardarEdicion(apto.id)}
                  >
                    Guardar
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
                    <span className="telefono-apartamento">
                      {apto.telefono ? `WhatsApp +57 ${apto.telefono}` : "Sin WhatsApp"}
                    </span>
                  </span>
                  <div className="acciones-apartamento">
                    <button
                      type="button"
                      className="btn btn-secundario btn-pequeno"
                      onClick={() => iniciarEdicion(apto)}
                    >
                      Editar
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
