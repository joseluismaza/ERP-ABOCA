// frontend/src/contexts/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGlobalData } from './GlobalDataContext';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe utilizarse de forma estricta dentro de un NotificationProvider');
  }
  return context;
};

/**
 * Función pura auxiliar para analizar la integridad de los datos de inventario.
 * Filtra los equipos defectuosos o sin datos mandatorios para generar incidentes operacionales.
 */
const generarAlertasDeMateriales = (materiales) => {
  if (!materiales || !Array.isArray(materiales)) return [];
  return materiales
    .filter(m => !m.tipo || !m.modelo || !m.sn)
    .map(m => ({
      type: 'error',
      message: `El material con SN "${m.sn || 'S/N'}" o Modelo "${m.modelo || 'S/M'}" presenta omisión de datos obligatorios.`,
      timestamp: new Date().toLocaleString('es-ES'),
      target: `/materiales`,
      id: m._id || m.id,
      tipo: 'material',
      accion: 'editar'
    }));
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  
  // Estado controlado reactivo que sustituye el uso de CustomEvents para la apertura de modales
  const [activeIncident, setActiveIncident] = useState(null);

  /**
   * REGLA DE HOOKS CORREGIDA: Consumimos el contexto global dentro del cuerpo del componente.
   * Agregamos un fallback defensivo '|| {}' por si el proveedor se monta en paralelo.
   */
  const globalData = useGlobalData() || {};
  const { materiales = [], refreshGlobalData } = globalData;

  // Efecto que recalcula de forma reactiva las alertas cada vez que el almacén de materiales cambia
  useEffect(() => {
    const nuevasNotificaciones = generarAlertasDeMateriales(materiales);
    setNotifications(nuevasNotificaciones);
  }, [materiales]);

  /**
   * Expone un objeto de configuración { tipo, id, accion } 
   * para que las pantallas del ERP reaccionen y abran los modales de forma declarativa.
   */
  const triggerIncidentResolution = (incidentConfig) => {
    setActiveIncident(incidentConfig);
  };

  const clearActiveIncident = () => {
    setActiveIncident(null);
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      materiales,              // Pasamos la colección limpia
      refreshGlobalData,       // Pasamos el método real de refresco de red
      activeIncident,
      triggerIncidentResolution,
      clearActiveIncident
    }}>
      {children}
    </NotificationContext.Provider>
  );
};