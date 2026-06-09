// frontend/src/pages/HistorialPage.jsx
import React, { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { usePagination } from '../hooks/usePagination';
import { getHistorial } from '../services/historialService';
import Table from '../components/Table';

const HistorialPage = () => {
  const { data: registros, loading } = useApi(getHistorial);
  const [filterQuery, setFilterQuery] = useState('');

  const filteredData = useMemo(() => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return registros;
    return registros.filter(r => 
      r.usuario?.toLowerCase().includes(q) || 
      r.accion?.toLowerCase().includes(q) || 
      r.detalles?.toLowerCase().includes(q)
    );
  }, [registros, filterQuery]);

  const { currentItems, currentPage, totalPages, nextPage, prevPage } = usePagination(filteredData, 15);

  const columns = [
    { label: 'Fecha / Hora', key: 'createdAt', render: (val) => <span className="font-mono text-slate-500 text-xs">{val ? new Date(val).toLocaleString('es-ES') : '-'}</span> },    { label: 'Operación Ejecutada', key: 'accion', render: (val) => {
        let badgeStyle = 'bg-slate-100 text-slate-700';
        if (val?.includes('CREAR') || val?.includes('ALTA')) badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (val?.includes('MODIFICAR') || val?.includes('ACTUALIZAR')) badgeStyle = 'bg-amber-50 text-amber-700 border-amber-100';
        if (val?.includes('ELIMINAR') || val?.includes('BAJA')) badgeStyle = 'bg-rose-50 text-rose-700 border-rose-100';
        return <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border ${badgeStyle}`}>{val}</span>;
    }},
    { label: 'Detalles del Suceso', key: 'detalles', render: (val) => <span className="text-slate-600 truncate max-w-md block font-medium">{val}</span> }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-slate-800">Libro de Auditoría Interna</h2>
        <p className="text-xs text-slate-400 font-medium">Trazabilidad absoluta e inmutable de operaciones, modificaciones e intercambios de hardware.</p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex items-center max-w-md">
        <input type="text" placeholder="Filtrar bitácora por operador, acción o detalle..." value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} className="w-full text-xs font-semibold focus:outline-none" />
      </div>

      <Table columns={columns} data={currentItems} loading={loading} />

      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">
          <button onClick={prevPage} disabled={currentPage === 1} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold disabled:opacity-40">Anterior</button>
          <span className="text-xs font-bold text-slate-500">Página {currentPage} de {totalPages}</span>
          <button onClick={nextPage} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold disabled:opacity-40">Siguiente</button>
        </div>
      )}
    </div>
  );
};

export default HistorialPage;