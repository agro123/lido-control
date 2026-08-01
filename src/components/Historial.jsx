import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { MESES, ANIOS } from "../helpers/constantes";
import { formatearConsumo, formatearPesos } from "../helpers/formato";

/**
 * Aplana los registros mensuales a una fila por apartamento por mes.
 * @param {Array} registros
 * @param {Array} apartamentos
 */
function aplanarRegistros(registros, apartamentos) {
  const mapaNombres = new Map(apartamentos.map((a) => [a.id, a.nombre]));
  const filas = [];

  registros.forEach((registro) => {
    (registro.apartamentos || []).forEach((apto) => {
      filas.push({
        mes: registro.mes,
        anio: registro.anio,
        apartamentoId: apto.apartamentoId,
        apartamentoNombre:
          mapaNombres.get(apto.apartamentoId) || `Apartamento ${apto.apartamentoId}`,
        lecturaAnteriorEnergia: apto.energia?.lecturaAnterior,
        lecturaActualEnergia: apto.energia?.lecturaActual,
        consumoEnergia: apto.energia?.consumo,
        tarifaEnergia: registro.tarifaEnergia,
        totalEnergia: apto.energia?.costo,
        lecturaAnteriorAgua: apto.agua?.lecturaAnterior,
        lecturaActualAgua: apto.agua?.lecturaActual,
        consumoAgua: apto.agua?.consumo,
        tarifaAgua: registro.tarifaAgua,
        totalAgua: apto.agua?.costo,
        tarifaFija: registro.tarifaFija,
        totalPagado: apto.totalAPagar,
      });
    });
  });

  // Orden: año desc, mes (calendario), luego apartamento
  const ordenMes = new Map(MESES.map((m, i) => [m, i]));
  filas.sort((a, b) => {
    if (a.anio !== b.anio) return b.anio - a.anio;
    const diffMes = (ordenMes.get(a.mes) ?? 0) - (ordenMes.get(b.mes) ?? 0);
    if (diffMes !== 0) return diffMes;
    return a.apartamentoId - b.apartamentoId;
  });

  return filas;
}

/**
 * Página de historial: consulta, filtro, eliminación y exportación a Excel.
 */
