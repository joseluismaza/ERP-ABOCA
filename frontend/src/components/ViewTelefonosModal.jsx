// frontend/src/components/ViewTelefonosModal.jsx
import React, { useState, useMemo } from 'react';
import { useGlobalData } from '../contexts/GlobalDataContext';
import axios from 'axios';
import { Shield, FileText, Download, KeyRound, Smartphone } from 'lucide-react';

const ViewTelefonosModal = ({ item, onClose }) => {
  if (!item) return null;

  const [activeTab, setActiveTab] = useState('expediente'); // 'expediente' o 'seguridad'
  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const { trabajadores = [], refreshGlobalData } = useGlobalData() || {};

  // Resolvemos el trabajador asignado activo actual usando la nueva relación del modelo
  const trabajadorAsignado = useMemo(() => {
    // 1. Capturamos cualquier posible vía de enlace (nueva o antigua)
    const referencia = item.TrabajadorId || item.asignadoA;
    if (!referencia) return null;

    // 2. CASO A: Si el backend ya hizo un .populate() y "referencia" es un objeto con nombre
    if (referencia && typeof referencia === 'object' && referencia.nombre) {
      return referencia; 
    }

    // 3. CASO B: Si "referencia" es solo el ID en texto plano, lo buscamos en el contexto
    const idBuscado = String(referencia._id || referencia);
    return trabajadores.find(t => String(t._id || t.id) === idBuscado);
  }, [item.TrabajadorId, item.asignadoA, trabajadores]);

  // Diccionario estético para formatear los campos puros de telefonía
  const mapeoCampos = {
    numeroTelefono: 'Número de Teléfono',
    numeroInterno: 'Extensión Interna',
    icc: 'ICC Tarjeta SIM (Nº Serie)',
    tipoSIM: 'Formato / Tipo SIM',
    tipoDispositivo: 'Terminal Movilidad',
    pin1: 'Código PIN 1',
    puk1: 'Código PUK 1',
    pin2: 'Código PIN 2',
    puk2: 'Código PUK 2',
    estado: 'Estado Operativo'
  };

  // Mapeamos los campos del registro excluyendo IDs y metadatos del sistema
  const camposFormateados = useMemo(() => {
    const ignorarCampos = ['_id', 'id', 'createdAt', 'updatedAt', '__v', 'TrabajadorId', 'asignadoA'];
    return Object.entries(item)
      .filter(([key]) => !ignorarCampos.includes(key))
      .map(([key, valor]) => ({
        label: mapeoCampos[key] || key,
        value: valor === true ? 'Sí' : valor === false ? 'No' : String(valor || 'N/A')
      }));
  }, [item]);

  // Descargador e Inyector del Llavero Maestro Cifrado (PDF con contraseña DNI)
  const handleDescargarLlaveroCifrado = async () => {
    if (!trabajadorAsignado) return;

    setProcesandoPdf(true);
    try {
      const idTrabajador = trabajadorAsignado._id || trabajadorAsignado.id;
      
      // Petición al backend que genera el PDFKit con el logo corporativo visible y buffer cerrado
      const respuesta = await axios.post(`/api/trabajador/${idTrabajador}/credenciales-lote`, {}, {
        responseType: 'blob'
      });

      const blob = new Blob([respuesta.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `LLAVERO_COMPLETO_${trabajadorAsignado.nombre.toUpperCase()}_${trabajadorAsignado.apellidos?.toUpperCase() || ''}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("⚠️ Error descargando credenciales:", err);
      alert('Error en el procesador de seguridad del servidor. Verifique los módulos de cifrado.');
    } finally {
      setProcesandoPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl flex flex-col max-h-[85vh]">
        
        {/* Cabecera Ficha de Línea */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
              <Smartphone size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Activo de Telecomunicaciones</span>
              <h3 className="text-base font-black text-slate-800 mt-0.5">Línea Móvil: {item.numeroTelefono}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">✕ Cerrar</button>
        </div>
        {/* Pestañas de navegación */}
        <div className="px-6 pt-4 flex gap-2 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('expediente')}
            className={`pb-2.5 px-1 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'expediente'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileText size={13} /> Expediente
          </button>
          <button
            onClick={() => setActiveTab('seguridad')}
            className={`pb-2.5 px-1 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'seguridad'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Shield size={13} /> Seguridad
          </button>
        </div>

        {/* Contenido Dinámico */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[55vh] space-y-4">
          {activeTab === 'expediente' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {camposFormateados.map(({ label, value }) => (
                  <div key={label} className="bg-slate-50/70 p-3 rounded-xl border border-slate-100/80">
                    <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-0.5">{label}</span>
                    <span className={`text-xs font-bold uppercase ${label.includes('PIN') || label.includes('PUK') ? 'font-mono text-slate-600 bg-slate-100/60 px-1 rounded' : 'text-slate-700'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100/80">
                <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-1">Operario Asignado en Activo:</span>
                {trabajadorAsignado ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-600">👤 {trabajadorAsignado.nombre} {trabajadorAsignado.apellidos}</span>
                    <span className="text-[10px] font-semibold text-slate-400 font-mono">DNI: {trabajadorAsignado.dni}</span>
                  </div>
                ) : (
                  <span className="text-xs font-black text-emerald-600">🏢 Disponible en Almacén Central (Listo para aprovisionamiento)</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {trabajadorAsignado ? (
                <div className="bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100/60 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl mt-0.5">
                      <KeyRound size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-indigo-900 uppercase">Expedición del Llavero Digital de Credenciales</h4>
                      <p className="text-[11px] text-indigo-700/90 font-medium mt-0.5 leading-relaxed">
                        Descargue el informe unificado con los 8 sistemas corporativos del trabajador. Por directiva de ciberseguridad, el archivo PDF se emite encriptado de forma nativa utilizando el DNI/NIE del operario (letras en mayúsculas, sin guiones ni espacios) como contraseña de apertura.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={handleDescargarLlaveroCifrado} 
                      disabled={procesandoPdf} 
                      className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <Download size={14} /> 
                      {procesandoPdf ? 'Encriptando y generando PDF...' : `Descargar Llavero Seguro (${trabajadorAsignado.nombre})`}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  La línea telefónica se encuentra libre en almacén. Vincule un trabajador activo desde el panel de edición de líneas para habilitar la generación de credenciales y descargas de seguridad.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-md">Cerrar Expediente</button>
        </div>

      </div>
    </div>
  );
};

export default ViewTelefonosModal;