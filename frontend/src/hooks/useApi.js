// frontend/src/hooks/useApi.js
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook optimizado para la gestión de peticiones asíncronas HTTP.
 * Corrige fugas de memoria (memory leaks) aislando correctamente el ciclo de desmonte
 * e implementa soporte nativo para cancelaciones en vuelo mediante AbortController.
 */
export const useApi = (serviceFunction) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sincronizamos la función del servicio en una referencia mutable.
  // Esto evita re-ejecuciones e hilos rotos si el componente padre recrea la función en cada render.
  const serviceRef = useRef(serviceFunction);
  useEffect(() => {
    serviceRef.current = serviceFunction;
  }, [serviceFunction]);

  // Controlador de aborto mutable para cancelar peticiones previas si se acumulan en red
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async (isMountedRef) => {
    // Si ya hay una petición idéntica en vuelo, la cancelamos antes de lanzar la nueva
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      
      // Se propaga el signal para que Axios/Fetch aborte el hilo de red nativamente si el componente se desmonta
      const response = await serviceRef.current({ signal: controller.signal });
      
      if (isMountedRef.current) {
        setData(response?.data ?? []);
      }
    } catch (err) {
      // Ignoramos el error si fue causado intencionadamente por el desmonte/cancelación del componente
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;

      if (isMountedRef.current) {
        setError(err.response?.data?.error ?? err.message ?? 'Error desconocido');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Control estricto del ciclo de vida del componente del cliente
  useEffect(() => {
    const isMountedRef = { current: true };
    fetchData(isMountedRef);

    // Limpieza síncrona real y efectiva que cancela la petición y bloquea actualizaciones de estado
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    const isMountedRef = { current: true };
    fetchData(isMountedRef);
  }, [fetchData]);

  return { data, loading, error, refetch };
};