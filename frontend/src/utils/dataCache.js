// frontend/src/services/dataCache.js

// Almacén aislado en memoria para evitar colisiones con el espacio de nombres global
const cacheStorage = new Map();
const DEFAULT_TTL = 30000; // 30 segundos de vida útil para datos estáticos del ERP

export const dataCache = {
  /**
   * Registra un set de datos asociado a una clave con una marca de tiempo de expiración.
   */
  set: (key, data, ttl = DEFAULT_TTL) => {
    const expiresAt = Date.now() + ttl;
    cacheStorage.set(key, { data, expiresAt });
  },

  /**
   * Recupera los datos si la clave existe y el tiempo de vida sigue vigente.
   */
  get: (key) => {
    const cached = cacheStorage.get(key);
    if (!cached) return null;

    // Validación atómica de expiración temporal
    if (Date.now() > cached.expiresAt) {
      cacheStorage.delete(key); // Auto-purga preventiva
      return null;
    }

    return cached.data;
  },

  /**
   * Invalida de forma inmediata un segmento de datos específico (Crucial tras operaciones POST/PUT/DELETE)
   */
  invalidate: (key) => {
    cacheStorage.delete(key);
  },

  /**
   * Purga absoluta de la memoria de caché del cliente
   */
  clearAll: () => {
    cacheStorage.clear();
  }
};