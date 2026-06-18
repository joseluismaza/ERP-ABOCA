// frontend/src/components/NotificationDropdown.jsx
import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationDropdown = ({ isOpen, onClose }) => {
  const { notifications, triggerIncidentResolution } = useNotifications();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleResolve = (notif) => {
    // Setea la incidencia en el contexto de forma controlada y pura por React
    triggerIncidentResolution({ tipo: notif.tipo, id: notif.id, accion: notif.accion });
    onClose();
  };

  return (
    <div ref={dropdownRef} className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200/80 z-50 py-2 animate-fadeIn">
      <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-xl">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Alertas del Sistema</span>
        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">{notifications.length}</span>
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div key={n.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col gap-1">
              <p className="text-xs text-slate-700 font-semibold leading-relaxed">{n.message}</p>
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-[10px] text-slate-400 font-medium">{n.timestamp}</span>
                {n.accion && (
                  <button onClick={() => handleResolve(n)} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Resolver Incidencia →</button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">Todo al día. No hay alertas críticas pendientes.</div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;