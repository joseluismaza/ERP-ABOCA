// frontend/src/components/ViewMaterialModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useGlobalData } from '../contexts/GlobalDataContext';
import { descargarActaMaterial } from '../services/materialService';
import { getHistorialByElemento } from '../services/historialService';
import { formatDate, formatFieldValue, calcularTiempo } from '../utils/formatDate';
import { Download, HardDrive, Clock, User, FileText } from 'lucide-react';

const LABELS = {
  tipo: 'Tipo', marca: 'Marca', modelo: 'Modelo', sn: 'Número de Serie',
  imei: 'IMEI', pn: 'Part Number', estado: 'Estado', esRenting: 'Es Renting',
  devueltoRenting: 'Devuelto al Renting', duracionRenting: 'Duración Renting (meses)',
  nContrato: 'Nº Contrato', comentarios: 'Comentarios',
  fechaEntregaOficina: 'Fecha Entrega Oficina',
  fechaEntregaTrabajador: 'Fecha Entrega Trabajador',
  fechaDevolucionTrabajador: 'Fecha Devolución Trabajador',
  fechaDevolucionRenting: 'Fecha Devolución Renting',
  fechaRobo: 'Fecha Robo', nDenuncia: 'Nº Denuncia',
  createdAt: 'Fecha de Alta en Sistema', updatedAt: 'Última Modificación',
};

const IGNORAR = ['_id', 'id', '__v', 'TrabajadorId', 'ultimoTrabajadorId', 'telefonoId', 'docDenuncia'];

