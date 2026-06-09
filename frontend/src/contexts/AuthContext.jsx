// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Creación del contexto de autenticación nativo
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Estado que mantiene los datos del usuario en memoria para una reactividad instantánea en los componentes
  const [user, setUser] = useState(null);
  // Estado para controlar la carga inicial mientras se verifica la persistencia del almacenamiento
  const [authLoading, setAuthLoading] = useState(true);

  // Efecto de ciclo de vida: Al montar el proveedor, recuperamos la sesión persistida si existe
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      // Si existen ambos registros en el almacenamiento local, restauramos el estado
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error crítico al inicializar la sesión del usuario desde el localStorage:', error);
      // Limpieza preventiva si el JSON guardado estuviera corrupto
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /**
   * Método centralizado para registrar el inicio de sesión exitoso.
   * Guarda los datos tanto en el estado reactivo como en el almacenamiento físico.
   */
  const login = useCallback((userData, token) => {
    if (!userData || !token) {
      console.error('Los parámetros aportados a la función de login son inválidos.');
      return;
    }
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  /**
   * Método de cierre de sesión: purga por completo las credenciales, destruye el estado
   * y limpia el almacenamiento para evitar accesos indebidos.
   */
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para consumir el estado de autenticación de forma limpia en el sistema
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado de forma estricta dentro de un AuthProvider');
  }
  return context;
};