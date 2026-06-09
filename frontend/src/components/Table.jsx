// frontend/src/components/Table.jsx
import React from 'react';

const Table = ({ columns, data, actions, rowKeySelector, loading }) => {
  const getRowKey = (row, index) => {
    if (rowKeySelector) return rowKeySelector(row);
    return row._id || row.id || index;
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl shadow-sm border border-slate-200/80 bg-white">
      <table className="min-w-full bg-white divide-y divide-slate-100">
        <thead className="bg-slate-50/70">
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} className="py-3.5 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{col.label}</th>
            ))}
            {actions && <th className="py-3.5 px-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {loading ? (
            // Implementación de Skeleton UI corporativo de alto rendimiento
            [...Array(5)].map((_, filterIdx) => (
              <tr key={filterIdx} className="animate-pulse">
                {columns.map((_, cIdx) => (
                  <td key={cIdx} className="px-4 py-4"><div className="h-4 bg-slate-100 rounded-md w-3/4" /></td>
                ))}
                {actions && <td className="px-4 py-4 flex justify-end"><div className="h-6 bg-slate-100 rounded-md w-16" /></td>}
              </tr>
            ))
          ) : data && data.length > 0 ? (
            data.map((row, index) => (
              <tr key={getRowKey(row, index)} className="hover:bg-slate-50/50 transition-colors duration-150">
                {columns.map((col, colIdx) => (
                  <td key={col.key || colIdx} className="px-4 py-3.5 text-sm text-slate-700 font-medium whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3.5 text-sm font-medium text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12 text-sm text-slate-400 font-semibold bg-slate-50/20">
                No se encontraron registros disponibles.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;