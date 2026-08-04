import { useEffect, useMemo, useRef, useState } from "react";
import { MESES, ANIOS } from "../helpers/constantes";
import {
  calcularFilaApartamento,
  calcularTarifaAgua,
  calcularTarifaEnergia,
  calcularTarifaFija,
} from "../helpers/calculos";
import { obtenerMesAnioAnterior } from "../helpers/fechas";
import {
  aNumeroONull,
  formatearConsumo,
  formatearPesos,
  normalizarInputDecimal,
  normalizarInputNumerico,
} from "../helpers/formato";
import {
  CAMPOS_EDITABLES_REGISTRO,
  navegarCamposConFlechas,
  navegarCeldasConFlechas,
} from "../helpers/navegacionTabla";

/**
 * Crea una fila vacía del formulario para un apartamento.
 * @param {number} apartamentoId
 */
function crearFilaVacia(apartamentoId) {
  return {
    apartamentoId,
    lecturaAnteriorEnergia: "",
    lecturaActualEnergia: "",
    lecturaAnteriorAgua: "",
    lecturaActualAgua: "",
  };
}

/**
 * Toma la lectura actual del mes anterior como lectura anterior del mes nuevo.
 * @param {number} apartamentoId
 * @param {object|null|undefined} datosMesAnterior
 */
function crearFilaConMesAnterior(apartamentoId, datosMesAnterior) {
  const fila = crearFilaVacia(apartamentoId);
  if (!datosMesAnterior) {
    return fila;
  }

  if (datosMesAnterior.energia?.lecturaActual != null) {
    fila.lecturaAnteriorEnergia = String(datosMesAnterior.energia.lecturaActual);
  }
  if (datosMesAnterior.agua?.lecturaActual != null) {
    fila.lecturaAnteriorAgua = String(datosMesAnterior.agua.lecturaActual);
  }
  return fila;
}

/**
 * Obtiene el mes y año actuales en español.
 */
function obtenerMesAnioActual() {
  const ahora = new Date();
  return {
    mes: MESES[ahora.getMonth()],
    anio: ahora.getFullYear(),
  };
}

function calcularTarifasDesdeRecibo({
  totalEnergiaRecibo,
  consumoKwh,
  costoAlcantarillado,
  costoAcueducto,
  consumoM3Agua,
  serviciosVarios,
  cantidadApartamentos,
}) {
  return {
    tarifaEnergia: calcularTarifaEnergia(totalEnergiaRecibo, consumoKwh),
    tarifaAgua: calcularTarifaAgua(costoAlcantarillado, costoAcueducto, consumoM3Agua),
    tarifaFija: calcularTarifaFija(serviciosVarios, cantidadApartamentos),
  };
}

/**
 * Página de registro mensual: ingreso de lecturas y cálculo automático.
 * Diseño compacto pensado para pantallas 1366×768.
 */
