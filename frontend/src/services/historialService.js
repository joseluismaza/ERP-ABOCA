// frontend/src/services/historialService.js
import api from './api';

export const getHistorial = async (options = {}) => {
  return await api.get('/historial', { signal: options.signal });
};

export const getHistorialByElemento = async (elementoId, signal) => {
  return await api.get('/historial', { params: { elementoId }, signal });
};