export default function Historial({
  registros,
  apartamentos,
  eliminarRegistro,
}) {
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroApto, setFiltroApto] = useState("");
  const [mensaje, setMensaje] = useState("");

  const filas = useMemo(
    () => aplanarRegistros(registros || [], apartamentos || []),
    [registros, apartamentos],
  );

  const filasFiltradas = useMemo(() => {
    return filas.filter((fila) => {
      if (filtroMes && fila.mes !== filtroMes) return false;
      if (filtroAnio && String(fila.anio) !== String(filtroAnio)) return false;
      if (filtroApto && String(fila.apartamentoId) !== String(filtroApto)) return false;
      return true;
    });
  }, [filas, filtroMes, filtroAnio, filtroApto]);

  function limpiarFiltros() {
    setFiltroMes("");
    setFiltroAnio("");
    setFiltroApto("");
  }

  /**
   * Elimina el registro completo del mes/año (todos los apartamentos).
   * @param {string} mes
   * @param {number} anio
   */
  async function manejarEliminar(mes, anio) {
    const confirmar = window.confirm(
      `¿Eliminar el registro completo de ${mes} ${anio}? Se borrarán los datos de todos los apartamentos de ese mes.`,
    );
    if (!confirmar) return;

    const ok = await eliminarRegistro(mes, anio);
    if (ok) {
      setMensaje(`Registro de ${mes} ${anio} eliminado.`);
    } else {
      setMensaje("No se pudo eliminar el registro. Intente de nuevo.");
    }
  }

  /** Exporta las filas filtradas visibles a un archivo .xlsx. */
  function exportarExcel() {
    if (filasFiltradas.length === 0) {
      window.alert("No hay datos para exportar con los filtros actuales.");
      return;
    }

    const datosExcel = filasFiltradas.map((fila, indice) => ({
      "#": indice + 1,
      Mes: fila.mes,
      Año: fila.anio,
      Apartamento: fila.apartamentoNombre,
      "Lect. Ant. Energía": fila.lecturaAnteriorEnergia,
      "Lect. Act. Energía": fila.lecturaActualEnergia,
      "Cons. Energía (kWh)": fila.consumoEnergia,
      "Tarifa Energía": fila.tarifaEnergia,
      "Total Energía ($)": fila.totalEnergia,
      "Lect. Ant. Agua": fila.lecturaAnteriorAgua,
      "Lect. Act. Agua": fila.lecturaActualAgua,
      "Cons. Agua (m³)": fila.consumoAgua,
      "Tarifa Agua": fila.tarifaAgua,
      "Total Agua ($)": fila.totalAgua,
      "Tarifa Fija": fila.tarifaFija,
      "TOTAL PAGADO ($)": fila.totalPagado,
    }));

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Historial");

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(libro, `historial-consumo-${fecha}.xlsx`);
    setMensaje("Archivo Excel exportado correctamente.");
  }

  return (
    <section className="pagina">
      <header className="pagina-encabezado">
        <h2>Historial</h2>
        <p>Consulte los registros guardados, filtre por mes o apartamento, o exporte a Excel.</p>
      </header>

      <div className="tarjeta">
        <h3 className="seccion-titulo">Filtros</h3>
        <div className="form-fila form-fila-filtros">
          <label className="campo">
            <span className="campo-etiqueta">Mes</span>
            <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}>
              <option value="">Todos</option>
              {MESES.map((mes) => (
                <option key={mes} value={mes}>
                  {mes}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span className="campo-etiqueta">Año</span>
            <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)}>
              <option value="">Todos</option>
              {ANIOS.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span className="campo-etiqueta">Apartamento</span>
            <select value={filtroApto} onChange={(e) => setFiltroApto(e.target.value)}>
              <option value="">Todos</option>
              {apartamentos.map((apto) => (
                <option key={apto.id} value={apto.id}>
                  {apto.nombre}
                </option>
              ))}
            </select>
          </label>

          <div className="campo campo-accion">
            <span className="campo-etiqueta campo-etiqueta-invisible">Acciones</span>
            <button type="button" className="btn btn-secundario" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="acciones acciones-arriba">
        <button type="button" className="btn btn-primario" onClick={exportarExcel}>
          Exportar a Excel (.xlsx)
        </button>
      </div>

      {mensaje && (
        <p className="mensaje-exito" role="status">
          {mensaje}
        </p>
      )}

      <div className="tarjeta">
        <div className="tabla-contenedor">
          <table className="tabla tabla-historial">
            <thead>
              <tr>
                <th>#</th>
                <th>Mes</th>
                <th>Año</th>
                <th>Apartamento</th>
                <th>Lect. Ant. Energía</th>
                <th>Lect. Act. Energía</th>
                <th>Cons. Energía (kWh)</th>
                <th>Tarifa Energía</th>
                <th>Total Energía ($)</th>
                <th>Lect. Ant. Agua</th>
                <th>Lect. Act. Agua</th>
                <th>Cons. Agua (m³)</th>
                <th>Tarifa Agua</th>
                <th>Total Agua ($)</th>
                <th>Tarifa Fija</th>
                <th>TOTAL PAGADO ($)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={17} className="celda-vacia">
                    No hay registros para mostrar.
                  </td>
                </tr>
              ) : (
                filasFiltradas.map((fila, indice) => (
                  <tr key={`${fila.mes}-${fila.anio}-${fila.apartamentoId}-${indice}`}>
                    <td>{indice + 1}</td>
                    <td>{fila.mes}</td>
                    <td>{fila.anio}</td>
                    <td className="celda-nombre">{fila.apartamentoNombre}</td>
                    <td>{formatearConsumo(fila.lecturaAnteriorEnergia)}</td>
                    <td>{formatearConsumo(fila.lecturaActualEnergia)}</td>
                    <td>{formatearConsumo(fila.consumoEnergia)}</td>
                    <td>{formatearPesos(fila.tarifaEnergia)}</td>
                    <td>{formatearPesos(fila.totalEnergia)}</td>
                    <td>{formatearConsumo(fila.lecturaAnteriorAgua)}</td>
                    <td>{formatearConsumo(fila.lecturaActualAgua)}</td>
                    <td>{formatearConsumo(fila.consumoAgua)}</td>
                    <td>{formatearPesos(fila.tarifaAgua)}</td>
                    <td>{formatearPesos(fila.totalAgua)}</td>
                    <td>{formatearPesos(fila.tarifaFija)}</td>
                    <td className="celda-total-pagado">{formatearPesos(fila.totalPagado)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-peligro btn-pequeno"
                        onClick={() => manejarEliminar(fila.mes, fila.anio)}
                        title={`Eliminar registro de ${fila.mes} ${fila.anio}`}
                      >
                        🗑 Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
