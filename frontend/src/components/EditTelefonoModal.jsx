// frontend/src/components/EditTelefonoModal.jsx
import React, { useEffect, useMemo } from 'react';
import useForm from '../hooks/useForm';
import { useGlobalData } from '../contexts/GlobalDataContext';
import { updateTelefono } from '../services/telefonoService';

const EditTelefonoModal = ({ isOpen, onClose, telefono, onUpdated }) => {
  const { trabajadores = [] } = useGlobalData() || {};

  const [values, handleChange, resetForm, setValues] = useForm({
    numeroTelefono: '', numeroInterno: '', icc: '',
    pin1: '', puk1: '', pin2: '', puk2: '',
    tipoSIM: 'eSIM', tipoDispositivo: '',
    estado: 'Disponible', TrabajadorId: ''
  });

  useEffect(() => {
    if (telefono) {
      // TrabajadorId puede llegar como objeto populado o como ID plano
      const trabId = telefono.TrabajadorId?._id || telefono.TrabajadorId || '';
      setValues({
        numeroTelefono:   telefono.numeroTelefono   || '',
        numeroInterno:    telefono.numeroInterno    || '',
        icc:              telefono.icc              || '',
        pin1:             telefono.pin1             || '',
        puk1:             telefono.puk1             || '',
        pin2:             telefono.pin2             || '',
        puk2:             telefono.puk2             || '',
        tipoSIM:          telefono.tipoSIM          || 'eSIM',
        tipoDispositivo:  telefono.tipoDispositivo  || '',
        estado:           telefono.estado           || '',
        TrabajadorId:     trabId
      });
    }
  }, [telefono, setValues]);

  if (!isOpen || !telefono) return null;

  const trabajadoresFiltradosYOrdenados = useMemo(() => {
    const actualId = telefono?.TrabajadorId?._id || telefono?.TrabajadorId || '';

    return trabajadores
      .filter(t => {
        // Un trabajador se incluye si está activo en la empresa...
        if (t.estado === 'Activo' || t.activo === true) return true;
        // ...O si es el operario que tiene asignada actualmente esta línea (Evita pérdidas de datos)
        if (actualId && String(t._id || t.id) === String(actualId)) return true;
        
        return false;
      })
      .sort((a, b) => {
        const nombreA = `${a.nombre} ${a.apellidos || ''}`.trim();
        const nombreB = `${b.nombre} ${b.apellidos || ''}`.trim();
        return nombreA.localeCompare(nombreB, 'es');
      });
  }, [trabajadores, telefono]);

  if (!isOpen || !telefono) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Si TrabajadorId queda vacío enviamos null para desvincular
      const payload = { ...values, TrabajadorId: values.TrabajadorId || null };
      await updateTelefono(telefono._id || telefono.id, payload);
      onUpdated();
      onClose();
    } catch (err) { alert(err.message || 'Error al modificar línea'); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">

        {/* Cabecera */}
        <div className="bg-indigo-600 px-5 py-3.5 flex justify-between items-center text-white shadow-sm">
          <h3 className="font-bold text-sm tracking-wide">Modificar Línea: {telefono.numeroTelefono}</h3>
          <button type="button" onClick={onClose} className="text-white hover:text-indigo-200 font-bold">✕</button>
        </div>

        {/* Cuerpo del formulario */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5">

          {/* Número de Teléfono */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">Número de Teléfono</label>
            <input type="text" name="numeroTelefono" value={values.numeroTelefono} onChange={handleChange} required
              className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>

          {/* Extensión Interna */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">Extensión Interna</label>
            <input type="text" name="numeroInterno" value={values.numeroInterno} onChange={handleChange}
              className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>

          {/* ICC */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">ICC Tarjeta SIM</label>
            <input type="text" name="icc" value={values.icc} onChange={handleChange}
              className="border border-slate-200 rounded-lg p-2 text-xs font-medium" />
          </div>

          {/* Formato SIM */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">Formato de SIM</label>
            <select name="tipoSIM" value={values.tipoSIM} onChange={handleChange}
              className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white">
              <option value="eSIM">eSIM</option>
              <option value="SIM Física">SIM Física</option>
            </select>
          </div>

          {/* PIN 1 */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">PIN 1</label>
            <input type="text" name="pin1" value={values.pin1} onChange={handleChange}
              className="border border-slate-200 rounded-lg p-2 text-xs font-mono" />
          </div>

          {/* PUK 1 */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">PUK 1</label>
            <input type="text" name="puk1" value={values.puk1} onChange={handleChange}
              className="border border-slate-200 rounded-lg p-2 text-xs font-mono" />
          </div>

          {/* PIN 2 */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">PIN 2</label>
            <input type="text" name="pin2" value={values.pin2} onChange={handleChange}
              className="border border-slate-200 rounded-lg p-2 text-xs font-mono" />
          </div>

          {/* PUK 2 */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">PUK 2</label>
            <input type="text" name="puk2" value={values.puk2} onChange={handleChange}
              className="border border-slate-200 rounded-lg p-2 text-xs font-mono" />
          </div>

          {/* Tipo de Dispositivo */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">Terminal / Dispositivo</label>
            <select name="tipoDispositivo" value={values.tipoDispositivo} onChange={handleChange}
              className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white">
              <option value="iPhone">📱 iPhone</option>
              <option value="iPad">🍏 iPad</option>
            </select>
          </div>

          {/* Estado de la Línea */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">Estado de la Línea</label>
            <select name="estado" value={values.estado} onChange={handleChange}
              className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white">
              <option value="Disponible">DISPONIBLE</option>
              <option value="Asignado">ASIGNADO</option>
            </select>
          </div>

          {/* Trabajador asignado — ocupa todo el ancho */}
          <div className="flex flex-col sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">Operario Asignado</label>
            <select name="TrabajadorId" value={values.TrabajadorId} onChange={handleChange}
              className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white">
              <option value="">— Sin asignar (Disponible en Almacén) —</option>
              {trabajadoresFiltradosYOrdenados.map(t => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.nombre} {t.apellidos || ''} {t.estado === 'Inactivo' || t.activo === false ? '⚠️ (INACTIVO)' : ''}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-white px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200">
            Cancelar
          </button>
          <button type="submit"
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">
            Aplicar Cambios
          </button>
        </div>

      </form>
    </div>
  );
};

export default EditTelefonoModal;