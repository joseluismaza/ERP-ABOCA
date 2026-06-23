// frontend/src/pages/MaterialesPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useGlobalData } from '../contexts/GlobalDataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { usePagination } from '../hooks/usePagination';
import { deleteMaterial, exportarMaterialesExcel } from '../services/materialService';
import Table from '../components/Table';
import CreateMaterialModal from '../components/CreateMaterialModal';
import EditMaterialModal from '../components/EditMaterialModal';
import ViewMaterialModal from '../components/ViewMaterialModal';
import ScannerModal from '../components/ScannerModal';
import { Keyboard, Monitor, Laptop, Smartphone, Tablet, Edit2, Eye, Trash2, Filter } from 'lucide-react'

const TIPO_ICONS = {
  'Teclado': <Keyboard className="w-4 h-4 text-slate-500" />,
  'Ratón': <Keyboard className="w-4 h-4 text-slate-500" />,
  'Monitor': <Monitor className="w-4 h-4 text-slate-500" />,
  'Portátil': <Laptop className="w-4 h-4 text-slate-500" />,
  'Móvil': <Smartphone className="w-4 h-4 text-slate-500" />,
  'Tablet': <Tablet className="w-4 h-4 text-slate-500" />
};

const getTipoIcon = (tipo) => TIPO_ICONS[tipo] || <Laptop className="w-4 h-4 text-slate-500" />;

