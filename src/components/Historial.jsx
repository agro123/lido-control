import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { MESES, ANIOS } from "../helpers/constantes";
import {
  calcularFilaApartamento,
  calcularTarifaAgua,
  calcularTarifaEnergia,
  calcularTarifaFija,
} from "../helpers/calculos";
import {
  aNumeroONull,
  formatearConsumo,
  formatearPesos,
  normalizarInputDecimal,
  normalizarInputNumerico,
} from "../helpers/formato";

const CAMPOS_RECIBO = [
  ["totalEnergia", "Total energía recibo ($)", "Valor total facturado por energía."],
  ["consumoKwh", "Consumo energía total (kWh)", "Consumo total indicado en el recibo de energía."],
  ["costoAlcantarillado", "Costo alcantarillado ($)", "Valor facturado por alcantarillado."],
  ["costoAcueducto", "Costo acueducto ($)", "Valor facturado por acueducto."],
  ["consumoM3Agua", "Consumo agua total (m³)", "Consumo total indicado en el recibo de agua."],
  ["serviciosVarios", "Servicios varios ($)", "Valor total de servicios varios."],
];

const CAMPOS_TARIFA = [
  ["tarifaEnergia", "Tarifa energía ($/kWh)"],
  ["tarifaAgua", "Tarifa agua ($/m³)"],
  ["tarifaFija", "Tarifa fija por apartamento ($)"],
];

function estaFaltante(valor) {
  return valor === "" || valor === null || valor === undefined;
}

function clonarRegistro(registro) {
  return JSON.parse(JSON.stringify(registro));
}

function numerarCopias(registros) {
  const ordenMes = new Map(MESES.map((mes, indice) => [mes, indice]));
  const contadores = new Map();
  return [...registros]
    .sort((a, b) => {
      if (a.anio !== b.anio) return b.anio - a.anio;
      const diffMes = (ordenMes.get(b.mes) ?? -1) - (ordenMes.get(a.mes) ?? -1);
      return diffMes || String(a.id).localeCompare(String(b.id));
    })
    .map((registro) => {
      const clave = `${registro.mes}-${registro.anio}`;
      const copia = (contadores.get(clave) || 0) + 1;
      contadores.set(clave, copia);
      return { ...registro, copia };
    });
}

function aplanarRegistros(registros, apartamentos) {
  const nombres = new Map(apartamentos.map((apartamento) => [apartamento.id, apartamento.nombre]));
  return registros.flatMap((registro) =>
    (registro.apartamentos || []).map((apto) => ({
      Mes: registro.mes,
      Año: registro.anio,
      Apartamento: nombres.get(apto.apartamentoId) || `Apartamento ${apto.apartamentoId}`,
      "Total energía recibo ($)": registro.recibo?.totalEnergia,
      "Consumo energía total (kWh)": registro.recibo?.consumoKwh,
      "Costo alcantarillado ($)": registro.recibo?.costoAlcantarillado,
      "Costo acueducto ($)": registro.recibo?.costoAcueducto,
      "Consumo agua total (m³)": registro.recibo?.consumoM3Agua,
      "Servicios varios ($)": registro.recibo?.serviciosVarios,
      "Lect. Ant. Energía": apto.energia?.lecturaAnterior,
      "Lect. Act. Energía": apto.energia?.lecturaActual,
      "Cons. Energía (kWh)": apto.energia?.consumo,
      "Total Energía ($)": apto.energia?.costo,
      "Lect. Ant. Agua": apto.agua?.lecturaAnterior,
      "Lect. Act. Agua": apto.agua?.lecturaActual,
      "Cons. Agua (m³)": apto.agua?.consumo,
      "Total Agua ($)": apto.agua?.costo,
      "TOTAL PAGADO ($)": apto.totalAPagar,
    })),
  );
}

