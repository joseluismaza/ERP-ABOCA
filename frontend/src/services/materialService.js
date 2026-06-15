// frontend/src/services/materialService.js
import api from './api';

const CACHE_KEY = 'materiales_data';

export const getMateriales = async (options = {}) => {
  /*if (!options.signal) {
    const cachedData = dataCache.get(CACHE_KEY);
    if (cachedData) return { data: cachedData };
  }*/

  const response = await api.get('/materiales', { signal: options.signal });
  if (response && response.data) {
    dataCache.set(CACHE_KEY, response.data);
  }
  return response;
};

export const getMaterialBySnOrImei = async (code) => {
  // Endpoint clave consumido directamente por el módulo de escáner óptico QR/Barras
  return await api.get(`/materiales/buscar/${encodeURIComponent(code)}`);
};

export const createMaterial = async (data) => {
  const response = await api.post('/materiales', data);
  dataCache.invalidate(CACHE_KEY);
  return response;
};

export const updateMaterial = async (id, data) => {
  const response = await api.put(`/materiales/${id}`, data);
  dataCache.invalidate(CACHE_KEY);
  return response;
};

export const deleteMaterial = async (id) => {
  const response = await api.delete(`/materiales/${id}`);
  dataCache.invalidate(CACHE_KEY);
  return response;
};

export const descargarActaMaterial = async (materialId, tipo, seleccionados = []) => {
  // Al usar 'api', el token JWT se adjunta automáticamente en los headers
  const response = await api.get(`/materiales/${materialId}/documentar`, {
    params: {
      tipo,
      // El backend espera una cadena de IDs separados por comas
      seleccionados: seleccionados.join(',')
    },
    responseType: 'blob' // Obligatorio para manejar la descarga de archivos binarios como PDF
  });
  return response.data;
};

export const exportarMaterialesExcel = async () => {
  const response = await api.get('/materiales/exportar', {
    responseType: 'blob'
  });
  return response.data;
};