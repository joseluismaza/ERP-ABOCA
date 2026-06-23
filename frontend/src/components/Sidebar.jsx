// frontend/src/components/Sidebar.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../contexts/SidebarContext';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/', icon: '📊' },
  { name: 'Trabajadores', path: '/trabajadores', icon: '👥' },
  { name: 'Materiales', path: '/materiales', icon: '📦' },
  { name: 'Teléfonos', path: '/telefonos', icon: '📱' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const userMenuRef = useRef(null);

  const iniciales = useMemo(() => {
    if (user && user.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return 'AD';
  }, [user]);

  const handleLogout = useCallback(() => {
    logout();
    setDropdownOpen(false);
    closeSidebar();
    navigate('/login');
  }, [logout, navigate, closeSidebar]);

  const toggleDropdown = useCallback((e) => {
    e.stopPropagation();
    setDropdownOpen(prev => !prev);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 lg:hidden transition-opacity duration-300"
          onClick={closeSidebar}
        />
      )}

      <div className={`
        fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-30
        transform transition-transform duration-300 ease-in-out flex flex-col justify-between border-r border-gray-100
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div>
          <div className="h-16 flex items-center justify-center px-4 border-b border-gray-50 bg-indigo-600">
            <img src="/logo.jpg" alt="ERP Aboca" className="h-10 w-auto object-contain" />
          </div>

          <nav className="p-4 flex flex-col gap-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                  }`}
                >
                  <span className="text-xl" role="img" aria-label={item.name}>{item.icon}</span>
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 relative" ref={userMenuRef}>
          {dropdownOpen && (
            <div className="absolute bottom-16 left-4 right-4 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden transform transition-all duration-200 origin-bottom">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Acciones de Cuenta</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2 transition-colors focus:outline-none focus:bg-red-50"
              >
                <span className="text-base" role="img" aria-label="Logout">🚪</span>
                Cerrar Sesión Activa
              </button>
            </div>
          )}

          <button 
            onClick={toggleDropdown}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-200/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="font-bold text-white text-sm tracking-wider">
                  {iniciales}
                </span>
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                  Sesión Activa
                </p>
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {user?.username || 'Invitado'}
                </p>
                <p className="text-xs text-indigo-600 font-medium capitalize truncate">
                  {user?.rol || 'Sin Rol'}
                </p>
              </div>
            </div>
            <div className={`text-gray-400 text-xs transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}>
              ▲
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;