const ViewMaterialModal = ({ item, onClose }) => {
  const [activeTab, setActiveTab] = useState('ficha');
  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const { trabajadores = [], materiales = [], refreshGlobalData } = useGlobalData() || {};
  const [seleccionados, setSeleccionados] = useState(item ? [item._id] : []);

  const trabajadorAsignado = useMemo(() => {
    if (!item?.TrabajadorId) return null;
    const id = item.TrabajadorId._id || item.TrabajadorId;
    return trabajadores.find(t => String(t._id) === String(id));
  }, [item?.TrabajadorId, trabajadores]);

  const ultimoTrabajador = useMemo(() => {
    if (!item?.ultimoTrabajadorId) return null;
    const id = item.ultimoTrabajadorId._id || item.ultimoTrabajadorId;
    return trabajadores.find(t => String(t._id) === String(id));
  }, [item?.ultimoTrabajadorId, trabajadores]);

  const equipamientoCompletoTrabajador = useMemo(() => {
    if (!item?.TrabajadorId) return [];
    const idTrabajador = String(item.TrabajadorId._id || item.TrabajadorId);
    return materiales.filter(m => String(m.TrabajadorId?._id || m.TrabajadorId) === idTrabajador);
  }, [item?.TrabajadorId, materiales]);

  useEffect(() => {
    if (activeTab !== 'historial' || !item?._id) return;
    const controller = new AbortController();
    setCargandoHistorial(true);
    getHistorialByElemento(item._id, controller.signal)
      .then(data => setHistorial(Array.isArray(data) ? data : []))
      .catch(err => { if (err.name !== 'CanceledError') console.error(err); })
      .finally(() => setCargandoHistorial(false));
    return () => controller.abort();
  }, [activeTab, item?._id]);

  const handleAccionDocumento = async (tipoActa) => {
    if (!seleccionados || seleccionados.length === 0) {
      alert('Selecciona al menos un material para generar el acta.');
      return;
    }
    setProcesandoPdf(true);
    try {
      const pdfBlob = await descargarActaMaterial(item._id, tipoActa, seleccionados);
      const blob = new Blob([pdfBlob], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      const operario = trabajadorAsignado || ultimoTrabajador;
      const nombreTrabajador = operario
        ? `${operario.nombre}_${operario.apellidos}`.toUpperCase().replace(/[- ]/g, '_')
        : 'ALMACEN';
      const sufijoArchivo = seleccionados.length > 1
        ? 'MATERIAL'
        : `${(item.marca || 'GENERICO').toUpperCase()}_${(item.modelo || 'EQUIPO').toUpperCase()}`;
      link.download = `ACTA_${tipoActa}_${sufijoArchivo}_${nombreTrabajador}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert(`Acta de ${tipoActa} generada para ${seleccionados.length} material(es).`);
      if (refreshGlobalData) refreshGlobalData();
    } catch (err) {
      alert(err.status === 401 ? 'Sesión expirada. Vuelve a iniciar sesión.' : 'Error al generar el acta.');
    } finally {
      setProcesandoPdf(false);
    }
  };

  const toggleMaterial = (id) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (!item) return null;

  const camposVisibles = Object.entries(item).filter(([k]) => !IGNORAR.includes(k));

  const TABS = [
    { id: 'ficha', label: '📋 Ficha Técnica' },
    { id: 'asignado', label: '👤 Asignado' },
    { id: 'historial', label: '📜 Historial' },
    { id: 'documentacion', label: '📄 Documentación' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl flex flex-col max-h-[88vh]">

        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
          <div>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              {item.tipo || 'Activo Técnico'}
            </span>
            <h3 className="text-base font-black text-slate-800 mt-1">{item.marca} {item.modelo}</h3>
            {item.sn && <p className="text-[10px] text-slate-400 font-mono mt-0.5">S/N: {item.sn}</p>}
          </div>
          <button onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-600">✕ Cerrar</button>
        </div>

        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-bold overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-fit py-3 px-2 text-center border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">

          {activeTab === 'ficha' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {camposVisibles.map(([clave, valor]) => (
                <div key={clave} className="bg-slate-50/70 p-3 rounded-xl border border-slate-100/80">
                  <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-0.5">
                    {LABELS[clave] || clave}
                  </span>
                  <span className="text-xs font-bold text-slate-700">{formatFieldValue(valor)}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'asignado' && (
            <div className="space-y-4">
              {trabajadorAsignado ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-sm">
                      {trabajadorAsignado.nombre?.[0]}{trabajadorAsignado.apellidos?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{trabajadorAsignado.nombre} {trabajadorAsignado.apellidos}</p>
                      <p className="text-[10px] text-slate-500 font-mono">DNI: {trabajadorAsignado.dni}</p>
                      {trabajadorAsignado.cargo && (
                        <p className="text-[10px] text-indigo-600 font-bold">{trabajadorAsignado.cargo}</p>
                      )}
                    </div>
                  </div>
                  {item.fechaEntregaTrabajador && (
                    <div className="bg-white rounded-xl p-3 border border-indigo-100/60 text-xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Asignado desde</span>
                      <span className="font-bold text-slate-700">{formatDate(item.fechaEntregaTrabajador)}</span>
                      <span className="ml-2 text-slate-400 font-medium">
                        ({calcularTiempo(item.fechaEntregaTrabajador, null) || 'fecha reciente'})
                      </span>
                    </div>
                  )}
                </div>
              ) : ultimoTrabajador ? (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 space-y-2">
                  <p className="text-xs font-black text-amber-800 uppercase">Último portador (material devuelto)</p>
                  <p className="text-sm font-bold text-slate-700">{ultimoTrabajador.nombre} {ultimoTrabajador.apellidos}</p>
                  {item.fechaDevolucionTrabajador && (
                    <p className="text-[11px] text-slate-500">Devuelto el: <span className="font-bold">{formatDate(item.fechaDevolucionTrabajador)}</span></p>
                  )}
                  <div className="mt-2 pt-2 border-t border-amber-100">
                    <p className="text-[10px] text-amber-700 font-bold">⚠️ El material está actualmente disponible en almacén.</p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <HardDrive className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  Este activo está disponible en almacén sin asignación actual ni historial previo registrado.
                </div>
              )}
            </div>
          )}

          {activeTab === 'historial' && (
            <div className="space-y-3">
              {cargandoHistorial ? (
                <div className="p-8 text-center text-slate-400 text-xs">Cargando historial...</div>
              ) : historial.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Clock className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  No hay registros de historial para este material.
                </div>
              ) : (
                <div className="space-y-2">
                  {historial.map((log) => {
                    const trabajador = log.detallesAsignacion?.trabajadorId;
                    const fechaIni = log.detallesAsignacion?.fechaAsignacion;
                    const fechaFin = log.detallesAsignacion?.fechaDevolucion;
                    const tiempo = calcularTiempo(fechaIni, fechaFin);
                    const esAsignacion = log.accion?.includes('ASIGNAR') || log.accion?.includes('assign');
                    const esDevolucion = log.accion?.includes('DEVOLU') || log.accion?.includes('unassign');

                    return (
                      <div key={log._id} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                            esAsignacion ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            esDevolucion ? 'bg-red-50 text-red-700 border border-red-100' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {log.accion || 'OPERACIÓN'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{formatDate(log.createdAt)}</span>
                        </div>

                        {trabajador && (
                          <div className="flex items-center gap-2 text-xs">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-slate-700">
                              {trabajador.nombre} {trabajador.apellidos}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                          {fechaIni && (
                            <div>
                              <p className="font-black text-slate-400 uppercase text-[9px]">Desde</p>
                              <p className="font-bold text-slate-700">{formatDate(fechaIni)}</p>
                            </div>
                          )}
                          {fechaFin && (
                            <div>
                              <p className="font-black text-slate-400 uppercase text-[9px]">Hasta</p>
                              <p className="font-bold text-slate-700">{formatDate(fechaFin)}</p>
                            </div>
                          )}
                          {tiempo && (
                            <div>
                              <p className="font-black text-slate-400 uppercase text-[9px]">Duración</p>
                              <p className="font-bold text-indigo-600">{tiempo}</p>
                            </div>
                          )}
                        </div>

                        {log.detalles && (
                          <p className="text-[10px] text-slate-500 italic leading-relaxed border-t border-slate-50 pt-1.5">
                            {log.detalles}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documentacion' && (
            <div className="space-y-4">
              {trabajadorAsignado ? (
                <div className="space-y-4">
                  <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/60 space-y-1">
                    <h4 className="text-xs font-black text-indigo-900 uppercase flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Expedición Contractual
                    </h4>
                    <p className="text-[11px] text-indigo-700/80 font-medium">
                      Selecciona los activos de {trabajadorAsignado.nombre} para incluirlos en el acta.
                    </p>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {equipamientoCompletoTrabajador.map((mat) => (
                      <div
                        key={mat._id}
                        onClick={() => toggleMaterial(mat._id)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          seleccionados.includes(mat._id)
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-slate-100 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            seleccionados.includes(mat._id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                          }`}>
                            {seleccionados.includes(mat._id) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">{mat.marca} {mat.modelo}</p>
                            <p className="text-[10px] text-slate-400 font-mono">S/N: {mat.sn || 'No reg.'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-white text-slate-500 rounded-full border border-slate-200 uppercase">
                          {mat.tipo}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      disabled={procesandoPdf || seleccionados.length === 0}
                      onClick={() => handleAccionDocumento('ENTREGA')}
                      className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-sm"
                    >
                      <Download size={14} /> Acta Entrega ({seleccionados.length})
                    </button>
                    <button
                      disabled={procesandoPdf || seleccionados.length === 0}
                      onClick={() => handleAccionDocumento('DEVOLUCION')}
                      className="flex items-center justify-center gap-2 p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-sm"
                    >
                      <Download size={14} /> Acta Devolución ({seleccionados.length})
                    </button>
                  </div>
                </div>
              ) : ultimoTrabajador ? (
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
                  <h4 className="text-xs font-black text-emerald-900 uppercase">Material recientemente devuelto</h4>
                  <p className="text-[11px] text-emerald-700/90 font-medium">
                    Entregado previamente por <strong>{ultimoTrabajador.nombre} {ultimoTrabajador.apellidos}</strong>.
                    Puedes generar el acta de devolución oficial.
                  </p>
                  <button
                    onClick={() => handleAccionDocumento('DEVOLUCION')}
                    disabled={procesandoPdf}
                    className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                  >
                    <Download size={14} /> Generar Acta de Devolución ({ultimoTrabajador.nombre})
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  El activo no tiene vinculación contractual. Asigna un trabajador para habilitar la generación de actas.
                </div>
              )}
            </div>
          )}

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-md">
            Cerrar Expediente
          </button>
        </div>

      </div>
    </div>
  );
};

export default ViewMaterialModal;