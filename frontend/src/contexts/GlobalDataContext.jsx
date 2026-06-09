// frontend/src/contexts/GlobalDataContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext'; // Corregida la ruta relativa estándar si hereda de la misma carpeta

const GlobalDataContext = createContext(null);

export const GlobalDataProvider = ({ children }) => {
  // Consumimos el estado de autenticación para disparar las peticiones solo si hay un token válido
  const { isAuthenticated } = useAuth();

  // Estados globales de las colecciones del ERP inicializados estrictamente como arrays vacíos
  const [trabajadores, setTrabajadores] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [telefonos, setTelefonos] = useState([]);

  // Estados de control de ciclo de vida de la API
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Sincronizador maestro de datos. 
   * Ejecuta peticiones concurrentes a la API optimizando los tiempos de respuesta del servidor.
   */
  const refreshGlobalData = useCallback(async () => {
    // Si el usuario no está autenticado en el sistema, no iniciamos las peticiones
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Extraemos el token del almacenamiento local para las cabeceras Bearer de seguridad
      const token = localStorage.getItem('token');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      /**
       * ARQUITECTURA EFICIENTE: Peticiones paralelas mediante Promise.allSettled.
       * Si un módulo falla (ej. telefonos da error), el sistema no tumba el Dashboard completo,
       * permitiendo al operador seguir consultando trabajadores o hardware.
       */
      const [resTrabajadores, resMateriales, resTelefonos] = await Promise.allSettled([
        api.get('/trabajadores'),
        api.get('/materiales'),
        api.get('/telefonos')
      ]);

      // 1. Procesamiento del censo de personal
      if (resTrabajadores.status === 'fulfilled' && resTrabajadores.value.data) {
        // Adaptabilidad: Aceptamos tanto arrays directos como estructuras envueltas en data.trabajadores
        setTrabajadores(Array.isArray(resTrabajadores.value.data) ? resTrabajadores.value.data : resTrabajadores.value.data.trabajadores || []);
      } else if (resTrabajadores.status === 'rejected') {
        console.error('Error al sincronizar colección de Trabajadores:', resTrabajadores.reason);
      }

      // 2. Procesamiento del almacén de hardware
      if (resMateriales.status === 'fulfilled' && resMateriales.value.data) {
        setMateriales(Array.isArray(resMateriales.value.data) ? resMateriales.value.data : resMateriales.value.data.materiales || []);
      } else if (resMateriales.status === 'rejected') {
        console.error('Error al sincronizar colección de Materiales:', resMateriales.reason);
      }

      // 3. Procesamiento de líneas de telecomunicaciones
      if (resTelefonos.status === 'fulfilled' && resTelefonos.value.data) {
        setTelefonos(Array.isArray(resTelefonos.value.data) ? resTelefonos.value.data : resTelefonos.value.data.telefonos || []);
      } else if (resTelefonos.status === 'rejected') {
        console.error('Error al sincronizar colección de Teléfonos:', resTelefonos.reason);
      }

      // Si las tres peticiones fallaron de forma crítica, notificamos en pantalla
      if (resTrabajadores.status === 'rejected' && resMateriales.status === 'rejected' && resTelefonos.status === 'rejected') {
        setError('Imposible conectar con los servicios centrales del ERP. Revise su conexión de red.');
      }

    } catch (err) {
      console.error('Fallo crítico e inesperado en el orquestador global de datos:', err);
      setError('Error inesperado al procesar los datos de inventario.');
    } finally {
      /**
       * DIRECTIVA MANDATORIA DE CLEAN CODE:
       * Pase lo que pase en el bloque try/catch (éxito o fracaso de red), 
       * desactivamos de forma fulminante el estado de carga para liberar la UI del Dashboard.
       */
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Efecto encargado de disparar la sincronización en el momento en que el técnico se loguea correctamente
  useEffect(() => {
    refreshGlobalData();
  }, [refreshGlobalData]);

return (
    <GlobalDataContext.Provider value={{ 
      trabajadores, 
      materiales, 
      telefonos, 
      loading, 
      error,
      refreshGlobalData 
    }}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  // Eliminamos el throw si coincide con el montaje en paralelo, o lo dejamos controlado:
  return context; 
};