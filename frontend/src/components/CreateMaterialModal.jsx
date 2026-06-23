// frontend/src/components/CreateMaterialModal.jsx
import React, { useMemo } from 'react';
import useForm from '../hooks/useForm';
import { createMaterial } from '../services/materialService';

const CreateMaterialModal = ({ isOpen, onClose, onCreated, trabajadores = [] }) => {
  
  const [values, handleChange, resetForm] = useForm({
    tipo: 'Portátil', 
    marca: '', 
    modelo: '', 
    sn: '', 
    imei: '', 
    pn: '',
    TrabajadorId: '', 
    estado: 'Disponible', 
    esRenting: false, 
    fechaEntregaOficina: '', 
    duracionRenting: 36, // Tipo número según tu nuevo enum de Mongoose
    comentarios: '',
    nContrato: ''
  });

  // Filtra personal en estado 'Activo' o 'Pendiente de alta' ordenados alfabéticamente
  const trabajadoresPermitidos = useMemo(() => {
    return trabajadores
      .filter(t => t.estado === 'Activo' || t.estado === 'Pendiente de alta')
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [trabajadores]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Inyección de lógica matemática de estados según asignación antes de persistir
    const payloadFinal = {
      ...values,
      TrabajadorId: values.TrabajadorId || null,
      estado: values.TrabajadorId ? 'Asignado' : 'Disponible',
      duracionRenting: values.esRenting ? parseInt(values.duracionRenting, 10) : undefined
    };

    try {
      await createMaterial(payloadFinal);
      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      alert(err.message || 'Error al guardar el material.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white w-full max-w-2xl rounded-3xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-black text-slate-800">Alta de Nuevo Activo Tecnológico</h3>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Tipo de Activo</label>
            <select name="tipo" value={values.tipo} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white">
              <option value="Portátil">Portátil</option>
              <option value="Móvil">Móvil</option>
              <option value="Tablet">Tablet</option>
              <option value="Teclado">Teclado</option>
              <option value="Ratón">Ratón</option>
              <option value="Teclado/Ratón">Teclado/Ratón</option>
              <option value="Teclado/Funda + Lapiz">Teclado/Funda + Lapiz</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Marca</label>
            <input type="text" name="marca" value={values.marca} onChange={handleChange} required className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Modelo</label>
            <input type="text" name="modelo" value={values.modelo} onChange={handleChange} required className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Número de Serie (S/N)</label>
            <input type="text" name="sn" value={values.sn} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">IMEI (Si aplica)</label>
            <input type="text" name="imei" value={values.imei} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Part Number (P/N)</label>
            <input type="text" name="pn" value={values.pn} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Asignar a Personal Autorizado</label>
            <select name="TrabajadorId" value={values.TrabajadorId} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white">
              <option value="">Depósito en Almacén Central (Disponible)</option>
              {trabajadoresPermitidos.map(t => <option key={t._id} value={t._id}>{t.nombre} {t.apellidos}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Número de Contrato</label>
            <input type="text" name="nContrato" value={values.nContrato} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>

          <div className="md:col-span-2 flex items-center gap-2 py-2">
            <input type="checkbox" name="esRenting" checked={values.esRenting} onChange={handleChange} id="create-renting" className="w-4 h-4 text-indigo-600 border-slate-300 rounded" />
            <label htmlFor="create-renting" className="text-xs font-bold text-slate-700 cursor-pointer">Activo bajo Modalidad de Renting Corporativo</label>
          </div>

          {values.esRenting && (
            <>
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Fecha de Entrega Oficina</label>
                <input type="date" name="fechaEntregaOficina" value={values.fechaEntregaOficina} onChange={handleChange} required className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
              </div>
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Duración Renting (Meses)</label>
                <select name="duracionRenting" value={values.duracionRenting} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white">
                  <option value={24}>24 meses</option>
                  <option value={36}>36 meses</option>
                  <option value={48}>48 meses</option>
                </select>
              </div>
            </>
          )}

          <div className="md:col-span-2 flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Comentarios / Notas Técnicas</label>
            <textarea name="comentarios" value={values.comentarios} onChange={handleChange} rows="2" className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 rounded-b-3xl flex justify-end gap-2 border-t border-slate-100">
          <button type="button" onClick={() => { resetForm(); onClose(); }} className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-xs">Dar de Alta</button>
        </div>
      </form>
    </div>
  );
};

export default CreateMaterialModal;