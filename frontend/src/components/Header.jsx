// frontend/src/components/Header.jsx
import React, { useState } from 'react';
import { useSidebar } from '../contexts/SidebarContext';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationDropdown from './NotificationDropdown';

const Header = () => {
  const { toggleSidebar } = useSidebar();
  const { notifications } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="lg:hidden text-slate-500 hover:text-slate-700 text-xl p-1" aria-label="Abrir Menú">☰</button>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">Panel Operativo</span>
      </div>
      <div className="flex items-center gap-4 relative">
        <button onClick={() => setDropdownOpen(!dropdownOpen)} className="p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-100 transition-all relative">
          <span className="text-lg" role="img" aria-label="Campana">🔔</span>
          {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />}
        </button>
        <NotificationDropdown isOpen={dropdownOpen} onClose={() => setDropdownOpen(false)} />
      </div>
    </header>
  );
};

export default Header;