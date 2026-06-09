// frontend/src/App.jsx
import React from 'react';
// Añadimos 'Navigate' de forma estricta a la importación para resolver el ReferenceError
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importación de Proveedores de Contexto (Capas de Estado Global de la Aplicación)
import { AuthProvider } from './contexts/AuthContext';
import { GlobalDataProvider } from './contexts/GlobalDataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SidebarProvider } from './contexts/SidebarContext';

// Importación de Componentes de Estructura y Seguridad del Core
import { PrivateRoute } from './components/PrivateRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Importación de Vistas y Páginas del ERP (Corregido con la nomenclatura exacta de tu sistema)
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TrabajadoresPage from './pages/TrabajadoresPage';
import MaterialPage from './pages/MaterialesPage';
import TelefonosPage from './pages/TelefonosPage';
import HistorialPage from './pages/HistorialPage';

/**
 * Componente Layout de Estructura Visual Unificada.
 * Gestiona de forma responsiva la distribución del Sidebar lateral fijo,
 * la barra superior de herramientas (Header) y el contenedor dinámico del contenido de la página.
 */
const AppLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-100 font-sans antialiased">
      {/* Panel de navegación e identidad corporativa */}
      <Sidebar />
      
      {/* Contenedor principal de la interfaz de usuario */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Barra superior de notificaciones y acciones globales */}
        <Header />
        
        {/* Inyección dinámica de las pantallas según el enrutamiento activo */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    // 1. Capa Maestra de Autenticación: Orquesta tokens y credenciales de administradores
    <AuthProvider>
      {/* 2. Capa de Datos del Servidor: Sincroniza y cachea el estado del personal e inventario */}
      <GlobalDataProvider>
        {/* 3. Capa de Notificaciones: Audita el inventario y calcula alertas críticas reactivas */}
        <NotificationProvider>
          {/* 4. Capa del Sidebar: Controla la apertura del panel en smartphones y tablets */}
          <SidebarProvider>
            
            <Router>
              <Routes>
                {/* Ruta Pública de Autenticación: Pantalla de Login Corporativo */}
                <Route path="/login" element={<Login />} />

                {/* Rutas Protegidas de Gestión: Validadas bajo el guardián de sesión PrivateRoute */}
                <Route
                  path="/"
                  element = {
                    <PrivateRoute>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </PrivateRoute>
                  }
                />
                
                <Route
                  path="/trabajadores"
                  element = {
                    <PrivateRoute>
                      <AppLayout>
                        <TrabajadoresPage />
                      </AppLayout>
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/materiales"
                  element = {
                    <PrivateRoute>
                      <AppLayout>
                        <MaterialPage />
                      </AppLayout>
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/telefonos"
                  element = {
                    <PrivateRoute>
                      <AppLayout>
                        <TelefonosPage />
                      </AppLayout>
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/historial"
                  element = {
                    <PrivateRoute>
                      <AppLayout>
                        <HistorialPage />
                      </AppLayout>
                    </PrivateRoute>
                  }
                />

                {/* Ruta de Seguridad Comodín: Atrapa URLs inválidas y las reconduce al Dashboard de forma transparente */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>

          </SidebarProvider>
        </NotificationProvider>
      </GlobalDataProvider>
    </AuthProvider>
  );
};

export default App;