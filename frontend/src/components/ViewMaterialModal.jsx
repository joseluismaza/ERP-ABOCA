// frontend/src/components/ViewMaterialModal.jsx
import React, { useState, useMemo } from 'react';
import { useGlobalData } from '../contexts/GlobalDataContext';
import { descargarActaMaterial } from '../services/materialService';
import { Shield, FileText, Download, HardDrive, RefreshCw } from 'lucide-react';

const ViewMaterialModal = ({ item, onClose }) => {
  const [activeTab, setActiveTab] = useState('expediente'); 
  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const { trabajadores = [], materiales = [], refreshGlobalData } = useGlobalData() || {};
  const [seleccionados, setSeleccionados] = useState(item ? [item._id] : []);

  // Resolvemos el trabajador asignado activo actual
  const trabajadorAsignado = useMemo(() => {
    if (!item?.TrabajadorId) return null;
    const id = item.TrabajadorId._id || item.TrabajadorId;
    return trabajadores.find(t => t._id === id);
  }, [item?.TrabajadorId, trabajadores]);

  // Resolvemos el último trabajador histórico que devolvió este equipo (si aplica)
  const ultimoTrabajador = useMemo(() => {
    if (!item?.ultimoTrabajadorId) return null;
    const id = item.ultimoTrabajadorId._id || item.ultimoTrabajadorId;
    return trabajadores.find(t => t._id === id);
  }, [item?.ultimoTrabajadorId, trabajadores]);

  // Relación de equipamiento completo del portador activo
  const equipamientoCompletoTrabajador = useMemo(() => {
    if (!item?.TrabajadorId) return [];
    const idTrabajador = item.TrabajadorId._id || item.TrabajadorId;
    return materiales.filter(m => {
      const idAsig = m.TrabajadorId?._id || m.TrabajadorId;
      return idAsig === idTrabajador;
    });
  }, [item?.TrabajadorId, materiales]);

  // Limpieza de campos internos para visualización de ficha técnica base
  const camposLimpiosBBDD = useMemo(() => {
    const ignorarCampos = ['_id', 'id', 'createdAt', 'updatedAt', '__v', 'TrabajadorId', 'ultimoTrabajadorId', 'telefonoId'];
    return Object.entries(item || {}).filter(([key]) => !ignorarCampos.includes(key));
  }, [item]);

  // Generador Dinámico de Documentación Contractual por flujo binario directo GET
  const handleAccionDocumento = async (tipoActa) => {
    if (!seleccionados || seleccionados.length === 0) {
      alert('Por favor, selecciona al menos un material para poder generar el acta correspondiente.');
      return;
    }

    setProcesandoPdf(true);
    try {
      const idMaterialBase = item._id || item.id;

      const pdfBlob = await descargarActaMaterial(idMaterialBase, tipoActa, seleccionados);

      const blob = new Blob([pdfBlob], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      
      const operarioActivo = trabajadorAsignado || ultimoTrabajador;

      // 2. Formateamos su nombre de manera segura (si no hay ninguno, pondrá 'ALMACEN')
      const nombreTrabajador = operarioActivo 
        ? `${operarioActivo.nombre || ''}_${operarioActivo.apellidos || ''}`
            .toUpperCase()
            .trim()
            .replace(/[- ]/g, '_')
        : 'ALMACEN';

      // 3. Sanitizamos los datos del material actual de forma segura contra nulos
      const marcaLimpia = (item?.marca || 'GENERICO').toUpperCase().trim();
      const modeloLimpio = (item?.modelo || 'EQUIPO').toUpperCase().trim();

      // 4. Asignamos el sufijo condicional y montamos el nombre final del archivo
      const sufijoArchivo = seleccionados.length > 1 ? 'MATERIAL' : `${marcaLimpia}_${modeloLimpio}`;
      link.download = `ACTA_${tipoActa}_${sufijoArchivo}_${nombreTrabajador}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`📄 [ACTA DE ${tipoActa}] generada con éxito para los (${seleccionados.length}) materiales seleccionados.`);
      
      if (refreshGlobalData) refreshGlobalData();
    } catch (err) {
      console.error('Error al intentar descargar el acta filtrada:', err);
      if (err.status === 401) {
        alert('Sesión expirada o no autorizada. Por favor, vuelve a iniciar sesión en el ERP.');
      } else {
        alert('Error en el servicio de procesamiento de documentación del servidor.');
      }
    } finally {
      setProcesandoPdf(false);
    }
  };

  const toggleMaterial = (id) => {
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 🔒 Este return condicional debe ir DESPUÉS de declarar todos los hooks:
  // los hooks de React deben llamarse siempre en el mismo orden en cada
  // renderizado. Si fuera antes, React lanzaría "Rendered fewer/more hooks
  // than during the previous render" al abrir/cerrar el modal.
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl flex flex-col max-h-[85vh]">
        
        {/* Cabecera */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
          <div>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider">{item.tipo || 'Activo Técnico'}</span>
            <h3 className="text-base font-black text-slate-800 mt-1">{item.marca} {item.modelo}</h3>
          </div>
          <button onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-600">✕ Cerrar</button>
        </div>

        {/* Sistema de Pestañas */}
        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-bold">
          <button onClick={() => setActiveTab('expediente')} className={`flex-1 py-3 text-center border-b-2 transition-all ${activeTab === 'expediente' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>📋 Ficha Técnica Base</button>
          <button onClick={() => setActiveTab('seguridad')} className={`flex-1 py-3 text-center border-b-2 transition-all ${activeTab === 'seguridad' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>🛡️ Documentos y Seguridad</button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[55vh] space-y-4">
          {activeTab === 'expediente' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {camposLimpiosBBDD.map(([clave, valor]) => (
                <div key={clave} className="bg-slate-50/70 p-3 rounded-xl border border-slate-100/80">
                  <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-0.5">{clave}</span>
                  <span className="text-xs font-bold text-slate-700">{valor === true ? 'Sí' : valor === false ? 'No' : String(valor || 'N/A')}</span>
                </div>
              ))}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100/80 sm:col-span-2">
                <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-0.5">Asignado Actualmente A:</span>
                <span className="text-xs font-black text-indigo-600">{trabajadorAsignado ? `👤 ${trabajadorAsignado.nombre} ${trabajadorAsignado.apellidos}` : '🏢 Disponible en Almacén Central'}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* CASO A: El hardware está asignado activamente */}
              {trabajadorAsignado && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/60 space-y-1">
                    <h4 className="text-xs font-black text-indigo-900 uppercase flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Expedición Contractual Combinada</h4>
                    <p className="text-[11px] text-indigo-700/80 font-medium">Marque los activos informáticos abajo para agregarlos o quitarlos del borrador del documento PDF dinámico.</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-600 uppercase flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-slate-400" /> Inventario Colectivo Vinculado ({trabajadorAsignado.nombre})</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
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

                    {/* Botones de acción unificados finales */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
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
                </div>
              )}

              {/* CASO B: El material está disponible pero tiene historial de devolución reciente */}
              {!trabajadorAsignado && ultimoTrabajador && (
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2">
                  <h4 className="text-xs font-black text-emerald-900 uppercase flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 text-emerald-600" /> MATERIAL RECIENTEMENTE DEVUELTO</h4>
                  <p className="text-[11px] text-emerald-700/90 font-medium">
                    Este activo acaba de retornar a Almacén. Fue entregado previamente por <strong>{ultimoTrabajador.nombre} {ultimoTrabajador.apellidos}</strong>.
                  </p>
                  <div className="pt-2">
                    <button 
                      onClick={() => handleAccionDocumento('DEVOLUCION')} 
                      disabled={procesandoPdf || seleccionados.length === 0} 
                      className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      <Download size={14} /> Generar Acta de Devolución Oficial ({ultimoTrabajador.nombre})
                    </button>
                  </div>
                </div>
              )}

              {/* CASO C: En Almacén sin historial de asignación cargado */}
              {!trabajadorAsignado && !ultimoTrabajador && (
                <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  El activo no registra ninguna vinculación contractual actual ni reciente. Asigne un operario activo desde el formulario de edición para habilitar los flujos de impresión legal.
                </div>
              )}

            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-md">Cerrar Expediente</button>
        </div>

      </div>
    </div>
  );
};

export default ViewMaterialModal;