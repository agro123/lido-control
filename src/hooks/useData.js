import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

/** Datos iniciales de respaldo si falla la lectura o el parseo. */
const DATOS_VACIOS = {
  apartamentos: [
    { id: 1, nombre: "Apto Cindy" },
    { id: 2, nombre: "Apto Daniel" },
    { id: 3, nombre: "Apto Jeferson" },
    { id: 4, nombre: "Apto Edison" },
  ],
  registros: [],
  telefonoDueno: null,
};

/**
 * Valida y normaliza la estructura leída de data.json.
 * @param {unknown} raw
 * @returns {{ apartamentos: Array, registros: Array, telefonoDueno: string|null }}
 */
function normalizarDatos(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DATOS_VACIOS, apartamentos: [...DATOS_VACIOS.apartamentos], registros: [] };
  }

  const apartamentos = Array.isArray(raw.apartamentos)
    ? raw.apartamentos.filter(
        (a) => a && typeof a.id === "number" && typeof a.nombre === "string",
      )
    : [...DATOS_VACIOS.apartamentos];

  const registros = Array.isArray(raw.registros)
    ? raw.registros.map((registro, indice) => ({
        ...registro,
        id:
          typeof registro?.id === "string" && registro.id
            ? registro.id
            : `registro-legado-${registro?.mes || "sin-mes"}-${registro?.anio || "sin-anio"}-${indice}`,
      }))
    : [];

  return {
    apartamentos: apartamentos.length > 0 ? apartamentos : [...DATOS_VACIOS.apartamentos],
    registros,
    telefonoDueno: typeof raw.telefonoDueno === "string" && raw.telefonoDueno ? raw.telefonoDueno : null,
  };
}

/**
 * Hook para leer y escribir data.json vía comandos Tauri.
 * Expone el estado de apartamentos/registros y operaciones de persistencia.
 */
export function useData() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  /** Carga data.json al iniciar la aplicación. */
  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const contenido = await invoke("read_data");
      const parseado = JSON.parse(contenido);
      setDatos(normalizarDatos(parseado));
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setError(
        typeof err === "string"
          ? err
          : "No se pudieron cargar los datos. Se usarán valores de ejemplo.",
      );
      setDatos({
        apartamentos: [...DATOS_VACIOS.apartamentos],
        registros: [],
      });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /**
   * Persiste el objeto de datos completo en data.json.
   * @param {{ apartamentos: Array, registros: Array }} nuevosDatos
   */
  const guardarDatos = useCallback(async (nuevosDatos) => {
    try {
      const contenido = JSON.stringify(nuevosDatos, null, 2);
      await invoke("write_data", { content: contenido });
      setDatos(nuevosDatos);
      setError(null);
      return true;
    } catch (err) {
      console.error("Error al guardar datos:", err);
      const mensaje =
        typeof err === "string" ? err : "No se pudieron guardar los datos. Intente de nuevo.";
      setError(mensaje);
      return false;
    }
  }, []);

  /**
   * Guarda o sobrescribe un registro mensual.
   * @param {object} registro
   * @param {boolean} sobrescribir
   */
  const guardarRegistro = useCallback(
    async (registro, sobrescribir = false) => {
      if (!datos) return { ok: false, existe: false };

      const indicePorId = registro.id
        ? datos.registros.findIndex((r) => r.id === registro.id)
        : -1;
      const indiceExistente = datos.registros.findIndex(
        (r) => r.mes === registro.mes && r.anio === registro.anio,
      );

      if (indicePorId < 0 && indiceExistente >= 0 && !sobrescribir) {
        return { ok: false, existe: true };
      }

      const registros = [...datos.registros];
      if (indicePorId >= 0) {
        registros[indicePorId] = registro;
      } else if (indiceExistente >= 0) {
        registros[indiceExistente] = registro;
      } else {
        registros.push(registro);
      }

      const ok = await guardarDatos({ ...datos, registros });
      return { ok, existe: false };
    },
    [datos, guardarDatos],
  );

  /**
   * Elimina un registro completo por su identificador.
   * @param {string} registroId
   */
  const eliminarRegistro = useCallback(
    async (registroId) => {
      if (!datos) return false;
      const registros = datos.registros.filter((r) => r.id !== registroId);
      return guardarDatos({ ...datos, registros });
    },
    [datos, guardarDatos],
  );

  /**
   * Actualiza la lista de apartamentos y limpia registros de IDs eliminados.
   * @param {Array} apartamentos
   * @param {number[]} idsEliminados
   */
  const guardarApartamentos = useCallback(
    async (apartamentos, idsEliminados = []) => {
      if (!datos) return false;

      let registros = datos.registros;
      if (idsEliminados.length > 0) {
        registros = registros
          .map((registro) => ({
            ...registro,
            apartamentos: (registro.apartamentos || []).filter(
              (a) => !idsEliminados.includes(a.apartamentoId),
            ),
          }))
          .filter((registro) => (registro.apartamentos || []).length > 0);
      }

      return guardarDatos({ apartamentos, registros });
    },
    [datos, guardarDatos],
  );

  /**
   * Guarda el número de WhatsApp del dueño del edificio (o lo borra con null/"").
   * @param {string|null} telefono
   */
  const guardarTelefonoDueno = useCallback(
    async (telefono) => {
      if (!datos) return false;
      return guardarDatos({ ...datos, telefonoDueno: telefono || null });
    },
    [datos, guardarDatos],
  );

  /**
   * Busca un registro por mes y año.
   * @param {string} mes
   * @param {number} anio
   */
  const buscarRegistro = useCallback(
    (mes, anio) => {
      if (!datos) return null;
      return datos.registros.find((r) => r.mes === mes && r.anio === anio) || null;
    },
    [datos],
  );

  return {
    datos,
    cargando,
    error,
    setError,
    cargar,
    guardarRegistro,
    eliminarRegistro,
    guardarApartamentos,
    guardarTelefonoDueno,
    buscarRegistro,
  };
}