const MaterialesPage = () => {
  const { 
    materiales = [], 
    trabajadores = [], 
    telefonos = [], 
    loading, 
    refreshGlobalData: reloadGlobalData
  } = useGlobalData() || {};

  const { activeIncident, clearActiveIncident } = useNotifications();

  // Estados de control de búsqueda y filtros avanzados
  const [filterQuery, setFilterQuery] = useState('');
  const [filterModelo, setFilterModelo] = useState('');
  const [filterAsignado, setFilterAsignado] = useState('');
  const [filterRenting, setFilterRenting] = useState('TODOS');
  const [filterEstado, setFilterEstado] = useState('TODOS');

  // Estados de Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(null);

  useEffect(() => {
    if (activeIncident && activeIncident.tipo === 'material') {
      const match = materiales.find(m => m._id === activeIncident.id || m.id === activeIncident.id);
      if (match) {
        if (activeIncident.accion === 'editar' || activeIncident.accion === 'edit') setEditingMaterial(match);
        if (activeIncident.accion === 'ver' || activeIncident.accion === 'view') setSelectedMaterial(match);
        clearActiveIncident();
      }
    }
  }, [activeIncident, materiales, clearActiveIncident]);

  // Lista única de modelos existentes para el combobox de filtrado
  const listaModelos = useMemo(() => {
    const modelos = materiales.map(m => m.modelo).filter(Boolean);
    return [...new Set(modelos)].sort();
  }, [materiales]);

  // Solo activos y bajas (excluye pendientes o estados intermedios), orden alfabético
  const trabajadoresOrdenados = useMemo(() => {
    return [...trabajadores]
      .filter(t => {
        const estadoLimpio = String(t.estado || '').toLowerCase().trim();
        return estadoLimpio === 'activo' || t.activo === true || estadoLimpio === 'baja';
      })
      .sort((a, b) => {
        const nombreA = `${a.nombre} ${a.apellidos || ''}`.trim();
        const nombreB = `${b.nombre} ${b.apellidos || ''}`.trim();
        return nombreA.localeCompare(nombreB, 'es');
      });
  }, [trabajadores]);

  // Filtrado combinado: texto libre + renting + estado + marca/modelo
  const filteredData = useMemo(() => {
    return materiales.filter(m => {
      // 1. Buscador por texto libre (Marca, Modelo, S/N o IMEI)
      const q = filterQuery.toLowerCase().trim();
      const matchQuery = !q || (
        m.marca?.toLowerCase().includes(q) || 
        m.modelo?.toLowerCase().includes(q) || 
        m.sn?.toLowerCase().includes(q) ||
        m.imei?.toLowerCase().includes(q)
      );

      // 2. Filtro por Modelo exacto
      const matchModelo = !filterModelo || m.modelo === filterModelo;

      // 3. Filtro por Trabajador Asignado
      const matchAsignado = !filterAsignado || m.TrabajadorId?._id === filterAsignado || m.TrabajadorId === filterAsignado;

      // 4. Filtro por Régimen de Renting
      const matchRenting = filterRenting === 'TODOS' || (
        filterRenting === 'RENTING' ? m.esRenting === true : m.esRenting === false
      );

      // 5. Filtro por Estado (Derivado lógicamente de la asignación)
      const tieneAsignado = !!m.TrabajadorId;
      const matchEstado = filterEstado === 'TODOS' || (
        filterEstado === 'ASIGNADO' ? tieneAsignado : !tieneAsignado
      );

      return matchQuery && matchModelo && matchAsignado && matchRenting && matchEstado;
    });
  }, [materiales, filterQuery, filterModelo, filterAsignado, filterRenting, filterEstado]);

  // Estadísticas calculadas sobre los materiales filtrados actualmente
  const stats = useMemo(() => {
    const total = filteredData.length;
    const asignados = filteredData.filter(m => !!m.TrabajadorId).length;
    const disponibles = filteredData.filter(m => !m.TrabajadorId && (!m.estado || m.estado.toLowerCase() === 'disponible')).length;
    const otros = filteredData.filter(m => {
      const estado = (m.estado || '').toLowerCase().trim();
      return estado === 'robado' || estado === 'devuelto a renting' || estado === 'comprado';
    }).length;
    return { total, asignados, disponibles, otros };
  }, [filteredData]);

  const { currentItems, currentPage, totalPages, nextPage, prevPage } = usePagination(filteredData, 12);

  const handleExportarExcel = async () => {
    try {
      const data = await exportarMaterialesExcel();
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Inventario_Hardware_ERP.xlsx');
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
    const confirmación = window.confirm(
      '⚠️ ATENCIÓN: Esta acción es COMPLETAMENTE IRREVERSIBLE.\n\n¿Está absolutamente seguro de que desea eliminar permanentemente este hardware del inventario? Se registrará la baja forzada en la auditoría del sistema.'
    );
    if (confirmación) {
      try {
        await deleteMaterial(id);
        reloadGlobalData();
      } catch (err) { 
        alert(err.message || 'Error al eliminar el material.'); 
      }
    }
  };

  const columns = [
    { 
      label: 'Tipo', 
      key: 'tipo',
      render: (val) => (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          {getTipoIcon(val)}
          <span>{val}</span>
        </div>
      )
    },
    { 
      label: 'Hardware', 
      key: 'modelo', 
      render: (_, row) => <span className="font-bold text-slate-800 text-xs">{row.marca} {row.modelo}</span> 
    },
    { label: 'Nº Serie (S/N)', key: 'sn' },
    { 
      label: 'Asignado A', 
      key: 'TrabajadorId', 
      render: (val) => {
        if (!val) {
          return (
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] border border-emerald-100">
              📦 Disponible en Almacén
            </span>
          );
        }

        const targetId = val._id || val;
        const t = trabajadores.find(item => item._id === targetId);
        
        return t ? (
          <span className="text-xs font-semibold text-slate-600">
            👤 {t.nombre} {t.apellidos} {String(t.estado || '').toLowerCase().trim() === 'baja' ? '⚠️ (BAJA)' : ''}
          </span>
        ) : (
          <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] border border-emerald-100">📦 Disponible en Almacén</span>
        );
      }
    },
    { 
      label: 'Renting', 
      key: 'esRenting', 
      render: (val) => val ? <span className="text-amber-600 font-black text-xs">Sí</span> : <span className="text-slate-400">No</span> 
    },
    { 
      label: 'Estado', 
      key: 'estado', 
      render: (_, row) => {
        const tieneAsignado = !!row.TrabajadorId;
        const estadoTexto = tieneAsignado ? 'ASIGNADO' : 'DISPONIBLE';

        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black rounded-full border uppercase tracking-wider
            ${tieneAsignado 
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <span className={`w-1 h-1 rounded-full ${tieneAsignado ? 'bg-blue-500' : 'bg-emerald-500'}`} />
            {estadoTexto}
          </span>
        );
      } 
    }
  ];
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 sm:p-4 max-w-[100vw] overflow-x-hidden">
      {/* Cabecera Responsive */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Inventario Físico de Hardware</h2>
          <p className="text-xs text-slate-400 font-medium">Control unificado de activos informáticos y asignaciones de personal.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button onClick={handleExportarExcel} className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5">📊 Exportar Excel</button>
          <button onClick={() => setIsScannerOpen(true)} className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5">📷 Escanear Código</button>
          <button onClick={() => setIsCreateOpen(true)} className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5">➕ Añadir Material</button>
        </div>
      </div>

      {/* 📊 ESTADÍSTICAS DE MATERIALES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
          <span className="text-2xl font-black text-slate-800">{stats.total}</span>
          <span className="text-[10px] font-semibold text-slate-400">Materiales registrados</span>
        </div>
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Asignados</span>
          <span className="text-2xl font-black text-blue-600">{stats.asignados}</span>
          <span className="text-[10px] font-semibold text-slate-400">En uso por trabajadores</span>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Disponibles</span>
          <span className="text-2xl font-black text-emerald-600">{stats.disponibles}</span>
          <span className="text-[10px] font-semibold text-slate-400">Disponibles en almacén</span>
        </div>
        {stats.otros > 0 && (
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Otros estados</span>
            <span className="text-2xl font-black text-amber-600">{stats.otros}</span>
            <span className="text-[10px] font-semibold text-slate-400">Robados / Renting / Comprados</span>
          </div>
        )}
      </div>

      {/* 📊 PANEL DE FILTRADO AVANZADO RESPONSIVE */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
          <Filter className="w-3.5 h-3.5 text-indigo-500" />
          <span>Filtros y Segmentación de Inventario</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Búsqueda General */}
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-1">Buscar Hardware</label>
            <input type="text" placeholder="S/N, IMEI, Marca..." value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
          </div>

          {/* Filtro Modelo */}
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-1">Filtrar por Modelo</label>
            <select value={filterModelo} onChange={(e) => setFilterModelo(e.target.value)} className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-indigo-500 bg-white">
              <option value="">Todos los modelos</option>
              {listaModelos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Filtro Asignado A — UTILIZA LA NUEVA LISTA FILTRADA Y ORDENADA */}
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-1">Filtrar por Asignación</label>
            <select value={filterAsignado} onChange={(e) => setFilterAsignado(e.target.value)} className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-indigo-500 bg-white">
              <option value="">Cualquier destino</option>
              {trabajadoresOrdenados.map(t => {
                const esBaja = String(t.estado || '').toLowerCase().trim() === 'baja';
                return (
                  <option key={t._id || t.id} value={t._id || t.id}>
                    👤 {t.nombre} {t.apellidos} {esBaja ? '⚠️ (BAJA)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Filtro Renting */}
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-1">Régimen Inversión</label>
            <select value={filterRenting} onChange={(e) => setFilterRenting(e.target.value)} className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-indigo-500 bg-white">
              <option value="TODOS">Todos (Propiedad/Renting)</option>
              <option value="RENTING">Solo Dispositivos en Renting</option>
              <option value="PROPIEDAD">Solo Propiedad de Empresa</option>
            </select>
          </div>

          {/* Filtro Estado */}
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-1">Estado de Disponibilidad</label>
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-indigo-500 bg-white">
              <option value="TODOS">Todos los estados</option>
              <option value="DISPONIBLE">🟢 Disponible en Almacén</option>
              <option value="ASIGNADO">🔵 Asignado a Trabajador</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contenedor de Tabla Adaptativo */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-x-auto">
        <Table 
          columns={columns} 
          data={currentItems} 
          actions={(row) => (
            <div className="flex items-center gap-1">
              <button onClick={() => setSelectedMaterial(row)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors" title="Ver Detalles Computados"><Eye className="w-4 h-4" /></button>
              <button onClick={() => setEditingMaterial(row)} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors" title="Editar Hardware"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(row._id || row.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Baja Definitiva"><Trash2 className="w-4 h-4" /></button>
            </div>
          )} 
        />
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs text-xs">
          <button onClick={prevPage} disabled={currentPage === 1} className="px-3 py-1 bg-slate-100 rounded-lg font-bold disabled:opacity-40">Anterior</button>
          <span className="font-bold text-slate-500">Página {currentPage} de {totalPages}</span>
          <button onClick={nextPage} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-100 rounded-lg font-bold disabled:opacity-40">Siguiente</button>
        </div>
      )}

      <CreateMaterialModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={reloadGlobalData} trabajadores={trabajadores} />
      {editingMaterial && <EditMaterialModal isOpen={!!editingMaterial} onClose={() => setEditingMaterial(null)} material={editingMaterial} onUpdated={reloadGlobalData} trabajadores={trabajadores} telefonos={telefonos} />}
      {selectedMaterial && <ViewMaterialModal item={selectedMaterial} onClose={() => setSelectedMaterial(null)} />}
      <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onDetected={(code) => { setFilterQuery(code); setIsScannerOpen(false); }} />
    </div>
  );
};

export default MaterialesPage;