// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { GlobalDataProvider } from './contexts/GlobalDataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SidebarProvider } from './contexts/SidebarContext';

import { PrivateRoute } from './components/PrivateRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TrabajadoresPage from './pages/TrabajadoresPage';
import MaterialPage from './pages/MaterialesPage';
import TelefonosPage from './pages/TelefonosPage';

const AppLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-100 font-sans antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <GlobalDataProvider>
        <NotificationProvider>
          <SidebarProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <AppLayout><Dashboard /></AppLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/trabajadores"
                  element={
                    <PrivateRoute>
                      <AppLayout><TrabajadoresPage /></AppLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/materiales"
                  element={
                    <PrivateRoute>
                      <AppLayout><MaterialPage /></AppLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/telefonos"
                  element={
                    <PrivateRoute>
                      <AppLayout><TelefonosPage /></AppLayout>
                    </PrivateRoute>
                  }
                />
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