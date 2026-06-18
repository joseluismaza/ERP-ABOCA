import React, { useEffect, useMemo, useState, useRef } from 'react';
import useForm from '../hooks/useForm';
import { updateMaterial } from '../services/materialService';
import { createTelefono } from '../services/telefonoService';
import { useNotifications } from '../contexts/NotificationContext';

// Tipos de activo que pueden tener línea telefónica asociada
const TIPOS_CON_LINEA = ['Móvil', 'Tablet'];

const EditMaterialModal = ({ isOpen, onClose, material, onUpdated, trabajadores = [], telefonos = [] }) => {
  const [values, handleChange, resetForm, setValues] = useForm({
    tipo: 'Portátil', marca: '', modelo: '', sn: '', imei: '', pn: '',
    TrabajadorId: '', telefonoId: '', esRenting: false, fechaEntregaOficina: '',
    duracionRenting: '24', comentarios: '', estado: 'Disponible',
    fechaEntregaTrabajador: '', fechaDevolucionTrabajador: '',
    nContrato: '', devueltoRenting: false, nDenuncia: '', fechaRobo: ''
  });

  // Estado local del buscador de línea telefónica
  const [busquedaTelefono, setBusquedaTelefono] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const inputBusquedaRef = useRef(null);
  const { addNotification } = useNotifications();

  const trabajadoresPermitidos = useMemo(() => {
    return trabajadores
      .filter(t => t.estado === 'Activo' || t.estado === 'Pendiente de alta')
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [trabajadores]);

  // INPUTS: Lista de teléfonos y texto escrito en el buscador
  // PROCESO: Filtra por coincidencia de substring en numeroTelefono; devuelve vacío si no hay texto
  // OUTPUTS: Array de teléfonos coincidentes para mostrar en el dropdown
  const telefonosFiltrados = useMemo(() => {
    if (!busquedaTelefono.trim()) return [];
    return telefonos.filter(t =>
      t.numeroTelefono && t.numeroTelefono.includes(busquedaTelefono.trim())
    );
  }, [telefonos, busquedaTelefono]);

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

      // Inicializamos el buscador con el número del teléfono ya vinculado al material
      const telId = material.telefonoId?._id || material.telefonoId;
      if (telId) {
        const telEncontrado = telefonos.find(t => t._id === telId);
        setBusquedaTelefono(telEncontrado?.numeroTelefono || '');
      } else {
        setBusquedaTelefono('');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material, setValues]);

  if (!isOpen) return null;

  const esTipoConLinea = TIPOS_CON_LINEA.includes(values.tipo);

  // INPUTS: Evento de cambio en el selector de trabajador
  // PROCESO: Si el tipo es Móvil/Tablet, busca automáticamente si ese trabajador ya tiene
  //          un teléfono asignado en Teléfonos y pre-rellena el buscador
  // OUTPUTS: Actualiza TrabajadorId, telefonoId y busquedaTelefono en el estado del formulario
  const handleTrabajadorChange = (e) => {
    const nuevoTrabajadorId = e.target.value;

    if (!TIPOS_CON_LINEA.includes(values.tipo)) {
      handleChange(e);
      return;
    }

    if (nuevoTrabajadorId) {
      const telefonoDelTrabajador = telefonos.find(t =>
        (t.TrabajadorId?._id || t.TrabajadorId) === nuevoTrabajadorId
      );
      if (telefonoDelTrabajador) {
        setValues(prev => ({ ...prev, TrabajadorId: nuevoTrabajadorId, telefonoId: telefonoDelTrabajador._id }));
        setBusquedaTelefono(telefonoDelTrabajador.numeroTelefono);
      } else {
        setValues(prev => ({ ...prev, TrabajadorId: nuevoTrabajadorId, telefonoId: '' }));
        setBusquedaTelefono('');
      }
    } else {
      setValues(prev => ({ ...prev, TrabajadorId: '', telefonoId: '' }));
      setBusquedaTelefono('');
    }
  };

  // INPUTS: Texto escrito en el campo de búsqueda
  // PROCESO: Actualiza el texto; si se borra por completo, limpia también el telefonoId vinculado
  // OUTPUTS: Actualiza busquedaTelefono y condicionalmente values.telefonoId
  const handleBusquedaChange = (e) => {
    const texto = e.target.value;
    setBusquedaTelefono(texto);
    setMostrarDropdown(true);
    if (!texto.trim()) {
      setValues(prev => ({ ...prev, telefonoId: '' }));
    }
  };

  // INPUTS: Objeto telefono seleccionado del dropdown de resultados
  // PROCESO: Vincula el teléfono al formulario y cierra el dropdown
  // OUTPUTS: Actualiza values.telefonoId y busquedaTelefono con el número elegido
  const handleSeleccionarTelefono = (tel) => {
    setValues(prev => ({ ...prev, telefonoId: tel._id }));
    setBusquedaTelefono(tel.numeroTelefono);
    setMostrarDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let telefonoIdFinal = values.telefonoId;

    const trabajadorSeleccionado = values.TrabajadorId && values.TrabajadorId !== '';
    const numeroEscrito = busquedaTelefono.trim();
    const yaExisteEnListado = telefonos.some(t => t.numeroTelefono === numeroEscrito);

    // Caso 2: Móvil/Tablet + trabajador + número nuevo escrito → crear teléfono automáticamente
    if (esTipoConLinea && trabajadorSeleccionado && numeroEscrito && !telefonoIdFinal && !yaExisteEnListado) {
      try {
        const respuesta = await createTelefono({
          numeroTelefono: numeroEscrito,
          TrabajadorId: values.TrabajadorId,
          estado: 'Asignado'
        });
        telefonoIdFinal = respuesta.data?._id || respuesta._id;
        addNotification({
          type: 'info',
          message: `Línea ${numeroEscrito} creada y vinculada al dispositivo. Recuerda completar el resto de la información del teléfono (SIM, ICC, PIN...).`,
          timestamp: new Date().toLocaleString('es-ES'),
          id: `tel-nueva-${telefonoIdFinal || Date.now()}`
        });
      } catch (err) {
        alert('Error al crear la línea telefónica: ' + (err.message || ''));
        return;
      }
    }

    // 🛡️ SANEAMIENTO DE PAYLOAD: Convertimos las cadenas vacías en valores null válidos para MongoDB
    const payloadFinal = {
      ...values,
      // Si está vacío, guardamos null para desvincular al trabajador en el Back
      TrabajadorId: values.TrabajadorId && values.TrabajadorId !== '' ? values.TrabajadorId : null,
      // Si está vacío, guardamos null para liberar la tarjeta SIM
      telefonoId: telefonoIdFinal || null,
      // Mantenemos la coherencia del estado operativo
      estado: values.TrabajadorId && values.TrabajadorId !== '' ? 'Asignado' : values.estado
    };

    try {
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

          {/* Buscador de línea telefónica: solo visible para Móvil y Tablet */}
          {esTipoConLinea && (
            <div className="flex flex-col relative">
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-1">Línea Telefónica Asociada</label>
              <input
                ref={inputBusquedaRef}
                type="text"
                value={busquedaTelefono}
                onChange={handleBusquedaChange}
                onFocus={() => setMostrarDropdown(true)}
                onBlur={() => setTimeout(() => setMostrarDropdown(false), 150)}
                placeholder="Escribe el número para buscar..."
                className="border border-slate-200 rounded-lg p-2 text-xs font-medium"
              />
              {/* Indicador de línea ya vinculada */}
              {values.telefonoId && (
                <span className="mt-1 text-[10px] text-emerald-600 font-bold">✓ Línea vinculada</span>
              )}
              {/* Dropdown con las coincidencias */}
              {mostrarDropdown && telefonosFiltrados.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {telefonosFiltrados.map(tel => (
                    <li
                      key={tel._id}
                      onMouseDown={() => handleSeleccionarTelefono(tel)}
                      className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer flex justify-between items-center"
                    >
                      <span>{tel.numeroTelefono}</span>
                      {tel.TrabajadorId && (
                        <span className="text-[10px] text-slate-400">
                          {tel.TrabajadorId?.nombre || ''} {tel.TrabajadorId?.apellidos || ''}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {/* Aviso cuando el número escrito no existe: se creará al guardar */}
              {mostrarDropdown && busquedaTelefono.trim() && telefonosFiltrados.length === 0 && !values.telefonoId && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[10px] text-amber-700 font-semibold z-10">
                  Número no encontrado — se creará una nueva línea al guardar.
                </div>
              )}
            </div>
          )}

          {/* Asignación y Fechas */}
          <div className="flex flex-col md:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-3">
            <div className="flex flex-col">
              <label className="text-[11px] font-black text-indigo-600 uppercase mb-1">Asignar Custodia a Empleado</label>
              <select
                name="TrabajadorId"
                value={values.TrabajadorId}
                onChange={esTipoConLinea ? handleTrabajadorChange : handleChange}
                className="border border-slate-200 rounded-lg p-2 text-xs font-medium bg-white"
              >
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
