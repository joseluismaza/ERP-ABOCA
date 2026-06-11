// frontend/src/services/telefonoService.js
import api from './api';
import { dataCache } from '../utils/dataCache';

const CACHE_KEY = 'telefonos_data';

export const getTelefonos = async (options = {}) => {
  if (!options.signal) {
    const cachedData = dataCache.get(CACHE_KEY);
    if (cachedData) return { data: cachedData };
  }

  const response = await api.get('/telefonos', { signal: options.signal });
  if (response && response.data) {
    dataCache.set(CACHE_KEY, response.data);
  }
  return response;
};

export const createTelefono = async (data) => {
  const response = await api.post('/telefonos', data);
  dataCache.invalidate(CACHE_KEY);
  return response;
};

export const updateTelefono = async (id, data) => {
  const response = await api.put(`/telefonos/${id}`, data);
  dataCache.invalidate(CACHE_KEY);
  return response;
};

export const deleteTelefono = async (id) => {
  const response = await api.delete(`/telefonos/${id}`);
  dataCache.invalidate(CACHE_KEY);
  return response;
};

export const exportarTelefonosExcel = async () => {
  const response = await api.get('/telefonos/exportar', {
    responseType: 'blob'
  });
  return response.data;
};