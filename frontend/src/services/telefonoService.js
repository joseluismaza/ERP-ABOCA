// frontend/src/services/telefonoService.js
import api from './api';

export const getTelefonos = async (options = {}) => {
  const response = await api.get('/telefonos', { signal: options.signal });
  return response;
};

export const createTelefono = async (data) => {
  const response = await api.post('/telefonos', data);
  return response;
};

export const updateTelefono = async (id, data) => {
  const response = await api.put(`/telefonos/${id}`, data);
  return response;
};

export const deleteTelefono = async (id) => {
  const response = await api.delete(`/telefonos/${id}`);
  return response;
};

export const exportarTelefonosExcel = async () => {
  const response = await api.get('/telefonos/exportar', {
    responseType: 'blob'
  });
  return response.data;
};