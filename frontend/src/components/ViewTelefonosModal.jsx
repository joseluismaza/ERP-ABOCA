// frontend/src/components/ViewTelefonosModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useGlobalData } from '../contexts/GlobalDataContext';
import { getHistorialByElemento } from '../services/historialService';
import { formatDate, formatFieldValue, calcularTiempo } from '../utils/formatDate';
import { Smartphone, User, Clock } from 'lucide-react';

const LABELS = {
  numeroTelefono: 'Número de Teléfono',
  numeroInterno: 'Extensión Interna',
  icc: 'ICC Tarjeta SIM (Nº Serie)',
  tipoSIM: 'Formato / Tipo SIM',
  tipoDispositivo: 'Terminal',
  pin1: 'Código PIN 1',
  puk1: 'Código PUK 1',
  pin2: 'Código PIN 2',
  puk2: 'Código PUK 2',
  estado: 'Estado Operativo',
  createdAt: 'Alta en Sistema',
  updatedAt: 'Última Modificación',
};

const IGNORAR = ['_id', 'id', '__v', 'TrabajadorId', 'asignadoA'];

const ViewTelefonosModal = ({ item, onClose }) => {
  const [activeTab, setActiveTab] = useState('ficha');
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const { trabajadores = [] } = useGlobalData() || {};

  const trabajadorAsignado = useMemo(() => {
    if (!item) return null;
    const referencia = item.TrabajadorId || item.asignadoA;
    if (!referencia) return null;
    if (typeof referencia === 'object' && referencia.nombre) return referencia;
    const id = String(referencia._id || referencia);
    return trabajadores.find(t => String(t._id) === id);
  }, [item, trabajadores]);

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

  if (!item) return null;

  const camposVisibles = Object.entries(item).filter(([k]) => !IGNORAR.includes(k));

  const TABS = [
    { id: 'ficha', label: '📋 Ficha Técnica' },
    { id: 'asignado', label: '👤 Asignado' },
    { id: 'historial', label: '📜 Historial' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl flex flex-col max-h-[88vh]">

        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
              <Smartphone size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                Activo de Telecomunicaciones
              </span>
              <h3 className="text-base font-black text-slate-800 mt-0.5">
                Línea Móvil: {item.numeroTelefono}
              </h3>
              {item.numeroInterno && (
                <p className="text-[10px] text-slate-400">Extensión interna: {item.numeroInterno}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-600">✕ Cerrar</button>
        </div>

        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-bold">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-center border-b-2 transition-all ${
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
                <div key={clave} className={`bg-slate-50/70 p-3 rounded-xl border border-slate-100/80 ${
                  (clave === 'pin1' || clave === 'puk1' || clave === 'pin2' || clave === 'puk2') ? 'font-mono' : ''
                }`}>
                  <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-0.5">
                    {LABELS[clave] || clave}
                  </span>
                  <span className={`text-xs font-bold ${
                    (clave === 'pin1' || clave === 'puk1' || clave === 'pin2' || clave === 'puk2')
                      ? 'text-slate-600 bg-slate-100 px-1 rounded font-mono'
                      : 'text-slate-700'
                  }`}>
                    {formatFieldValue(valor)}
                  </span>
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
                      <p className="text-sm font-black text-slate-800">
                        {trabajadorAsignado.nombre} {trabajadorAsignado.apellidos}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">DNI: {trabajadorAsignado.dni}</p>
                      {trabajadorAsignado.cargo && (
                        <p className="text-[10px] text-indigo-600 font-bold">{trabajadorAsignado.cargo}</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-indigo-100/60">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Estado de la línea</span>
                    <span className="text-xs font-black text-indigo-600">
                      📱 Asignada y en uso activo
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Smartphone className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  La línea se encuentra libre en almacén. Vincula un trabajador desde el panel de edición.
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
                  No hay registros de historial para esta línea.
                </div>
              ) : (
                <div className="space-y-2">
                  {historial.map((log) => {
                    const trabajador = log.detallesAsignacion?.trabajadorId;
                    const fechaIni = log.detallesAsignacion?.fechaAsignacion;
                    const fechaFin = log.detallesAsignacion?.fechaDevolucion;
                    const tiempo = calcularTiempo(fechaIni, fechaFin);
                    const esAsignacion = log.accion?.includes('ASIGNAR');
                    const esDevolucion = log.accion?.includes('DEVOLU');

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
                          <p className="text-[10px] text-slate-500 italic border-t border-slate-50 pt-1.5">
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

export default ViewTelefonosModal;