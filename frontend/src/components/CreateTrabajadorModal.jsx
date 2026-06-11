// frontend/src/components/CreateTrabajadorModal.jsx
import React, { useState } from 'react';
import { createTrabajador } from '../services/trabajadorService'; // Ajusta la ruta a tu API

// Valores por defecto del formulario, extraídos a una función para poder
// "resetear" el formulario tras un alta exitosa con los mismos valores
// iniciales (incluida la fecha de alta = hoy en ese momento).
const getInitialFormData = () => ({
  nombre: '',
  apellidos: '',
  dni: '',
  fechaNacimiento: '',
  genero: '',
  estado: 'Pendiente de alta',
  matriculaSAP: '',
  cargo: '',
  agente: '',
  codigoZona: '',
  zona: '',
  calendario: 'Estándar',
  fechaAlta: new Date().toISOString().split('T')[0], // Por defecto hoy
  fechaBaja: '',
  nContable: '',
  activo: true,
  emailAboca: '',
  username: '',
  password: '',
  appleID: '',
  passwordApple: '',
  codComercial: '',
  agentComercial: '',
  codMedico: '',
  agentMedico: '',
  telefono: '',
  poblacion: '',
  domicilio: ''
});

const CreateTrabajadorModal = ({ isOpen, onClose, onCreated }) => {
  // Estados de visibilidad para las contraseñas iniciales
  const [showPass, setShowPass] = useState(false);
  const [showApplePass, setShowApplePass] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estado inicial con los valores por defecto del esquema
  const [formData, setFormData] = useState(getInitialFormData);

  // 🔒 Este return condicional debe ir DESPUÉS de declarar todos los hooks:
  // los hooks de React deben llamarse siempre en el mismo orden en cada
  // renderizado. Si fuera antes, React lanzaría "Rendered fewer/more hooks
  // than during the previous render" al abrir/cerrar el modal.
  if (!isOpen) return null;

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
      // Enviamos el payload completo al backend
      await createTrabajador(formData);
      if (onCreated) await onCreated();
      onClose();
      
      // Limpiamos el formulario tras un alta exitosa
      setFormData(getInitialFormData());
    } catch (err) {
      setErrorMsg(err.message || 'Error al procesar el alta del nuevo trabajador.');
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
            <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600 block mb-1">Operaciones de RRHH</span>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">🎒 Registrar Nuevo Colaborador</h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full border border-slate-200 shadow-sm transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* GRUPO 1: Identificación e Información Personal*/}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">👤 Identidad Primaria</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Nombre *</label>
                <input required type="text" name="nombre" value={formData.nombre || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Apellidos *</label>
                <input required type="text" name="apellidos" value={formData.apellidos || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">DNI / NIE *</label>
                <input required type="text" name="dni" value={formData.dni || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl font-mono focus:outline-none" />
              </div>
              
              {/* NUEVO SELECTOR DE GÉNERO */}
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
                <label className="font-semibold text-slate-500">Fecha Nacimiento</label>
                <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento || ''} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl focus:outline-none" />
              </div>
              <div className="sm:col-span-3 flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Estado Inicial</label>
                <select name="estado" value={formData.estado || 'Pendiente de alta'} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl font-bold bg-slate-50 focus:outline-none">
                  <option value="Pendiente de alta">Pendiente de alta</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          {/* GRUPO 2: Parámetros Organizacionales */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">💼 Estructura y Empresa</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Matrícula SAP</label>
                <input type="text" name="matriculaSAP" value={formData.matriculaSAP} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl font-mono focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Cargo / Puesto</label>
                <input type="text" name="cargo" value={formData.cargo} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Agente</label>
                <input type="text" name="agente" value={formData.agente} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Código Zona</label>
                <input type="text" name="codigoZona" value={formData.codigoZona} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl font-mono focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Zona / Delegación</label>
                <input type="text" name="zona" value={formData.zona} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Calendario Laboral</label>
                <input type="text" name="calendario" value={formData.calendario} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Fecha Alta Compañía</label>
                <input type="date" name="fechaAlta" value={formData.fechaAlta} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl text-emerald-700 font-bold focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Fecha Baja Compañía</label>
                <input type="date" name="fechaBaja" value={formData.fechaBaja} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl text-rose-700 font-bold focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Nº Contable</label>
                <input type="number" name="nContable" value={formData.nContable} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl font-mono focus:outline-none" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="create_activo" name="activo" checked={formData.activo} onChange={handleChange} className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
              <label htmlFor="create_activo" className="font-bold text-slate-700 select-none">Habilitar inmediatamente en sistemas (`activo` true)</label>
            </div>
          </div>

          {/* GRUPO 3: Credenciales del Sistema */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">🔐 Credenciales e Infraestructura informática</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              
              {/* Aboca */}
              <div className="space-y-3">
                <p className="font-bold text-indigo-600 border-b border-slate-200 pb-0.5 text-[11px]">💻 Cuenta Corporativa Aboca</p>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-slate-500">Email Corporativo</label>
                  <input type="email" name="emailAboca" value={formData.emailAboca} onChange={handleChange} placeholder="usuario@aboca.es" className="p-2 border border-slate-200 rounded-xl bg-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-slate-500">Username</label>
                  <input type="text" name="username" value={formData.username} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-white font-mono focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-slate-500">Contraseña Inicial</label>
                  <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2">
                    <input type={showPass ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Contraseña segura..." className="w-full p-1.5 font-mono bg-transparent focus:outline-none" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="p-1 text-slate-400 hover:text-indigo-600">👁️</button>
                  </div>
                </div>
              </div>

              {/* Apple */}
              <div className="space-y-3">
                <p className="font-bold text-amber-600 border-b border-slate-200 pb-0.5 text-[11px]">🍏 Asignación ID Apple</p>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-slate-500">Apple ID Email</label>
                  <input type="email" name="appleID" value={formData.appleID} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl bg-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-slate-500">Contraseña Cuenta Apple</label>
                  <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2">
                    <input type={showApplePass ? "text" : "password"} name="passwordApple" value={formData.passwordApple} onChange={handleChange} className="w-full p-1.5 font-mono bg-transparent focus:outline-none" />
                    <button type="button" onClick={() => setShowApplePass(!showApplePass)} className="p-1 text-slate-400 hover:text-amber-600">👁️</button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* GRUPO 4: Red Médica y Comercial */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">🩺 Redes de Venta / Canal Médico</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Cód. Comercial</label>
                <input type="text" name="codComercial" value={formData.codComercial} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl font-mono focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Agente Comercial</label>
                <input type="text" name="agentComercial" value={formData.agentComercial} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Cód. Médico</label>
                <input type="text" name="codMedico" value={formData.codMedico} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl font-mono focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Agente Médico</label>
                <input type="text" name="agentMedico" value={formData.agentMedico} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl focus:outline-none" />
              </div>
            </div>
          </div>

          {/* GRUPO 5: Contacto y Localización */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">📍 Localización y Datos de Contacto</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Teléfono Corporativo / Personal</label>
                <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Ej: +34 600 000 000" className="p-2 border border-slate-200 rounded-xl font-mono focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Población / Provincia</label>
                <input type="text" name="poblacion" value={formData.poblacion} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Domicilio Completo</label>
                <input type="text" name="domicilio" value={formData.domicilio} onChange={handleChange} className="p-2 border border-slate-200 rounded-xl focus:outline-none" />
              </div>
            </div>
          </div>

        </div>

        {/* Pie de Página / Botones */}
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
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-100"
          >
            {submitting ? 'Procesando Alta...' : '🚀 Dar de Alta Trabajador'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default CreateTrabajadorModal;