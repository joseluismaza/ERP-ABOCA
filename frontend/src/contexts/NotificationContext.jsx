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
  // Notificaciones automáticas generadas por el análisis del inventario
  const [notificacionesAutomaticas, setNotificacionesAutomaticas] = useState([]);
  // Notificaciones manuales inyectadas desde componentes (ej: nueva línea telefónica creada)
  const [notificacionesManuales, setNotificacionesManuales] = useState([]);

  // Estado controlado reactivo que sustituye el uso de CustomEvents para la apertura de modales
  const [activeIncident, setActiveIncident] = useState(null);

  /**
   * REGLA DE HOOKS CORREGIDA: Consumimos el contexto global dentro del cuerpo del componente.
   * Agregamos un fallback defensivo '|| {}' por si el proveedor se monta en paralelo.
   */
  const globalData = useGlobalData() || {};
  const { materiales = [], refreshGlobalData } = globalData;

  // Efecto que recalcula de forma reactiva las alertas cada vez que el almacén de materiales cambia.
  // Solo afecta a notificacionesAutomaticas; las manuales persisten entre refresos.
  useEffect(() => {
    const nuevasNotificaciones = generarAlertasDeMateriales(materiales);
    setNotificacionesAutomaticas(nuevasNotificaciones);
  }, [materiales]);

  // INPUTS: Objeto notificación con campos: type, message, timestamp, id, (opcional) tipo, accion
  // PROCESO: Añade la notificación al array de manuales sin afectar las automáticas
  // OUTPUTS: La campanita muestra una nueva entrada informativa
  const addNotification = (notificacion) => {
    setNotificacionesManuales(prev => [...prev, notificacion]);
  };

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

  // Combinamos ambas fuentes de notificaciones para exponerlas juntas
  const notifications = [...notificacionesAutomaticas, ...notificacionesManuales];

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
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
