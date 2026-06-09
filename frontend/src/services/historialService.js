// frontend/src/services/historialService.js
import api from './api';

export const getHistorial = async (options = {}) => {
  return await api.get('/historial', { signal: options.signal });
};

export const createHistorialEntry = async (entryData) => {
  return await api.post('/historial', entryData);
};