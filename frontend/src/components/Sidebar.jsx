// frontend/src/components/Sidebar.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../contexts/SidebarContext';
import { useAuth } from '../contexts/AuthContext';

// Definición estática de las rutas de navegación del ERP para optimizar rendimiento de renderizado
const navItems = [
  { name: 'Dashboard', path: '/', icon: '📊' },
  { name: 'Trabajadores', path: '/trabajadores', icon: '👥' },
  { name: 'Materiales', path: '/materiales', icon: '📦' },
  { name: 'Teléfonos', path: '/telefonos', icon: '📱' },
  { name: 'Historial', path: '/historial', icon: '📝' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Consumimos el estado real del usuario administrador y el método de cierre del contexto de autenticación
  const { user, logout } = useAuth();
  const { sidebarOpen, closeSidebar } = useSidebar();
  
  // Estado local para controlar el despliegue del menú de acciones de usuario
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Referencia mutable adjuntada al contenedor para capturar eventos de clic fuera del componente
  const userMenuRef = useRef(null);

  /**
   * Cálculo computado y memorizado de las iniciales para evitar ejecuciones en re-renderizados.
   * Si el username es 'SuperAdmin' devolverá 'SU', si es 'Aboca' devolverá 'AB'. Fallback seguro: 'AD'.
   */
  const iniciales = useMemo(() => {
    if (user && user.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return 'AD';
  }, [user]);

  // Manejador del botón de salida segura del sistema
  const handleLogout = useCallback(() => {
    logout(); // Limpia el estado global y borra tokens del localStorage
    setDropdownOpen(false);
    closeSidebar();
    navigate('/login'); // Redirección al control de acceso de seguridad
  }, [logout, navigate, closeSidebar]);

  // Alterna la visibilidad del menú desplegable inferior de usuario
  const toggleDropdown = useCallback((e) => {
    e.stopPropagation();
    setDropdownOpen(prev => !prev);
  }, []);

  // Efecto encargado de interceptar clics en el DOM global para cerrar el menú en caso de pérdida de foco
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
      {/* Capa traslúcida de fondo (Overlay) para facilitar el cierre en terminales móviles */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 lg:hidden transition-opacity duration-300"
          onClick={closeSidebar}
        />
      )}

      {/* Contenedor estructural del panel lateral de navegación */}
      <div className={`
        fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-30
        transform transition-transform duration-300 ease-in-out flex flex-col justify-between border-r border-gray-100
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        
        {/* Cabecera corporativa y listado de módulos */}
        <div>
          <div className="h-16 flex items-center px-6 border-b border-gray-50 bg-indigo-600">
            <span className="text-xl mr-2" role="img" aria-label="Aboca Leaf">🌿</span>
            <h2 className="text-lg font-bold text-white tracking-wide">ERP Aboca</h2>
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

        {/* Sección Inferior: Control Dinámico de Identidad del Administrador Real */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 relative" ref={userMenuRef}>
          
          {/* Menú flotante superior desplegado sobre el botón de perfil */}
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

          {/* Botón interactivo contenedor del perfil del Administrador Autenticado */}
          <button 
            onClick={toggleDropdown}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-200/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {/* Esfera con las iniciales dinámicas reales calculadas en el frontend */}
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="font-bold text-white text-sm tracking-wider">
                  {iniciales}
                </span>
              </div>
              
              {/* Bloque de texto descriptivo del perfil del Administrador */}
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

            {/* Icono de control indicador de estado del menú */}
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