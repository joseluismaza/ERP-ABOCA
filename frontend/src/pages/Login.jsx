// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  // Estado local para capturar las credenciales de acceso del operador del ERP
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Estados para la gestión visual del ciclo de vida de la petición de red
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Hooks de control de navegación y consumo de estado reactivo global
  const navigate = useNavigate();
  const { login } = useAuth();

  /**
   * Manejador del envío del formulario.
   * Valida los datos en cliente, realiza la mutación asíncrona de red mediante Axios,
   * inyecta el estado de sesión en el contexto global y redirige de forma segura.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación previa de seguridad: Sanitización elemental de campos obligatorios
    if (!username.trim() || !password.trim()) {
      setError('Por favor complete todos los campos mandatorios.');
      return;
    }
    
    // Bloqueo de UI preventivo y reseteo de la bandeja de errores de sistema
    setSubmitting(true);
    setError('');
    
    try {
      /**
       * Arquitectura limpia: Petición directa aislada de interceptores globales.
       * Evitamos que Axios intente resolver redirecciones o procesar interceptores globales
       * forzando la transformación manual del payload a String JSON.
       */
      const res = await axios({
        method: 'post',
        url: '/api/auth/login',
        data: { username, password },
        headers: { 'Content-Type': 'application/json' },
        transformRequest: [(data) => JSON.stringify(data)], 
      });

      // Verificación de integridad de la respuesta devuelta por el controlador de Express
      if (res.data?.token && res.data?.user) {
        /**
         * Inyección centralizada de la sesión en el AuthContext.
         * Almacena de golpe el string token cifrado y el objeto del usuario { username, rol, _id }
         * en el estado de React y en el almacenamiento local persistente.
         */
        login(res.data.user, res.data.token);
        
        // Redirección inmediata al cuadro de mandos o dashboard principal del sistema
        navigate('/');
      } else {
        // Disparador de contingencia si el backend responde un 200 pero sin estructura limpia
        throw new Error('La respuesta del servidor no cumple con la estructura de metadatos requerida.');
      }
    } catch (err) {
      console.error('Fallo en el proceso de autenticación del operador:', err);
      
      // Diagnóstico preciso de denegación de servicio por políticas de Rate Limiting corporativas
      if (err.response?.status === 429) {
        setError(
          'Acceso temporalmente restringido por seguridad corporativa (429). ' +
          'El servidor ha detectado demasiadas peticiones desde este origen. ' +
          'Por favor, limpie la caché del servidor o espere unos minutos.'
        );
      } else {
        // Captura el mensaje de error personalizado sembrado por el servidor o aplica fallback
        setError(err.response?.data?.error || 'Credenciales de acceso no válidas. Inténtelo de nuevo.');
      }
    } finally {
      // Liberación del bloqueo de la interfaz de usuario una vez finalizada la operación
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Acceso ERP Corporativo</h2>
        
        {/* Renderizado condicional de alertas críticas de la API */}
        {error && <p className="text-red-500 text-sm mb-4 font-medium bg-red-50 p-2.5 rounded border border-red-200">{error}</p>}
        
        {/* Input: Nombre de Usuario */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-1">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
            disabled={submitting}
            required
            autoComplete="username"
          />
        </div>
        
        {/* Input: Contraseña */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-semibold mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
            disabled={submitting}
            required
            autoComplete="current-password"
          />
        </div>
        
        {/* Botón de Envió Dinámico */}
        <button
          type="submit"
          className={`w-full bg-indigo-600 text-white py-2 rounded font-semibold hover:bg-indigo-700 transition-colors ${
            submitting ? 'opacity-50 cursor-not-allowed bg-indigo-500' : ''
          }`}
          disabled={submitting}
        >
          {submitting ? 'Autenticando...' : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  );
};

export default Login;