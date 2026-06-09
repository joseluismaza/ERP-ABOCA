// frontend/src/pages/TelefonosPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useGlobalData } from '../contexts/GlobalDataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { usePagination } from '../hooks/usePagination';
import { deleteTelefono, exportarTelefonosExcel } from '../services/telefonoService';
import Table from '../components/Table';
import CreateTelefonoModal from '../components/CreateTelefonoModal';
import EditTelefonoModal from '../components/EditTelefonoModal';
import ViewTelefonosModal from '../components/ViewTelefonosModal';
import { Pencil, Eye, Trash2, Filter } from 'lucide-react';

const TelefonosPage = () => {
  const { 
    telefonos = [], 
    trabajadores = [], 
    loading = {}, 
    refreshGlobalData,
    reloadGlobalData 
  } = useGlobalData() || {};

  const ejecutarRefrescoBBDD = refreshGlobalData || reloadGlobalData;
  const { activeIncident, clearActiveIncident } = useNotifications();

  // 🎛️ ESTADOS DE FILTRADO
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'disponible' | 'asignado'
  const [workerFilter, setWorkerFilter] = useState(''); // '' | ID del Trabajador

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTelefono, setSelectedTelefono] = useState(null);
  const [editingTelefono, setEditingTelefono] = useState(null);

  useEffect(() => {
    if (activeIncident && activeIncident.tipo === 'telefono') {
      const match = telefonos.find(t => t._id === activeIncident.id || t.id === activeIncident.id);
      if (match) {
        if (activeIncident.accion === 'editar') setEditingTelefono(match);
        clearActiveIncident();
      }
    }
  }, [activeIncident, telefonos, clearActiveIncident]);

  // 👥 ORDENAR TRABAJADORES ALFABÉTICAMENTE PARA EL SELECT
  const trabajadoresOrdenados = useMemo(() => {
    return [...trabajadores]
      .filter(t => {
        const estadoLimpio = String(t.estado || '').toLowerCase().trim();
        // Soportamos variaciones de mayúsculas/minúsculas y booleanos si aplicara
        return estadoLimpio === 'activo' || t.activo === true || estadoLimpio === 'baja';
      })
      .sort((a, b) => {
        const nombreA = `${a.nombre} ${a.apellidos || ''}`.trim();
        const nombreB = `${b.nombre} ${b.apellidos || ''}`.trim();
        return nombreA.localeCompare(nombreB, 'es');
      });
  }, [trabajadores]);

  // Estadísticas calculadas del total de teléfonos
  const stats = useMemo(() => {
    const total = telefonos.length;
    const asignados = telefonos.filter(t => String(t.estado || '').toLowerCase().trim() === 'asignado').length;
    const disponibles = telefonos.filter(t => String(t.estado || '').toLowerCase().trim() !== 'asignado').length;
    return { total, asignados, disponibles };
  }, [telefonos]);

  // 🚀 LÓGICA DE FILTRADO COMBINADO Y MULTI-CRITERIO
  const filteredData = useMemo(() => {
    return telefonos.filter(t => {
      // 1. Filtro por Buscador de Texto Plano
      const q = filterQuery.toLowerCase().trim();
      if (q) {
        const matchText = 
          t.numeroTelefono?.toLowerCase().includes(q) || 
          t.numeroInterno?.toLowerCase().includes(q) || 
          t.icc?.toLowerCase().includes(q) ||
          t.tipoDispositivo?.toLowerCase().includes(q);
          
        if (!matchText) return false;
      }

      // 2. Filtro por Estado Operativo
      if (statusFilter) {
        const estadoLinea = String(t.estado || '').toLowerCase().trim();
        if (estadoLinea !== statusFilter) return false;
      }

      // 3. Filtro por Trabajador Vinculado
      if (workerFilter) {
        const idVinculado = String(t.TrabajadorId?._id || t.TrabajadorId || t.asignadoA || '');
        if (idVinculado !== String(workerFilter)) return false;
      }

      return true;
    });
  }, [telefonos, filterQuery, statusFilter, workerFilter]);

  const { currentItems, currentPage, totalPages, nextPage, prevPage } = usePagination(filteredData, 12);

  const handleExportarExcel = async () => {
    try {
      const data = await exportarTelefonosExcel();
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Listado_Telefonia_ERP.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar el archivo Excel:", error);
      alert("No se ha podido exportar el listado. Revisa tus permisos de administrador.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Desea rescindir e inactivar esta línea telefónica del ERP?')) {
      try {
        await deleteTelefono(id);
        if (ejecutarRefrescoBBDD) ejecutarRefrescoBBDD();
      } catch (err) { 
        alert(err.message || 'Error al eliminar'); 
      }
    }
  };

  // ==========================================
  // 📋 CONFIGURACIÓN DE COLUMNAS DE LA TABLA
  // ==========================================
  const columns = [
    { 
      label: 'Número de Teléfono', 
      key: 'numeroTelefono', 
      render: (val) => <span className="font-bold text-slate-800">{val}</span> 
    },
    { 
      label: 'Extensión Interna', 
      key: 'numeroInterno' 
    },
    {
      label: 'Trabajador',
      key: 'TrabajadorId',
      render: (val, row) => {
        const referencia = val || row.asignadoA;
        if (!referencia) return <span className="text-slate-400 font-medium italic">Disponible en Almacén</span>;

        if (typeof referencia === 'object' && referencia.nombre) {
          return <span className="font-semibold text-slate-700">{`${referencia.nombre} ${referencia.apellidos || ''}`.trim()}</span>;
        }

        const idBuscado = referencia?._id || referencia;
        const empleado = trabajadores.find(t => String(t._id || t.id) === String(idBuscado));
        return empleado
          ? <span className="font-semibold text-slate-700">{`${empleado.nombre} ${empleado.apellidos || ''}`.trim()}</span>
          : <span className="text-slate-500 font-medium italic">Operario no encontrado</span>;
      }
    },
    { 
      label: 'PIN 1', 
      key: 'pin1',
      render: (val) => <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded text-slate-600">{val || '----'}</span>
    },
    { 
      label: 'PUK 1', 
      key: 'puk1',
      render: (val) => <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded text-slate-600">{val || '--------'}</span>
    },
    { 
      label: 'ICC Tarjeta SIM', 
      key: 'icc',
      render: (val) => <span className="font-mono text-[11px] text-slate-500">{val}</span>
    },
    { 
      label: 'Estado', 
      key: 'estado', 
      render: (val) => {
        const estadoLimpio = String(val || '').toLowerCase().trim();
        if (estadoLimpio === 'asignado') {
          return (
            <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full border bg-rose-50 text-rose-700 border-rose-100 uppercase tracking-wide">
              Asignado
            </span>
          );
        }
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100 uppercase tracking-wide">
            Disponible
          </span>
        );
      } 
    },
    { 
      label: 'Formato SIM', 
      key: 'tipoSIM',
      render: (val) => <span className="text-xs font-medium text-slate-600 uppercase">{val || 'SIM'}</span>
    },
    {
      label: 'Terminal',
      key: 'tipoDispositivo',
      render: (val) => {
        const dev = String(val || '').toLowerCase().trim();
        if (dev === 'ipad') {
          return <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg uppercase">🍏 iPad</span>;
        }
        return <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg uppercase">📱 iPhone</span>;
      }
    }
  ];

  return (
    <div className="space-y-4">
      {/* Cabecera de Página */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Infraestructura de Telefonía</h2>
          <p className="text-xs text-slate-400 font-medium">Control de líneas móviles, perfiles de tarjetas SIM/eSIM y extensiones corporativas.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportarExcel} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5">📊 Exportar Excel</button>
          <button onClick={() => setIsCreateOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5">
            ➕ Aprovisionar Línea
          </button>
        </div>
      </div>

      {/* 📊 ESTADÍSTICAS DE TELEFONÍA */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
          <span className="text-2xl font-black text-slate-800">{stats.total}</span>
          <span className="text-[10px] font-semibold text-slate-400">Líneas registradas</span>
        </div>
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Asignados</span>
          <span className="text-2xl font-black text-rose-600">{stats.asignados}</span>
          <span className="text-[10px] font-semibold text-slate-400">En uso por trabajadores</span>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Disponibles</span>
          <span className="text-2xl font-black text-emerald-600">{stats.disponibles}</span>
          <span className="text-[10px] font-semibold text-slate-400">Disponibles en almacén</span>
        </div>
      </div>

      {/* 🛠️ CONTENEDOR FLUIDO DE FILTROS AVANZADOS */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center w-full">
        
        {/* Buscador de texto ordinario */}
        <div className="flex-1 min-w-[240px] border border-slate-200 rounded-xl p-2 flex items-center bg-slate-50/30 focus-within:border-indigo-500 transition-colors">
          <input 
            type="text" 
            placeholder="Buscar por número, extensión, ICC..." 
            value={filterQuery} 
            onChange={(e) => setFilterQuery(e.target.value)} 
            className="w-full text-xs font-semibold focus:outline-none bg-transparent placeholder:text-slate-400" 
          />
        </div>

        {/* Desplegable de Estado */}
        <div className="w-full md:w-48 border border-slate-200 rounded-xl p-1.5 bg-white focus-within:border-indigo-500 transition-colors">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-bold text-slate-600 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="">— Filtrar Estado —</option>
            <option value="disponible">🟢 DISPONIBLE</option>
            <option value="asignado">🔴 ASIGNADO</option>
          </select>
        </div>

        {/* Desplegable de Trabajador */}
        <div className="w-full md:w-64 border border-slate-200 rounded-xl p-1.5 bg-white focus-within:border-indigo-500 transition-colors">
          <select
            value={workerFilter}
            onChange={(e) => setWorkerFilter(e.target.value)}
            className="w-full text-xs font-bold text-slate-600 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="">— Filtrar por Operario —</option>
            {trabajadoresOrdenados.map(t => (
              <option key={t._id || t.id} value={t._id || t.id}>
                👤 {t.nombre} {t.apellidos || ''} {t.estado === 'Inactivo' || t.activo === false ? '(INACTIVO)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Botón rápido para limpiar filtros si hay alguno activo */}
        {(filterQuery || statusFilter || workerFilter) && (
          <button
            onClick={() => { setFilterQuery(''); setStatusFilter(''); setWorkerFilter(''); }}
            className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-2 rounded-xl transition-all self-center md:self-auto text-center"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* Tabla de Datos Principal */}
      <Table 
        columns={columns} 
        data={currentItems} 
        loading={!!loading.telefonos} 
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setSelectedTelefono(row)} 
              title="Ver detalles de la línea"
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Eye size={15} />
            </button>
            <button 
              onClick={() => setEditingTelefono(row)} 
              title="Editar parámetros SIM"
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            >
              <Pencil size={15} />
            </button>
            <button 
              onClick={() => handleDelete(row._id || row.id)} 
              title="Dar de baja línea"
              className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )} 
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">
          <button onClick={prevPage} disabled={currentPage === 1} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold disabled:opacity-40">Anterior</button>
          <span className="text-xs font-bold text-slate-500">Página {currentPage} de {totalPages}</span>
          <button onClick={nextPage} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold disabled:opacity-40">Siguiente</button>
        </div>
      )}

      {/* Modales modulares del ecosistema */}
      <CreateTelefonoModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={ejecutarRefrescoBBDD} />
      {editingTelefono && <EditTelefonoModal isOpen={!!editingTelefono} onClose={() => setEditingTelefono(null)} telefono={editingTelefono} onUpdated={ejecutarRefrescoBBDD} />}
      <ViewTelefonosModal item={selectedTelefono} title="Línea Telefónica" onClose={() => setSelectedTelefono(null)} />
    </div>
  );
};

export default TelefonosPage;