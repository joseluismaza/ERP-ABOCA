import React, { useEffect, useMemo } from 'react';
import useForm from '../hooks/useForm';
import { updateMaterial } from '../services/materialService';

const EditMaterialModal = ({ isOpen, onClose, material, onUpdated, trabajadores = [], telefonos = [] }) => {
  const [values, handleChange, resetForm, setValues] = useForm({
    tipo: 'Portátil', marca: '', modelo: '', sn: '', imei: '', pn: '',
    TrabajadorId: '', telefonoId: '', esRenting: false, fechaEntregaOficina: '', 
    duracionRenting: '24', comentarios: '', estado: 'Disponible',
    fechaEntregaTrabajador: '', fechaDevolucionTrabajador: '', fechaDevolucionRenting: '',
    nContrato: '', devueltoRenting: false, nDenuncia: '', fechaRobo: ''
  });

  const trabajadoresPermitidos = useMemo(() => {
    return trabajadores
      .filter(t => t.estado === 'Activo' || t.estado === 'Pendiente de alta')
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [trabajadores]);

  useEffect(() => {
    if (material) {
      const parseFecha = (f) => f ? f.split('T')[0] : '';
      setValues({
        tipo: material.tipo || 'Portátil', 
        marca: material.marca || '', 
        modelo: material.modelo || '',
        sn: material.sn || '', 
        imei: material.imei || '', 
        pn: material.pn || '',
        TrabajadorId: material.TrabajadorId?._id || material.TrabajadorId || '', 
        telefonoId: material.telefonoId?._id || material.telefonoId || '', 
        esRenting: material.esRenting || false,
        fechaEntregaOficina: parseFecha(material.fechaEntregaOficina), 
        duracionRenting: material.duracionRenting || '36',
        fechaDevolucionRenting: parseFecha(material.fechaDevolucionRenting),
        comentarios: material.comentarios || '',
        estado: material.estado || 'Disponible',
        fechaEntregaTrabajador: parseFecha(material.fechaEntregaTrabajador),
        fechaDevolucionTrabajador: parseFecha(material.fechaDevolucionTrabajador),
        nContrato: material.nContrato || '',
        devueltoRenting: material.devueltoRenting || false,
        nDenuncia: material.nDenuncia || '',
        fechaRobo: parseFecha(material.fechaRobo)
      });
    }
  }, [material, setValues]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🛡️ SANEAMIENTO DE PAYLOAD: Convertimos las cadenas vacías en valores null válidos para MongoDB
    const payloadFinal = {
      ...values,
      // Si está vacío, guardamos null para desvincular al trabajador en el Back
      TrabajadorId: values.TrabajadorId && values.TrabajadorId !== "" ? values.TrabajadorId : null,
      
      // 🔌 CORRECCIÓN DEL BUG: Si está vacío, guardamos null para liberar la tarjeta SIM
      telefonoId: values.telefonoId && values.telefonoId !== "" ? values.telefonoId : null,
      
      // Mantenemos la coherencia del estado operativo
      estado: values.TrabajadorId && values.TrabajadorId !== "" ? 'Asignado' : values.estado
    };

    try {
      // Enviamos el objeto completamente limpio de strings vacíos en sus IDs
      await updateMaterial(material._id || material.id, payloadFinal);
      onUpdated();
      onClose();
    } catch (err) {
      alert(err.message || 'Error al actualizar el material.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white w-full max-w-2xl rounded-3xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-black text-slate-800">Modificar Ficha Completa de Activo</h3>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Ficha Base */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Tipo de Activo</label>
            <select name="tipo" value={values.tipo} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white">
              <option value="Portátil">Portátil</option><option value="Móvil">Móvil</option><option value="Tablet">Tablet</option>
              <option value="Monitor">Monitor</option><option value="Teclado">Teclado</option><option value="Ratón">Ratón</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Estado Operativo</label>
            <select name="estado" value={values.estado} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white">
              <option value="Disponible">Disponible</option><option value="Asignado">Asignado</option>
              <option value="Almacén">Almacén</option><option value="Comprado">Comprado</option><option value="Robado">Robado</option>
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

          {/* Identificadores Técnicos */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Número de Serie (S/N)</label>
            <input type="text" name="sn" value={values.sn} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">IMEI (Smartphones/Tablets)</label>
            <input type="text" name="imei" value={values.imei} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Part Number (P/N)</label>
            <input type="text" name="pn" value={values.pn} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Línea Telefónica Asociada</label>
            <select name="telefonoId" value={values.telefonoId} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white">
              <option value="">Sin tarjeta SIM vinculada</option>
              {telefonos.map(tel => <option key={tel._id} value={tel._id}>{tel.numeroTelefono}</option>)}
            </select>
          </div>

          {/* Asignación y Fechas */}
          <div className="flex flex-col md:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-3">
            <div className="flex flex-col">
              <label className="text-[11px] font-black text-indigo-600 uppercase mb-1">Asignar Custodia a Empleado</label>
              <select name="TrabajadorId" value={values.TrabajadorId} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white">
                <option value="">Depósito Libre en Almacén Central (Disponible)</option>
                {trabajadoresPermitidos.map(t => <option key={t._id} value={t._id}>{t.nombre} {t.apellidos}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha Entrega a Trabajador</label>
                <input type="date" name="fechaEntregaTrabajador" value={values.fechaEntregaTrabajador} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha Última Devolución</label>
                <input type="date" name="fechaDevolucionTrabajador" value={values.fechaDevolucionTrabajador} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white" />
              </div>
            </div>
          </div>

          {/* Sección Contrato / Renting */}
          <div className="md:col-span-2 border-t border-slate-100 pt-2">
            <div className="flex items-center gap-2 py-1">
              <input type="checkbox" name="esRenting" checked={values.esRenting} onChange={handleChange} id="edit-renting" className="w-4 h-4 text-indigo-600 border-slate-300 rounded" />
              <label htmlFor="edit-renting" className="text-xs font-bold text-slate-700 cursor-pointer">Activo bajo Renting Corporativo</label>
            </div>
          </div>

          {values.esRenting && (
            <>
              <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Nº Contrato Renting</label>
                <input type="text" name="nContrato" value={values.nContrato} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium" /></div>
              <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Meses Duración</label>
                <select name="duracionRenting" value={values.duracionRenting} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white">
                  <option value="24">24 meses</option><option value="36">36 meses</option><option value="48">48 meses</option>
                </select></div>
              <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Fecha Adquisición / Oficina</label>
                <input type="date" name="fechaEntregaOficina" value={values.fechaEntregaOficina} onChange={handleChange} className="border border-slate-200 rounded-lg p-2 text-xs font-medium" /></div>
              <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Vencimiento del Renting</label>
                <input type="date" name="fechaDevolucionRenting" value={values.fechaDevolucionRenting} readOnly className="border border-slate-200 bg-slate-50 rounded-lg p-2 text-xs font-medium text-slate-400 cursor-not-allowed" /></div>
              <div className="flex items-center gap-2 md:col-span-2 py-1">
                <input type="checkbox" name="devueltoRenting" checked={values.devueltoRenting} onChange={handleChange} id="edit-devuelto-renting" className="w-4 h-4 text-amber-600 border-slate-300 rounded" />
                <label htmlFor="edit-devuelto-renting" className="text-xs font-bold text-slate-700 cursor-pointer">Dispositivo ya devuelto formalmente a la proveedora de Renting</label>
              </div>
            </>
          )}

          {/* Sección de Siniestros / Robos */}
          {values.estado === 'Robado' && (
            <div className="md:col-span-2 bg-rose-50/50 p-3 rounded-xl border border-rose-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col"><label className="text-[11px] font-bold text-rose-700 uppercase mb-1">Número de Denuncia policial</label>
                <input type="text" name="nDenuncia" value={values.nDenuncia} onChange={handleChange} className="border border-rose-200 rounded-lg p-2 text-xs font-medium bg-white focus:ring-rose-400" /></div>
              <div className="flex flex-col"><label className="text-[11px] font-bold text-rose-700 uppercase mb-1">Fecha del Suceso</label>
                <input type="date" name="fechaRobo" value={values.fechaRobo} onChange={handleChange} className="border border-rose-200 rounded-lg p-2 text-xs font-medium bg-white focus:ring-rose-400" /></div>
            </div>
          )}

          <div className="md:col-span-2 flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Comentarios / Notas Técnicas</label>
            <textarea name="comentarios" value={values.comentarios} onChange={handleChange} rows="2" className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>
        </div>
        
        <div className="bg-slate-50 px-6 py-4 rounded-b-3xl flex justify-end gap-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-xs">Guardar Cambios</button>
        </div>
      </form>
    </div>
  );
};

export default EditMaterialModal;