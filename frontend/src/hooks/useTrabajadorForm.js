// frontend/src/hooks/useTrabajadorForm.js
import { useState, useCallback, useRef } from 'react';

/**
 * Función pura de utilidad interna para formatear fechas de manera segura a ISO String (YYYY-MM-DD).
 * Extraída fuera del flujo reactivo para evitar penalizaciones de memoria en re-renders.
 */
const formatearFechaAInput = (fechaRaw) => {
  if (!fechaRaw) return '';
  try {
    const fecha = new Date(fechaRaw);
    return isNaN(fecha.getTime()) ? '' : fecha.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

/**
 * Sanea y mapea la estructura de datos del trabajador proveniente del backend
 * para adaptarla exactamente a los requerimientos de los inputs de tipo fecha nativos.
 */
const inicializarEstructuraTrabajador = (data) => {
  if (!data) return {};
  return {
    ...data,
    fechaAlta: formatearFechaAInput(data.fechaAlta),
    fechaBaja: formatearFechaAInput(data.fechaBaja),
    fechaNacimiento: formatearFechaAInput(data.fechaNacimiento)
  };
};

export const useTrabajadorForm = (initialData) => {
  // Inicialización perezosa (Lazy initialization): Solo se ejecuta una vez en el montaje inicial
  const [formValues, setFormValues] = useState(() => inicializarEstructuraTrabajador(initialData));
  
  // Guardamos los datos iniciales procesados para el reinicio limpio del estado
  const baseDataRef = useRef(initialData);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormValues((prev) => ({
      ...prev,
      [name]: newValue
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormValues(inicializarEstructuraTrabajador(baseDataRef.current));
  }, []);

  return [formValues, handleChange, resetForm];
};