function valorNumerico(valor) {
  if (estaFaltante(valor)) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function calcularTotalRegistro(registro) {
  let total = 0;
  let cantidadValores = 0;

  (registro.apartamentos || []).forEach((apartamento) => {
    const calculos = calcularFilaApartamento(
      {
        lecturaAnteriorEnergia: apartamento.energia?.lecturaAnterior,
        lecturaActualEnergia: apartamento.energia?.lecturaActual,
        lecturaAnteriorAgua: apartamento.agua?.lecturaAnterior,
        lecturaActualAgua: apartamento.agua?.lecturaActual,
      },
      registro,
    );
    const valor = valorNumerico(calculos.totalAPagar) ?? valorNumerico(apartamento.totalAPagar);

    if (valor !== null) {
      total += valor;
      cantidadValores += 1;
    }
  });

  return cantidadValores > 0 ? total : null;
}

function obtenerMesAnterior(registro) {
  const indiceMes = MESES.indexOf(registro.mes);
  if (indiceMes < 0) return null;
  return indiceMes === 0
    ? { mes: MESES[MESES.length - 1], anio: Number(registro.anio) - 1 }
    : { mes: MESES[indiceMes - 1], anio: Number(registro.anio) };
}

function buscarRegistroAnterior(registro, registros) {
  const periodoAnterior = obtenerMesAnterior(registro);
  if (!periodoAnterior) return null;

  return (registros || [])
    .filter((item) => item.mes === periodoAnterior.mes && Number(item.anio) === periodoAnterior.anio)
    .sort((a, b) => String(b.id).localeCompare(String(a.id)))[0] || null;
}

function calcularVariacionPorcentual(actual, anterior) {
  const valorActual = valorNumerico(actual);
  const valorAnterior = valorNumerico(anterior);
  if (valorActual === null || valorAnterior === null || valorAnterior === 0) return null;
  return ((valorActual - valorAnterior) / Math.abs(valorAnterior)) * 100;
}

function textoVariacion(porcentaje) {
  if (porcentaje === null) return null;
  const signo = porcentaje > 0 ? "+" : "";
  return `${signo}${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(porcentaje)}%`;
}

export default function Historial({ registros, apartamentos, eliminarRegistro, guardarRegistro }) {
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroApto, setFiltroApto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [registroDetalle, setRegistroDetalle] = useState(null);
  const [borrador, setBorrador] = useState(null);
  const [registroAEliminar, setRegistroAEliminar] = useState(null);
  const [guardandoDetalle, setGuardandoDetalle] = useState(false);

  const registrosConCopia = useMemo(() => numerarCopias(registros || []), [registros]);
  const registrosFiltrados = useMemo(
    () => registrosConCopia.filter((registro) => {
      if (filtroMes && registro.mes !== filtroMes) return false;
      if (filtroAnio && String(registro.anio) !== String(filtroAnio)) return false;
      return !filtroApto || (registro.apartamentos || []).some(
        (apartamento) => String(apartamento.apartamentoId) === String(filtroApto),
      );
    }),
    [registrosConCopia, filtroMes, filtroAnio, filtroApto],
  );
  function abrirDetalle(registro) {
    setRegistroDetalle(registro);
    setBorrador(clonarRegistro(registro));
  }

  function cerrarDetalle() {
    setRegistroDetalle(null);
    setBorrador(null);
  }

  function actualizarRecibo(campo, valor) {
    setBorrador((actual) => ({
      ...actual,
      recibo: { ...actual.recibo, [campo]: normalizarInputDecimal(valor) },
    }));
  }

  function actualizarTarifa(campo, valor) {
    setBorrador((actual) => ({ ...actual, [campo]: normalizarInputDecimal(valor) }));
  }

  function actualizarLectura(apartamentoId, servicio, campo, valor) {
    setBorrador((actual) => ({
      ...actual,
      apartamentos: actual.apartamentos.map((apartamento) =>
        apartamento.apartamentoId === apartamentoId
          ? { ...apartamento, [servicio]: { ...apartamento[servicio], [campo]: normalizarInputNumerico(valor) } }
          : apartamento,
      ),
    }));
  }

  function prepararRegistroParaGuardar() {
    const recibo = Object.fromEntries(CAMPOS_RECIBO.map(([campo]) => [campo, aNumeroONull(borrador.recibo?.[campo])]));
    const tarifas = {
      tarifaEnergia: aNumeroONull(borrador.tarifaEnergia) ?? calcularTarifaEnergia(recibo.totalEnergia, recibo.consumoKwh),
      tarifaAgua: aNumeroONull(borrador.tarifaAgua) ?? calcularTarifaAgua(recibo.costoAlcantarillado, recibo.costoAcueducto, recibo.consumoM3Agua),
      tarifaFija: aNumeroONull(borrador.tarifaFija) ?? calcularTarifaFija(recibo.serviciosVarios, apartamentos.length),
    };
    return {
      ...borrador,
      recibo,
      ...tarifas,
      apartamentos: (borrador.apartamentos || []).map((apartamento) => {
        const energia = { lecturaAnterior: aNumeroONull(apartamento.energia?.lecturaAnterior), lecturaActual: aNumeroONull(apartamento.energia?.lecturaActual) };
        const agua = { lecturaAnterior: aNumeroONull(apartamento.agua?.lecturaAnterior), lecturaActual: aNumeroONull(apartamento.agua?.lecturaActual) };
        const calculos = calcularFilaApartamento({ lecturaAnteriorEnergia: energia.lecturaAnterior, lecturaActualEnergia: energia.lecturaActual, lecturaAnteriorAgua: agua.lecturaAnterior, lecturaActualAgua: agua.lecturaActual }, tarifas);
        return { ...apartamento, energia: { ...energia, consumo: calculos.consumoEnergia, costo: calculos.costoEnergia }, agua: { ...agua, consumo: calculos.consumoAgua, costo: calculos.costoAgua }, totalAPagar: calculos.totalAPagar };
      }),
    };
  }

  async function guardarDatosFaltantes() {
    setGuardandoDetalle(true);
    const resultado = await guardarRegistro(prepararRegistroParaGuardar(), true);
    setGuardandoDetalle(false);
    if (resultado.ok) {
      setMensaje(`Datos de ${registroDetalle.mes} ${registroDetalle.anio} actualizados.`);
      cerrarDetalle();
    } else setMensaje("No se pudieron actualizar los datos faltantes.");
  }

  async function confirmarEliminacion() {
    const registro = registroAEliminar;
    const ok = await eliminarRegistro(registro.id);
    setRegistroAEliminar(null);
    setMensaje(ok ? `Registro de ${registro.mes} ${registro.anio} eliminado.` : "No se pudo eliminar el registro.");
  }

  function exportarExcel() {
    const filas = aplanarRegistros(registrosFiltrados, apartamentos);
    if (!filas.length) return window.alert("No hay datos para exportar con los filtros actuales.");
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), "Historial");
    XLSX.writeFile(libro, `historial-consumo-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMensaje("Archivo Excel exportado correctamente.");
  }

  return <section className="pagina pagina-historial">
    <header className="pagina-encabezado"><h2>Historial</h2><p>Abra cada carpeta para consultar el registro guardado o completar datos faltantes.</p></header>
    <div className="tarjeta"><h3 className="seccion-titulo">Filtros</h3><div className="form-fila form-fila-filtros">
      <label className="campo"><span className="campo-etiqueta">Mes</span><select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}><option value="">Todos</option>{MESES.map((mes) => <option key={mes} value={mes}>{mes}</option>)}</select></label>
      <label className="campo"><span className="campo-etiqueta">Año</span><select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)}><option value="">Todos</option>{ANIOS.map((anio) => <option key={anio} value={anio}>{anio}</option>)}</select></label>
      <label className="campo"><span className="campo-etiqueta">Apartamento</span><select value={filtroApto} onChange={(e) => setFiltroApto(e.target.value)}><option value="">Todos</option>{apartamentos.map((apto) => <option key={apto.id} value={apto.id}>{apto.nombre}</option>)}</select></label>
      <div className="campo campo-accion"><span className="campo-etiqueta campo-etiqueta-invisible">Acciones</span><button type="button" className="btn btn-secundario" onClick={() => { setFiltroMes(""); setFiltroAnio(""); setFiltroApto(""); }}>Limpiar filtros</button></div>
    </div></div>
    <div className="acciones acciones-arriba"><button type="button" className="btn btn-primario" onClick={exportarExcel}>Exportar a Excel (.xlsx)</button></div>
    {mensaje && <p className="mensaje-exito" role="status">{mensaje}</p>}
    <div className="tarjeta tarjeta-historial-grid">{registrosFiltrados.length === 0 ? <p className="historial-vacio">No hay registros para mostrar.</p> : <div className="historial-grid">{registrosFiltrados.map((registro) => <article key={registro.id} className="archivo-registro"><button type="button" className="archivo-registro-principal" onClick={() => abrirDetalle(registro)} aria-label={`Abrir ${registro.mes} ${registro.anio}, copia ${registro.copia}`}><span className="archivo-icono" aria-hidden="true">📁</span><span className="archivo-nombre">{registro.mes} {registro.anio} - Copia {String(registro.copia).padStart(2, "0")}</span><span className="archivo-meta">{(registro.apartamentos || []).length} apartamento(s)</span></button><button type="button" className="archivo-eliminar" onClick={() => setRegistroAEliminar(registro)} title="Eliminar este registro" aria-label={`Eliminar ${registro.mes} ${registro.anio}`}>🗑</button></article>)}</div>}</div>
    {registroDetalle && borrador && <ModalDetalle registro={registroDetalle} borrador={borrador} registros={registros} apartamentos={apartamentos} guardando={guardandoDetalle} onCerrar={cerrarDetalle} onActualizarRecibo={actualizarRecibo} onActualizarTarifa={actualizarTarifa} onActualizarLectura={actualizarLectura} onGuardar={guardarDatosFaltantes} />}
    {registroAEliminar && <div className="modal-fondo" role="presentation"><section className="modal modal-confirmacion" role="dialog" aria-modal="true" aria-labelledby="eliminar-titulo"><h3 id="eliminar-titulo">¿Eliminar registro?</h3><p>Se eliminará únicamente <strong>{registroAEliminar.mes} {registroAEliminar.anio} - Copia {String(registroAEliminar.copia).padStart(2, "0")}</strong>, junto con los datos de sus apartamentos.</p><div className="modal-acciones"><button type="button" className="btn btn-secundario" onClick={() => setRegistroAEliminar(null)}>Cancelar</button><button type="button" className="btn btn-peligro" onClick={confirmarEliminacion}>Eliminar registro</button></div></section></div>}
  </section>;
}

function ModalDetalle({ registro, borrador, registros, apartamentos, guardando, onCerrar, onActualizarRecibo, onActualizarTarifa, onActualizarLectura, onGuardar }) {
  const totalAPagar = calcularTotalRegistro(borrador);
  const registroAnterior = useMemo(() => buscarRegistroAnterior(registro, registros), [registro, registros]);
  const totalAnterior = registroAnterior ? calcularTotalRegistro(registroAnterior) : null;
  const variacionTotal = calcularVariacionPorcentual(totalAPagar, totalAnterior);
  const periodoAnterior = registroAnterior ? `${registroAnterior.mes} ${registroAnterior.anio}` : null;

  return <div className="modal-fondo" role="presentation" onMouseDown={onCerrar}><section className="modal modal-registro" role="dialog" aria-modal="true" aria-labelledby="detalle-titulo" onMouseDown={(evento) => evento.stopPropagation()}><header className="modal-encabezado"><div><h3 id="detalle-titulo">{registro.mes} {registro.anio}</h3><p>Los datos guardados son de solo lectura. Los campos vacíos se pueden completar.</p></div><button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar detalle">×</button></header><div className="modal-contenido"><h4>Datos del recibo</h4><div className="detalle-recibo-grid">{CAMPOS_RECIBO.map(([campo, etiqueta, ayuda]) => <CampoDetalle key={campo} etiqueta={etiqueta} ayuda={ayuda} valor={borrador.recibo?.[campo]} valorAnterior={registroAnterior?.recibo?.[campo]} periodoAnterior={periodoAnterior} editable={estaFaltante(registro.recibo?.[campo])} onChange={(valor) => onActualizarRecibo(campo, valor)} moneda={!campo.includes("consumo")} />)}</div><div className="detalle-tarifas">{CAMPOS_TARIFA.map(([campo, etiqueta]) => <CampoDetalle key={campo} etiqueta={etiqueta} valor={borrador[campo]} valorAnterior={registroAnterior?.[campo]} periodoAnterior={periodoAnterior} editable={estaFaltante(registro[campo])} onChange={(valor) => onActualizarTarifa(campo, valor)} moneda />)}</div><section className="comparacion-total" aria-live="polite"><span>Variación total a pagar frente a {periodoAnterior || "el mes anterior"}</span>{variacionTotal === null ? <strong>Sin datos comparables del mes anterior.</strong> : <strong className={variacionTotal > 0 ? "variacion-sube" : variacionTotal < 0 ? "variacion-baja" : ""}>{textoVariacion(variacionTotal)} ({formatearPesos(totalAPagar)} vs. {formatearPesos(totalAnterior)})</strong>}</section><h4>Lecturas por apartamento</h4><div className="tabla-contenedor"><table className="tabla tabla-detalle"><thead><tr><th>Apartamento</th><th>Ant. energía</th><th>Act. energía</th><th>Cons. energía</th><th>Total energía</th><th>Ant. agua</th><th>Act. agua</th><th>Cons. agua</th><th>Total agua</th><th>Total a pagar</th></tr></thead><tbody>{(borrador.apartamentos || []).map((apto) => <FilaDetalle key={apto.apartamentoId} apartamento={apto} nombre={apartamentos.find((item) => item.id === apto.apartamentoId)?.nombre || `Apartamento ${apto.apartamentoId}`} original={(registro.apartamentos || []).find((item) => item.apartamentoId === apto.apartamentoId) || {}} anterior={(registroAnterior?.apartamentos || []).find((item) => item.apartamentoId === apto.apartamentoId)} tarifas={borrador} tarifasAnteriores={registroAnterior} periodoAnterior={periodoAnterior} onChange={onActualizarLectura} />)}</tbody><tfoot><tr className="fila-totales"><td colSpan={9}>Suma total a pagar</td><td className="celda-total-pagado"><ComparacionHover etiqueta="Suma total a pagar" actual={totalAPagar} anterior={totalAnterior} periodoAnterior={periodoAnterior} formatear={formatearPesos}>{formatearPesos(totalAPagar)}</ComparacionHover></td></tr></tfoot></table></div></div><footer className="modal-acciones"><button type="button" className="btn btn-secundario" onClick={onCerrar}>Cerrar</button><button type="button" className="btn btn-primario" onClick={onGuardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar datos faltantes"}</button></footer></section></div>;
}

function CampoDetalle({ etiqueta, ayuda, valor, valorAnterior, periodoAnterior, editable, onChange, moneda }) {
  const formatear = moneda ? formatearPesos : formatearConsumo;
  const contenido = editable ? <input type="text" inputMode="decimal" value={valor ?? ""} onChange={(evento) => onChange(evento.target.value)} /> : <span className="valor-detalle">{formatear(valor)}</span>;
  return <label className="campo campo-detalle" title={ayuda || etiqueta}><span className="campo-etiqueta">{etiqueta}</span><ComparacionHover etiqueta={etiqueta} actual={valor} anterior={valorAnterior} periodoAnterior={periodoAnterior} formatear={formatear}>{contenido}</ComparacionHover></label>;
}

function FilaDetalle({ apartamento, nombre, original, anterior, tarifas, tarifasAnteriores, periodoAnterior, onChange }) {
  const calculos = calcularFilaApartamento({ lecturaAnteriorEnergia: apartamento.energia?.lecturaAnterior, lecturaActualEnergia: apartamento.energia?.lecturaActual, lecturaAnteriorAgua: apartamento.agua?.lecturaAnterior, lecturaActualAgua: apartamento.agua?.lecturaActual }, tarifas);
  const calculosAnteriores = anterior ? calcularFilaApartamento({ lecturaAnteriorEnergia: anterior.energia?.lecturaAnterior, lecturaActualEnergia: anterior.energia?.lecturaActual, lecturaAnteriorAgua: anterior.agua?.lecturaAnterior, lecturaActualAgua: anterior.agua?.lecturaActual }, tarifasAnteriores || {}) : {};
  const lectura = (servicio, campo, etiqueta) => {
    const contenido = estaFaltante(original[servicio]?.[campo]) ? <input type="text" inputMode="numeric" className="input-numero input-tabla" value={apartamento[servicio]?.[campo] ?? ""} onChange={(evento) => onChange(apartamento.apartamentoId, servicio, campo, evento.target.value)} aria-label={`${etiqueta} ${nombre}`} /> : formatearConsumo(apartamento[servicio]?.[campo]);
    return <ComparacionHover etiqueta={etiqueta} actual={apartamento[servicio]?.[campo]} anterior={anterior?.[servicio]?.[campo]} periodoAnterior={periodoAnterior} formatear={formatearConsumo}>{contenido}</ComparacionHover>;
  };
  const calculado = (etiqueta, actual, previo, moneda = false) => <ComparacionHover etiqueta={etiqueta} actual={actual} anterior={previo} periodoAnterior={periodoAnterior} formatear={moneda ? formatearPesos : formatearConsumo}>{moneda ? formatearPesos(actual) : formatearConsumo(actual)}</ComparacionHover>;
  return <tr><td className="celda-nombre">{nombre}</td><td>{lectura("energia", "lecturaAnterior", "Lectura anterior de energía")}</td><td>{lectura("energia", "lecturaActual", "Lectura actual de energía")}</td><td>{calculado("Consumo de energía", calculos.consumoEnergia, calculosAnteriores.consumoEnergia)}</td><td>{calculado("Total de energía", calculos.costoEnergia, calculosAnteriores.costoEnergia, true)}</td><td>{lectura("agua", "lecturaAnterior", "Lectura anterior de agua")}</td><td>{lectura("agua", "lecturaActual", "Lectura actual de agua")}</td><td>{calculado("Consumo de agua", calculos.consumoAgua, calculosAnteriores.consumoAgua)}</td><td>{calculado("Total de agua", calculos.costoAgua, calculosAnteriores.costoAgua, true)}</td><td className="celda-total-pagado">{calculado("Total a pagar", calculos.totalAPagar, calculosAnteriores.totalAPagar, true)}</td></tr>;
}

function ComparacionHover({ etiqueta, actual, anterior, periodoAnterior, formatear, children }) {
  const disparador = useRef(null);
  const [posicion, setPosicion] = useState(null);
  const valorActual = valorNumerico(actual);
  const valorAnterior = valorNumerico(anterior);
  if (valorActual === null || valorAnterior === null) return children;

  const maximo = Math.max(Math.abs(valorActual), Math.abs(valorAnterior), 1);
  const variacion = calcularVariacionPorcentual(valorActual, valorAnterior);
  const etiquetaAnterior = periodoAnterior || "mes anterior";
  const mostrar = () => {
    const rectangulo = disparador.current?.getBoundingClientRect();
    if (!rectangulo) return;
    setPosicion({
      top: rectangulo.top > 160 ? rectangulo.top - 150 : rectangulo.bottom + 8,
      left: Math.max(104, Math.min(window.innerWidth - 104, rectangulo.left + (rectangulo.width / 2))),
    });
  };
  const ocultar = () => setPosicion(null);
  const grafico = posicion && <span className="comparacion-popover" role="tooltip" style={{ top: posicion.top, left: posicion.left }}><strong>{etiqueta}</strong><span className="comparacion-periodos"><span>Mes actual</span><span>{etiquetaAnterior}</span></span><span className="comparacion-barras"><span className="comparacion-barra"><i style={{ "--altura-barra": `${Math.max((Math.abs(valorActual) / maximo) * 100, 5)}%` }} /><b>{formatear(valorActual)}</b></span><span className="comparacion-barra comparacion-barra-anterior"><i style={{ "--altura-barra": `${Math.max((Math.abs(valorAnterior) / maximo) * 100, 5)}%` }} /><b>{formatear(valorAnterior)}</b></span></span><span className={`comparacion-variacion ${variacion > 0 ? "variacion-sube" : variacion < 0 ? "variacion-baja" : ""}`}>Diferencia: {textoVariacion(variacion) || "sin base"}</span></span>;
  return <><span ref={disparador} className="comparacion-hover" tabIndex={0} onMouseEnter={mostrar} onMouseLeave={ocultar} onFocus={mostrar} onBlur={ocultar} aria-label={`${etiqueta}. Actual: ${formatear(valorActual)}. ${etiquetaAnterior}: ${formatear(valorAnterior)}.`}>{children}</span>{grafico && createPortal(grafico, document.body)}</>;
}
