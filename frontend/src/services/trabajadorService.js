// frontend/src/services/trabajadorService.js
import api from './api';
import { dataCache } from '../utils/dataCache';

const CACHE_KEY = 'trabajadores_data';

export const getTrabajadores = async (options = {}) => {
  // Si la petición viene con señal de abortar, ignoramos la caché para dar prioridad al control de red
  if (!options.signal) {
    const cachedData = dataCache.get(CACHE_KEY);
    if (cachedData) return { data: cachedData };
  }

  const response = await api.get('/trabajadores', { signal: options.signal });
  
  if (response && response.data) {
    dataCache.set(CACHE_KEY, response.data);
  }
  return response;
};

export const getTrabajadorById = async (id) => {
  return await api.get(`/trabajadores/${id}`);
};

export const createTrabajador = async (data) => {
  const response = await api.post('/trabajadores', data);
  dataCache.invalidate(CACHE_KEY); // Forzar recarga en la siguiente consulta
  return response;
};

export const updateTrabajador = async (id, data) => {
  const response = await api.put(`/trabajadores/${id}`, data);
  dataCache.invalidate(CACHE_KEY); // Evita desfases de información en la UI
  return response;
};

export const deleteTrabajador = async (id) => {
  const response = await api.delete(`/trabajadores/${id}`);
  dataCache.invalidate(CACHE_KEY);
  return response;
};

export const exportarTrabajadoresExcel = async () => {
  // Usamos la instancia configurada del archivo (ej: api.get o axios.get)
  // Al usar la instancia del servicio, el token JWT se inyecta automáticamente
  const response = await api.get('/trabajadores/exportar', {
    responseType: 'blob' // CRUCIAL para recibir archivos binarios
  });
  return response.data;
};

export const obtenerEstadoSMTP = async () => {
  // Aquí usamos la instancia configurada del archivo (que ya tiene el token JWT inyectado)
  // Nota: Si en este archivo tu instancia de axios se llama "axios" o "API" en vez de "api", cámbialo aquí.
  const response = await api.get('/trabajadores/smtp-status');
  return response.data;
};

export const descargarPDFHistorial = async (historialId) => {
  // Asegúrate de usar la instancia de axios configurada en tu proyecto (ej: 'api' o 'axios')
  const response = await api.get(`/sistema/historial/descargar/${historialId}`, {
    responseType: 'blob' // 🚨 CRÍTICO: Indica que recibimos un archivo binario
  });
  return response.data;
};

// 🔒 Pide al backend las contraseñas reales (descifradas) de un trabajador.
// Requiere reenviar la contraseña del administrador logueado para que el
// servidor verifique su identidad antes de descifrar nada.
export const revelarCredenciales = async (id, password) => {
  const response = await api.post(`/trabajadores/${id}/revelar-credenciales`, { password });
  return response.data;
};