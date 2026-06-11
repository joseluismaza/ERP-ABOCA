// frontend/src/services/api.js
import axios from 'axios';

// Instanciación base de Axios apuntando al prefijo del API Gateway del backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000, // Protección contra peticiones colgadas en redes lentas
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔒 Token de sesión guardado SOLO en memoria (variable de este módulo), nunca
// en localStorage/sessionStorage. Si un script no autorizado se ejecutara en la
// página (XSS), no podría leer el token desde el almacenamiento del navegador.
// Contrapartida: al recargar la página o cerrar la pestaña, el token se pierde
// y el usuario debe volver a iniciar sesión.
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

// Interceptor de Peticiones: Inyección dinámica del Token Bearer
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      // Formateo estándar RFC 6750 para la transmisión de JSON Web Tokens
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Respuestas: Gestión atómica de seguridad y caducidad de sesión
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Caso de uso crítico: El token ha expirado o ha sido manipulado en el cliente
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      authToken = null;
      
      // Evitamos romper el árbol de React forzando una recarga limpia hacia la raíz de acceso
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Normalización del payload de error para los hooks y catch bloques del ERP
    const errorNormalizado = {
      status: error.response?.status ?? 500,
      message: error.response?.data?.error ?? error.message ?? 'Error interno del servidor',
    };

    return Promise.reject(errorNormalizado);
  }
);

export default api;