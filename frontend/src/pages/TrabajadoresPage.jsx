// frontend/src/pages/TrabajadoresPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useGlobalData } from '../contexts/GlobalDataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { usePagination } from '../hooks/usePagination';
import { deleteTrabajador, exportarTrabajadoresExcel } from '../services/trabajadorService';
import CreateTrabajadorModal from '../components/CreateTrabajadorModal';
import EditTrabajadorModal from '../components/EditTrabajadorModal';
import ViewTrabajadorModal from '../components/ViewTrabajadorModal';

const TrabajadoresPage = () => {
  const globalData = useGlobalData() || {};
  const { trabajadores = [], telefonos = [], loading, error, refreshGlobalData } = globalData;
  const { activeIncident, clearActiveIncident } = useNotifications();

  // Estados de filtrado basados en el Schema de Mongoose
  const [filterQuery, setFilterQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos'); // 'Activo', 'Inactivo', 'De Baja', 'Pendiente de alta'
  const [filterCargo, setFilterCargo] = useState('todos');
  const [filterCodZona, setFilterCodZona] = useState('todos');
  const [filterZona, setFilterZona] = useState('todos');
  const [sortBy, setSortBy] = useState('reciente'); 

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTrabajador, setSelectedTrabajador] = useState(null);
  const [editingTrabajador, setEditingTrabajador] = useState(null);

  // Efecto para los incidentes activos compartidos por el contexto de notificaciones
  useEffect(() => {
    if (activeIncident && activeIncident.tipo === 'trabajador') {
      const match = trabajadores.find(t => t._id === activeIncident.id || t.id === activeIncident.id);
      if (match) {
        if (activeIncident.accion === 'editar') setEditingTrabajador(match);
        clearActiveIncident();
      }
    }
  }, [activeIncident, trabajadores, clearActiveIncident]);

  // Extracción automática de valores únicos para los Selects
  const uniqueCriterias = useMemo(() => {
    const cargos = new Set();
    const codZonas = new Set();
    const zonas = new Set();

    trabajadores.forEach(t => {
      if (t.cargo) cargos.add(t.cargo);
      if (t.codigoZona) codZonas.add(t.codigoZona);
      if (t.zona) zonas.add(t.zona);
    });

    return {
      cargos: Array.from(cargos).sort(),
      codZonas: Array.from(codZonas).sort(),
      zonas: Array.from(zonas).sort()
    };
  }, [trabajadores]);

  // Estadísticas calculadas del total de trabajadores
  const stats = useMemo(() => {
    const total = trabajadores.length;
    const activos = trabajadores.filter(t => t.estado?.toLowerCase() === 'activo').length;
    const baja = trabajadores.filter(t => t.estado?.toLowerCase() === 'de baja').length;
    const inactivos = trabajadores.filter(t => t.estado?.toLowerCase() === 'inactivo').length;
    const pendientes = trabajadores.filter(t => t.estado?.toLowerCase() === 'pendiente de alta').length;
    return { total, activos, baja, inactivos, pendientes };
  }, [trabajadores]);

  // Motor unificado de Filtrado y Ordenación
  const processedData = useMemo(() => {
    let result = [...trabajadores];

    // Texto General
    const q = filterQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(t => 
        t.nombre?.toLowerCase().includes(q) || 
        t.apellidos?.toLowerCase().includes(q) || 
        t.username?.toLowerCase().includes(q) ||
        t.emailAboca?.toLowerCase().includes(q)
      );
    }

    // Estado basado estrictamente en el string del Enum del Backend
    if (filterEstado !== 'todos') {
      result = result.filter(t => t.estado?.toLowerCase() === filterEstado.toLowerCase());
    }

    // Cargo
    if (filterCargo !== 'todos') {
      result = result.filter(t => t.cargo === filterCargo);
    }

    // Código de Zona
    if (filterCodZona !== 'todos') {
      result = result.filter(t => t.codigoZona === filterCodZona);
    }

    // Zona / Delegación
    if (filterZona !== 'todos') {
      result = result.filter(t => t.zona === filterZona);
    }

    // Ordenación por fecha de alta oficial (fallback a createdAt)
    result.sort((a, b) => {
      const fechaA = a.fechaAlta ? new Date(a.fechaAlta) : (a.createdAt ? new Date(a.createdAt) : new Date(0));
      const fechaB = b.fechaAlta ? new Date(b.fechaAlta) : (b.createdAt ? new Date(b.createdAt) : new Date(0));
      const nombreA = `${a.nombre || ''} ${a.apellidos || ''}`.toLowerCase();
      const nombreB = `${b.nombre || ''} ${b.apellidos || ''}`.toLowerCase();

      switch (sortBy) {
        case 'reciente': return fechaB - fechaA;
        case 'antiguo': return fechaA - fechaB;
        case 'az': return nombreA.localeCompare(nombreB);
        case 'za': return nombreB.localeCompare(nombreA);
        default: return 0;
      }
    });

    return result;
  }, [trabajadores, filterQuery, filterEstado, filterCargo, filterCodZona, filterZona, sortBy]);

  const { currentItems, currentPage, totalPages, nextPage, prevPage } = usePagination(processedData, 12);

  const handleExportarExcel = async () => {
    try {
      const data = await exportarTrabajadoresExcel();
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Listado_Trabajadores_ERP.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar el archivo Excel:", error);
      alert("No se ha podido exportar el listado. Revisa tus permisos de administrador.");
    }
  };

  const handleDelete = async (trabajador) => {
    const advertencia = `⚠️ ATENCIÓN: Esta acción es ABSOLUTAMENTE IRREVERSIBLE.\n\n` +
                        `¿Está seguro de que desea eliminar permanentemente al colaborador "${trabajador.nombre} ${trabajador.apellidos}"?\n\n` +
                        `Al proceder:\n` +
                        `• Todos los materiales asignados pasarán inmediatamente a estado 'Disponible'.\n` +
                        `• El sistema registrará en el historial: "Materiales y teléfonos liberados por eliminación del trabajador".`;
    
    if (window.confirm(advertencia)) {
      try {
        await deleteTrabajador(trabajador._id || trabajador.id);
        await refreshGlobalData();
      } catch (err) { 
        alert(err.message || 'Error crítico durante el proceso de eliminación.'); 
      }
    }
  };

  const renderEstadoBadge = (estado) => {
    const normalizado = (estado || 'Pendiente de alta').toLowerCase();
    switch (normalizado) {
      case 'activo':
        return <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded border bg-emerald-50 text-emerald-700 border-emerald-100 flex-shrink-0">Activo</span>;
      case 'inactivo':
        return <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded border bg-slate-100 text-slate-500 border-slate-200 flex-shrink-0">Inactivo</span>;
      case 'de baja':
        return <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded border bg-amber-50 text-amber-700 border-amber-200 flex-shrink-0">De Baja</span>;
      case 'pendiente de alta':
      default:
        return <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded border bg-indigo-50 text-indigo-600 border-indigo-100 flex-shrink-0">Pendiente</span>;
    }
  };

  // ÚNICO RETURN DEL COMPONENTE GLOBAL
  return (
    <div className="space-y-6 p-6">
      
      {/* Cabecera de Botones de Acción */}
      <div className="flex gap-2">
        <button
          onClick={handleExportarExcel}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-100 flex items-center gap-2"
        >
          📊 Exportar Excel
        </button>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md"
        >
          🎒 Nuevo Colaborador
        </button>
      </div>

      {/* ESTADÍSTICAS DE TRABAJADORES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
          <span className="text-2xl font-black text-slate-800">{stats.total}</span>
          <span className="text-[10px] font-semibold text-slate-400">Trabajadores registrados</span>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Activos</span>
          <span className="text-2xl font-black text-emerald-600">{stats.activos}</span>
          <span className="text-[10px] font-semibold text-slate-400">En activo</span>
        </div>
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">De Baja</span>
          <span className="text-2xl font-black text-amber-600">{stats.baja}</span>
          <span className="text-[10px] font-semibold text-slate-400">Baja médica</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inactivos</span>
          <span className="text-2xl font-black text-slate-500">{stats.inactivos}</span>
          <span className="text-[10px] font-semibold text-slate-400">Sin actividad</span>
        </div>
        {stats.pendientes > 0 && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Pendientes de Alta</span>
            <span className="text-2xl font-black text-indigo-600">{stats.pendientes}</span>
            <span className="text-[10px] font-semibold text-slate-400">En espera de alta</span>
          </div>
        )}
      </div>

      {/* FILTROS RESPONSIVOS MEJORADOS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          
          <div className="sm:col-span-2 md:col-span-1 xl:col-span-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Búsqueda General</label>
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-slate-400 mr-2 text-xs">🔍</span>
              <input 
                type="text" 
                placeholder="Nombre, DNI..." 
                value={filterQuery} 
                onChange={(e) => setFilterQuery(e.target.value)} 
                className="w-full text-xs font-semibold text-slate-700 bg-transparent placeholder-slate-400 focus:outline-none" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ordenar por</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none truncate"
            >
              <option value="reciente">📅 Más reciente</option>
              <option value="antiguo">📅 Más antiguo</option>
              <option value="az">🔤 Nombre: A-Z</option>
              <option value="za">🔤 Nombre: Z-A</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none"
            >
              <option value="todos">🔹 Todos</option>
              <option value="Activo">🟢 Activos</option>
              <option value="Inactivo">⚪ Inactivos</option>
              <option value="De Baja">🟡 De Baja Médica</option>
              <option value="Pendiente de alta">🔵 Pendientes</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cargo</label>
            <select
              value={filterCargo}
              onChange={(e) => setFilterCargo(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none truncate"
            >
              <option value="todos">🔹 Todos los cargos</option>
              {uniqueCriterias.cargos.map(cargo => (
                <option key={cargo} value={cargo}>{cargo}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cód. Zona</label>
            <select
              value={filterCodZona}
              onChange={(e) => setFilterCodZona(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none"
            >
              <option value="todos">🔹 Todos los cód.</option>
              {uniqueCriterias.codZonas.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zona / Delegación</label>
            <select
              value={filterZona}
              onChange={(e) => setFilterZona(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none truncate"
            >
              <option value="todos">🔹 Todas las del.</option>
              {uniqueCriterias.zonas.map(zona => (
                <option key={zona} value={zona}>{zona}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Spinners de Carga */}
      {loading && (
        <div className="text-center py-12 text-xs font-bold text-slate-400 animate-pulse">
          Sincronizando registros con el servidor central...
        </div>
      )}

      {/* Mensajes de error globales */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* CUADRÍCULA DE TARJETAS DE TRABAJADORES */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentItems.map(t => {
            const telefonoAsignado = telefonos.find(p => (p.asignadoA?._id || p.asignadoA) === t._id);

            return (
              <div 
                key={t._id || t.id} 
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">
                        {t.nombre} {t.apellidos}
                      </h3>
                      <p className="text-[11px] font-mono font-semibold text-indigo-600 mt-0.5 truncate">
                        {t.username || 'sin_usuario'} | {t.emailAboca || 'sin-email@aboca.es'}
                      </p>
                    </div>
                    {renderEstadoBadge(t.estado)}
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-[90px_1fr] items-center gap-2">
                      <span className="text-slate-400 font-medium">📞 Teléfono:</span>
                      <span className="font-mono font-bold text-slate-700 truncate">
                        {telefonoAsignado ? telefonoAsignado.numeroTelefono : '⚠️ Sin línea'}
                      </span>
                    </div>

                    <div className="grid grid-cols-[90px_1fr] items-baseline gap-2">
                      <span className="text-slate-400 font-medium">💼 Cargo:</span>
                      <span className="font-bold text-slate-700 break-words line-clamp-2" title={t.cargo}>
                        {t.cargo || 'No definido'}
                      </span>
                    </div>

                    <div className="grid grid-cols-[90px_1fr] items-center gap-2">
                      <span className="text-slate-400 font-medium">📍 Cód. Zona:</span>
                      <div>
                        <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono font-bold rounded text-[10px]">
                          {t.codigoZona || 'N/D'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-[90px_1fr] items-baseline gap-2">
                      <span className="text-slate-400 font-medium">🗺️ Delegación:</span>
                      <span className="font-bold text-slate-600 break-words" title={t.zona}>
                        {t.zona || 'No asignada'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botonera Operativa */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedTrabajador(t)}
                    title="Ver detalles"
                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-sm transition-colors flex justify-center items-center"
                  >
                    👁️
                  </button>
                  <button
                    onClick={() => setEditingTrabajador(t)}
                    title="Editar ficha"
                    className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-sm transition-colors flex justify-center items-center"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    title="Eliminar permanentemente"
                    className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-sm transition-colors flex justify-center items-center"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fallback Vacío */}
      {!loading && processedData.length === 0 && (
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-400">
          Ningún expediente coincide con los criterios aplicados.
        </div>
      )}

      {/* Paginador Adaptativo */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
          <button 
            onClick={prevPage} 
            disabled={currentPage === 1} 
            className="w-full sm:w-auto px-3 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs font-bold text-slate-500">Página {currentPage} de {totalPages}</span>
          <button 
            onClick={nextPage} 
            disabled={currentPage === totalPages} 
            className="w-full sm:w-auto px-3 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Inyecciones de Modales */}
      <CreateTrabajadorModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={refreshGlobalData} />
      
      {editingTrabajador && (
        <EditTrabajadorModal 
          isOpen={!!editingTrabajador} 
          onClose={() => setEditingTrabajador(null)} 
          trabajador={editingTrabajador} 
          onUpdated={refreshGlobalData} 
        />
      )}
      
      {selectedTrabajador && (
        <ViewTrabajadorModal 
          title="Colaborador" 
          onClose={() => setSelectedTrabajador(null)} 
          item={selectedTrabajador} 
        />
      )}
    </div>
  );
};

export default TrabajadoresPage;