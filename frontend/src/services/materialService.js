// frontend/src/services/materialService.js
import api from './api';

export const getMateriales = async (options = {}) => {
  const response = await api.get('/materiales', { signal: options.signal });
  return response;
};

export const getMaterialBySnOrImei = async (code) => {
  // Endpoint clave consumido directamente por el módulo de escáner óptico QR/Barras
  return await api.get(`/materiales/buscar/${encodeURIComponent(code)}`);
};

export const createMaterial = async (data) => {
  const response = await api.post('/materiales', data);
  return response;
};

export const updateMaterial = async (id, data) => {
  const response = await api.put(`/materiales/${id}`, data);
  return response;
};

export const deleteMaterial = async (id) => {
  const response = await api.delete(`/materiales/${id}`);
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

export const enviarActaEmail = async (materialId, { tipo, seleccionados, destinatarios, asunto, cuerpo }) => {
  const response = await api.post(`/materiales/${materialId}/enviar-acta`, {
    tipo, seleccionados, destinatarios, asunto, cuerpo
  });
  return response.data;
};

export const exportarMaterialesExcel = async () => {
  const response = await api.get('/materiales/exportar', {
    responseType: 'blob'
  });
  return response.data;
};