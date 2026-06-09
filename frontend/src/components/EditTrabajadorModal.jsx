// frontend/src/components/EditTrabajadorModal.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Ajusta la ruta a tu contexto de autenticación
import { updateTrabajador } from '../services/trabajadorService'; // Ajusta la ruta a tu servicio de API

const EditTrabajadorModal = ({ isOpen, onClose, trabajador, onUpdated }) => {
  if (!isOpen || !trabajador) return null;

  const { user } = useAuth() || {};
  const isAdmin = user?.rol === 'admin' || user?.isAdmin === true;

  // Estados de visibilidad para contraseñas
  const [showPass, setShowPass] = useState(false);
  const [showApplePass, setShowApplePass] = useState(false);
  
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Helper para convertir fechas ISO en formato YYYY-MM-DD compatible con <input type="date" />
  const formatInputDate = (dateRaw) => {
    if (!dateRaw) return '';
    const d = new Date(dateRaw);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  // Carga inicial y mapeo de datos del trabajador seleccionado al estado local
  useEffect(() => {
    setFormData({
      ...trabajador,
      fechaNacimiento: formatInputDate(trabajador.fechaNacimiento),
      fechaAlta: formatInputDate(trabajador.fechaAlta),
      fechaBaja: formatInputDate(trabajador.fechaBaja),
    });
    setErrorMsg('');
  }, [trabajador]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    
    try {
      // Forzamos que 'id' y '_id' viajen en el objeto enviado al backend
      const payload = {
        ...formData,
        id: trabajador.id,   // Código de empleado original (ej: "1000003415" o el que tenga)
        _id: trabajador._id // ID nativo de MongoDB
      };

      await updateTrabajador(trabajador._id || trabajador.id, payload);
      
      if (onUpdated) await onUpdated();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error crítico al guardar los cambios del colaborador.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
      <form 
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        
        {/* Cabecera */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600 block mb-1">Modificar Expediente</span>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              Ficha: {trabajador.nombre} {trabajador.apellidos}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full border border-slate-200 shadow-sm transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del Formulario con scroll - Excluye el campo 'id' */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* GRUPO 1: Información Personal Primaria */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">👤 Información Personal</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Nombre *</label>
                <input required type="text" name="nombre" value={formData.nombre || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Apellidos *</label>
                <input required type="text" name="apellidos" value={formData.apellidos || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">DNI / NIE *</label>
                <input required type="text" name="dni" value={formData.dni || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-800 font-mono font-bold focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Fecha de Nacimiento</label>
                <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Género</label>
                <select 
                  name="genero" 
                  value={formData.genero || ''} 
                  onChange={handleChange} 
                  className="p-2 border border-slate-200 rounded-xl bg-white focus:outline-none font-medium"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Estado del Trabajador</label>
                <select name="estado" value={formData.estado || 'Pendiente de alta'} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-800 font-bold focus:outline-none">
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="De Baja">De Baja</option>
                  <option value="Pendiente de alta">Pendiente de alta</option>
                </select>
              </div>
            </div>
          </div>

          {/* GRUPO 2: Estructura y Parámetros Laborales */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">💼 Estructura Laboral</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Matrícula SAP</label>
                <input type="text" name="matriculaSAP" value={formData.matriculaSAP || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 font-mono focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Cargo / Puesto</label>
                <input type="text" name="cargo" value={formData.cargo || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-semibold focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Agente</label>
                <input type="text" name="agente" value={formData.agente || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Código Zona</label>
                <input type="text" name="codigoZona" value={formData.codigoZona || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 font-mono focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Zona / Delegación</label>
                <input type="text" name="zona" value={formData.zona || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-semibold focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Calendario Local</label>
                <input type="text" name="calendario" value={formData.calendario || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Fecha Alta</label>
                <input type="date" name="fechaAlta" value={formData.fechaAlta || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-emerald-700 font-bold focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Fecha Baja</label>
                <input type="date" name="fechaBaja" value={formData.fechaBaja || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-rose-700 font-bold focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Nº Contable</label>
                <input type="number" name="nContable" value={formData.nContable || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 font-mono focus:outline-none" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="activo" name="activo" checked={!!formData.activo} onChange={handleChange} className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
              <label htmlFor="activo" className="font-bold text-slate-700 select-none">Habilitar Check de Operatividad General (`activo` true/false)</label>
            </div>
          </div>

          {/* GRUPO 3: Credenciales de Sistemas (Edición restringida de contraseñas) */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">🔐 Credenciales y Sistemas Corporativos</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              
              {/* Entorno Aboca */}
              <div className="space-y-3">
                <p className="font-bold text-indigo-600 border-b border-slate-200 pb-0.5 text-[11px]">💻 Cuenta ERP / Mail Aboca</p>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-slate-500">Email Aboca</label>
                  <input type="email" name="emailAboca" value={formData.emailAboca || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-slate-500">Username</label>
                  <input type="text" name="username" value={formData.username || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-white font-mono focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-slate-500">Contraseña Corporativa</label>
                  <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2">
                    <input 
                      type={showPass && isAdmin ? "text" : "password"} 
                      name="password" 
                      disabled={!isAdmin}
                      value={formData.password || ''} 
                      onChange={handleChange} 
                      placeholder={isAdmin ? "Establecer clave..." : "🔑 Acceso restringido"}
                      className="w-full p-1.5 font-mono bg-transparent focus:outline-none disabled:opacity-60" 
                    />
                    {isAdmin && (
                      <button type="button" onClick={() => setShowPass(!showPass)} className="p-1 text-slate-400 hover:text-indigo-600">👁️</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Entorno Apple */}
              <div className="space-y-3">
                <p className="font-bold text-amber-600 border-b border-slate-200 pb-0.5 text-[11px]">🍏 Cuenta Gestión Apple</p>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-slate-500">Apple ID</label>
                  <input type="email" name="appleID" value={formData.appleID || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-slate-500">Contraseña Cuenta Apple</label>
                  <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2">
                    <input 
                      type={showApplePass && isAdmin ? "text" : "password"} 
                      name="passwordApple" 
                      disabled={!isAdmin}
                      value={formData.passwordApple || ''} 
                      onChange={handleChange} 
                      placeholder={isAdmin ? "Establecer clave Apple..." : "🔑 Acceso restringido"}
                      className="w-full p-1.5 font-mono bg-transparent focus:outline-none disabled:opacity-60" 
                    />
                    {isAdmin && (
                      <button type="button" onClick={() => setShowApplePass(!showApplePass)} className="p-1 text-slate-400 hover:text-amber-600">👁️</button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* GRUPO 4: Redes Médicas y Comerciales */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">🩺 Red Médica y Canales Comerciales</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Cód. Comercial</label>
                <input type="text" name="codComercial" value={formData.codComercial || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 font-mono focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Agente Comercial</label>
                <input type="text" name="agentComercial" value={formData.agentComercial || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Cód. Médico</label>
                <input type="text" name="codMedico" value={formData.codMedico || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 font-mono focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Agente Médico</label>
                <input type="text" name="agentMedico" value={formData.agentMedico || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* GRUPO 5: Localización Territorial */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">📍 Localización Territorial</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Población / Provincia</label>
                <input type="text" name="poblacion" value={formData.poblacion || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none" />
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Domicilio Fiscal / Particular</label>
                <input type="text" name="domicilio" value={formData.domicilio || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none" />
              </div>
            </div>
          </div>

        </div>

        {/* Botonera de Acción */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-2">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-bold transition-all"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1"
          >
            {submitting ? 'Guardando Cambios...' : '💾 Actualizar Colaborador'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default EditTrabajadorModal;