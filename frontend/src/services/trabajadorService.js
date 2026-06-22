// frontend/src/services/trabajadorService.js
import api from './api';

export const getTrabajadores = async (options = {}) => {
  const response = await api.get('/trabajadores', { signal: options.signal });
  return response;
};

export const getTrabajadorById = async (id) => {
  return await api.get(`/trabajadores/${id}`);
};

export const createTrabajador = async (data) => {
  const response = await api.post('/trabajadores', data);
  return response;
};

export const updateTrabajador = async (id, data) => {
  const response = await api.put(`/trabajadores/${id}`, data);
  return response;
};

export const deleteTrabajador = async (id) => {
  const response = await api.delete(`/trabajadores/${id}`);
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

// Descarga el PDF "llavero" con todas las credenciales del trabajador, cifrado
// con su DNI/NIE. Al usar 'api', el token JWT y la URL base correctas se
// aplican automáticamente (antes esto se hacía con axios directo y una URL
// fija a localhost:5000, lo que rompía la descarga en producción).
export const enviarLlaveroEmail = async (id, { destinatarios, asunto, cuerpo }) => {
  const response = await api.post(`/trabajadores/${id}/enviar-llavero`, { destinatarios, asunto, cuerpo });
  return response.data;
};

export const descargarLlaveroCredenciales = async (id) => {
  const response = await api.post(`/trabajadores/${id}/credenciales-lote`, {}, {
    responseType: 'blob'
  });
  return response.data;
};