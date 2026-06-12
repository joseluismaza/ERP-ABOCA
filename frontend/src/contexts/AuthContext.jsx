// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken } from '../services/api';
import { dataCache } from '../utils/dataCache';

// Creación del contexto de autenticación nativo
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 🔒 user y token viven SOLO en memoria (estado de React / módulo api.js).
  // Al recargar la página se pierden a propósito: es la decisión tomada para
  // no exponer el token de sesión a través de localStorage/sessionStorage.
  const [user, setUser] = useState(null);
  // Estado para controlar la carga inicial al montar el proveedor
  const [authLoading, setAuthLoading] = useState(true);

  // Efecto de ciclo de vida: limpiamos cualquier sesión que versiones
  // anteriores de la app hubieran dejado guardada en localStorage, ya que
  // ahora esa información ya no se usa ni se mantiene actualizada.
  useEffect(() => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } catch (error) {
      console.error('Error al limpiar la sesión heredada del localStorage:', error);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /**
   * Método centralizado para registrar el inicio de sesión exitoso.
   * Guarda los datos solo en memoria: estado de React (user) y variable de
   * módulo en api.js (token), nunca en localStorage/sessionStorage.
   */
  const login = useCallback((userData, token) => {
    if (!userData || !token) {
      console.error('Los parámetros aportados a la función de login son inválidos.');
      return;
    }
    setAuthToken(token);
    setUser(userData);
  }, []);

  /**
   * Método de cierre de sesión: borra el token en memoria, el usuario del
   * estado, y la caché de datos (trabajadores/materiales/teléfonos) para que
   * no queden visibles datos de esta sesión si otra persona inicia sesión
   * después en el mismo navegador.
   */
  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    dataCache.clearAll();
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