export default function RegistroMensual({
  apartamentos,
  buscarRegistro,
  guardarRegistro,
}) {
  const inicial = obtenerMesAnioActual();
  const [mes, setMes] = useState(inicial.mes);
  const [anio, setAnio] = useState(inicial.anio);
  const [tarifaEnergia, setTarifaEnergia] = useState("");
  const [tarifaAgua, setTarifaAgua] = useState("");
  const [tarifaFija, setTarifaFija] = useState("");
  const [costoAlcantarillado, setCostoAlcantarillado] = useState("");
  const [costoAcueducto, setCostoAcueducto] = useState("");
  const [consumoM3Agua, setConsumoM3Agua] = useState("");
  const [totalEnergiaRecibo, setTotalEnergiaRecibo] = useState("");
  const [consumoKwh, setConsumoKwh] = useState("");
  const [serviciosVarios, setServiciosVarios] = useState("");
  const [filas, setFilas] = useState([]);
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState("");
  const [exito, setExito] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [origenMesAnterior, setOrigenMesAnterior] = useState(null);
  const tablaRef = useRef(null);
  const camposReciboRef = useRef(null);
  const formularioInicializado = useRef(false);
  const mesRef = useRef(mes);
  const anioRef = useRef(anio);

  mesRef.current = mes;
  anioRef.current = anio;

  /**
   * Maneja flechas/Enter para mover el foco entre celdas editables (estilo Excel).
   * @param {import('react').KeyboardEvent<HTMLInputElement>} evento
   * @param {number} indiceFila
   * @param {number} indiceColumna
   */
  function manejarTeclaCelda(evento, indiceFila, indiceColumna) {
    navegarCeldasConFlechas(evento, {
      contenedor: tablaRef.current,
      fila: indiceFila,
      columna: indiceColumna,
      totalFilas: filas.length,
      totalColumnas: CAMPOS_EDITABLES_REGISTRO.length,
    });
  }

  function manejarTeclaCampoSuperior(evento) {
    navegarCamposConFlechas(evento, {
      contenedor: camposReciboRef.current,
    });
  }

  function actualizarTarifasDesdeRecibo({
    totalEnergiaRecibo: nuevoTotalEnergiaRecibo = totalEnergiaRecibo,
    consumoKwh: nuevoConsumoKwh = consumoKwh,
    costoAlcantarillado: nuevoCostoAlcantarillado = costoAlcantarillado,
    costoAcueducto: nuevoCostoAcueducto = costoAcueducto,
    consumoM3Agua: nuevoConsumoM3Agua = consumoM3Agua,
    serviciosVarios: nuevosServiciosVarios = serviciosVarios,
  }) {
    const tarifas = calcularTarifasDesdeRecibo({
      totalEnergiaRecibo: nuevoTotalEnergiaRecibo,
      consumoKwh: nuevoConsumoKwh,
      costoAlcantarillado: nuevoCostoAlcantarillado,
      costoAcueducto: nuevoCostoAcueducto,
      consumoM3Agua: nuevoConsumoM3Agua,
      serviciosVarios: nuevosServiciosVarios,
      cantidadApartamentos: apartamentos.length,
    });

    setTarifaEnergia(tarifas.tarifaEnergia == null ? "" : String(tarifas.tarifaEnergia));
    setTarifaAgua(tarifas.tarifaAgua == null ? "" : String(tarifas.tarifaAgua));
    setTarifaFija(tarifas.tarifaFija == null ? "" : String(tarifas.tarifaFija));
  }

  /**
   * Carga tarifas y lecturas para un mes/año concretos.
   * @param {string} mesObjetivo
   * @param {number} anioObjetivo
   */
  function cargarFormulario(mesObjetivo, anioObjetivo) {
    const registro = buscarRegistro(mesObjetivo, anioObjetivo);
    const anteriorRef = obtenerMesAnioAnterior(mesObjetivo, anioObjetivo);
    const registroAnterior = anteriorRef
      ? buscarRegistro(anteriorRef.mes, anteriorRef.anio)
      : null;

    const mapaAnterior = new Map(
      (registroAnterior?.apartamentos || []).map((a) => [a.apartamentoId, a]),
    );

    if (registro) {
      setTarifaEnergia(String(registro.tarifaEnergia ?? ""));
      setTarifaAgua(String(registro.tarifaAgua ?? ""));
      setTarifaFija(String(registro.tarifaFija ?? ""));
      setCostoAlcantarillado("");
      setCostoAcueducto("");
      setConsumoM3Agua("");
      setTotalEnergiaRecibo("");
      setConsumoKwh("");
      setServiciosVarios("");
      setFilas(
        apartamentos.map((apto) => {
          const datosApto = (registro.apartamentos || []).find(
            (a) => a.apartamentoId === apto.id,
          );
          if (!datosApto) {
            return crearFilaConMesAnterior(apto.id, mapaAnterior.get(apto.id));
          }
          return {
            apartamentoId: apto.id,
            lecturaAnteriorEnergia: String(datosApto.energia?.lecturaAnterior ?? ""),
            lecturaActualEnergia: String(datosApto.energia?.lecturaActual ?? ""),
            lecturaAnteriorAgua: String(datosApto.agua?.lecturaAnterior ?? ""),
            lecturaActualAgua: String(datosApto.agua?.lecturaActual ?? ""),
          };
        }),
      );
      setOrigenMesAnterior(null);
    } else {
      setTarifaEnergia("");
      setTarifaAgua("");
      setTarifaFija("");
      setCostoAlcantarillado("");
      setCostoAcueducto("");
      setConsumoM3Agua("");
      setTotalEnergiaRecibo("");
      setConsumoKwh("");
      setServiciosVarios("");
      setFilas(
        apartamentos.map((apto) =>
          crearFilaConMesAnterior(apto.id, mapaAnterior.get(apto.id)),
        ),
      );
      setOrigenMesAnterior(
        registroAnterior && anteriorRef
          ? `${anteriorRef.mes} ${anteriorRef.anio}`
          : null,
      );
    }

    setErrores({});
    setAviso("");
    setExito("");
  }

  /**
   * Carga inicial al montar. Al cambiar mes/año NO se recargan los valores:
   * se conservan para que el usuario pueda corregir el periodo antes de guardar.
   * Solo se sincronizan filas si cambia la lista de apartamentos.
   */
  useEffect(() => {
    if (!formularioInicializado.current) {
      formularioInicializado.current = true;
      cargarFormulario(mesRef.current, anioRef.current);
      return;
    }

    setFilas((previas) => {
      const mapaPrevias = new Map(previas.map((fila) => [fila.apartamentoId, fila]));
      const anteriorRef = obtenerMesAnioAnterior(mesRef.current, anioRef.current);
      const registroAnterior = anteriorRef
        ? buscarRegistro(anteriorRef.mes, anteriorRef.anio)
        : null;
      const mapaAnterior = new Map(
        (registroAnterior?.apartamentos || []).map((a) => [a.apartamentoId, a]),
      );

      return apartamentos.map((apto) => {
        const existente = mapaPrevias.get(apto.id);
        if (existente) {
          return existente;
        }
        return crearFilaConMesAnterior(apto.id, mapaAnterior.get(apto.id));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mes/año no deben reiniciar el formulario
  }, [apartamentos, buscarRegistro]);

  /** Cambia el mes sin borrar tarifas ni lecturas ya digitadas. */
  function cambiarMes(nuevoMes) {
    setMes(nuevoMes);
    setExito("");
  }

  /** Cambia el año sin borrar tarifas ni lecturas ya digitadas. */
  function cambiarAnio(nuevoAnio) {
    setAnio(Number(nuevoAnio));
    setExito("");
  }

  const tarifas = useMemo(
    () => ({ tarifaEnergia, tarifaAgua, tarifaFija }),
    [tarifaEnergia, tarifaAgua, tarifaFija],
  );

  /** Filas con cálculos en tiempo real. */
  const filasCalculadas = useMemo(
    () =>
      filas.map((fila) => ({
        ...fila,
        calculos: calcularFilaApartamento(fila, tarifas),
        nombre:
          apartamentos.find((a) => a.id === fila.apartamentoId)?.nombre ||
          `Apartamento ${fila.apartamentoId}`,
      })),
    [filas, tarifas, apartamentos],
  );

  /** Totales de la fila inferior. */
  const totales = useMemo(() => {
    return filasCalculadas.reduce(
      (acc, fila) => {
        const c = fila.calculos;
        return {
          consumoEnergia: acc.consumoEnergia + (c.consumoEnergia ?? 0),
          costoEnergia: acc.costoEnergia + (c.costoEnergia ?? 0),
          consumoAgua: acc.consumoAgua + (c.consumoAgua ?? 0),
          costoAgua: acc.costoAgua + (c.costoAgua ?? 0),
          totalAPagar: acc.totalAPagar + (c.totalAPagar ?? 0),
        };
      },
      {
        consumoEnergia: 0,
        costoEnergia: 0,
        consumoAgua: 0,
        costoAgua: 0,
        totalAPagar: 0,
      },
    );
  }, [filasCalculadas]);

  /**
   * Actualiza un campo numérico de una fila.
   * @param {number} apartamentoId
   * @param {string} campo
   * @param {string} valor
   */
  function actualizarCampo(apartamentoId, campo, valor) {
    const limpio = normalizarInputNumerico(valor);
    setFilas((prev) =>
      prev.map((fila) =>
        fila.apartamentoId === apartamentoId ? { ...fila, [campo]: limpio } : fila,
      ),
    );
    setExito("");
  }

  /**
   * Valida el formulario antes de guardar.
   * @returns {boolean}
   */
  function validar() {
    const nuevosErrores = {};

    if (!mes) {
      nuevosErrores.mes = "Seleccione el mes.";
    }
    if (!anio) {
      nuevosErrores.anio = "Seleccione el año.";
    }

    const tarifasVacias =
      tarifaEnergia === "" || tarifaAgua === "" || tarifaFija === "";
    const tarifasCero =
      Number(tarifaEnergia) === 0 ||
      Number(tarifaAgua) === 0 ||
      Number(tarifaFija) === 0;

    if (tarifasVacias || tarifasCero) {
      setAviso(
        "Advertencia: una o más tarifas están vacías o en cero. Puede guardar de todos modos si es correcto.",
      );
    } else {
      setAviso("");
    }

    filasCalculadas.forEach((fila) => {
      const campos = [
        ["lecturaAnteriorEnergia", "Lectura anterior de energía"],
        ["lecturaActualEnergia", "Lectura actual de energía"],
        ["lecturaAnteriorAgua", "Lectura anterior de agua"],
        ["lecturaActualAgua", "Lectura actual de agua"],
      ];

      campos.forEach(([campo, etiqueta]) => {
        if (fila[campo] === "") {
          nuevosErrores[`${fila.apartamentoId}-${campo}`] = `${etiqueta} es obligatoria.`;
        }
      });

      if (fila.calculos.energiaInvalida) {
        nuevosErrores[`${fila.apartamentoId}-energia`] =
          "La lectura actual de energía no puede ser menor que la anterior.";
      }
      if (fila.calculos.aguaInvalida) {
        nuevosErrores[`${fila.apartamentoId}-agua`] =
          "La lectura actual de agua no puede ser menor que la anterior.";
      }
    });

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  /** Construye el objeto de registro a persistir. */
  function construirRegistro() {
    return {
      id: crypto.randomUUID(),
      mes,
      anio: Number(anio),
      tarifaEnergia: aNumeroONull(tarifaEnergia) ?? 0,
      tarifaAgua: aNumeroONull(tarifaAgua) ?? 0,
      tarifaFija: aNumeroONull(tarifaFija) ?? 0,
      apartamentos: filasCalculadas.map((fila) => ({
        apartamentoId: fila.apartamentoId,
        energia: {
          lecturaAnterior: Number(fila.lecturaAnteriorEnergia),
          lecturaActual: Number(fila.lecturaActualEnergia),
          consumo: fila.calculos.consumoEnergia ?? 0,
          costo: fila.calculos.costoEnergia ?? 0,
        },
        agua: {
          lecturaAnterior: Number(fila.lecturaAnteriorAgua),
          lecturaActual: Number(fila.lecturaActualAgua),
          consumo: fila.calculos.consumoAgua ?? 0,
          costo: fila.calculos.costoAgua ?? 0,
        },
        totalAPagar: fila.calculos.totalAPagar ?? 0,
      })),
    };
  }

  /** Guarda el registro, preguntando si ya existe uno para el mismo mes/año. */
  async function manejarGuardar() {
    setExito("");
    if (!validar()) {
      return;
    }

    setGuardando(true);
    try {
      const existente = buscarRegistro(mes, anio);
      const registro = construirRegistro();
      if (existente?.id) {
        registro.id = existente.id;
      }

      let resultado = await guardarRegistro(registro, false);

      if (resultado.existe) {
        const confirmar = window.confirm(
          `Ya existe un registro para ${mes} ${anio}. ¿Desea sobrescribirlo?`,
        );
        if (!confirmar) {
          return;
        }
        resultado = await guardarRegistro(registro, true);
      }

      if (resultado.ok) {
        setExito(`Registro de ${mes} ${anio} guardado correctamente.`);
        setErrores({});
        setOrigenMesAnterior(null);
      }
    } finally {
      setGuardando(false);
    }
  }

  /** Limpia los campos editables; conserva lecturas anteriores del mes previo si existen. */
  function manejarLimpiar() {
    const confirmar = window.confirm(
      "¿Está seguro de que desea limpiar los campos? Se perderán los datos no guardados.",
    );
    if (!confirmar) return;

    const anteriorRef = obtenerMesAnioAnterior(mes, anio);
    const registroAnterior = anteriorRef
      ? buscarRegistro(anteriorRef.mes, anteriorRef.anio)
      : null;
    const mapaAnterior = new Map(
      (registroAnterior?.apartamentos || []).map((a) => [a.apartamentoId, a]),
    );

    setTarifaEnergia("");
    setTarifaAgua("");
    setTarifaFija("");
    setCostoAlcantarillado("");
    setCostoAcueducto("");
    setConsumoM3Agua("");
    setTotalEnergiaRecibo("");
    setConsumoKwh("");
    setServiciosVarios("");
    setFilas(
      apartamentos.map((apto) =>
        crearFilaConMesAnterior(apto.id, mapaAnterior.get(apto.id)),
      ),
    );
    setOrigenMesAnterior(
      registroAnterior && anteriorRef
        ? `${anteriorRef.mes} ${anteriorRef.anio}`
        : null,
    );
    setErrores({});
    setAviso("");
    setExito("");
  }

  return (
    <section className="pagina pagina-registro">
      <header className="pagina-encabezado pagina-encabezado-compacto">
        <div>
          <h2>Registro Mensual</h2>
          <p>Ingrese las lecturas del mes. Los totales se calculan solos.</p>
        </div>
        <div className="acciones acciones-encabezado">
          <button
            type="button"
            className="btn btn-primario"
            onClick={manejarGuardar}
            disabled={guardando}
          >
            {guardando ? "Guardando…" : "Guardar registro"}
          </button>
          <button type="button" className="btn btn-secundario" onClick={manejarLimpiar}>
            Limpiar campos
          </button>
        </div>
      </header>

      <div className="tarjeta tarjeta-compacta" ref={camposReciboRef}>
        <div className="form-fila form-fila-registro-periodo">
          <label className="campo">
            <span className="campo-etiqueta">Mes</span>
            <select
              value={mes}
              data-navegacion-campo="true"
              onKeyDown={manejarTeclaCampoSuperior}
              onChange={(e) => cambiarMes(e.target.value)}
              aria-invalid={Boolean(errores.mes)}
            >
              {MESES.map((nombreMes) => (
                <option key={nombreMes} value={nombreMes}>
                  {nombreMes}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span className="campo-etiqueta">Año</span>
            <select
              value={anio}
              data-navegacion-campo="true"
              onKeyDown={manejarTeclaCampoSuperior}
              onChange={(e) => cambiarAnio(e.target.value)}
              aria-invalid={Boolean(errores.anio)}
            >
              {ANIOS.map((valorAnio) => (
                <option key={valorAnio} value={valorAnio}>
                  {valorAnio}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-fila-registro-grupos">
          <div className="bloque-tarifa">
            <h4>Energía</h4>
            <div className="form-fila form-fila-bloque-tarifa">
              <label className="campo">
                <span className="campo-etiqueta">Total energía recibo ($)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-numero"
                  data-navegacion-campo="true"
                  value={totalEnergiaRecibo}
                  onKeyDown={manejarTeclaCampoSuperior}
                  onChange={(e) => {
                    const valor = normalizarInputDecimal(e.target.value);
                    setTotalEnergiaRecibo(valor);
                    actualizarTarifasDesdeRecibo({ totalEnergiaRecibo: valor });
                  }}
                />
              </label>
              <label className="campo">
                <span className="campo-etiqueta">Consumo energía total (kWh)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-numero"
                  data-navegacion-campo="true"
                  value={consumoKwh}
                  onKeyDown={manejarTeclaCampoSuperior}
                  onChange={(e) => {
                    const valor = normalizarInputDecimal(e.target.value);
                    setConsumoKwh(valor);
                    actualizarTarifasDesdeRecibo({ consumoKwh: valor });
                  }}
                />
              </label>
              <label className="campo">
                <span className="campo-etiqueta">Tarifa Energía ($/kWh)</span>
                <span className="valor-etiqueta"> {formatearPesos(tarifaEnergia)}</span>
              </label>
            </div>
          </div>

          <div className="bloque-tarifa">
            <h4>Agua</h4>
            <div className="form-fila form-fila-bloque-tarifa">
              <label className="campo">
                <span className="campo-etiqueta">Costo alcantarillado ($)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-numero"
                  data-navegacion-campo="true"
                  value={costoAlcantarillado}
                  onKeyDown={manejarTeclaCampoSuperior}
                  onChange={(e) => {
                    const valor = normalizarInputDecimal(e.target.value);
                    setCostoAlcantarillado(valor);
                    actualizarTarifasDesdeRecibo({ costoAlcantarillado: valor });
                  }}
                />
              </label>
              <label className="campo">
                <span className="campo-etiqueta">Costo acueducto ($)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-numero"
                  data-navegacion-campo="true"
                  value={costoAcueducto}
                  onKeyDown={manejarTeclaCampoSuperior}
                  onChange={(e) => {
                    const valor = normalizarInputDecimal(e.target.value);
                    setCostoAcueducto(valor);
                    actualizarTarifasDesdeRecibo({ costoAcueducto: valor });
                  }}
                />
              </label>
              <label className="campo">
                <span className="campo-etiqueta">Consumo agua total (m³)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-numero"
                  data-navegacion-campo="true"
                  value={consumoM3Agua}
                  onKeyDown={manejarTeclaCampoSuperior}
                  onChange={(e) => {
                    const valor = normalizarInputDecimal(e.target.value);
                    setConsumoM3Agua(valor);
                    actualizarTarifasDesdeRecibo({ consumoM3Agua: valor });
                  }}
                />
              </label>
              <label className="campo">
                <span className="campo-etiqueta">Tarifa Agua ($/m³)</span>
                <span className="valor-etiqueta">{formatearPesos(tarifaAgua)}</span>
              </label>
            </div>
          </div>

          <div className="bloque-tarifa">
            <h4>Fijo</h4>
            <div className="form-fila form-fila-bloque-tarifa">
              <label className="campo">
                <span className="campo-etiqueta">Servicios varios ($)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-numero"
                  data-navegacion-campo="true"
                  value={serviciosVarios}
                  onKeyDown={manejarTeclaCampoSuperior}
                  onChange={(e) => {
                    const valor = normalizarInputDecimal(e.target.value);
                    setServiciosVarios(valor);
                    actualizarTarifasDesdeRecibo({ serviciosVarios: valor });
                  }}
                />
              </label>
              <label className="campo">
                <span className="campo-etiqueta">Tarifa Fija ($)</span>
                <span className="valor-etiqueta">{formatearPesos(tarifaFija)}</span>
              </label>
            </div>
          </div>
        </div>

        <p className="aviso-tarifas aviso-tarifas-inline" role="status">
          Recuerde actualizar las tarifas cada mes
          {origenMesAnterior
            ? ` · Lecturas anteriores tomadas de ${origenMesAnterior}`
            : ""}
        </p>

        {aviso && (
          <p className="aviso-advertencia" role="status">
            {aviso}
          </p>
        )}
      </div>

      <div className="tarjeta tarjeta-tabla">
        <div className="tabla-contenedor tabla-contenedor-registro" ref={tablaRef}>
          <table className="tabla tabla-registro">
            <thead>
              <tr>
                <th>#</th>
                <th>Apartamento</th>
                <th className="col-energia">Ant. Energía</th>
                <th className="col-energia">Act. Energía</th>
                <th className="col-energia">Cons. (kWh)</th>
                <th className="col-energia">Total Energía</th>
                <th className="col-agua">Ant. Agua</th>
                <th className="col-agua">Act. Agua</th>
                <th className="col-agua">Cons. (m³)</th>
                <th className="col-agua">Total Agua</th>
                <th className="col-total">TOTAL A PAGAR</th>
              </tr>
            </thead>
            <tbody>
              {filasCalculadas.map((fila, indice) => (
                <tr
                  key={fila.apartamentoId}
                  className={
                    fila.calculos.energiaInvalida || fila.calculos.aguaInvalida
                      ? "fila-error"
                      : undefined
                  }
                >
                  <td>{indice + 1}</td>
                  <td className="celda-nombre">{fila.nombre}</td>
                  <td className="col-energia">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="input-numero input-tabla"
                      data-fila={indice}
                      data-columna={0}
                      value={fila.lecturaAnteriorEnergia}
                      onChange={(e) =>
                        actualizarCampo(
                          fila.apartamentoId,
                          "lecturaAnteriorEnergia",
                          e.target.value,
                        )
                      }
                      onKeyDown={(e) => manejarTeclaCelda(e, indice, 0)}
                      onFocus={(e) => e.target.select()}
                      aria-label={`Lectura anterior energía ${fila.nombre}`}
                    />
                  </td>
                  <td className="col-energia">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="input-numero input-tabla"
                      data-fila={indice}
                      data-columna={1}
                      value={fila.lecturaActualEnergia}
                      onChange={(e) =>
                        actualizarCampo(
                          fila.apartamentoId,
                          "lecturaActualEnergia",
                          e.target.value,
                        )
                      }
                      onKeyDown={(e) => manejarTeclaCelda(e, indice, 1)}
                      onFocus={(e) => e.target.select()}
                      aria-label={`Lectura actual energía ${fila.nombre}`}
                    />
                  </td>
                  <td className="col-energia celda-calculada">
                    {formatearConsumo(fila.calculos.consumoEnergia)}
                  </td>
                  <td className="col-energia celda-calculada">
                    {formatearPesos(fila.calculos.costoEnergia)}
                  </td>
                  <td className="col-agua">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="input-numero input-tabla"
                      data-fila={indice}
                      data-columna={2}
                      value={fila.lecturaAnteriorAgua}
                      onChange={(e) =>
                        actualizarCampo(
                          fila.apartamentoId,
                          "lecturaAnteriorAgua",
                          e.target.value,
                        )
                      }
                      onKeyDown={(e) => manejarTeclaCelda(e, indice, 2)}
                      onFocus={(e) => e.target.select()}
                      aria-label={`Lectura anterior agua ${fila.nombre}`}
                    />
                  </td>
                  <td className="col-agua">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="input-numero input-tabla"
                      data-fila={indice}
                      data-columna={3}
                      value={fila.lecturaActualAgua}
                      onChange={(e) =>
                        actualizarCampo(
                          fila.apartamentoId,
                          "lecturaActualAgua",
                          e.target.value,
                        )
                      }
                      onKeyDown={(e) => manejarTeclaCelda(e, indice, 3)}
                      onFocus={(e) => e.target.select()}
                      aria-label={`Lectura actual agua ${fila.nombre}`}
                    />
                  </td>
                  <td className="col-agua celda-calculada">
                    {formatearConsumo(fila.calculos.consumoAgua)}
                  </td>
                  <td className="col-agua celda-calculada">
                    {formatearPesos(fila.calculos.costoAgua)}
                  </td>
                  <td className="col-total celda-calculada">
                    {formatearPesos(fila.calculos.totalAPagar)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="fila-totales">
                <td colSpan={2}>TOTALES</td>
                <td className="col-energia" colSpan={2} />
                <td className="col-energia">{formatearConsumo(totales.consumoEnergia)}</td>
                <td className="col-energia">{formatearPesos(totales.costoEnergia)}</td>
                <td className="col-agua" colSpan={2} />
                <td className="col-agua">{formatearConsumo(totales.consumoAgua)}</td>
                <td className="col-agua">{formatearPesos(totales.costoAgua)}</td>
                <td className="col-total">{formatearPesos(totales.totalAPagar)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {filasCalculadas.some(
          (f) => f.calculos.energiaInvalida || f.calculos.aguaInvalida,
        ) && (
          <p className="campo-error aviso-fila" role="alert">
            La lectura actual no puede ser menor que la anterior. Corrija las filas en rojo.
          </p>
        )}

        {Object.keys(errores).length > 0 &&
          !filasCalculadas.some(
            (f) => f.calculos.energiaInvalida || f.calculos.aguaInvalida,
          ) && (
            <p className="campo-error aviso-fila" role="alert">
              Complete todos los campos de lecturas antes de guardar.
            </p>
          )}
      </div>

      {exito && (
        <p className="mensaje-exito" role="status">
          {exito}
        </p>
      )}
    </section>
  );
}
